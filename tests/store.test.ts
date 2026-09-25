import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store,configureState } from '../src/store.js';
import { createPet, DEFAULT_PROFILE, HOUR } from '../src/core.js';
import { artRequest } from '../src/art.js';
test('concurrent transactions do not lose changes; corruption is preserved',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-store-'));const store=new Store(dir,true);
 try{await Promise.all(Array.from({length:12},()=>store.transaction(s=>{s.clockOffset+=1;})));assert.equal((await store.current()).clockOffset,12);
  await writeFile(store.file,'{broken');await assert.rejects(()=>store.current(),/preserved/);assert.equal(await readFile(store.file,'utf8'),'{broken');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('outfit freeze captures the actual current outfit and unfreeze releases it',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-lock-'));const store=new Store(dir,true);
 try{await store.transaction(async s=>{await store.adopt(s);s.pet!.state.prop='book';s.pet!.state.scene='library';configureState(s,{freezeOutfit:true});s.pet!.state.prop='tool';assert.deepEqual(s.settings.lockedOutfit,{prop:'book',scene:'library'});configureState(s,{freezeOutfit:false});assert.equal(s.settings.lockedOutfit,undefined);});}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('persisted legacy egg and egg reference migrate without restarting adoption', async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-migration-'));const store=new Store(dir,true);
 try {
  const adoptedAt=Date.now()-HOUR;
  await store.transaction(s=>{
   s.pet=createPet({...DEFAULT_PROFILE},adoptedAt,'legacy');
   (s.pet.dna as any).earStyle='floppy';(s.pet.dna as any).marking=2;
   delete (s.pet as any).hatchIdentity;s.identityReference='/old/egg.png';
  });
  const loaded=await store.current();
  assert.equal(loaded.pet?.adoptedAt,adoptedAt);
  assert.equal(loaded.pet?.stage,'egg');assert.equal(loaded.pet?.hatchIdentity,null);
  assert.ok(!('earStyle' in loaded.pet!.dna));
  assert.equal(loaded.eggReference,'/old/egg.png');assert.equal(loaded.identityReference,undefined);
  const disk=JSON.parse(await readFile(store.file,'utf8'));
  assert.equal(disk.pet.adoptedAt,adoptedAt);assert.equal(disk.pet.hatchIdentity,null);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('new adoption records only bounded mapping evidence and keeps visual request ID stable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-adoption-trace-'));
 const oldHome=process.env.CODEX_HOME;process.env.CODEX_HOME=path.join(dir,'codex');
 const store=new Store(path.join(dir,'state'));
 try {
  const sessionDir=path.join(process.env.CODEX_HOME,'sessions');await mkdir(sessionDir,{recursive:true});
  await writeFile(path.join(sessionDir,'task.jsonl'),JSON.stringify({type:'event_msg',timestamp:Date.now(),payload:{type:'user_message',message:'Please research a paper SECRET_PRIVATE_TOKEN'}})+'\n');
  const pet=await store.transaction(s=>store.adopt(s,{palette:'peach'}));
  assert.equal(pet.profile.palette,'peach');assert.equal(pet.profile.interest,'research');
  assert.deepEqual(pet.adoptionTrace,{algorithmVersion:'adoption-map-v1',mode:'automatic',selectedActivity:'research',
   activityCounts:{build:0,research:1,create:0,learn:0,rest:0},explicitFields:['palette'],capturedAt:pet.adoptedAt});
  assert.doesNotMatch(JSON.stringify(pet.adoptionTrace),/SECRET_PRIVATE_TOKEN|task\.jsonl|paper/);
  const state=await store.current();
  const request=artRequest(state)!;
  assert.deepEqual(request.adoptionTrace,pet.adoptionTrace);
  assert.equal(artRequest({...state,pet:{...state.pet!,adoptionTrace:undefined}})!.id,request.id);
 }finally{
  if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;
  await rm(dir,{recursive:true,force:true});
 }
});
test('first sync beyond hatch imports all incubation observations before freezing birth', async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-birth-sync-'));
 const oldHome=process.env.CODEX_HOME;process.env.CODEX_HOME=path.join(dir,'codex');
 const store=new Store(path.join(dir,'state'));
 try {
  const now=Date.now(),adoptedAt=now-6*HOUR;
  const sessionDir=path.join(process.env.CODEX_HOME,'sessions');await mkdir(sessionDir,{recursive:true});
  for(const [index,text] of ['create an illustration','research a paper','research an experiment'].entries()) {
   await writeFile(path.join(sessionDir,`${index}.jsonl`),JSON.stringify({type:'event_msg',timestamp:adoptedAt+(index+0.5)*HOUR,payload:{type:'user_message',message:text}})+'\n');
  }
  await store.transaction(s=>{s.pet=createPet({...DEFAULT_PROFILE},adoptedAt,'late-birth');s.lastScanAt=Date.now();});
  // Even the normal scan throttle must not freeze birth before this full scan.
  const first=await store.current();
  assert.equal(first.pet?.hatchIdentity?.evidenceCount,3);
  assert.equal(first.pet?.hatchIdentity?.influence,'research');
  assert.equal(first.pet?.adoptedAt,adoptedAt);
  const second=await store.current();assert.deepEqual(second.pet?.hatchIdentity,first.pet?.hatchIdentity);
 }finally{
  if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;
  await rm(dir,{recursive:true,force:true});
 }
});

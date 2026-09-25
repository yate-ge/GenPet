import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { debugReset, debugGrow, debugState } from '../src/debug.js';
import { artRequest, acceptArt, exportNative } from '../src/art.js';
import { HOUR } from '../src/core.js';

const atlas=path.resolve('assets/pets/mystery-egg/spritesheet.webp');
async function setup(){
 const root=await mkdtemp(path.join(tmpdir(),'genpet-debug-'));const store=new Store(root);
 await store.transaction(s=>{s.settings.autoContext=false;return store.adopt(s);});
 return {root,store};
}
async function approve(store:Store){
 const request=artRequest(await store.current())!;
 for(const kind of ['portrait','atlas'] as const)await acceptArt(store,{requestId:request.id,file:atlas,kind,provenance:'Packaged fixture for isolated state tests only, never generated visual evidence.'});
}
test('reset archives a life, clears references/offset/outfit and starts a new egg without touching the native manifest',async()=>{
 const {root,store}=await setup();
 try{
  await approve(store);await debugGrow(store,'hatch');await approve(store);await debugGrow(store,'adult','adult');
  await debugState(store,'brush','create');
  await store.transaction(s=>{s.settings.freezeOutfit=true;s.settings.lockedOutfit={prop:'book',scene:'library'};});
  const before=await store.current();
  const destination=path.join(root,'pets','genpet-companion');await approve(store);await exportNative(await store.current(),destination);
  const visible=await readFile(path.join(destination,'pet.json'),'utf8');
  const reset=await debugReset(store,'reset-1');
  assert.notEqual(reset.state.pet!.seed,before.pet!.seed);assert.ok(reset.state.pet!.adoptedAt>=before.pet!.adoptedAt);
  assert.equal(reset.state.pet!.stage,'egg');assert.equal(reset.state.pet!.hatchIdentity,null);
  assert.equal(reset.state.eggReference,undefined);assert.equal(reset.state.identityReference,undefined);assert.equal(reset.state.art.length,0);
  assert.equal(reset.state.debug!.growthOffsetMs,0);assert.equal(reset.state.debug!.stateOverride,undefined);
  assert.equal(reset.state.settings.autoContext,false);assert.equal(reset.state.settings.freezeOutfit,false);
  assert.equal(JSON.parse(await readFile(reset.backup!,'utf8')).pet.seed,before.pet!.seed);
  assert.equal(await readFile(path.join(destination,'pet.json'),'utf8'),visible);
  const retry=await debugReset(store,'reset-1');assert.equal(retry.alreadyApplied,true);assert.equal(retry.state.pet!.seed,reset.state.pet!.seed);
  await assert.rejects(()=>debugState(store,'reset-1','none'),/different operation/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('growth requires forward-hatching references, preserves identity and continues after reopening',async()=>{
 const {root,store}=await setup();
 try{
  await assert.rejects(()=>debugGrow(store,'grow'),/egg portrait/);await approve(store);
  await assert.rejects(()=>debugGrow(store,'adult','adult'),/birth identity first/);
  const egg=(await store.current()).pet!;const hatch=await debugGrow(store,'grow');
  assert.equal(hatch.state.pet!.stage,'hatchling');assert.equal(hatch.state.pet!.growth.days,0);assert.ok(hatch.state.pet!.hatchIdentity);
  assert.equal(hatch.state.pet!.adoptedAt,egg.adoptedAt);assert.equal(hatch.state.pet!.seed,egg.seed);
  assert.deepEqual(hatch.artRequest!.referenceFiles,[hatch.state.eggReference]);
  await assert.rejects(()=>debugGrow(store,'next'),/first hatchling portrait/);await approve(store);
  const birth=(await store.current()).identityReference;
  const day=await debugGrow(store,'day');assert.equal(day.state.pet!.growth.days,1);
  assert.equal((await debugGrow(store,'day')).alreadyApplied,true);
  for(const target of ['juvenile','adult'] as const){
   const grown=await debugGrow(store,target,target);assert.equal(grown.state.pet!.stage,target);
   assert.deepEqual(grown.state.pet!.hatchIdentity,hatch.state.pet!.hatchIdentity);assert.equal(grown.state.identityReference,birth);
   assert.equal(grown.state.pet!.adoptedAt,egg.adoptedAt);assert.equal(grown.state.pet!.seed,egg.seed);
  }
  const reopened=await new Store(root).current();assert.equal(reopened.pet!.growth.days,21);
  await assert.rejects(()=>debugGrow(store,'again','hatch'),/already reached/);
  const saved=await readFile(store.file,'utf8');await assert.rejects(()=>debugGrow(store,'bad','next',-1),/1 and 90/);assert.equal(await readFile(store.file,'utf8'),saved);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('state overrides are persistent visual controls, never user evidence; A to B to A exports exact cached A',async()=>{
 const {root,store}=await setup();
 try{
  await assert.rejects(()=>debugState(store,'egg-brush','create'),/Eggs have no props/);
  await approve(store);await debugGrow(store,'hatch');await approve(store);
  const before=await store.current(),expected={build:'tool',research:'book',create:'brush',learn:'star',rest:'pillow',none:'none'};
  for(const [kind,prop] of Object.entries(expected)){
   const changed=await debugState(store,kind,kind as keyof typeof expected);
   assert.equal(changed.artRequest!.visual.prop,prop);assert.deepEqual(changed.state.pet!.context,before.pet!.context);
   assert.deepEqual(changed.state.pet!.hatchIdentity,before.pet!.hatchIdentity);assert.equal(changed.state.pet!.growth.days,0);
   assert.equal(artRequest(await new Store(root).current())!.visual.prop,prop);
  }
  const a=await debugState(store,'A','research');await approve(store);
  const aExport=await exportNative(await store.current(),path.join(root,'native'));
  const b=await debugState(store,'B','create');
  await assert.rejects(()=>exportNative(b.state,path.join(root,'native')),/current design/);await approve(store);
  const bExport=await exportNative(await store.current(),path.join(root,'native'));assert.notEqual(bExport.artId,aExport.artId);
  const again=await debugState(store,'A-again','research');assert.equal(again.artRequest!.status,'ready');
  assert.equal((await exportNative(again.state,path.join(root,'native'))).artId,a.artRequest!.id);
  const automatic=await debugState(store,'auto','auto');assert.equal(automatic.state.debug!.stateOverride,undefined);
  assert.equal(automatic.artRequest!.visual.prop,automatic.state.pet!.state.prop);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('accelerated pets scan real recent chats and map timestamps onto their logical timeline',async()=>{
 const {root,store}=await setup();const old=process.env.CODEX_HOME;
 process.env.CODEX_HOME=path.join(root,'codex');
 try{
  await approve(store);await debugGrow(store,'hatch');await approve(store);await debugGrow(store,'adult','adult');
  const now=Date.now();await mkdir(path.join(process.env.CODEX_HOME,'sessions'),{recursive:true});
  await writeFile(path.join(process.env.CODEX_HOME,'sessions','task.jsonl'),JSON.stringify({type:'event_msg',timestamp:now,payload:{type:'user_message',message:'research papers and experiments'}})+'\n');
  await store.transaction(s=>{s.settings.autoContext=true;s.lastScanAt=0;});
  const state=await store.current();assert.equal(state.pet!.context.length,1);
  assert.equal(state.pet!.context[0].kind,'research');assert.equal(state.pet!.context[0].occurredAt,now+state.debug!.growthOffsetMs);
  assert.equal((await store.current()).pet!.context.length,1);
  assert.ok(state.debug!.growthOffsetMs>21*24*HOUR);
 }finally{if(old===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=old;await rm(root,{recursive:true,force:true});}
});

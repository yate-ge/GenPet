import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { Store } from '../src/store.js';
import { actions,artRequest,acceptArt,validateImage,exportNative,installNative } from '../src/art.js';
import { refreshNativePet } from '../src/native-refresh.js';

// Synthetic opaque blocks are validation fixtures only, never pet artwork.
async function fixture(file:string,badUnused=false,color=80){
 const width=1536,height=2288,rgba=Buffer.alloc(width*height*4);
 for(let row=0;row<11;row++)for(let col=0;col<(row===0?7:row<9?actions[row].count:8);col++)for(let y=70;y<100;y++)for(let x=70;x<100;x++){
  const p=((row*208+y)*width+col*192+x)*4;rgba[p]=color;rgba[p+1]=130;rgba[p+2]=60;rgba[p+3]=255;
 }
 if(badUnused)rgba[(50*width+7*192+50)*4+3]=255;
 await sharp(rgba,{raw:{width,height,channels:4}}).png().toFile(file);
}
test('atlas validation rejects bad geometry, blank used and nonempty unused cells',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-art-'));
 try{const good=path.join(dir,'good.png');await fixture(good);assert.equal((await validateImage(good,'atlas')).height,2288);
  const bad=path.join(dir,'bad.png');await fixture(bad,true);await assert.rejects(()=>validateImage(bad,'atlas'),/Unused cell/);
  const empty=path.join(dir,'empty.png');await sharp({create:{width:1536,height:2288,channels:4,background:'#00000000'}}).png().toFile(empty);await assert.rejects(()=>validateImage(empty,'atlas'),/Empty animation cell/);
  const wrong=path.join(dir,'wrong.png');await sharp({create:{width:32,height:32,channels:4,background:'#00000000'}}).png().toFile(wrong);await assert.rejects(()=>validateImage(wrong,'atlas'),/Atlas must/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('stale art is rejected and successful native install keeps an atomic manifest and rollback',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-accept-'));const store=new Store(dir,true);
 try{await store.transaction(s=>store.adopt(s));const s=await store.current(),request=artRequest(s)!;
  const file=path.join(dir,'fixture.png');await fixture(file);
  await assert.rejects(()=>acceptArt(store,{file,kind:'atlas',requestId:'stale',provenance:'Synthetic test fixture, never distributed'}),/Stale/);assert.equal((await store.current()).art.length,0);
  await acceptArt(store,{file,kind:'atlas',requestId:request.id,provenance:'Synthetic test fixture, never distributed'});
  const destination=path.join(dir,'native');await exportNative(await store.current(),destination);const manifest=JSON.parse(await readFile(path.join(destination,'pet.json'),'utf8'));assert.match(manifest.spritesheetPath,/^spritesheet-[a-f0-9]{16}\.png$/);assert.equal(manifest.spriteVersionNumber,2);
  await validateImage(path.join(destination,manifest.spritesheetPath),'atlas');await exportNative(await store.current(),destination);assert.equal(await readFile(path.join(destination,'previous-pet.json'),'utf8'),await readFile(path.join(destination,'pet.json'),'utf8'));
  // A long image generation may cross a life-stage boundary without a status poll.
  await store.transaction(state=>{state.clockOffset=5*3_600_000;});
  await assert.rejects(()=>acceptArt(store,{file,kind:'atlas',requestId:request.id,provenance:'Synthetic test fixture, never distributed'}),/Stale/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('image references progress from shell-only to a revealed identity, never a preselected creature',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-forward-'));const store=new Store(dir,true);
 try {
  await store.transaction(s=>store.adopt(s));
  const file=path.join(dir,'portrait.png');
  await sharp({create:{width:32,height:32,channels:4,background:{r:230,g:230,b:220,alpha:0.8}}}).png().toFile(file);
  let request=artRequest(await store.current())!;
  assert.equal(request.visual.hatchIdentity,null);assert.deepEqual(request.referenceFiles,[]);
  const shell=await acceptArt(store,{file,kind:'portrait',requestId:request.id,provenance:'Synthetic reference test only; never distributed.'});
  let state=await store.current();assert.equal(state.eggReference,shell.file);assert.equal(state.identityReference,undefined);
  await store.transaction(s=>{s.clockOffset=5*3_600_000;});
  request=artRequest(await store.current())!;assert.match(request.prompt,/FORWARD HATCHING/);
  assert.match(request.prompt,/seed-derived permanent marking/);
  assert.deepEqual(request.referenceFiles,[shell.file]);assert.ok(request.visual.hatchIdentity);
  const child=await acceptArt(store,{file,kind:'portrait',requestId:request.id,provenance:'Synthetic reference test only; never distributed.'});
  state=await store.current();assert.equal(state.identityReference,child.file);assert.equal(state.eggReference,shell.file);
  request=artRequest(state)!;assert.deepEqual(request.referenceFiles,[child.file]);assert.match(request.prompt,/CONTINUE THE SAME REVEALED INDIVIDUAL/);
  assert.doesNotMatch(request.prompt,/seed-derived permanent marking/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('day-one art request carries stronger visible torso and limb growth without changing birth identity',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-day1-request-'));const store=new Store(dir,true);
 try{
  await store.transaction(s=>store.adopt(s));
  await store.transaction(s=>{s.clockOffset=5*3_600_000;});
  const birth=artRequest(await store.current())!;
  await store.transaction(s=>{s.clockOffset=29*3_600_000;});
  const day1=artRequest(await store.current())!;
  assert.equal(day1.visual.day,1);
  assert.deepEqual(day1.visual.hatchIdentity,birth.visual.hatchIdentity);
  assert.ok(day1.visual.growth!.proportions.torsoLengthRelativeToBirth>=1.08);
  assert.ok(day1.visual.growth!.proportions.limbLengthRelativeToBirth>=1.06);
  assert.notEqual(day1.id,birth.id);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('demo installation is blocked before it writes any native files',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-demo-block-'));const oldHome=process.env.CODEX_HOME;
 process.env.CODEX_HOME=path.join(dir,'codex');
 try {
  await assert.rejects(()=>installNative(new Store(path.join(dir,'data'),true)),/Demo state cannot install/);
  assert.deepEqual(await readdir(dir),[]);
 }finally{if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;await rm(dir,{recursive:true,force:true});}
});

test('installNative can confirm automatic host refresh when the adapter reports a matching display hash',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'genpet-auto-refresh-'));const oldHome=process.env.CODEX_HOME;
  process.env.CODEX_HOME=path.join(dir,'codex');
  const store=new Store(path.join(dir,'data'));
  try {
   await store.transaction(s=>{s.settings.autoContext=false;return store.adopt(s);});
   const state=await store.current();const file=path.join(dir,'fixture.png');await fixture(file);
   await acceptArt(store,{file,kind:'atlas',requestId:artRequest(state)!.id,provenance:'Synthetic refresh wiring fixture only.'});
   const fake: typeof refreshNativePet = async (options) => {
     const { createHash } = await import('node:crypto');
     const { readFile } = await import('node:fs/promises');
     const expected=createHash('sha256').update(await readFile(options.expectedSpritePath)).digest('hex');
     return {automaticRefresh:true,displayStatus:'confirmed',strategy:'cdp-query-invalidate',
       before:{petId:'custom:genpet-companion',spriteSha256:'old',source:'cdp-dom'},
       after:{petId:'custom:genpet-companion',spriteSha256:expected,source:'cdp-dom'},
       expectedSpriteSha256:expected,
       notice:'Floating Pet reloaded the committed atlas for the same identity.'};
   };
   const result=await installNative(store,{refresh:fake});
   assert.equal(result.filesCommitted,true);
   assert.equal(result.automaticRefresh,true);
   assert.equal(result.displayStatus,'confirmed');
   assert.equal(result.refreshRequired,false);
   assert.equal(result.refresh?.strategy,'cdp-query-invalidate');
   const saved=(await store.current()).nativeExport!;
   assert.equal(saved.refreshRequired,false);
  }finally{if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;await rm(dir,{recursive:true,force:true});}
});

test('egg, hatch and growth updates replace one native entry and preserve adoption identity',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-same-entry-'));const oldHome=process.env.CODEX_HOME;
 process.env.CODEX_HOME=path.join(dir,'codex');
 let clock=Date.now();
 class TestClockStore extends Store { override now(){return clock;} }
 const store=new TestClockStore(path.join(dir,'data'));
 try {
  await store.transaction(s=>{s.settings.autoContext=false;return store.adopt(s);});
  const original=(await store.current()).pet!;let previous='';const spriteNames=new Set<string>();
  for(const [hours,stage,color] of [[0,'egg',70],[5,'hatchling',100],[29,'hatchling',140]] as const){
   clock=original.adoptedAt+hours*3_600_000;
   const state=await store.current();assert.equal(state.pet!.stage,stage);
   const file=path.join(dir,'fixture.png');await fixture(file,false,color);
   await acceptArt(store,{file,kind:'atlas',requestId:artRequest(state)!.id,provenance:'Synthetic export regression fixture only; not a visual growth test.'});
   const result=await installNative(store);assert.equal(result.manifest.id,'genpet-companion');
   assert.equal(result.filesCommitted,true);assert.equal(result.automaticRefresh,false);assert.equal(result.displayStatus,'unconfirmed');
   assert.equal(result.destination,path.join(dir,'codex','pets','genpet-companion'));
   assert.deepEqual(await readdir(path.join(dir,'codex','pets')),['genpet-companion']);
   if(previous)assert.equal(await readFile(path.join(result.destination,'previous-pet.json'),'utf8'),previous);
   previous=await readFile(path.join(result.destination,'pet.json'),'utf8');spriteNames.add(result.manifest.spritesheetPath);
   const updated=(await store.current()).pet!;assert.equal(updated.id,original.id);assert.equal(updated.seed,original.seed);assert.equal(updated.adoptedAt,original.adoptedAt);
  }
  assert.equal(spriteNames.size,3);
 }finally{if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;await rm(dir,{recursive:true,force:true});}
});

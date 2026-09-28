import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { Store } from '../src/store.js';
import { actions,artRequest,acceptArt,validateImage,exportNative,installNative } from '../src/art.js';
import { refreshNativePet } from '../src/native-refresh.js';

async function png(file:string,width:number,height:number,rgba=Buffer.alloc(width*height*4)){
 const image=new PNG({width,height});rgba.copy(image.data);await writeFile(file,PNG.sync.write(image));
}
// Synthetic opaque blocks are validation fixtures only, never pet artwork.
async function fixture(file:string,badUnused=false,color=80){
 const width=1536,height=2288,rgba=Buffer.alloc(width*height*4);
 for(let row=0;row<11;row++)for(let col=0;col<(row===0?7:row<9?actions[row].count:8);col++)for(let y=70;y<100;y++)for(let x=70;x<100;x++){
  const p=((row*208+y)*width+col*192+x)*4;rgba[p]=color;rgba[p+1]=130;rgba[p+2]=60;rgba[p+3]=255;
 }
 if(badUnused)rgba[(50*width+7*192+50)*4+3]=255;
 await png(file,width,height,rgba);
}
test('atlas validation rejects bad geometry, blank used and nonempty unused cells',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-art-'));
 try{const good=path.join(dir,'good.png');await fixture(good);assert.equal((await validateImage(good,'atlas')).height,2288);
  const bad=path.join(dir,'bad.png');await fixture(bad,true);await assert.rejects(()=>validateImage(bad,'atlas'),/Unused cell/);
  const empty=path.join(dir,'empty.png');await png(empty,1536,2288);await assert.rejects(()=>validateImage(empty,'atlas'),/Empty animation cell/);
  const wrong=path.join(dir,'wrong.png');await png(wrong,32,32);await assert.rejects(()=>validateImage(wrong,'atlas'),/Atlas must/);
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
  await png(file,32,32,Buffer.alloc(32*32*4).map((_,i)=>[230,230,220,204][i%4]));
  let request=artRequest(await store.current())!;
  assert.equal(request.visual.hatchIdentity,null);assert.deepEqual(request.referenceFiles,[]);
  assert.match(request.prompt,/egg-three profile/);
  assert.match(request.prompt,/three AI-generated eight-frame loops/);
  assert.match(request.prompt,/one neutral calm frame across all sixteen look slots/);
  assert.doesNotMatch(request.prompt,/Do not visually inspect/);
  const shell=await acceptArt(store,{file,kind:'portrait',requestId:request.id,provenance:'Synthetic reference test only; never distributed.'});
  let state=await store.current();assert.equal(state.eggReference,shell.file);assert.equal(state.identityReference,undefined);
  await store.transaction(s=>{s.clockOffset=5*3_600_000;});
  request=artRequest(await store.current())!;assert.match(request.prompt,/FORWARD HATCHING/);
  assert.match(request.prompt,/all nine state rows and both eight-pose look rows independently from base/);
  assert.doesNotMatch(request.prompt,/egg-three profile/);
  assert.match(request.prompt,/seed-derived permanent marking/);
  assert.match(request.prompt,/natural head and body turns/);
  assert.match(request.prompt,/Visually review each generated source/);
  assert.doesNotMatch(request.prompt,/torso facing the viewer|change gaze only|validate structure only/);
  assert.deepEqual(request.referenceFiles,[shell.file]);assert.ok(request.visual.hatchIdentity);
  const child=await acceptArt(store,{file,kind:'portrait',requestId:request.id,provenance:'Synthetic reference test only; never distributed.'});
  state=await store.current();assert.equal(state.identityReference,child.file);assert.equal(state.eggReference,shell.file);
  request=artRequest(state)!;assert.deepEqual(request.referenceFiles,[child.file]);assert.match(request.prompt,/CONTINUE THE SAME REVEALED INDIVIDUAL/);
  assert.doesNotMatch(request.prompt,/seed-derived permanent marking/);
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

test('first install and ready-art resume request refresh and persist IPC delivery independently of display proof',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-ipc-install-'));const oldHome=process.env.CODEX_HOME;process.env.CODEX_HOME=path.join(dir,'codex');
 const store=new Store(path.join(dir,'data'));let calls=0;
 try{
  await store.transaction(s=>{s.settings.autoContext=false;return store.adopt(s);});
  const file=path.join(dir,'fixture.png');await fixture(file);
  await acceptArt(store,{file,kind:'atlas',requestId:artRequest(await store.current())!.id,provenance:'Synthetic IPC wiring fixture only.'});
  const adapter:typeof refreshNativePet=async()=>{calls++;return {automaticRefresh:true,refreshRequested:true,displayStatus:'unconfirmed',strategy:'ipc-query-invalidate',expectedSpriteSha256:'fixture',notice:'IPC delivered'};};
  for(let i=0;i<2;i++){const r=await installNative(store,{refresh:adapter});assert.equal(r.refreshRequired,false);assert.equal(r.displayStatus,'unconfirmed');assert.equal(r.automaticRefresh,true);}
  assert.equal(calls,2);assert.equal((await store.current()).nativeExport!.refreshRequired,false);
  const failed=await installNative(store,{refresh:options=>refreshNativePet({...options,ipcSocketPath:path.join(dir,'missing.sock'),timeoutMs:150})});
  assert.equal(failed.automaticRefresh,false);
  assert.equal(failed.refresh?.refreshRequested,false);
  assert.equal(failed.refreshRequired,true);
  assert.equal((await store.current()).nativeExport!.refreshRequired,true);
  const retried=await installNative(store,{refresh:adapter});
  assert.equal(retried.refreshRequired,false);
  assert.equal((await store.current()).nativeExport!.refreshRequired,false);
 }finally{if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;await rm(dir,{recursive:true,force:true});}
});

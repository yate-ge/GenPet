import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../src/debugger-server.js';
import { Store } from '../src/store.js';
import { createPet, DEFAULT_PROFILE } from '../src/core.js';

test('debugger reads without writes, protects actions, isolates demo and stops',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-debugger-test-'));
 const store=new Store(root);
 await store.transaction(s=>{s.pet=createPet(DEFAULT_PROFILE,Date.now()-86400000,'debug-test');});
 const before=await readFile(store.file,'utf8');
 const nativeHome=path.join(root,'codex-home');await mkdir(nativeHome);
 const configFile=path.join(nativeHome,'config.toml');const initialConfig='[desktop]\nselected-avatar-id = "codex"\n';await writeFile(configFile,initialConfig);
 const server=await startServer(0,root,{nativeHome});
 const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try {
  const state=await (await fetch(url+'/api/state')).json();
  assert.equal(state.state.pet.stage,'egg');
  assert.equal(await readFile(store.file,'utf8'),before);
  assert.equal(state.nativePets.selection.selectedPetId,'codex');
  assert.equal(state.nativePets.activation.immediate,false);
  assert.ok(state.nativePets.pets.some((pet:{id:string})=>pet.id==='dewey'));
  assert.equal(await readFile(configFile,'utf8'),initialConfig);
  const demo=await (await fetch(url+'/api/state?demo=1')).json();
  assert.equal(demo.state.pet,null);
  assert.equal(demo.nativePets,null);
  await assert.rejects(access(path.join(root,'debugger','demo.json')));
  assert.equal((await fetch(url+'/api/state',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(url+'/api/action',{method:'POST',body:'{}'})).status,403);
  const action=(body:object,demo=true)=>fetch(url+'/api/action?demo='+Number(demo),{method:'POST',headers:{'X-GenPet-Token':state.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await action({action:'adopt'})).status,200);
  assert.equal((await action({action:'advance',hours:24})).status,200);
  for(const name of ['export','ipc-refresh','switch-native','select-native-pet'])assert.equal((await action({action:name,petId:'dewey'})).status,400);
  assert.equal(await readFile(configFile,'utf8'),initialConfig);
  assert.equal((await action({action:'select-native-pet',petId:'custom:missing'},false)).status,400);
  assert.equal(await readFile(configFile,'utf8'),initialConfig);
  const selected=await (await action({action:'select-native-pet',petId:'dewey'},false)).json();
  assert.equal(selected.ok,true);
  assert.equal(selected.result.restartRequired,true);
  assert.equal(selected.result.immediate,false);
  assert.equal((await (await fetch(url+'/api/state')).json()).nativePets.selection.selectedPetId,'dewey');
  assert.equal(await readFile(store.file,'utf8'),before);
  assert.equal((await action({action:'advance',hours:24},false)).status,400);
  for(const route of ['/','/app.js','/style.css'])assert.equal((await fetch(url+route)).status,200);
  assert.equal((await action({action:'stop'})).status,200);
 } finally {server.close();server.closeAllConnections();await rm(root,{recursive:true,force:true});}
});

test('debugger switches through the host bridge and never falls back to a disk write on failure',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-debugger-live-test-'));
 const nativeHome=path.join(root,'home');await mkdir(nativeHome);
 const configFile=path.join(nativeHome,'config.toml');const config='[desktop]\nselected-avatar-id = "codex"\n';await writeFile(configFile,config);
 let selected='hoots',reads=0,fail=false;const writes:string[]=[];
 const server=await startServer(0,root,{nativeHome,livePets:{
  read:async()=>{reads++;return {available:true as const,selectedPetId:selected,effectiveSelectedPetId:selected};},
  select:async petId=>{
   if(fail)throw new Error('Host disconnected');
   writes.push(petId);selected=petId;
   return {selectedPetId:petId,effectiveSelectedPetId:petId,immediate:true as const,restartRequired:false as const,hostStateConfirmed:true as const,visualVerified:false as const};
  },
 }});
 const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try {
  const state=await (await fetch(url+'/api/state')).json();
  assert.equal(state.nativePets.selection.selectedPetId,'hoots');
  assert.equal(state.nativePets.selection.source,'app-tools');
  assert.equal(state.nativePets.activation.immediate,true);
  const readCount=reads;await fetch(url+'/api/state?demo=1');assert.equal(reads,readCount);
  const action=(petId:string,demo=false)=>fetch(url+'/api/action?demo='+Number(demo),{method:'POST',headers:{'X-GenPet-Token':state.token,'Content-Type':'application/json'},body:JSON.stringify({action:'select-native-pet',petId,applyMode:'live'})});
  assert.equal((await action('dewey',true)).status,400);
  assert.equal((await action('custom:missing')).status,400);
  assert.deepEqual(writes,[]);
  const result=await (await action('dewey')).json();
  assert.equal(result.ok,true);assert.equal(result.result.immediate,true);assert.equal(result.result.restartRequired,false);
  assert.equal((await (await fetch(url+'/api/state')).json()).nativePets.selection.selectedPetId,'dewey');
  fail=true;assert.equal((await action('fireball')).status,400);
  assert.deepEqual(writes,['dewey']);assert.equal(selected,'dewey');
  assert.equal(await readFile(configFile,'utf8'),config);
  await assert.rejects(access(path.join(root,'state.json')));
 } finally {server.close();server.closeAllConnections();await rm(root,{recursive:true,force:true});}
});

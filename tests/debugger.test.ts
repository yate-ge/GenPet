import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { nativePetSelection, startServer } from '../src/debugger-server.js';
import { Store } from '../src/store.js';
import { createPet, DEFAULT_PROFILE } from '../src/core.js';

test('debugger reads without writes, protects actions, isolates demo and stops',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-debugger-test-'));
 const store=new Store(root);
 await store.transaction(s=>{s.pet=createPet(DEFAULT_PROFILE,Date.now()-86400000,'debug-test');});
 const before=await readFile(store.file,'utf8');
 const server=await startServer(0,root);
 const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try {
  const state=await (await fetch(url+'/api/state')).json();
  assert.equal(state.state.pet.stage,'egg');
  assert.equal(await readFile(store.file,'utf8'),before);
  const demo=await (await fetch(url+'/api/state?demo=1')).json();
  assert.equal(demo.state.pet,null);
  await assert.rejects(access(path.join(root,'debugger','demo.json')));
  assert.equal((await fetch(url+'/api/state',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(url+'/api/action',{method:'POST',body:'{}'})).status,403);
  const action=(body:object,demo=true)=>fetch(url+'/api/action?demo='+Number(demo),{method:'POST',headers:{'X-GenPet-Token':state.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await action({action:'adopt'})).status,200);
  assert.equal((await action({action:'advance',hours:24})).status,200);
  for(const name of ['export','ipc-refresh','switch-native'])assert.equal((await action({action:name})).status,400);
  assert.equal(await readFile(store.file,'utf8'),before);
  assert.equal((await action({action:'advance',hours:24},false)).status,400);
  for(const route of ['/','/app.js','/style.css'])assert.equal((await fetch(url+route)).status,200);
  assert.equal((await action({action:'stop'})).status,200);
 } finally {server.close();server.closeAllConnections();await rm(root,{recursive:true,force:true});}
});

test('debugger reports native Pet selection without changing it',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-selection-test-'));
 const previous=process.env.CODEX_HOME;
 process.env.CODEX_HOME=root;
 const file=path.join(root,'.codex-global-state.json');
 try {
  await writeFile(file,JSON.stringify({'electron-persisted-atom-state':{'selected-avatar-id':'custom:genpet-companion'}}));
  assert.deepEqual(await nativePetSelection(),{selectedPetId:'custom:genpet-companion',genpetSelected:true});
  await writeFile(file,JSON.stringify({'electron-persisted-atom-state':{'selected-avatar-id':'custom:another-pet'}}));
  assert.deepEqual(await nativePetSelection(),{selectedPetId:'custom:another-pet',genpetSelected:false});
  assert.match(await readFile(file,'utf8'),/custom:another-pet/);
 } finally {
  if(previous===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=previous;
  await rm(root,{recursive:true,force:true});
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
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

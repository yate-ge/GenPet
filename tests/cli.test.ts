import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execute=promisify(execFile);

test('CLI exposes the complete lightweight GenPet interface',async()=>{
 const data=await mkdtemp(path.join(tmpdir(),'genpet-cli-'));
 const run=async(...args:string[])=>JSON.parse((await execute(process.execPath,['--import','tsx','src/cli.ts',...args],{
  cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,GENPET_DATA_DIR:data},maxBuffer:8*1024*1024,
 })).stdout);
 try{
  await run('configure','autoContext=false');
  assert.equal((await run('status')).pet,null);
  const pet=await run('adopt','Test Egg','lilac');assert.equal(pet.stage,'egg');assert.equal(pet.profile.palette,'lilac');
  await assert.rejects(()=>run('adopt'),/already have a pet/);
  const request=await run('art-request');assert.equal(request.status,'pending');assert.equal(request.contract.rows,11);
  const configured=await run('configure','autoArt=false','name=CLI Egg');
  assert.equal(configured.pet.profile.name,'CLI Egg');
  assert.equal((await run('art-request')).status,'paused');
  const cleared=await run('clear-context');assert.equal(cleared.cleared,true);assert.deepEqual(cleared.state.pet.context,[]);
 }finally{await rm(data,{recursive:true,force:true});}
});

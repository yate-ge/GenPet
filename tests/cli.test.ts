import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
test('native CLI advances only the isolated demo and preserves the real adoption',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'genpet-cli-'));
 const run=(...args:string[])=>JSON.parse(execFileSync(process.execPath,['--import','tsx','src/cli.ts',...args],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,GENPET_DATA_DIR:dir,CODEX_HOME:path.join(dir,'codex')},encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 try {
  const real=run('adopt','Real');const original=await readFile(path.join(dir,'state.json'),'utf8');
  const egg=run('--demo','adopt');assert.equal(egg.hatchIdentity,null);
  const born=run('--demo','advance','5');assert.equal(born.stage,'hatchling');assert.ok(born.hatchIdentity);
  const next=run('--demo','advance','24');assert.equal(next.growth.days,1);assert.deepEqual(next.hatchIdentity,born.hatchIdentity);
  assert.throws(()=>run('advance','5'));assert.equal(await readFile(path.join(dir,'state.json'),'utf8'),original);
  assert.equal(JSON.parse(original).pet.adoptedAt,real.adoptedAt);
  const reset=run('debug-reset','cli-reset');assert.equal(reset.state.pet.stage,'egg');assert.notEqual(reset.state.pet.seed,real.seed);
  assert.equal(run('debug-reset','cli-reset').alreadyApplied,true);
  assert.throws(()=>run('debug-grow','next','cli-grow'));
  assert.throws(()=>run('debug-state','create','cli-state'));
  assert.equal(run('debug-state','auto','cli-auto').state.debug.stateOverride,undefined);
 }finally{await rm(dir,{recursive:true,force:true});}
});

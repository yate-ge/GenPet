import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { retireLegacyDemo } from '../src/native-migration.js';

test('upgrade retires only the known legacy demo, preserves the companion and is repeatable',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-migrate-'));
 try {
  const pets=path.join(root,'codex','pets');
  for(const id of ['genpet-companion','genpet-demo','other-pet']) {
   await mkdir(path.join(pets,id),{recursive:true});
   await writeFile(path.join(pets,id,'pet.json'),JSON.stringify({id,displayName:id==='genpet-demo'?'GenPet Demo':id}));
  }
  const companion=await readFile(path.join(pets,'genpet-companion','pet.json'),'utf8');
  const demo=await readFile(path.join(pets,'genpet-demo','pet.json'),'utf8');
  const migrated=await retireLegacyDemo(path.join(root,'codex'),path.join(root,'backups'));
  assert.ok(migrated);assert.equal(await readFile(path.join(migrated.backup,'pet.json'),'utf8'),demo);
  assert.deepEqual((await readdir(pets)).sort(),['genpet-companion','other-pet']);
  assert.equal(await readFile(path.join(pets,'genpet-companion','pet.json'),'utf8'),companion);
  assert.equal(await retireLegacyDemo(path.join(root,'codex'),path.join(root,'backups')),null);
  await mkdir(path.join(pets,'genpet-demo'));
  await writeFile(path.join(pets,'genpet-demo','pet.json'),JSON.stringify({id:'unrelated',displayName:'Someone else'}));
  assert.equal(await retireLegacyDemo(path.join(root,'codex'),path.join(root,'backups')),null);
  assert.ok((await readdir(pets)).includes('genpet-demo'));
 }finally{await rm(root,{recursive:true,force:true});}
});

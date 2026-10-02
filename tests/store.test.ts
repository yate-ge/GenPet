import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { beginStory } from '../src/story.js';
test('two hosts and demo have separate identities and read-only status creates no files',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'genpet-hosts-'));const desktop=new Store(root),dots=new Store(root,false,'dots'),demo=new Store(root,true);
 try{
  assert.equal((await desktop.peek()).pet,null);await assert.rejects(access(desktop.file));
  const pets=await Promise.all([beginStory(desktop,'init'),beginStory(dots,'init'),beginStory(demo,'init')]);
  assert.equal(new Set(pets.map(p=>p.pet!.id)).size,3);assert.notEqual(desktop.file,dots.file);assert.notEqual(desktop.file,demo.file);
  const before=await readFile(desktop.file,'utf8');await dots.transaction(s=>{s.pet!.name='Dots only';});assert.equal(await readFile(desktop.file,'utf8'),before);
  await assert.rejects(desktop.transaction(s=>{s.pet!.name='Invalid mutation';throw new Error('Stop');}),/Stop/);assert.equal(await readFile(desktop.file,'utf8'),before);
  await writeFile(desktop.file,'broken');await assert.rejects(desktop.peek());assert.equal(await readFile(desktop.file,'utf8'),'broken');
 }finally{await rm(root,{recursive:true,force:true});}
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateUnitResult } from '../../../src/generation.ts';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = async (name: string) => JSON.parse(await readFile(path.join(root,name),'utf8'));
const seed = await read('seed.snapshot.json');
const final = await read('final.snapshot.json');
const timeline = (await read('timeline.json')).episodes;
const manifest = await read('manifest.json');
assert.equal(final.pet.id,seed.pet.id);
assert.equal(final.pet.genes,seed.pet.genes);
assert.equal(final.pet.personality,seed.pet.personality);
assert.deepEqual(final.pet.naming,seed.pet.naming);
assert.deepEqual(final.stories.slice(0,seed.stories.length),seed.stories);
assert.equal(final.stories.length,seed.stories.length+5);
assert.equal(new Set(final.stories.map((s: any)=>s.id)).size,final.stories.length);
assert.equal(final.pending,null);
let contracts=0;
for(let n=1;n<=5;n++) {
 const prefix='episodes/'+String(n).padStart(2,'0')+'/';
 for(const unit of ['context','story','evolution','home','carrier','appearance','output']) {
  const suffix=['carrier','appearance','output'].includes(unit)?unit+'/result.json':unit+'.result.json';
  validateUnitResult(unit,await read(prefix+suffix));contracts++;
 }
 const story=final.stories[seed.stories.length+n-1];
 const done=await read(prefix+'actual-completed.json');
 const runtime=await read(prefix+'runtime-review.json');
 assert.equal(story.id,done.id);assert.equal(story.petId,seed.pet.id);
 assert.equal(story.at,Date.parse(timeline[n-1].at));
 assert.equal(story.text,(await read(prefix+'story.result.json')).result.text);
 assert.equal(story.state,(await read(prefix+'evolution.result.json')).result.state);
 assert.equal(runtime.stories,seed.stories.length+n);
 assert.equal(runtime.duplicateTriggerCreatesStory,false);assert.equal(runtime.slotDueAfter,false);
 assert.ok(story.steps.some((s:any)=>s.unit==='output'));
 const out=(await read(prefix+'output/result.json')).result;
 const available=(await read(prefix+'output/input.json')).inputs.availableMedia.map((a:any)=>a.file.replaceAll('\\','/'));
 assert.ok(out.mediaRefs.every((m:any)=>available.includes((typeof m==='string'?m:m.file).replaceAll('\\','/'))));
}
assert.deepEqual(final.pet.special,seed.pet.special);
assert.equal(final.pet.state.appearanceId,'art-688ff9d8a4b753b8906f1e8f');
assert.equal(final.art.length,seed.art.length+manifest.acceptedImages.length);
for (const n of [3,5]) {
 const p='episodes/'+String(n).padStart(2,'0')+'/';
 const prev=await read('episodes/'+String(n-1).padStart(2,'0')+'/accepted-art.json');
 const home=(await read(p+'home.result.json')).result;
 if(home.visual) assert.ok(home.visual.references.some((f:string)=>prev.some((a:any)=>f.replaceAll('\\','/')===a.file.replaceAll('\\','/'))),'latest stored home reference '+n);
}
for (const image of manifest.acceptedImages) {
 const art=final.art.find((a:any)=>a.id===image.id);
 assert.ok(art);assert.equal(art.petId,seed.pet.id);
 const hash=createHash('sha256').update(await readFile(path.join(root,image.archiveImage))).digest('hex');
 assert.equal(hash,image.sha256);
 assert.ok(image.width/image.height<=3&&image.height/image.width<=3);
}
let imageReviewContracts=0;
for(const item of manifest.imageReviews){validateUnitResult('image-review',await read(item));imageReviewContracts++;}
for(const item of manifest.files) {
 const hash=createHash('sha256').update(await readFile(path.join(root,item.file))).digest('hex');
 assert.equal(hash,item.sha256,item.file);
}
console.log(JSON.stringify({ok:true,contracts,imageReviewContracts,stories:5,totalStories:final.stories.length,art:final.art.length,identity:true,oldHistoryUnchanged:true,specialTimerRetained:true,ordinaryReused:true,archivedFiles:manifest.files.length,scope:'Stored evidence and contracts; visual semantics require the recorded independent reviews'},null,2));

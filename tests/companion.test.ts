import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createPet } from '../src/core.js';
import { Store } from '../src/store.js';
import { beginStory, planStory, finishStory, resetPet } from '../src/story.js';
import { unitRequest, validateUnitResult } from '../src/generation.js';
import { artRequest, acceptArt } from '../src/art.js';
import { namingDue, markNameAsked, namePet, deferName } from '../src/naming.js';
import { initialPlan, initialization, image, personality } from './fixtures.js';

async function isolated(run: (store: Store, root: string) => Promise<void>) {
 const root=await mkdtemp(path.join(tmpdir(),'genpet-companion-'));
 try { await run(new Store(root,true,'dots'),root); }
 finally { await rm(root,{recursive:true,force:true}); }
}
async function completeAppearance(store:Store,root:string,op:string) {
 const file=path.join(root,'avatar.png');await image(file);
 await acceptArt(store,{requestId:artRequest(await store.peek())!.id,file,kind:'avatar',provenance:'Synthetic engineering fixture, not generated visual evidence'});
 return finishStory(store,op);
}

test('new personalities use an open text unit and commit only with successful adoption',async()=>isolated(async(store,root)=>{
 const request=unitRequest('personality',{inputs:{context:{facts:[]},encounter:{text:'Saved encounter'},genes:{genes:'Saved individual'}}});
 assert.equal(request.unit,'personality');
 assert.deepEqual(validateUnitResult('personality',{inputRefs:[],result:{personality}}).result,{personality});
 assert.throws(()=>validateUnitResult('personality',{inputRefs:[],result:{personality:' '}}),/personality/);
 const op=(await beginStory(store,'personality:init')).pending!.id;
 const {personality:unused,...withoutPersonality}=initialPlan;
 await assert.rejects(()=>planStory(store,op,withoutPersonality),/requires an individual personality/);
 await planStory(store,op,initialPlan);
 await assert.rejects(()=>planStory(store,op,{...initialPlan,personality:'A rerolled character'}),/saved/);
 await assert.rejects(()=>finishStory(store,op),/unfinished/);
 assert.equal((await store.peek()).pet!.personality,undefined);
 await completeAppearance(store,root,op);assert.equal((await store.peek()).pet!.personality,personality);
 const next=(await beginStory(store,'personality:later')).pending!.id;
 await assert.rejects(()=>planStory(store,next,{text:'Another episode',basis:'Fixture',state:'Quiet',personality:'A different character'}),/retains its personality/);
 await planStory(store,next,{text:'It followed its own little path and returned to listening.',basis:'An independent fictional episode',state:initialPlan.state});
 await finishStory(store,next);assert.equal((await store.peek()).pet!.personality,personality);
}));

test('old records retain their name on read and backfill personality through one completed story',async()=>isolated(async store=>{
 await store.transaction(state=>{state.pet=createPet('Existing name');delete state.pet.naming;state.pet.genes='Saved old genome';state.pet.stage='hatchling';state.pet.state.description='Listening';});
 const before=await readFile(store.file,'utf8'),pet=(await store.peek()).pet!;
 assert.equal(namingDue(await store.peek()),false);assert.equal(await readFile(store.file,'utf8'),before);
 const op=(await beginStory(store,'legacy:personality')).pending!.id;
 await planStory(store,op,{text:'The same companion listened again.',basis:'Original encounter details are unknown',state:'Listening',personality});
 assert.equal((await store.peek()).pet!.personality,undefined);await finishStory(store,op);
 const after=(await store.peek()).pet!;assert.equal(after.id,pet.id);assert.equal(after.name,pet.name);assert.equal(after.genes,pet.genes);assert.equal(after.personality,personality);assert.equal(after.naming,undefined);
}));

test('a legacy saved pending plan can be retried and finished without rewriting its missing personality',async()=>isolated(async(store,root)=>{
 const op=await initialization(store);
 await store.transaction(state=>{delete state.pending!.plan!.personality;delete state.pet!.naming;});
 const saved=(await store.peek()).pending!.plan!;
 await planStory(store,op,saved);await completeAppearance(store,root,op);
 assert.equal((await store.peek()).pet!.personality,undefined);
}));

test('the completed hatch invites naming once and an unanswered invitation does not block stories',async()=>isolated(async(store,root)=>{
 assert.equal(namingDue(await store.peek()),false);
 const init=await initialization(store);await completeAppearance(store,root,init);
 const petId=(await store.peek()).pet!.id;assert.equal((await markNameAsked(store,petId)).asked,false);
 const op=(await beginStory(store,'naming:hatch')).pending!.id;
 await planStory(store,op,{text:'You welcomed the little companion as it hatched.',basis:'Explicit test-only hatch request',state:'Listening',stage:'hatchling',appearance:{description:'Synthetic hatchling fixture'}});
 assert.equal(namingDue(await store.peek()),false);await assert.rejects(()=>finishStory(store,op),/unfinished/);
 await completeAppearance(store,root,op);assert.equal(namingDue(await store.peek()),true);
 const interrupted=(await beginStory(store,'naming:before-invitation')).pending!.id;
 assert.equal(namingDue(await store.peek()),false);
 await planStory(store,interrupted,{text:'A resumed little episode',basis:'Synthetic interrupted-story fixture',state:'Listening'});await finishStory(store,interrupted);
 assert.equal(namingDue(await store.peek()),true);
 assert.equal((await markNameAsked(store,petId)).asked,true);assert.equal((await markNameAsked(store,petId)).asked,false);
 const next=(await beginStory(store,'naming:no-answer')).pending!.id;
 await planStory(store,next,{text:'The companion went on with its own life.',basis:'No new user event',state:'Listening'});await finishStory(store,next);
 assert.equal(namingDue(await store.peek()),false);assert.equal((await store.peek()).pet!.naming!.status,'asked');
 await deferName(store,petId);assert.equal((await store.peek()).pet!.naming!.status,'deferred');assert.equal(namingDue(await store.peek()),false);
}));

test('a user name is idempotent and preserves the individual; a stale reply cannot name a reset pet',async()=>isolated(async(store,root)=>{
 const init=await initialization(store);await completeAppearance(store,root,init);
 const before=await store.peek(),id=before.pet!.id;
 await namePet(store,id,'  薄荷 ☘️  ');const after=await store.peek();
 assert.equal(after.pet!.name,'薄荷 ☘️');assert.equal(after.pet!.id,id);assert.equal(after.pet!.genes,before.pet!.genes);assert.equal(after.pet!.personality,before.pet!.personality);assert.deepEqual(after.pet!.state,before.pet!.state);assert.deepEqual(after.art,before.art);assert.deepEqual(after.stories,before.stories);
 const saved=await readFile(store.file,'utf8');await namePet(new Store(store.base,true,'dots'),id,'薄荷 ☘️');assert.equal(await readFile(store.file,'utf8'),saved);
 await assert.rejects(()=>namePet(store,id,'two\nlines'),/one line/);assert.equal(await readFile(store.file,'utf8'),saved);
 const reset=await resetPet(store,'new-individual');assert.equal(reset.pet!.naming!.status,'unasked');assert.equal(reset.pet!.personality,undefined);assert.equal(reset.pet!.name,'GenPet');
 const resetFile=await readFile(store.file,'utf8');await assert.rejects(()=>namePet(store,id,'late answer'),/another or missing pet/);assert.equal(await readFile(store.file,'utf8'),resetFile);
 await assert.rejects(()=>namePet(store,reset.pet!.id,'before-finish'),/unfinished story/);
}));

test('CLI naming and status persist an explicit name in isolated data without invoking a host',async()=>isolated(async(_store,root)=>{
 const data=path.join(root,'cli-data'),store=new Store(data,true,'desktop');
 await store.transaction(state=>{state.pet=createPet();state.pet.genes='Synthetic genome';state.pet.stage='hatchling';state.pet.personality=personality;});
 const id=(await store.peek()).pet!.id;
 const env={...process.env,GENPET_DATA_DIR:data,CODEX_HOME:path.join(root,'no-host-home'),CODEX_APP_TOOLS_PIPE_PATH:'',CODEX_THREAD_ID:''};
 const call=(...args:string[])=>JSON.parse(execFileSync(process.execPath,['--import','tsx',path.resolve('src/cli.ts'),'--demo',...args],{env,encoding:'utf8'}));
 assert.equal(call('status').namingDue,true);assert.equal(call('name-asked',id).asked,true);assert.equal(call('status').namingDue,false);
 assert.equal(call('name-pet',id,'小薄荷').name,'小薄荷');assert.equal(call('status').pet.name,'小薄荷');
}));

/** End-to-end controlled input audit. Synthetic tasks, never real user records. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { scanCodexContext, deriveInitialProfile, type ContextKind } from '../src/context.js';
import { createPet, addContextBatch, evolvePet, DEFAULT_PROFILE, HOUR } from '../src/core.js';

const root=path.resolve('output/verification/personalization');
const adoptedAt=Date.parse('2026-09-01T00:00:00Z');
const cases:Array<{kind:ContextKind;text:string;palette:string;prop:string}>=[
 {kind:'build',text:'请修复编译错误并部署代码。',palette:'sage',prop:'tool'},
 {kind:'research',text:'请梳理这些论文的实验方法和研究局限。',palette:'sky',prop:'book'},
 {kind:'create',text:'请创作一幅海报插画。',palette:'peach',prop:'brush'},
 {kind:'learn',text:'请用教程讲解这个概念，给我练习。',palette:'lilac',prop:'star'},
 {kind:'rest',text:'我要暂停工作，休息放松一下。',palette:'sage',prop:'pillow'},
];
const results=[];
for(const c of cases){
 const home=path.join(root,'fixtures',c.kind);
 await mkdir(path.join(home,'sessions'),{recursive:true});
 const records=[-1,1,3].map(hour=>({timestamp:new Date(adoptedAt+hour*HOUR).toISOString(),type:'event_msg',payload:{type:'user_message',message:c.text}}));
 await writeFile(path.join(home,'sessions','synthetic.jsonl'),records.map(r=>JSON.stringify(r)).join('\n'));
 const pre=await scanCodexContext({codexHome:home,nowMs:adoptedAt});
 const incubation=await scanCodexContext({codexHome:home,nowMs:adoptedAt+5*HOUR});
 const inferred=deriveInitialProfile(pre);
 assert.equal(inferred.palette,c.palette);assert.equal(incubation.entries[0]?.kind,c.kind);
 for(let i=1;i<=5;i++){
  const seed=`verification-person-${String(i).padStart(2,'0')}`;
  const egg=createPet({...DEFAULT_PROFILE,...inferred},adoptedAt,seed);
  assert.equal(egg.hatchIdentity,null);
  const hatch=addContextBatch(egg,incubation.entries,adoptedAt+5*HOUR);
  assert.equal(hatch.state.prop,c.prop);
  const grown=evolvePet(hatch,adoptedAt+(5+24*7)*HOUR);
  assert.deepEqual(grown.hatchIdentity,hatch.hatchIdentity);
  results.push({seed,syntheticInput:c.text,label:c.kind,profile:egg.profile,shell:egg.dna,birth:hatch.hatchIdentity,prop:hatch.state.prop,growthDay7:{size:grown.growth.size,stage:grown.stage}});
 }
}
// Same seed across categories isolates context; same category across seeds isolates individuality.
const categories=cases.map(c=>({kind:c.kind,distinctBodies:new Set(results.filter(r=>r.label===c.kind).map(r=>r.birth!.bodyShape)).size,distinctShells:new Set(results.filter(r=>r.label===c.kind).map(r=>JSON.stringify(r.shell))).size}));
const counterfactual=results.filter(r=>r.seed==='verification-person-01').map(r=>({label:r.label,body:r.birth!.bodyShape,appendage:r.birth!.appendage,roundness:r.birth!.roundness,prop:r.prop}));
for(const category of categories){
 assert.equal(category.distinctShells,5,`${category.kind}: seeds must produce distinct shell DNA`);
 assert.ok(category.distinctBodies>1,`${category.kind}: a task class must not force one body type`);
}
assert.equal(new Set(counterfactual.map(c=>c.body)).size,1,'Task changes must not replace seed-based body identity');
assert.equal(new Set(counterfactual.map(c=>c.prop)).size,5,'Task classes should yield their distinct configured props');
const report={method:'Synthetic JSONL -> real context scanner -> profile -> seed-controlled egg -> incubation -> birth -> growth. No real participants; does not prove visual differences.',cells:results.length,categories,counterfactual,results};
await mkdir(root,{recursive:true});await writeFile(path.join(root,'mapping.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cells:report.cells,categories,counterfactual,report:'output/verification/personalization/mapping.json'},null,2));

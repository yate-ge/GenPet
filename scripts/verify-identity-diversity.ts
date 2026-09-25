/** Synthetic same-activity cohort: audits collisions in the design specification, not perception. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { addContextBatch, createPet, evolvePet, DEFAULT_PROFILE, HOUR } from '../src/core.js';

const at=Date.parse('2026-09-01T00:00:00Z');
const count=1000;
const rows=[];
for(let i=0;i<count;i++) {
  const seed=`identity-audit-${String(i).padStart(4,'0')}`;
  const egg=createPet({...DEFAULT_PROFILE,palette:'sky',interest:'research'},at,seed);
  assert.equal(egg.hatchIdentity,null);
  const born=addContextBatch(egg,[{kind:'research',source:'codex-local',occurredAt:at+HOUR,
    summary:'Synthetic research activity'}],at+5*HOUR);
  const grown=evolvePet(born,at+(5+24*21)*HOUR);
  assert.deepEqual(grown.hatchIdentity,born.hatchIdentity);
  assert.ok(born.hatchIdentity);
  rows.push({seed,shell:{hue:egg.dna.hue,pattern:egg.dna.pattern,patternSeed:egg.dna.patternSeed},
    body:born.hatchIdentity.bodyShape,appendage:born.hatchIdentity.appendage,
    markZone:egg.dna.patternSeed%4,identitySeed:born.hatchIdentity.identitySeed});
}
function collisions(key:(row:typeof rows[number])=>string) {
  const groups=new Map<string,number>();
  for(const row of rows){const k=key(row);groups.set(k,(groups.get(k)||0)+1);}
  const pairs=[...groups.values()].reduce((n,size)=>n+size*(size-1)/2,0);
  return {distinctKeys:groups.size,matchingPairs:pairs,totalPairs:count*(count-1)/2,
    matchingPairFraction:Number((pairs/(count*(count-1)/2)).toFixed(6))};
}
const result={method:'1000 synthetic users with identical research profile/activity; seed varies. Design-code fingerprint only; generator adherence and human identifiability are separate.',
  individuals:count,
  silhouette:collisions(row=>`${row.body}|${row.appendage}`),
  stableVisualTraits:collisions(row=>`${row.body}|${row.appendage}|${row.shell.pattern}|${row.markZone}`),
  includingHue:collisions(row=>`${row.body}|${row.appendage}|${row.shell.pattern}|${row.markZone}|${row.shell.hue}`),
  shellHash:collisions(row=>String(row.shell.patternSeed)),
  examples:rows.slice(0,8)};
const output=path.resolve('output/verification/personalization/identity-diversity.json');
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,examples:undefined,report:output},null,2));

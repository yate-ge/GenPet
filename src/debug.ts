import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { evolvePet, HOUR } from './core.js';
import { Store, type State } from './store.js';
import { artRequest } from './art.js';

export type GrowthTarget = 'next'|'hatch'|'juvenile'|'adult';
export type DebugState = 'build'|'research'|'create'|'learn'|'rest'|'none'|'auto';

function operation(s:State,id:string,key:string) {
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('operationId must contain 1–100 letters, digits, underscores or hyphens. Reuse it only when retrying the same operation.');
  const previous=s.debug?.operations.find(o=>o.id===id);
  if(previous&&previous.key!==key)throw new Error('operationId already belongs to a different operation.');
  return previous;
}
function record(s:State,id:string,key:string,backup?:string) {
  s.debug??={growthOffsetMs:0,operations:[]};
  s.debug.operations=[...s.debug.operations,{id,key,at:Date.now(),...(backup?{backup}:{})}].slice(-50);
}
function result(s:State,action:string,alreadyApplied=false,backup?:string) {
  return {action,alreadyApplied,backup,state:s,artRequest:artRequest(s),
    nativePetId:'genpet-companion',displayStatus:'unconfirmed',
    notice:'Design state only. Generate/validate any pending artwork, then call genpet_install_native even when the requested atlas is already ready. Only its confirmed result proves visible completion.'};
}
async function backup(store:Store,s:State,action:string) {
  const dir=path.join(store.root,'backups');await mkdir(dir,{recursive:true,mode:0o700});
  const file=path.join(dir,`${action}-${Date.now()}-${randomUUID()}.json`);
  await writeFile(file,JSON.stringify(s,null,2),{mode:0o600,flag:'wx'});return file;
}

/** Explicit user reset only; atomic state commit, recoverable prior life, stable native entry. */
export async function debugReset(store:Store,operationId:string) {
  return store.transaction(async s=>{
    const prior=operation(s,operationId,'reset');if(prior)return result(s,'reset',true,prior.backup);
    const saved=await backup(store,s,'reset');
    const settings={...s.settings,freezeOutfit:false};delete settings.lockedOutfit;
    const history=s.debug?.operations||[];
    for(const key of Object.keys(s))delete (s as unknown as Record<string,unknown>)[key];
    Object.assign(s,{version:1,pet:null,clockOffset:0,settings,importedIds:[],lastScanAt:0,
      scanInfo:{messages:0,files:0,warnings:[]},art:[],debug:{growthOffsetMs:0,operations:history}});
    await store.adopt(s); // New seed, newly inferred preferences, real adoption timestamp.
    record(s,operationId,'reset',saved);
    return result(s,'reset',false,saved);
  });
}

/** Accelerate the same individual's logical age, preserving the real adoption date. */
export async function debugGrow(store:Store,operationId:string,target:GrowthTarget='next',days?:number) {
  if(!['next','hatch','juvenile','adult'].includes(target))throw new Error('Unknown growth target.');
  if(days!==undefined&&(!Number.isInteger(days)||days<1||days>90))throw new Error('days must be an integer between 1 and 90.');
  if(days!==undefined&&target!=='next')throw new Error('Choose either days or a stage target.');
  return store.transaction(async s=>{
    const key=`grow:${target}:${days??''}`;
    const prior=operation(s,operationId,key);if(prior)return result(s,'grow',true,prior.backup);
    if(!s.pet)throw new Error('Adopt an egg first.');
    await store.sync(s,true);s.pet=evolvePet(s.pet,store.now(s));
    const p=s.pet,now=store.now(s),hatch=p.adoptedAt+p.policy.hatchHours*HOUR;
    if(p.stage==='egg'&&(!s.eggReference||artRequest(s)?.status!=='ready'))throw new Error('Generate and approve this egg portrait and atlas before hatching.');
    if(p.stage==='egg'&&(days!==undefined||!['next','hatch'].includes(target)))throw new Error('Hatch and approve the birth identity first; later growth must reference that individual.');
    if(p.stage!=='egg'&&!s.identityReference)throw new Error('Generate and approve the first hatchling portrait before further growth.');
    let destination:number;
    if(target==='hatch'||p.stage==='egg')destination=hatch;
    else if(target==='juvenile'||target==='adult')destination=hatch+p.policy[target==='juvenile'?'juvenileDays':'adultDays']*p.policy.growthHours*HOUR;
    else destination=hatch+(p.growth.days+(days??1))*p.policy.growthHours*HOUR;
    if(destination<=now)throw new Error('This growth target is already reached. Choose a later target; debug growth never reverses age.');
    const saved=await backup(store,s,'grow');
    s.debug??={growthOffsetMs:0,operations:[]};
    s.debug.growthOffsetMs+=destination-now;
    s.pet=evolvePet(p,store.now(s));
    record(s,operationId,key,saved);
    return result(s,'grow',false,saved);
  });
}

/** Appearance override only: never insert fake activity or reroll the birth identity. */
export async function debugState(store:Store,operationId:string,kind:DebugState) {
  if(!['build','research','create','learn','rest','none','auto'].includes(kind))throw new Error('Unknown debug state.');
  return store.transaction(async s=>{
    const key=`state:${kind}`,prior=operation(s,operationId,key);
    if(prior)return result(s,'state',true);
    if(!s.pet)throw new Error('Adopt an egg first.');
    await store.sync(s);s.pet=evolvePet(s.pet,store.now(s));
    if(s.pet.stage==='egg'&&kind!=='auto')throw new Error('Eggs have no props. Hatch first; do not reveal a creature during incubation.');
    s.debug??={growthOffsetMs:0,operations:[]};
    if(kind==='auto')delete s.debug.stateOverride;
    else s.debug.stateOverride={kind,at:Date.now()};
    record(s,operationId,key);
    return result(s,'state');
  });
}

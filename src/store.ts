import { mkdir, readFile, rename, writeFile, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createPet, evolvePet, addContextBatch, migratePet, HOUR, DEFAULT_PROFILE, type Pet, type Prop, type Scene } from './core.js';
import { scanCodexContext, deriveInitialProfile, summarizeInitialActivity } from './context.js';
import { adoptionConfig } from './config.js';

export interface ArtRecord { id: string; stage: string; growthDay: number; windowIndex: number; file: string; kind: 'portrait'|'atlas'; createdAt: number; provenance: string; }
export interface State {
  version: 1; pet: Pet|null; clockOffset: number;
  settings: { autoContext: boolean; freezeOutfit: boolean; autoArt: boolean; lockedOutfit?:{prop:Prop;scene:Scene} };
  importedIds: string[]; lastScanAt: number; scanInfo: {messages: number; files: number; warnings: string[]};
  art: ArtRecord[];
  eggReference?:string;
  identityReference?:string;
  nativeExport?:{artId:string;artCreatedAt:number;at:number;destination:string;refreshRequired:boolean};
  debug?: {
    growthOffsetMs: number;
    stateOverride?: { kind: 'build'|'research'|'create'|'learn'|'rest'|'none'; at: number };
    operations: Array<{id:string;key:string;at:number;backup?:string}>;
  };
}
export const dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), '.genpet');
const fresh = (): State => ({version:1,pet:null,clockOffset:0,settings:{autoContext:true,freezeOutfit:false,autoArt:true},importedIds:[],lastScanAt:0,scanInfo:{messages:0,files:0,warnings:[]},art:[]});
export function configureState(s:State,input:Record<string,unknown>) {
  if(input.freezeOutfit===true&&!s.settings.freezeOutfit)s.settings.lockedOutfit={prop:s.pet?.state.prop||'none',scene:s.pet?.state.scene||'nest'};
  if(input.freezeOutfit===false)delete s.settings.lockedOutfit;
  for(const key of ['autoContext','freezeOutfit','autoArt'] as const)if(typeof input[key]==='boolean')s.settings[key]=input[key] as boolean;
  return s.settings;
}
export class Store {
  readonly file: string;
  constructor(readonly root=dataRoot(),readonly demo=false) { this.file=path.join(root,demo?'demo.json':'state.json'); }
  now(state: State) { return Date.now()+(this.demo?state.clockOffset:0)+(state.debug?.growthOffsetMs||0); }
  async transaction<T>(fn: (s: State)=>T|Promise<T>):Promise<T> {
    await mkdir(this.root,{recursive:true,mode:0o700});
    const lock=this.file+'.lock'; let acquired=false;
    for(let i=0;i<100;i++) {
      try { await mkdir(lock); acquired=true; break; }
      catch(e) {
        if((e as NodeJS.ErrnoException).code!=='EEXIST') throw e;
        const age=await stat(lock).then(s=>Date.now()-s.mtimeMs).catch(()=>0);
        if(age>120_000) await rm(lock,{recursive:true,force:true});
        else await new Promise(r=>setTimeout(r,50));
      }
    }
    if(!acquired) throw new Error('GenPet is busy; retry shortly.');
    try {
      let state: State;
      try { state=JSON.parse(await readFile(this.file,'utf8')); }
      catch(e) { if((e as NodeJS.ErrnoException).code!=='ENOENT') throw new Error('State file cannot be read. It has been preserved; restore a backup instead of resetting it.'); state=fresh(); }
      if(state.version!==1) throw new Error('Unsupported state version');
      if(state.pet) {
        state.pet=migratePet(state.pet);
        if(state.pet.stage==='egg'&&state.identityReference) {
          state.eggReference ||= state.identityReference;
          delete state.identityReference;
        }
      }
      const result=await fn(state);
      const tmp=this.file+'.'+randomUUID()+'.tmp';
      await writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600}); await rename(tmp,this.file);
      return result;
    } finally { await rm(lock,{recursive:true,force:true}); }
  }
  async sync(s: State, force=false) {
    const now=this.now(s);
    const birthDue=s.pet&&!s.pet.hatchIdentity&&now>=s.pet.adoptedAt+s.pet.policy.hatchHours*HOUR;
    if(this.demo || !s.settings.autoContext || (!force && !birthDue && Date.now()-s.lastScanAt<60_000)) return;
    // First post-incubation scan includes the entire incubation interval, not
    // merely its overlap with a rolling five-hour window. Scanner/retention
    // limits remain explicit; no observations is a valid healthy birth.
    const hours=birthDue?Math.min(168,Math.max(5,(now-s.pet!.adoptedAt)/HOUR)):5;
    // Debug growth advances life-cycle time, never the local-chat search clock.
    const scan=await scanCodexContext({nowMs:Date.now(),hours});
    s.scanInfo={...scan.stats,warnings:scan.warnings}; s.lastScanAt=Date.now();
    if(s.pet) {
      const batch=[];
      for(const entry of scan.entries) {
        if(s.importedIds.includes(entry.externalId)) continue;
        // Pre-adoption context informs the birth profile only; later windows have actual timestamps.
        const logicalAt=entry.occurredAt+(s.debug?.growthOffsetMs||0);
        if(entry.occurredAt>=s.pet.adoptedAt&&logicalAt>=now-s.pet.policy.contextRetentionDays*24*HOUR) batch.push({...entry,occurredAt:logicalAt});
        s.importedIds.push(entry.externalId);
      }
      // Never resolve birth on the first item of a multi-entry scan.
      s.pet=addContextBatch(s.pet,batch,now);
      s.importedIds=s.importedIds.slice(-3000);
    }
  }
  async adopt(s: State, profile: Record<string,unknown>={}) {
    if(s.pet) throw new Error('You already have a pet. Adoption never overwrites an existing companion.');
    let inferred={};
    let activity: ReturnType<typeof summarizeInitialActivity> | null = null;
    if(!this.demo&&s.settings.autoContext) {
      const scan=await scanCodexContext({nowMs:Date.now(),hours:5}); inferred=deriveInitialProfile(scan);
      activity=summarizeInitialActivity(scan);
      s.scanInfo={...scan.stats,warnings:scan.warnings};
    }
    const config=await adoptionConfig();
    s.pet=createPet({...DEFAULT_PROFILE,...config.defaultProfile,...inferred,...profile},this.now(s),this.demo?'genpet-demo-egg':undefined,config.timing);
    s.pet.adoptionTrace={algorithmVersion:'adoption-map-v1',
      mode:activity?(activity.selected?'automatic':'no-dominant-activity'):'disabled',
      selectedActivity:activity?.selected??null,
      activityCounts:activity?.counts??{build:0,research:0,create:0,learn:0,rest:0},
      explicitFields:(['name','palette','interest','temperament'] as const).filter(field=>Object.hasOwn(profile,field)),
      capturedAt:s.pet.adoptedAt};
    await this.sync(s,true); return s.pet;
  }
  async current() { return this.transaction(async s=>{ await this.sync(s); if(s.pet) s.pet=evolvePet(s.pet,this.now(s)); return s; }); }
}

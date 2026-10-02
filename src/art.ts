import { mkdir, readFile, copyFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { readImageInfo, decodeRgba } from './image.js';
import type { State, Store, ArtKind } from './store.js';
import { desiredAppearance, requestId, validateHostResult } from './story.js';
import { refreshNativePet, isLiveNativeDestination } from './native-refresh.js';
import { readNativePetLive } from './native-pet-live.js';
import { homedir } from 'node:os';
import { readPrompt } from './prompts.js';

export const actions = [
  {name:'idle',row:0,count:6,durations:[280,110,110,140,140,320]},
  {name:'running-right',row:1,count:8,durations:[120,120,120,120,120,120,120,220]},
  {name:'running-left',row:2,count:8,durations:[120,120,120,120,120,120,120,220]},
  {name:'waving',row:3,count:4,durations:[140,140,140,280]},
  {name:'jumping',row:4,count:5,durations:[140,140,140,140,280]},
  {name:'failed',row:5,count:8,durations:[140,140,140,140,140,140,140,240]},
  {name:'waiting',row:6,count:6,durations:[150,150,150,150,150,260]},
  {name:'running',row:7,count:6,durations:[120,120,120,120,120,220]},
  {name:'review',row:8,count:6,durations:[150,150,150,150,150,280]},
];
export function artRequest(state: State) {
  if (!state.pet || !state.pending?.plan) return null;
  const plan = state.pending.plan, existing = desiredAppearance(state), id = requestId(state)!;
  const references = state.art.filter(art => art.petId === state.pet!.id &&
    (art.kind === 'portrait' || state.host === 'dots' && art.kind === 'avatar'));
  return { id, operationId: state.pending.id, petId: state.pet.id, host: state.host,
    status: !plan.appearance ? 'unchanged' : existing ? 'ready' : 'pending',
    stage: plan.stage, name: state.pet.name, naming: state.pet.naming, personality: state.pet.personality ?? plan.personality,
    genes: state.pet.genes ?? plan.genes, story: plan.text, appearance: plan.appearance,
    reusableAppearances: state.art.filter(art => art.petId === state.pet!.id && ['atlas','avatar'].includes(art.kind)),
    referenceFiles: [...new Set([
      references.find(art=>art.stage==='egg')?.file,
      references.find(art=>art.stage!=='egg')?.file,
      references.at(-1)?.file,
    ].filter((file):file is string=>!!file))],
    prompt: readPrompt('meta') + '\n' + readPrompt('appearance'),
    contract: state.host === 'desktop' ? {columns:8,cellWidth:192,cellHeight:208,rows:11,spriteVersionNumber:2} : null,
    target: state.pet.binding ?? null,
  };
}
export async function validateImage(file: string, kind: ArtKind) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error('Artifact must be a regular file below 64 MiB');
  if (kind === 'artifact') return { format: 'artifact', width: 0, height: 0, hasAlpha: false };
  const meta = await readImageInfo(file);
  if (['portrait','atlas'].includes(kind) && !meta.hasAlpha) throw new Error('Pet images must have an alpha channel');
  if (meta.width * meta.height > 16_000_000) throw new Error('Image exceeds size limit');
  if (kind === 'atlas' && (meta.width !== 1536 || meta.height !== 2288)) throw new Error('Atlas must be 1536 × 2288 (v2)');
  const decoded = await decodeRgba(file); // Reject a truncated image before storing it.
  if (kind === 'atlas') {
    const {data,width} = decoded;
    for (let row=0;row<11;row++) for (let col=0;col<8;col++) {
      let visible=0; const used=col<(row<9?actions[row].count:8)||(row===0&&col===6);
      for (let y=row*208;y<(row+1)*208;y++) for (let x=col*192;x<(col+1)*192;x++) if(data[(y*width+x)*4+3]>0) visible++;
      if (used&&visible<30) throw new Error(`Empty animation cell ${row},${col}`);
      if (!used&&visible>0) throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
  }
  return meta;
}
export async function acceptArt(store: Store, input: {requestId:string;file:string;kind:ArtKind;provenance:string;description?:string}) {
  if (!path.isAbsolute(input.file)) throw new Error('Artifact file must be an absolute local path');
  if (!['portrait','atlas','avatar','story','artifact'].includes(input.kind)) throw new Error('Unknown artifact kind');
  if (!input.provenance?.trim()) throw new Error('Record generation and validation provenance');
  await validateImage(input.file,input.kind);
  const bytes = await readFile(input.file);
  return store.transaction(async state => {
    if (requestId(state) !== input.requestId) throw new Error('Stale design request');
    if ((state.host === 'dots' && input.kind === 'atlas') || (state.host === 'desktop' && input.kind === 'avatar')) throw new Error('Artwork uses the other host format');
    const id = `art-${createHash('sha256').update(state.pet!.id+input.requestId+input.kind).update(bytes).digest('hex').slice(0,24)}`;
    const previous = state.art.find(art => art.id === id);
    if (previous) { await stat(previous.file); return previous; }
    const dir = path.join(store.root,'pets',state.pet!.id,'assets'); await mkdir(dir,{recursive:true,mode:0o700});
    const ext = path.extname(input.file).toLowerCase(), file = path.join(dir,id+ext);
    const tmp = file+'.'+randomUUID()+'.tmp';
    try { await writeFile(tmp,bytes,{mode:0o600,flag:'wx'}); await rename(tmp,file); }
    finally { await (await import('node:fs/promises')).rm(tmp,{force:true}); }
    const record = { id, petId:state.pet!.id, requestId:input.requestId, stage:state.pending!.plan!.stage!,
      description:input.description?.trim() || state.pending!.plan!.appearance?.description || state.pending!.plan!.state,
      file, kind:input.kind, createdAt:Date.now(), provenance:input.provenance };
    state.art.push(record); return record;
  });
}
export function desktopDestination(state: State) {
  if (!state.pet) throw new Error('No pet');
  const home = process.env.CODEX_HOME || path.join(homedir(),'.codex');
  const destination = state.pet.binding?.destination ?? path.join(home,'pets',state.pet.id);
  const relative = path.relative(path.resolve(home,'pets'),path.resolve(destination));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep)) throw new Error('Target must be one entry in this Codex home');
  if (state.pet.binding && state.pet.binding.avatarId !== `custom:${path.basename(destination)}`) throw new Error('Avatar binding does not match its destination');
  return destination;
}
export async function exportNative(state: State, destination: string) {
  if (!state.pet || state.host !== 'desktop') throw new Error('Native export requires a desktop pet');
  const art = desiredAppearance(state);
  if (!art || art.kind !== 'atlas') throw new Error('Complete or select a validated atlas first');
  await validateImage(art.file,'atlas');
  let previous: string | undefined;
  try {
    previous = await readFile(path.join(destination,'pet.json'),'utf8');
    const old = JSON.parse(previous);
    const transferred = state.replacesPetId && old.genpetId === state.replacesPetId && state.pet.binding?.destination === destination;
    if (old.genpetId !== state.pet.id && !transferred && !(state.legacy && state.pet.binding?.destination === destination && !old.genpetId)) throw new Error('Target entry belongs to another pet; it was preserved');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await mkdir(destination,{recursive:true});
  const hash = createHash('sha256').update(await readFile(art.file)).digest('hex').slice(0,16);
  const spritesheetPath = `spritesheet-${hash}${path.extname(art.file)}`;
  const tmp = path.join(destination,`.pending-${randomUUID()}`);
  await copyFile(art.file,tmp); await rename(tmp,path.join(destination,spritesheetPath));
  const manifest = { id:path.basename(destination), genpetId:state.pet.id, displayName:state.pet.name,
    description:'GenPet · a companion with its own stories', spriteVersionNumber:2, spritesheetPath };
  if (previous) await writeFile(path.join(destination,'previous-pet.json'),previous);
  const manifestTmp = path.join(destination,`.pet-${randomUUID()}.json`);
  await writeFile(manifestTmp,JSON.stringify(manifest,null,2)); await rename(manifestTmp,path.join(destination,'pet.json'));
  return {destination,manifest,artId:art.id,filesCommitted:true};
}
export async function installNative(store: Store, options: {refresh?:typeof refreshNativePet;selection?:typeof readNativePetLive} = {}) {
  if (store.host !== 'desktop') throw new Error('Dots uses its own Avatar adapter');
  return store.transaction(async state => {
    if (!state.pending?.plan?.appearance) throw new Error('No planned appearance update');
    const operationId=state.pending.id, destination=desktopDestination(state), avatarId=`custom:${path.basename(destination)}`;
    const result=await exportNative(state,destination);
    state.pet!.binding={host:'desktop',avatarId,destination};
    const selection=await (options.selection ?? readNativePetLive)();
    const active=selection.available ? selection.effectiveSelectedPetId===avatarId : null;
    const refresh=await (options.refresh ?? refreshNativePet)({expectedSpritePath:path.join(destination,result.manifest.spritesheetPath)});
    const hostResult=validateHostResult(state,operationId,{petId:state.pet!.id,operationId,appearanceId:result.artId,avatarId,updated:true,active,
      refreshRequested:refresh.refreshRequested===true,displayStatus:refresh.displayStatus,
      ...(!refresh.automaticRefresh && (active===true || active===null&&isLiveNativeDestination(destination)) ? {error:'Active Avatar refresh did not complete'} : {})});
    state.pending.hostResult=hostResult;
    return {...result,...hostResult,refresh};
  });
}

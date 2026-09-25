import { mkdir, readFile, copyFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { State, Store } from './store.js';
import { evolvePet, situations, growthMaturity } from './core.js';
import { refreshNativePet, isLiveNativeDestination, type RefreshOutcome } from './native-refresh.js';

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
export function artRequest(s: State) {
  const p=s.pet; if(!p)return null;
  const isEgg=p.stage==='egg';
  const maturity=growthMaturity(p.growth.days,p.policy.adultDays);
  const proportions={torsoLengthRelativeToBirth:Number((1+0.4*maturity).toFixed(3)),limbLengthRelativeToBirth:Number((1+0.3*maturity).toFixed(3)),headShape:'preserve-canonical' as const};
  const forced=s.debug?.stateOverride;
  const outfit=forced?(forced.kind==='none'?{prop:'none',scene:'nest'}:situations[forced.kind])
    :s.settings.freezeOutfit&&s.settings.lockedOutfit?s.settings.lockedOutfit:p.state;
  const visual={id:p.id,seed:p.seed,stage:p.stage,day:p.growth.days,
    palette:p.profile.palette,dna:p.dna,hatchIdentity:isEgg?null:p.hatchIdentity,
    growth:isEgg?null:{size:p.growth.size,expression:p.growth.temperament,decorationLevel:p.growth.decorationLevel,proportions},
    prop:isEgg?'none':outfit.prop,scene:isEgg?'nest':outfit.scene};
  const id=createHash('sha256').update(JSON.stringify(visual)).digest('hex').slice(0,20);
  const current=s.art.find(a=>a.id===id&&a.kind==='atlas');
  const latestPortrait=[...s.art].reverse().find(a=>a.kind==='portrait'&&a.stage!=='egg')?.file;
  const references=isEgg?[s.eggReference]:s.identityReference?[s.identityReference,latestPortrait]:[s.eggReference];
  // This is chosen from shell-only DNA and described only at first birth. Once
  // a portrait is approved, its realized mark takes precedence over this hint.
  const birthMarkZone=['lower left belly','upper right shoulder','low central belly','lower right belly'][p.dna.patternSeed%4];
  const birthMark=`At first birth, carry exactly one restrained asymmetrical identity mark: echo 1–3 tiny abstract ${p.dna.pattern} fragments on the ${birthMarkZone}. This is a seed-derived permanent marking, not the changing task prop. It must not depict a face, symbol, species or outfit. After the first approved portrait, preserve the realized mark rather than recomputing it.`;
  const bodyInstruction={round:'a compact near-circular torso',pear:'a tapered upper torso visibly fuller at the lower belly',bean:'a soft bean-like asymmetric torso with a gentle side curve'}[p.hatchIdentity?.bodyShape||'round'];
  const appendageInstruction={buds:'one pair of small rounded buds attached to the lower side contours of the HEAD',leaflets:'one pair of short soft leaflets attached to the sides of the HEAD',
    'soft-fins':'one pair of small fleshy lateral fins attached to the sides of the HEAD'}[p.hatchIdentity?.appendage||'buds'];
  const birthGeometry=`The selected seed-derived morphology for THIS newborn is ${bodyInstruction} and ${appendageInstruction}. Render these exact targets visibly at 192x208 size; do not substitute another torso shape or appendage type. The two normal arms are separate from the head appendages.`;
  const common='Use the hatch-pet image-generation pipeline and native Codex Pet visual language: crisp low-resolution pixel art, stepped dark outlines, a limited palette with two or three shade levels. NOT plush, felt, fur, clay, painterly or 3D rendering. Private task text must never appear in the image or prompt. Generate state-specific rows with imagegen, then assemble and validate a transparent 8x11 v2 atlas. Never synthesize missing animation in code.';
  const concept=isEgg
    ? `EGG FIRST: create an ordinary intact egg, not a disguised animal. No future creature has been selected or generated. The egg's silhouette is a simple ovate shell in warm ivory/gray. At most 5–10% of its surface carries extremely faint ${p.profile.palette} tint and sparse abstract ${p.dna.pattern} hints, variant ${p.dna.patternSeed}. No eyes, mouth, face, ears, limbs, leaves, recognizable creature pattern, or heraldic symbol. The hints must not reveal a species. Do not reference any hatchling or reverse-engineer an egg from one. Motion is limited to small shell wobbles, restrained hops and subtle attached shell-light changes; no blinking, exposed creature or detached effects. Look directions use restrained whole-shell leaning, with no invented eyes.`
    : `${s.identityReference?'CONTINUE THE SAME REVEALED INDIVIDUAL. Preserve its approved face, palette, anatomy and identity marks exactly; change proportions and small accessories within the existing character.':`FORWARD HATCHING: this is the first time the creature is designed. The egg reference supplies only a subtle color echo and one abstract pattern echo; do not turn the egg silhouette or markings into a face. Design a distinct organism silhouette and head construction; the shell outline is not a head template. There is no predetermined adult to reverse-engineer. Create an organic fantasy creature within the shared rounded pixel family: a broad horizontal oval head with a blunt top, separate compact torso, tiny square eyes without bright highlights, a tiny mouth, two short arms and two short feet. Do not use a pointed egg-shaped head or shell-like ivory surface. ${birthGeometry} Keep buds under 10% of head width, leaflets under 15%, and fins similarly small. ${birthMark} Use the newly resolved birth identity below.`} Birth identity: ${JSON.stringify(p.hatchIdentity)}. Stage ${p.stage}, growth day ${p.growth.days}, normalized size ${p.growth.size.toFixed(2)} (adult maximum 1.25; keep native cell margins), expression weights ${JSON.stringify(p.growth.temperament)}, keepsake level ${p.growth.decorationLevel}/3. Visible growth must survive the official fit-to-cell normalization. Relative to the first approved hatchling, target torso length multiplier ${proportions.torsoLengthRelativeToBirth} and limb length multiplier ${proportions.limbLengthRelativeToBirth}; keep canonical head outline, facial features, palette and marks. Show maturity through torso-to-head and limb proportions, not merely enlarging the whole sprite. Do not shrink or recolor a prop to fake body growth. These are character design parameters, not a diagnosis of the user. Current prop: ${visual.prop}. Scene cue ${visual.scene} belongs in the habitat, not the transparent sprite. The approved realized character takes precedence over approximate initial targets; record deviations in provenance and never redraw identity to repair an old target.`;
  return {id,status:current?'ready':s.settings.autoArt?'pending':'paused',phase:isEgg?'incubating':'revealed',visual,
    adoptionTrace:p.adoptionTrace??null,
    referenceFiles:[...new Set(references.filter((f):f is string=>!!f))],prompt:common+' '+concept,
    reason:isEgg?'Only an abstract shell identity exists. The creature will be resolved at the five-hour hatch boundary.':forced?`Explicit debug state: ${forced.kind}; not observed user activity. Use genpet_debug_state auto to resume activity-based appearance.`:p.state.reason,
    contract:{columns:8,cellWidth:192,cellHeight:208,rows:11,spriteVersionNumber:2},
    note:'Image synthesis runs in Codex through the GenPet skill. State hatching and completion of new artwork are separate. Preserve the last approved native atlas until its successor passes QA.'};
}
export async function validateImage(file: string, kind:'portrait'|'atlas') {
  const meta=await sharp(file).metadata();
  if(!['png','webp'].includes(meta.format||''))throw new Error('Use a PNG or WebP image');
  if(!meta.hasAlpha)throw new Error('The image must have an alpha channel');
  if(kind==='atlas'&&(meta.width!==1536||![1872,2288].includes(meta.height||0)))throw new Error('Atlas must be 1536 × 1872 (v1) or 1536 × 2288 (v2)');
  if((meta.width||0)*(meta.height||0)>16_000_000)throw new Error('Image exceeds size limit');
  if(kind==='atlas') {
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let row=0;row<(meta.height===2288?11:9);row++)for(let col=0;col<8;col++) {
      let visible=0; const count=row<9?actions[row].count:8;
      // The official v2 assembler reserves r0c6 as a neutral reference cell.
      const used=col<count||(meta.height===2288&&row===0&&col===6);
      for(let y=row*208;y<(row+1)*208;y++)for(let x=col*192;x<(col+1)*192;x++)if(data[(y*info.width+x)*4+3]>0)visible++;
      if(used&&visible<30)throw new Error(`Empty animation cell ${row},${col}`);
      if(!used&&visible>0)throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
  }
  return meta;
}
export async function acceptArt(store: Store, input:{requestId:string;file:string;kind:'portrait'|'atlas';provenance:string}) {
  if(!path.isAbsolute(input.file))throw new Error('Artifact file must be an absolute local path');
  if(input.provenance.length<12)throw new Error('Record generation method and visual QA in provenance');
  await validateImage(input.file,input.kind);
  return store.transaction(async s=>{
    await store.sync(s);
    if(s.pet)s.pet=evolvePet(s.pet,store.now(s));
    const request=artRequest(s); if(!request||request.id!==input.requestId)throw new Error('Stale design request; read the current request before committing an image');
    const dir=path.join(store.root,'art');await mkdir(dir,{recursive:true});
    const ext=path.extname(input.file).toLowerCase();const file=path.join(dir,`${request.id}-${input.kind}-${randomUUID()}${ext}`);await copyFile(input.file,file);
    const record={id:request.id,stage:s.pet!.stage,growthDay:s.pet!.growth.days,windowIndex:s.pet!.state.windowIndex,file,kind:input.kind,createdAt:Date.now(),provenance:input.provenance};
    if(input.kind==='portrait') {
      if(s.pet!.stage==='egg'&&!s.eggReference)s.eggReference=file;
      if(s.pet!.stage!=='egg'&&!s.identityReference)s.identityReference=file;
    }
    s.art=s.art.filter(a=>!(a.id===record.id&&a.kind===record.kind)).concat(record).slice(-79);
    return record;
  });
}
export async function exportNative(s: State, destination: string) {
  if(!s.pet)throw new Error('Adopt a pet first');
  const request=artRequest(s)!;
  const art=[...s.art].reverse().find(a=>a.kind==='atlas'&&a.id===request.id);
  if(!art)throw new Error('No approved atlas for this current design yet. Run the GenPet image-generation skill first.');
  const meta=await validateImage(art.file,'atlas');await mkdir(destination,{recursive:true});
  const ext=path.extname(art.file);const hash=createHash('sha256').update(await readFile(art.file)).digest('hex').slice(0,16);
  const spriteName=`spritesheet-${hash}${ext}`;const sprite=path.join(destination,spriteName);
  const temporary=path.join(destination,`.pending-${randomUUID()}${ext}`);await copyFile(art.file,temporary);await rename(temporary,sprite);
  const manifest={id:path.basename(destination),displayName:s.pet.profile.name,description:'GenPet · a growing image-generated companion',spriteVersionNumber:meta.height===2288?2:1,spritesheetPath:spriteName};
  await copyFile(path.join(destination,'pet.json'),path.join(destination,'previous-pet.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});
  const manifestTemporary=path.join(destination,`.pet-${randomUUID()}.json`);await writeFile(manifestTemporary,JSON.stringify(manifest,null,2));await rename(manifestTemporary,path.join(destination,'pet.json'));
  return {destination,manifest,artId:art.id,artCreatedAt:art.createdAt,filesCommitted:true,
    automaticRefresh:false,displayStatus:'unconfirmed' as const,refreshRequired:true,
    notice:'Files committed to the same GenPet entry. Host display refresh has not run yet; call install-native to trigger automatic refresh, or use the refresh adapter.'};
}
export async function installNative(store:Store, options?:{refresh?:typeof refreshNativePet}) {
  if(store.demo)throw new Error('Demo state cannot install a native Pet. Use isolated file exports for developer tests; the live companion is updated in place.');
  const s=await store.current();
  const result=await exportNative(s,path.join(process.env.CODEX_HOME||path.join((await import('node:os')).homedir(),'.codex'),'pets','genpet-companion'));
  let refresh:RefreshOutcome|undefined;
  const injected=typeof options?.refresh==='function';
  const skip=!injected&&process.env.GENPET_SKIP_NATIVE_REFRESH==='1';
  const shouldRefresh=injected||(!skip&&isLiveNativeDestination(result.destination));
  if(shouldRefresh) {
    const spritePath=path.join(result.destination,result.manifest.spritesheetPath);
    refresh=await (options?.refresh??refreshNativePet)({expectedSpritePath:spritePath,petId:'custom:genpet-companion',allowUiRefresh:!injected&&isLiveNativeDestination(result.destination)});
  }
  const automaticRefresh=refresh?.automaticRefresh??false;
  const displayStatus=refresh?.displayStatus??'unconfirmed' as const;
  const notice=refresh?.notice??'Files committed to the same GenPet entry. Host refresh was skipped for this non-live destination; visible update remains unconfirmed.';
  await store.transaction(state=>{state.nativeExport={artId:result.artId,artCreatedAt:result.artCreatedAt,at:Date.now(),destination:result.destination,refreshRequired:!automaticRefresh};});
  return {...result,automaticRefresh,displayStatus,refreshRequired:!automaticRefresh,notice,refresh};
}
/** Publish validated new artwork during an explicit CLI tick. No internal recurring timer. UI reload is separate. */
export async function nativeTick(store:Store) {
  const s=await store.current();if(!s.nativeExport||!s.pet)return;
  const ready=[...s.art].reverse().find(a=>a.kind==='atlas'&&a.id===artRequest(s)?.id);
  if(ready&&(ready.id!==s.nativeExport.artId||ready.createdAt!==s.nativeExport.artCreatedAt||s.nativeExport.refreshRequired))await installNative(store);
}

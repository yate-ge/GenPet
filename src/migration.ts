/** Explicit imports preserve every source file. Reading legacy records never adopts or rewrites them. */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  createPet,
  fresh,
  identifier,
  text,
  validateStage,
  type GenerationStep,
  type Host,
  type State,
} from './model.js';
import type { Store } from './store.js';

export interface ImportOptions {
  confirmed: boolean;
  genes?: string;
  place?: string;
  connection?: string;
  personality?: string;
  memory?: string;
}
const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const optionalText = (value: unknown, field: string) =>
  value === undefined || value === null ? undefined : text(value, field);

/** Saved names are translated once at the read boundary, never accepted as aliases for new writes. */
function savedAliases(value: unknown): any {
  if (Array.isArray(value)) return value.map(savedAliases);
  if (!object(value)) return value;
  const result: Record<string, unknown> = {};
  const aliases: Record<string, string> = {
    basis: 'reason',
    designBasis: 'designReason',
    provenance: 'source',
    evidence: 'observed',
    evidenceIds: 'factIds',
  };
  for (const [key, item] of Object.entries(value)) {
    const target = aliases[key] ?? key;
    if (target !== key && Object.hasOwn(value, target)) continue;
    result[target] = savedAliases(item);
  }
  if (result.unit === 'carrier') result.unit = 'story-item';
  if (result.unit === 'image-review') result.unit = 'ImageReviewer';
  return result;
}
function hostResult(input: unknown) {
  if (!object(input)) return undefined;
  const result = savedAliases(input);
  const verified =
    result.storedArtworkVerified === true &&
    typeof result.acceptedArtworkSha256 === 'string' &&
    result.acceptedArtworkSha256 === result.storedArtworkSha256;
  result.storedArtworkVerified = verified ? true : result.storedArtworkVerified === false ? false : null;
  return result;
}
export function normalizeStep(step: GenerationStep): GenerationStep {
  return savedAliases(step);
}

/** Read-only v2/v3 view. Cross-host import is allowed only by the explicit importer. */
export function normalizeRecord(input: unknown, host: Host, file?: string, importing = false): State {
  if (!object(input) || ![1, 2, 3].includes(input.version)) throw new Error('Unsupported pet record');
  const old = input.version !== 3;
  const sourceHost = input.host === 'dots' ? 'cloud' : input.host;
  if (input.version !== 1 && sourceHost !== host && !importing) throw new Error('Mismatched pet record host');
  const record = savedAliases(input);
  const result = { ...fresh(host), ...record, version: 3, host } as State;
  if (record.pet) {
    const source = record.pet;
    const adoptedAt = number(source.adoptedAt, number(record.legacy?.importedAt, 0));
    const state = source.state ?? {};
    const shell = createPet(source.name ?? source.profile?.name ?? 'GenPet', adoptedAt);
    const soul = source.soul ?? {
      genes: source.genes ?? null,
      personality: source.personality,
      acquisition: source.acquisition,
    };
    result.pet = {
      ...shell,
      id: identifier(source.id, 'petId'),
      revision: number(source.revision, 0),
      ...(source.naming
        ? { naming: { ...source.naming, status: source.naming.status === 'deferred' ? 'asked' : source.naming.status } }
        : {}),
      soul: {
        ...soul,
        genes: soul.genes === null || soul.genes === undefined ? null : text(soul.genes, 'genes'),
        ...(optionalText(soul.personality, 'personality') ? { personality: soul.personality } : {}),
      },
      memory: source.memory ? { ...source.memory } : { text: '', updatedAt: number(state.updatedAt, adoptedAt) },
      state: {
        ...state,
        stage: validateStage('egg', state.stage ?? source.stage),
        description: state.description ?? state.reason ?? '',
        updatedAt: number(state.updatedAt, adoptedAt),
        ...(source.home !== undefined && state.home === undefined ? { home: source.home } : {}),
        ...(source.special !== undefined && state.special === undefined ? { special: source.special } : {}),
      },
      ...(source.binding
        ? {
            binding: {
              ...source.binding,
              host: source.binding.host === 'dots' || importing ? host : source.binding.host,
            },
          }
        : {}),
    };
    if (result.pet.naming && !['unasked', 'asked', 'named'].includes(result.pet.naming.status))
      throw new Error('Invalid naming status');
    if (typeof result.pet.memory.text !== 'string') throw new Error('Invalid memory');
  } else result.pet = null;
  result.stories = (record.stories ?? []).map((story: any) => ({
    ...story,
    reason: story.reason ?? 'Legacy story; its reason was not recorded',
    mediaIds: story.mediaIds ?? [],
    ...(story.hostResult ? { hostResult: hostResult(story.hostResult) } : {}),
    ...(story.steps ? { steps: story.steps.map(normalizeStep) } : {}),
  }));
  // Before 0.11 story images were `story` and non-image files `artifact`; a story that changed the home showed it.
  const homeStories = new Set<string>();
  (record.stories ?? []).forEach((story: any, index: number) => {
    if (story.home !== undefined && story.home !== record.stories[index - 1]?.home) homeStories.add(story.id);
  });
  result.art = (record.art ?? []).map((art: any) => {
    const kind = art.kind === 'story' ? 'scene' : art.kind === 'artifact' ? 'prop' : art.kind;
    const home =
      kind === 'scene' &&
      art.home === undefined &&
      (record.stories ?? []).some((story: any) => homeStories.has(story.id) && story.mediaIds?.includes(art.id));
    return { ...art, kind, ...(home ? { home: true } : {}), source: art.source ?? 'Preserved legacy artwork' };
  });
  if (result.pending) {
    if (result.pending.hostResult) result.pending.hostResult = hostResult(result.pending.hostResult);
    if (result.pending.steps) result.pending.steps = result.pending.steps.map(normalizeStep);
  }
  if (old) {
    result.needsImport = true;
    if (file) result.legacyFile = file;
  }
  return result;
}

/** Locate only a historical source; it remains separate from the selected v3 Pet. */
export async function findLegacyRecord(store: Store): Promise<string | null> {
  const candidates = [path.join(store.root, 'state.json')];
  if (store.host === 'desktop') candidates.push(path.join(store.base, 'state.json'));
  else candidates.push(path.join(store.base, 'dots', 'state.json'));
  for (const file of candidates) {
    try {
      const old = JSON.parse(await readFile(file, 'utf8'));
      if ([1, 2].includes(old.version) && old.pet) return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return null;
}

/** Inventory every historical location, including Dots remnants beside a current v3 Pet. */
export async function inspectLegacyRecords(base: string) {
  const files = ['state.json', 'desktop/state.json', 'cloud/state.json', 'dots/state.json'].map(file =>
    path.join(base, file),
  );
  const found: Array<{ file: string; version?: number; petId?: string; host?: string; problem?: string }> = [];
  for (const file of files) {
    let bytes: string;
    try {
      bytes = await readFile(file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        found.push({ file, problem: `Record read failed (${(error as NodeJS.ErrnoException).code ?? 'unknown'})` });
      continue;
    }
    try {
      const record = JSON.parse(bytes);
      if (!object(record) || ![1, 2].includes(record.version)) continue;
      found.push({
        file,
        version: record.version,
        ...(typeof record.pet?.id === 'string' ? { petId: record.pet.id } : {}),
        ...(typeof record.host === 'string' ? { host: record.host } : {}),
      });
    } catch {
      found.push({ file, problem: 'Record is not valid JSON; preserved for explicit review' });
    }
  }
  return found;
}

/** Called inside Store's host lock, so backup, copied assets and registration resume idempotently. */
export async function prepareImport(store: Store, file: string, options: ImportOptions, now: number): Promise<State> {
  if (!options.confirmed) throw new Error('Import requires explicit user confirmation');
  if (!path.isAbsolute(file)) throw new Error('Legacy file must be absolute');
  const bytes = await readFile(file);
  const original = JSON.parse(bytes.toString('utf8'));
  if (![1, 2, 3].includes(original.version) || !original.pet) throw new Error('No Pet to import');
  const state = normalizeRecord(original, store.host, file, true);
  const pet = state.pet!;
  if (original.version === 1) {
    pet.soul.genes = text(options.genes, 'observed legacy identity');
    pet.soul.acquisition = {
      place: text(options.place, 'origin'),
      connection: text(options.connection, 'connection'),
      storyId: 'legacy',
    };
    const destination = original.nativeExport?.destination;
    if (destination)
      pet.binding = {
        host: store.host,
        avatarId: original.nativeExport?.avatarId ?? `custom:${path.basename(destination)}`,
        destination,
        ...(original.nativeExport?.cloudId ? { cloudId: original.nativeExport.cloudId } : {}),
      };
    // Old v1 art IDs were optional. Stable IDs ensure retries never create duplicate records.
    state.art = state.art.map(art => ({
      ...art,
      id:
        art.id ??
        `art-${createHash('sha256')
          .update(JSON.stringify([art.file, art.kind, art.stage, art.createdAt]))
          .digest('hex')
          .slice(0, 24)}`,
      petId: pet.id,
      requestId: art.requestId ?? 'legacy',
      description: art.description ?? 'Imported existing artwork',
      stage: validateStage('egg', art.stage),
      createdAt: number(art.createdAt, now),
    }));
  }
  if (options.personality !== undefined && !pet.soul.personality)
    pet.soul.personality = text(options.personality, 'personality');
  if (options.memory !== undefined && !pet.memory.text)
    pet.memory = { text: text(options.memory, 'memory'), updatedAt: now, storyId: 'legacy' };
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const backup = path.join(store.root, 'backups', `legacy-v${original.version}-${pet.id}-${digest}.json`);
  await mkdir(path.dirname(backup), { recursive: true });
  await copyFile(file, backup);
  state.legacy = { backup, importedAt: now, source: file, sourceVersion: original.version };
  if (options.memory !== undefined && pet.memory.storyId === 'legacy') state.legacy.memorySupplementedAt = now;
  delete state.needsImport;
  delete state.legacyFile;
  if (original.version !== 3) {
    state.growthClock = {
      stage: pet.state.stage,
      stageSince: now,
      experiences: 0,
      pausedMs: 0,
      stagePausedMs: 0,
      specialPausedMs: 0,
    };
  }
  for (const art of state.art) {
    if (art.petId !== pet.id || !path.isAbsolute(art.file)) continue;
    const target = path.join(
      store.petDirectory(pet.id),
      'assets',
      identifier(art.id, 'artId') + path.extname(art.file),
    );
    if (path.resolve(art.file) !== path.resolve(target)) {
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await copyFile(art.file, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
    }
    art.file = target;
    if (original.version === 1 && art.kind === 'atlas' && art.stage === pet.state.stage)
      pet.state.appearanceId = art.id;
  }
  return state;
}

/** The command itself is explicit authorization; installation and inspection never call this. */
export async function migrateLegacy(store: Store, file: string, design: Omit<ImportOptions, 'confirmed'>) {
  return store.importRecord(file, { ...design, confirmed: true });
}

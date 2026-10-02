/** Art requests for the Agent's image generation, and accepting finished files into the pet's assets. */
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { desiredAppearance, requestId } from './appearance.js';
import { readPrompt } from './config.js';
import { checkAtlas } from './hosts/desktop/atlas.js';
import { hostFor } from './hosts/index.js';
import { decodeRgba, readImageInfo } from './image.js';
import { artKinds, type ArtKind, type ArtRecord, type State } from './model.js';
import type { Store } from './store.js';

/** `art-request`: everything needed to draw (or reuse) the planned visuals for the pending story. */
export function artRequest(state: State) {
  if (!state.pet || !state.pending?.plan) return null;
  const pet = state.pet;
  const plan = state.pending.plan;
  const host = hostFor(state.host);
  const own = state.art.filter(art => art.petId === pet.id);
  const references = own.filter(art => host.referenceKinds.includes(art.kind));
  // Identity references: the egg, the first hatched form and the latest image.
  const referenceFiles = [
    references.find(art => art.stage === 'egg')?.file,
    references.find(art => art.stage !== 'egg')?.file,
    references.at(-1)?.file,
  ].filter((file): file is string => !!file);
  return {
    id: requestId(state)!,
    operationId: state.pending.id,
    petId: pet.id,
    host: state.host,
    status: !plan.appearance ? 'unchanged' : desiredAppearance(state) ? 'ready' : 'pending',
    stage: plan.stage,
    name: pet.name,
    naming: pet.naming,
    personality: pet.personality ?? plan.personality,
    genes: pet.genes ?? plan.genes,
    story: plan.text,
    appearance: plan.appearance,
    reusableAppearances: own.filter(art => art.kind === 'atlas' || art.kind === 'avatar'),
    referenceFiles: [...new Set(referenceFiles)],
    prompt: readPrompt('meta') + '\n' + readPrompt('appearance'),
    contract: host.artContract,
    target: pet.binding ?? null,
  };
}

/** Structural checks only; whether the image is right is judged by image review. */
export async function validateImage(file: string, kind: ArtKind) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error('Artifact must be a regular file below 64 MiB');
  if (kind === 'artifact') return { format: 'artifact', width: 0, height: 0, hasAlpha: false };
  const meta = await readImageInfo(file);
  if ((kind === 'portrait' || kind === 'atlas') && !meta.hasAlpha)
    throw new Error('Pet images must have an alpha channel');
  if (meta.width * meta.height > 16_000_000) throw new Error('Image exceeds size limit');
  const decoded = await decodeRgba(file); // Rejects a truncated image before storing it.
  if (kind === 'atlas') checkAtlas(decoded);
  return meta;
}

/** `accept-art`: copy a reviewed file into this pet's assets under the current request. Idempotent. */
export async function acceptArt(
  store: Store,
  input: { requestId: string; file: string; kind: ArtKind; provenance: string; description?: string },
) {
  if (!path.isAbsolute(input.file)) throw new Error('Artifact file must be an absolute local path');
  if (!artKinds.includes(input.kind)) throw new Error('Unknown artifact kind');
  if (!input.provenance?.trim()) throw new Error('Record generation and validation provenance');
  await validateImage(input.file, input.kind);
  const bytes = await readFile(input.file);
  return store.transaction(async state => {
    if (requestId(state) !== input.requestId) throw new Error('Stale design request');
    const appearanceKind = hostFor(state.host).appearanceKind;
    if ((input.kind === 'atlas' || input.kind === 'avatar') && input.kind !== appearanceKind)
      throw new Error('Artwork uses the other host format');
    const pet = state.pet!;
    const plan = state.pending!.plan!;
    const id = `art-${createHash('sha256')
      .update(pet.id + input.requestId + input.kind)
      .update(bytes)
      .digest('hex')
      .slice(0, 24)}`;
    const previous = state.art.find(art => art.id === id);
    if (previous) {
      await stat(previous.file);
      return previous;
    }
    const dir = path.join(store.root, 'pets', pet.id, 'assets');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, id + path.extname(input.file).toLowerCase());
    const tmp = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(tmp, bytes, { mode: 0o600, flag: 'wx' });
      await rename(tmp, file);
    } finally {
      await rm(tmp, { force: true });
    }
    const record: ArtRecord = {
      id,
      petId: pet.id,
      requestId: input.requestId,
      stage: plan.stage!,
      description: input.description?.trim() || plan.appearance?.description || plan.state,
      file,
      kind: input.kind,
      createdAt: Date.now(),
      provenance: input.provenance,
    };
    state.art.push(record);
    return record;
  });
}

import { readFile, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { identifier, text, validateStage, type Stage } from './core.js';
import { atomicJson, type Store } from './store.js';

/** Explicit migration; old files remain intact, no time-derived growth or reroll. */
export async function migrateLegacy(
  store: Store,
  file: string,
  design: { genes: string; place: string; connection: string },
) {
  if (store.host !== 'desktop') throw new Error('Legacy migration is for desktop records');
  if (!path.isAbsolute(file)) throw new Error('Legacy file must be absolute');
  const legacy = JSON.parse(await readFile(file, 'utf8'));
  if (legacy.version !== 1 || !legacy.pet) throw new Error('No v1 pet to migrate');
  const genes = text(design.genes, 'observed legacy identity'),
    place = text(design.place, 'origin'),
    connection = text(design.connection, 'connection');
  return store.transaction(async state => {
    if (state.legacy && state.pet?.id === legacy.pet.id) return state;
    if (state.pet) throw new Error('Migration never replaces an existing v2 pet');
    const petId = identifier(legacy.pet.id, 'legacy petId');
    const stage = validateStage('egg', legacy.pet.stage) as Stage;
    const backup = path.join(store.root, 'backups', `legacy-${randomUUID()}.json`);
    await atomicJson(backup, legacy);
    state.pet = {
      id: petId,
      name: text(legacy.pet.profile?.name ?? 'GenPet', 'name'),
      adoptedAt: legacy.pet.adoptedAt,
      revision: 1,
      genes,
      stage,
      acquisition: { place, connection, storyId: 'legacy' },
      state: { description: legacy.pet.state?.reason || 'Continuing the existing companion', updatedAt: Date.now() },
    };
    state.legacy = { backup, importedAt: Date.now() };
    const destination = legacy.nativeExport?.destination;
    if (destination)
      state.pet.binding = { host: 'desktop', avatarId: `custom:${path.basename(destination)}`, destination };
    const dir = path.join(store.root, 'pets', petId, 'assets');
    await mkdir(dir, { recursive: true });
    for (const art of legacy.art ?? []) {
      if (!['portrait', 'atlas'].includes(art.kind) || !path.isAbsolute(art.file)) continue;
      const id = `art-${randomUUID()}`,
        target = path.join(dir, id + path.extname(art.file));
      try {
        await copyFile(art.file, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      state.art.push({
        id,
        petId,
        requestId: 'legacy',
        stage: validateStage('egg', art.stage),
        description: 'Imported existing artwork',
        file: target,
        kind: art.kind,
        createdAt: art.createdAt,
        provenance: art.provenance || 'Preserved v1 artwork',
      });
      if (art.kind === 'atlas' && art.stage === stage) state.pet.state.appearanceId = id;
    }
    return state;
  });
}

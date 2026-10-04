/** Write the planned atlas into this pet's one entry under CODEX_HOME/pets, then request a refresh. */
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { desiredAppearance } from '../../appearance.js';
import { validateImage } from '../../art.js';
import { codexHome } from '../../config.js';
import type { State } from '../../model.js';
import type { Store } from '../../store.js';
import { validateHostResult } from '../result.js';
import { isLiveDestination, refreshNativePet } from './refresh.js';
import { readSelectedPet } from './switch.js';

/** The pet's bound entry, or a new one named after its ID. Always exactly one entry in this Codex home. */
export function desktopDestination(state: State) {
  if (!state.pet) throw new Error('No pet');
  const pets = path.resolve(codexHome(), 'pets');
  const destination = state.pet.binding?.destination ?? path.join(pets, state.pet.id);
  const relative = path.relative(pets, path.resolve(destination));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep))
    throw new Error('Target must be one entry in this Codex home');
  if (state.pet.binding && state.pet.binding.avatarId !== `custom:${path.basename(destination)}`)
    throw new Error('Avatar binding does not match its destination');
  return destination;
}

/**
 * What the Codex Pet list shows: the pet's unique ID in short form (genpet-xxxxxx), never the user's name.
 * The name is for talking with the user; this stays stable, so naming needs no republish.
 */
export const desktopLabel = (petId: string) => petId.slice(0, 'genpet-'.length + 6);

/** Replace the entry's sprite and manifest; refuses an entry that belongs to another pet. */
export async function exportNative(state: State, destination: string) {
  if (!state.pet || state.host !== 'desktop') throw new Error('Native export requires a desktop pet');
  const art = desiredAppearance(state);
  if (!art || art.kind !== 'atlas') throw new Error('Complete or select a validated atlas first');
  await validateImage(art.file, 'atlas');
  let previous: string | undefined;
  try {
    previous = await readFile(path.join(destination, 'pet.json'), 'utf8');
    const old = JSON.parse(previous);
    const boundHere = state.pet.binding?.destination === destination;
    const ours =
      old.genpetId === state.pet.id ||
      (boundHere && state.replacesPetId && old.genpetId === state.replacesPetId) || // explicit reset
      (boundHere && state.legacy && !old.genpetId); // migrated v1 entry
    if (!ours) throw new Error('Target entry belongs to another pet; it was preserved');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await mkdir(destination, { recursive: true });
  const bytes = await readFile(art.file);
  const spritesheetPath = `spritesheet-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}${path.extname(art.file)}`;
  const tmp = path.join(destination, `.pending-${randomUUID()}`);
  await copyFile(art.file, tmp);
  await rename(tmp, path.join(destination, spritesheetPath));
  const manifest = {
    id: path.basename(destination),
    genpetId: state.pet.id,
    displayName: desktopLabel(state.pet.id),
    description: 'GenPet · a companion with its own stories',
    spriteVersionNumber: 2,
    spritesheetPath,
  };
  if (previous) await writeFile(path.join(destination, 'previous-pet.json'), previous);
  const manifestTmp = path.join(destination, `.pet-${randomUUID()}.json`);
  await writeFile(manifestTmp, JSON.stringify(manifest, null, 2));
  await rename(manifestTmp, path.join(destination, 'pet.json'));
  return { destination, manifest, artId: art.id, filesCommitted: true };
}

/** `publish`: export, bind, refresh, and record the host result for the pending story. */
export async function installNative(
  store: Store,
  options: { refresh?: typeof refreshNativePet; selection?: typeof readSelectedPet } = {},
) {
  if (store.host !== 'desktop') throw new Error('Dots updates its own Avatar through host-request and host-result');
  return store.transaction(async state => {
    if (!state.pending?.plan?.appearance) throw new Error('No planned appearance update');
    const operationId = state.pending.id;
    const destination = desktopDestination(state);
    const avatarId = `custom:${path.basename(destination)}`;
    const result = await exportNative(state, destination);
    state.pet!.binding = { host: 'desktop', avatarId, destination };
    const selection = await (options.selection ?? readSelectedPet)();
    const active = selection.available ? selection.effectiveSelectedPetId === avatarId : null;
    const refresh = await (options.refresh ?? refreshNativePet)({
      expectedSpritePath: path.join(destination, result.manifest.spritesheetPath),
    });
    // An active (or possibly active) live entry must actually receive the refresh request.
    const mustRefresh = active === true || (active === null && isLiveDestination(destination));
    const hostResult = validateHostResult(state, operationId, {
      petId: state.pet!.id,
      operationId,
      appearanceId: result.artId,
      avatarId,
      updated: true,
      active,
      refreshRequested: refresh.refreshRequested,
      displayStatus: refresh.displayStatus,
      // No delivery channel (app closed, or a Codex version whose channel is missing or changed) must not leave the
      // story unfinished forever: the files are committed and appear when Codex next loads Pets.
      ...(mustRefresh && !refresh.automaticRefresh
        ? {
            refreshUnavailable: true,
            notice: `Files committed; the desktop refresh was not delivered (${refresh.errors?.join('; ') || 'no live app channel'}). The new look appears when Codex next loads Pets.`,
          }
        : {}),
    });
    state.pending.hostResult = hostResult;
    return { ...result, ...hostResult, refresh };
  });
}

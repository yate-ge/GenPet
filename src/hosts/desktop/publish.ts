/** Update the actual Pet by ID; migrated Pets need cloud upload and host readback. */
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { desiredAppearance } from '../../appearance.js';
import { codexHome } from '../../config.js';
import type { State } from '../../model.js';
import { pendingFor } from '../../pending.js';
import { briefForPet } from '../../status.js';
import type { Store } from '../../store.js';
import { validateArt } from '../art.js';
import { verifyStoredArtwork } from '../artwork.js';
import { cloudAppearanceRequest } from '../cloud-request.js';
import { findAvatar } from '../identity.js';
import { validateHostResult } from '../result.js';
import { readMigrationMap, type MigrationMap } from './mapping.js';
import { isLiveDestination, refreshNativePet } from './refresh.js';
import { readSelectedPet } from './switch.js';
import type { AppearanceOutcome } from '../types.js';

/** The bound local entry remains an alias of its cloud Pet after migration. */
export function desktopDestination(state: State) {
  if (!state.pet) throw new Error('No pet');
  const pets = path.resolve(codexHome(), 'pets');
  const destination = path.resolve(state.pet.binding?.destination ?? path.join(pets, state.pet.id));
  const relative = path.relative(pets, destination);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep))
    throw new Error('Target must be one entry in this Codex home');
  const localId = `custom:${path.basename(destination)}`;
  if (state.pet.binding?.avatarId.startsWith('custom:') && state.pet.binding.avatarId !== localId)
    throw new Error('Avatar binding does not match its destination');
  return destination;
}

export const desktopLabel = (petId: string) => petId.slice(0, 'genpet-'.length + 6);

/** Replace one local entry and independently read its manifest and pixels back. */
export async function exportNative(state: State, destination: string) {
  if (!state.pet || state.host !== 'desktop') throw new Error('Native export requires a desktop pet');
  if (!path.isAbsolute(destination)) throw new Error('Local export requires an absolute destination');
  if (state.pet.binding && path.resolve(destination) !== desktopDestination(state))
    throw new Error('Local export must use the bound Pet destination');
  const art = desiredAppearance(state);
  if (!art || art.kind !== 'atlas') throw new Error('Complete or select a validated atlas first');
  await validateArt(art.file);
  let previous: string | undefined;
  try {
    previous = await readFile(path.join(destination, 'pet.json'), 'utf8');
    const old = JSON.parse(previous);
    const boundHere = state.pet.binding?.destination === destination;
    const ours =
      old.genpetId === state.pet.id ||
      (boundHere && state.replacesPetId && old.genpetId === state.replacesPetId) ||
      (boundHere && state.legacy && !old.genpetId);
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
    description: briefForPet(state.pet),
    spriteVersionNumber: 2,
    spritesheetPath,
  };
  if (previous) {
    await writeFile(path.join(destination, `previous-pet-${Date.now()}-${randomUUID()}.json`), previous);
    await writeFile(path.join(destination, 'previous-pet.json'), previous);
  }
  const manifestTmp = path.join(destination, `.pet-${randomUUID()}.json`);
  await writeFile(manifestTmp, JSON.stringify(manifest, null, 2));
  await rename(manifestTmp, path.join(destination, 'pet.json'));
  const readback = JSON.parse(await readFile(path.join(destination, 'pet.json'), 'utf8'));
  if (readback.genpetId !== state.pet.id || readback.spritesheetPath !== spritesheetPath)
    throw new Error('Host local manifest readback does not match the intended Pet');
  const checks = await verifyStoredArtwork(art.file, path.join(destination, readback.spritesheetPath));
  return { destination, manifest, artId: art.id, filesCommitted: true, ...checks };
}

/** Runtime writes an unmigrated local Pet; Agent performs authenticated cloud steps for migrated Pets. */
export async function installNative(
  store: Store,
  options: {
    refresh?: typeof refreshNativePet;
    selection?: typeof readSelectedPet;
    mapping?: () => Promise<MigrationMap>;
  } = {},
): Promise<AppearanceOutcome> {
  if (store.host !== 'desktop') throw new Error('Use the shared cloud Pet appearance interface in this environment');
  return store.transaction(async state => {
    if (!state.pending?.plan?.appearance) throw new Error('No planned appearance update');
    const pending = pendingFor(state, state.pending.id);
    const lookup = { selection: options.selection, mapping: options.mapping ?? (() => readMigrationMap()) };
    let target = await findAvatar(state, lookup);
    if (!target.avatarId) throw new Error(target.reason ?? 'Host target is unknown');
    if (target.cloudId) {
      state.pet!.binding = {
        ...state.pet!.binding,
        host: 'desktop',
        avatarId: target.localAvatarId ?? target.cloudId,
        cloudId: target.cloudId,
      };
      const request = await cloudAppearanceRequest(state, target);
      state.pending!.hostResult = validateHostResult(state, pending.id, request, target);
      return request;
    }
    const destination = desktopDestination(state);
    const result = await exportNative(state, destination);
    const avatarId = `custom:${path.basename(destination)}`;
    state.pet!.binding = { host: 'desktop', avatarId, destination };
    // The host may have migrated the entry while files were written. Never finish on local proof then.
    if (target.mappingAvailable) {
      target = await findAvatar(state, lookup);
      if (!target.avatarId) throw new Error(target.reason ?? 'Host target is unknown');
      if (target.cloudId) {
        state.pet!.binding.cloudId = target.cloudId;
        const request = await cloudAppearanceRequest(state, target);
        state.pending!.hostResult = validateHostResult(state, pending.id, request, target);
        return { local: result, ...request };
      }
    }
    const selection = await (options.selection ?? readSelectedPet)();
    const active = selection.available ? target.aliases.includes(selection.effectiveSelectedPetId ?? '') : null;
    const refresh = await (options.refresh ?? refreshNativePet)({
      expectedSpritePath: path.join(destination, result.manifest.spritesheetPath),
    });
    const mustRefresh = active === true || (active === null && isLiveDestination(destination));
    const hostResult = validateHostResult(
      state,
      pending.id,
      {
        petId: pending.petId,
        operationId: pending.id,
        appearanceId: result.artId,
        avatarId,
        updated: true,
        ...result,
        active,
        refreshRequested: refresh.refreshRequested,
        displayStatus: 'unconfirmed',
        observed: `Local host manifest and sprite were independently read back. ${refresh.notice}`,
        ...(mustRefresh && !refresh.automaticRefresh
          ? {
              refreshUnavailable: true,
              notice: `Local host artwork was verified; refresh delivery is unavailable (${refresh.errors?.join('; ') || 'no live app channel'}). It will load when the host next reads this entry.`,
            }
          : {}),
      },
      target,
    );
    state.pending!.hostResult = hostResult;
    return { ...result, ...hostResult, refresh };
  });
}

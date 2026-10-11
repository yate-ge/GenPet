/** Restore accepted artwork on the same host Pet without changing stories, identity or growth. */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { State } from '../model.js';
import type { Store } from '../store.js';
import { validateArt } from './art.js';
import { artworkFingerprint, verifyStoredArtwork } from './artwork.js';
import { cloudUploadSteps } from './cloud-request.js';
import { findAvatar, type FindOptions } from './identity.js';
import { desktopDestination, exportNative } from './desktop/publish.js';
import { refreshNativePet } from './desktop/refresh.js';
import type { Command } from './index.js';

export function currentAcceptedArt(state: State) {
  const art = state.art.find(
    art => art.id === state.pet?.state.appearanceId && art.petId === state.pet.id && art.kind === 'atlas',
  );
  if (!art)
    throw new Error('This Pet has no saved current accepted atlas; preserve its records and resume unfinished work');
  if (state.pending?.hostResult?.updated && state.pending.hostResult.appearanceId !== art.id)
    throw new Error('A newer pending appearance is already on the host; resume that story before repairing');
  return art;
}

async function saveReport<T extends object>(store: Store, petId: string, result: T) {
  const directory = path.join(store.root, 'pets', petId, 'diagnostics');
  await mkdir(directory, { recursive: true });
  const reportFile = path.join(directory, `repair-${Date.now()}-${randomUUID()}.json`);
  await writeFile(reportFile, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  return { ...result, reportFile };
}

export async function repairAppearance(
  store: Store,
  options: FindOptions & { refresh?: typeof refreshNativePet } = {},
) {
  const state = await store.peek();
  if (!state.pet?.binding) throw new Error('Bind the existing host Pet before repairing its appearance');
  const art = currentAcceptedArt(state);
  await validateArt(art.file);
  const target = await findAvatar(state, options);
  if (!target.avatarId) throw new Error(target.reason ?? 'The actual host Pet target is unknown');
  const fingerprint = await artworkFingerprint(art.file);
  const base = {
    petId: state.pet.id,
    appearanceId: art.id,
    avatarId: target.avatarId,
    cloudId: target.cloudId,
    file: art.file,
    acceptedArtworkSha256: fingerprint.artworkSha256,
    active: target.active,
    preserveCurrentSelection: true,
    displayStatus: 'unconfirmed',
  };
  const cloudRequest = (cloudId: string) => ({
    ...base,
    operation: 'repair-cloud-pet',
    avatarId: cloudId,
    cloudId,
    updated: false,
    storedArtworkVerified: null,
    refreshRequested: false,
    agentSteps: cloudUploadSteps(art.file, cloudId, {
      command: 'repair-result',
      petId: state.pet!.id,
      check:
        'Save avatarId, appearanceId, updated, readbackFile and observed host facts to an absolute JSON file. Runtime verifies the actual host image; no new story is created.',
    }),
  });
  if (target.cloudId) return saveReport(store, state.pet.id, cloudRequest(target.cloudId));
  const local = await exportNative({ ...state, pending: null }, desktopDestination(state));
  const after = await findAvatar(state, options);
  if (!after.avatarId) throw new Error(after.reason ?? 'The host target changed during repair');
  if (after.cloudId) return saveReport(store, state.pet.id, { local, ...cloudRequest(after.cloudId) });
  const refresh = await (options.refresh ?? refreshNativePet)({
    expectedSpritePath: path.join(local.destination, local.manifest.spritesheetPath),
  });
  return saveReport(store, state.pet.id, {
    ...base,
    operation: 'repair-local-pet',
    updated: true,
    ...local,
    refreshRequested: refresh.refreshRequested,
    refresh,
    observed: 'The existing accepted image was written to this same local Pet and independently read back.',
  });
}

export interface RepairResultInput {
  avatarId: string;
  appearanceId: string;
  updated: boolean;
  readbackFile: string;
  observed: string;
  refreshRequested?: boolean;
}

export async function repairResult(
  store: Store,
  petId: string,
  input: RepairResultInput,
  options: FindOptions & { refresh?: typeof refreshNativePet } = {},
) {
  const state = await store.peek();
  if (state.pet?.id !== petId) throw new Error('Repair result belongs to a different Pet');
  const art = currentAcceptedArt(state);
  const target = await findAvatar(state, options);
  if (!target.avatarId || input.avatarId !== target.avatarId || input.appearanceId !== art.id)
    throw new Error('Repair result does not match the current accepted image and actual host Pet');
  if (typeof input.updated !== 'boolean' || typeof input.observed !== 'string' || !input.observed.trim())
    throw new Error('Repair requires observed host update facts');
  if (!path.isAbsolute(input.readbackFile) || path.resolve(input.readbackFile) === path.resolve(art.file))
    throw new Error('Repair requires a separate absolute host readback file');
  const checks = await verifyStoredArtwork(art.file, input.readbackFile);
  const refresh =
    state.host === 'desktop' && checks.storedArtworkVerified && input.updated
      ? await (options.refresh ?? refreshNativePet)({
          expectedSpritePath: art.file,
          ...(target.cloudId ? { cloudId: target.cloudId } : {}),
        })
      : null;
  return saveReport(store, petId, {
    petId,
    appearanceId: art.id,
    avatarId: target.avatarId,
    cloudId: target.cloudId,
    updated: input.updated,
    ...checks,
    active: target.active,
    refreshRequested: refresh?.refreshRequested ?? input.refreshRequested ?? false,
    displayStatus: 'unconfirmed',
    observed: input.observed.trim(),
    ...(refresh ? { refresh } : {}),
  });
}

export const repairCommands: Record<string, Command> = {
  'repair-appearance': { usage: 'repair-appearance', run: (_, store) => repairAppearance(store) },
  'repair-result': {
    usage: 'repair-result PET_ID RESULT_JSON_FILE',
    run: async (args, store) => {
      if (!args[0] || !args[1] || !path.isAbsolute(args[1]))
        throw new Error('repair-result requires a Pet ID and an absolute result JSON file');
      return repairResult(store.forPet(args[0]), args[0], JSON.parse(await readFile(args[1], 'utf8')));
    },
  },
};

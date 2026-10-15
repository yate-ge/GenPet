/**
 * Debugger preview: show one saved atlas of this Pet on its own host entry without changing its records.
 * A local entry is written and refreshed here; a migrated cloud Pet needs the Agent's authenticated upload.
 * `repair-appearance` restores the current accepted image afterwards.
 */
import path from 'node:path';
import type { Store } from '../../store.js';
import { validateArt } from '../art.js';
import { cloudUploadSteps } from '../cloud-request.js';
import { findAvatar } from '../identity.js';
import { desktopDestination, exportNative } from './publish.js';
import { refreshNativePet } from './refresh.js';

export async function previewAppearance(store: Store, artId: string) {
  if (store.host !== 'desktop') throw new Error('Appearance preview is available for the desktop Pet');
  const state = await store.peek();
  if (!state.pet?.binding) throw new Error('This Pet is not bound to a host Pet yet');
  const art = state.art.find(art => art.id === artId && art.petId === state.pet!.id && art.kind === 'atlas');
  if (!art) throw new Error('Choose a saved atlas of this Pet');
  await validateArt(art.file);
  const target = await findAvatar(state);
  if (!target.avatarId) throw new Error(target.reason ?? 'The actual host Pet target is unknown');
  const base = { petId: state.pet.id, artId, file: art.file, avatarId: target.avatarId, displayStatus: 'unconfirmed' };
  const cloud = (cloudId: string) => ({
    ...base,
    operation: 'preview-cloud-pet',
    cloudId,
    updated: false,
    agentSteps: cloudUploadSteps(art.file, cloudId, {
      check:
        'This is a debug preview: GenPet records are unchanged. Run repair-appearance to restore the current image.',
    }),
  });
  if (target.cloudId) return cloud(target.cloudId);
  const preview = {
    ...state,
    pet: { ...state.pet, state: { ...state.pet.state, appearanceId: art.id } },
    pending: null,
  };
  const local = await exportNative(preview, desktopDestination(state));
  const refresh = await refreshNativePet({
    expectedSpritePath: path.join(local.destination, local.manifest.spritesheetPath),
  });
  return { ...base, operation: 'preview-local-pet', updated: true, ...local, refresh };
}

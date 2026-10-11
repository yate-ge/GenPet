/** The authenticated cloud steps shared by a story update and a same-identity repair. */
import { desiredAppearance } from '../appearance.js';
import type { State } from '../model.js';
import { pendingFor } from '../pending.js';
import { validateArt } from './art.js';
import { artworkFingerprint } from './artwork.js';
import type { AvatarLocation } from './identity.js';
import type { AppearanceOutcome } from './types.js';

export async function cloudAppearanceRequest(state: State, target: AvatarLocation): Promise<AppearanceOutcome> {
  if (!state.pending?.plan?.appearance) throw new Error('No planned appearance update');
  const pending = pendingFor(state, state.pending.id);
  const art = desiredAppearance(state);
  if (!art || art.kind !== 'atlas') throw new Error('Complete or select validated Pet atlas artwork first');
  if (!target.cloudId || target.avatarId !== target.cloudId)
    throw new Error(target.reason ?? 'Resolve the actual cloud Pet ID first');
  await validateArt(art.file);
  const accepted = await artworkFingerprint(art.file);
  return {
    operation: 'update-cloud-pet',
    petId: pending.petId,
    operationId: pending.id,
    appearanceId: art.id,
    avatarId: target.cloudId,
    cloudId: target.cloudId,
    target: { avatarId: target.cloudId, cloudId: target.cloudId, localAvatarId: target.localAvatarId },
    file: art.file,
    acceptedArtworkSha256: accepted.artworkSha256,
    updated: false,
    storedArtworkVerified: null,
    active: target.active,
    refreshRequested: false,
    displayStatus: 'unconfirmed',
    preserveCurrentSelection: true,
    agentSteps: cloudUploadSteps(art.file, target.cloudId, {
      command: 'host-result',
      operationId: pending.id,
      check:
        'Pass the actual downloaded readbackFile and observed tool results. Runtime compares accepted and stored pixels; a boolean alone cannot prove the update.',
    }),
    notice:
      'The cloud Pet still needs upload and actual host readback. This story remains pending until the stored artwork matches.',
  };
}

export function cloudUploadSteps(file: string, cloudId: string, finalStep: object) {
  return [
    {
      tool: 'validate_pet_spritesheet',
      arguments: { file },
      check: 'Repair structural errors while preserving the accepted design.',
    },
    { tool: 'prepare_pet_upload', arguments: { file }, save: 'upload_session_id' },
    {
      tool: 'update_pet',
      arguments: { pet_id: cloudId, updates: { upload_session_id: '<prepared upload_session_id>' } },
      check: 'Update this exact existing Pet ID; preserve name, description and selection.',
    },
    {
      tool: 'get_pet_download_link',
      arguments: { pet_id: cloudId },
      check:
        'Use this fresh host URL immediately to save a separate readback file. Do not reuse the upload input or persist the temporary URL.',
    },
    finalStep,
  ];
}

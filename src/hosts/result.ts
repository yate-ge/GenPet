/** Save host facts only after checking the target and actual downloaded/read-back artwork. */
import path from 'node:path';
import { desiredAppearance } from '../appearance.js';
import { text, type HostResult, type State } from '../model.js';
import { pendingFor } from '../pending.js';
import type { Store } from '../store.js';
import { verifyStoredArtwork } from './artwork.js';
import { findAvatar, type AvatarLocation, type FindOptions } from './identity.js';
import { refreshNativePet } from './desktop/refresh.js';

export type HostResultInput = HostResult & { readbackFile?: string };
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Synchronous structural validation after runtime has supplied independent lookup and image comparison. */
export function validateHostResult(
  state: State,
  operationId: string,
  input: HostResult,
  target?: AvatarLocation,
): HostResult {
  const pending = pendingFor(state, operationId);
  const binding = state.pet?.binding;
  if (!binding) throw new Error('Bind the actual host target before recording an update');
  if (input.petId !== pending.petId || input.operationId !== operationId)
    throw new Error('Host result belongs to another pet or operation');
  if (input.appearanceId !== desiredAppearance(state)?.id)
    throw new Error('Host result belongs to a different appearance');
  const avatarId = text(input.avatarId, 'avatarId');
  if (avatarId !== (target?.avatarId ?? binding.cloudId ?? binding.avatarId))
    throw new Error('Host updated a different Avatar from the actual bound target');
  if (
    typeof input.updated !== 'boolean' ||
    ![true, false, null].includes(input.storedArtworkVerified) ||
    ![true, false, null].includes(input.active) ||
    typeof input.refreshRequested !== 'boolean' ||
    !['confirmed', 'unconfirmed'].includes(input.displayStatus)
  )
    throw new Error('Invalid host result');
  if (
    input.storedArtworkVerified === true &&
    (!input.updated ||
      !hash(input.acceptedArtworkSha256) ||
      !hash(input.storedArtworkSha256) ||
      input.acceptedArtworkSha256 !== input.storedArtworkSha256 ||
      !input.observed?.trim())
  )
    throw new Error('Verified stored artwork requires matching runtime readback hashes and observed host facts');
  if (input.refreshUnavailable !== undefined && typeof input.refreshUnavailable !== 'boolean')
    throw new Error('Invalid host result');
  if (input.refreshUnavailable && !input.notice?.trim()) throw new Error('refreshUnavailable requires a notice');
  if (input.displayStatus === 'confirmed' && !input.observed?.trim())
    throw new Error('Confirmed display requires observed host evidence');
  return {
    petId: input.petId,
    operationId,
    appearanceId: input.appearanceId,
    avatarId,
    ...(target?.cloudId
      ? { cloudId: target.cloudId }
      : input.cloudId
        ? { cloudId: text(input.cloudId, 'cloudId') }
        : {}),
    updated: input.updated,
    storedArtworkVerified: input.storedArtworkVerified,
    active: input.active,
    refreshRequested: input.refreshRequested,
    displayStatus: input.displayStatus,
    ...(input.acceptedArtworkSha256 ? { acceptedArtworkSha256: input.acceptedArtworkSha256 } : {}),
    ...(input.storedArtworkSha256 ? { storedArtworkSha256: input.storedArtworkSha256 } : {}),
    ...(input.acceptedFileSha256 ? { acceptedFileSha256: input.acceptedFileSha256 } : {}),
    ...(input.storedFileSha256 ? { storedFileSha256: input.storedFileSha256 } : {}),
    ...(input.refreshUnavailable ? { refreshUnavailable: true, notice: text(input.notice, 'notice') } : {}),
    ...(input.observed ? { observed: text(input.observed, 'observed') } : {}),
    ...(input.error ? { error: text(input.error, 'error') } : {}),
  };
}

/** An Agent-reported success flag cannot replace actual host artwork readback. */
export async function recordHostResult(
  store: Store,
  operationId: string,
  input: HostResultInput,
  options: FindOptions & { refresh?: typeof refreshNativePet } = {},
) {
  return store.transaction(async state => {
    const pending = pendingFor(state, operationId);
    if (!pending.plan?.appearance) throw new Error('No planned appearance update');
    const art = desiredAppearance(state);
    if (!art) throw new Error('Complete or select appearance artwork first');
    if (!state.pet!.binding) throw new Error('Bind the actual host target before recording an update');
    const target = await findAvatar(state, options);
    if (!target.avatarId) throw new Error(target.reason ?? 'Host target is unknown');
    if (input.avatarId !== target.avatarId)
      throw new Error('Host updated a different Avatar from the actual bound target');
    if (input.storedArtworkVerified === true && !input.readbackFile)
      throw new Error('Stored artwork must be checked from an actual host readback file');
    if (input.readbackFile && path.resolve(input.readbackFile) === path.resolve(art.file))
      throw new Error('Host readback must be a separate file retrieved from the host');
    const checks = input.readbackFile
      ? await verifyStoredArtwork(art.file, input.readbackFile)
      : { storedArtworkVerified: null };
    if (target.cloudId) state.pet!.binding.cloudId = target.cloudId;
    let resultInput: HostResult = {
      ...input,
      ...checks,
      ...(state.host === 'desktop' ? { active: target.active } : {}),
    };
    if (state.host === 'desktop' && target.cloudId && checks.storedArtworkVerified === true && input.updated) {
      const refresh = await (options.refresh ?? refreshNativePet)({
        expectedSpritePath: art.file,
        cloudId: target.cloudId,
      });
      delete resultInput.refreshUnavailable;
      delete resultInput.notice;
      resultInput = {
        ...resultInput,
        refreshRequested: refresh.refreshRequested,
        displayStatus: 'unconfirmed',
        observed:
          `${input.observed ?? ''} Cloud Pet artwork was independently compared with accepted pixels. ${refresh.notice}`.trim(),
        ...(!refresh.automaticRefresh && target.active !== false
          ? {
              refreshUnavailable: true,
              notice:
                'Cloud artwork was uploaded and verified; desktop resource refresh is unavailable. The updated artwork will load when this Pet is next fetched.',
            }
          : {}),
      };
    }
    return (pending.hostResult = validateHostResult(state, operationId, resultInput, target));
  });
}

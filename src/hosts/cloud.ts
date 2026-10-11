/** Shared cloud Pet handoff. No separate Dots Avatar or image format is created. */
import { text } from '../model.js';
import type { Store } from '../store.js';
import { ATLAS_CONTRACT } from './desktop/atlas.js';
import { isCloudId } from './desktop/mapping.js';
import { validateArt } from './art.js';
import { findAvatar, selectedAvatar, type FindOptions } from './identity.js';
import { diagnose } from './diagnose.js';
import type { HostAdapter } from './index.js';
import { validateHostResult } from './result.js';
import { cloudAppearanceRequest } from './cloud-request.js';
export { cloudAppearanceRequest } from './cloud-request.js';
import { repairCommands } from './repair.js';

/** Only a resolved owned Pet ID can be bound; a local binding is kept as its alias. */
export async function bindCloud(store: Store, cloudId: string) {
  const id = text(cloudId, 'cloudId');
  if (!isCloudId(id)) throw new Error('Bind an existing pet_ cloud Pet ID');
  return store.transaction(async state => {
    if (!state.pet) throw new Error('Allocate the pet identity first');
    const old = state.pet.binding;
    if (state.host === 'desktop' && old?.avatarId.startsWith('custom:')) {
      const target = await findAvatar(state);
      if (target.cloudId !== id)
        throw new Error('The fresh host migration mapping must confirm this local/cloud binding');
    }
    if (old?.cloudId && old.cloudId !== id) throw new Error('Target is already bound; preserve the existing cloud Pet');
    if (old && isCloudId(old.avatarId) && old.avatarId !== id)
      throw new Error('Target is already bound; preserve the existing cloud Pet');
    return (state.pet.binding = { ...old, host: state.host, avatarId: old?.avatarId ?? id, cloudId: id });
  });
}

export async function setCloudAppearance(store: Store, options: FindOptions = {}) {
  return store.transaction(async state => {
    const target = await findAvatar(state, options);
    const request = await cloudAppearanceRequest(state, target);
    state.pending!.hostResult = validateHostResult(state, request.operationId, request, target);
    return request;
  });
}

export const cloud: HostAdapter = {
  appearanceKind: 'atlas',
  artContract: ATLAS_CONTRACT,
  validateArt,
  findAvatar,
  selectedAvatar,
  setAppearance: setCloudAppearance,
  diagnose,
  commands: {
    'bind-cloud': { usage: 'bind-cloud CLOUD_PET_ID', run: (args, store) => bindCloud(store, args[0]) },
    ...repairCommands,
  },
};

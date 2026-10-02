/**
 * Dots Avatar. GenPet saves the artwork and the bound target; the Dots Agent updates the Avatar
 * with its own tools (host-request → update → host-result).
 */
import { desiredAppearance } from '../appearance.js';
import { pendingFor } from '../lifecycle.js';
import { text, type State } from '../model.js';
import type { Store } from '../store.js';
import type { HostAdapter } from './index.js';

/** Bind the real Dots Avatar once; later updates always target it. */
export async function bindAvatar(store: Store, avatarId: string) {
  if (store.host !== 'dots') throw new Error('bind-avatar is for a real Dots pet');
  return store.transaction(state => {
    if (!state.pet) throw new Error('Allocate the pet identity first');
    const id = text(avatarId, 'avatarId');
    if (state.pet.binding && state.pet.binding.avatarId !== id)
      throw new Error('Target is already bound; preserve the existing Avatar');
    return (state.pet.binding ??= { host: 'dots', avatarId: id });
  });
}

/** Everything the Dots Agent needs to update the bound Avatar for the pending story. */
export function hostRequest(state: State) {
  if (state.host !== 'dots') throw new Error('This handoff is for Dots Avatar updates');
  if (!state.pending?.plan?.appearance) throw new Error('No planned Avatar update');
  if (!state.pet?.binding) throw new Error('Bind the actual Dots Avatar before requesting an update');
  const pending = pendingFor(state, state.pending.id);
  const art = desiredAppearance(state);
  if (!art || art.kind !== 'avatar') throw new Error('Complete or select Dots Avatar artwork first');
  return {
    operation: 'update-avatar',
    petId: pending.petId,
    operationId: pending.id,
    name: state.pet.name,
    target: state.pet.binding,
    file: art.file,
    appearanceId: art.id,
    description: state.pending.plan.appearance.description,
    stage: state.pending.plan.stage,
    refreshWhenActive: true,
    preserveCurrentSelection: true,
  };
}

export const dots: HostAdapter = {
  appearanceKind: 'avatar',
  referenceKinds: ['portrait', 'avatar'],
  artContract: null,
  commands: {
    'bind-avatar': { usage: 'bind-avatar AVATAR_ID', run: (args, store) => bindAvatar(store, args[0]) },
    'host-request': { usage: 'host-request', run: async (_, store) => hostRequest(await store.peek()) },
  },
};

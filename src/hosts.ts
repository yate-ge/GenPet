import { text } from './core.js';
import type { Store, State } from './store.js';
import { desiredAppearance, pendingFor } from './story.js';

export function hostRequest(state: State) {
  if (state.host !== 'dots') throw new Error('This handoff is for Dots Avatar updates');
  if (!state.pending?.plan?.appearance) throw new Error('No planned Avatar update');
  if (!state.pet?.binding) throw new Error('Bind the actual Dots Avatar before requesting an update');
  const pending=pendingFor(state,state.pending.id), art=desiredAppearance(state);
  if (!art || art.kind!=='avatar') throw new Error('Complete or select Dots Avatar artwork first');
  return { operation:'update-avatar', petId:pending.petId, operationId:pending.id,
    name:state.pet!.name,
    target:state.pet!.binding, file:art.file, appearanceId:art.id,
    description:state.pending.plan.appearance.description, stage:state.pending.plan.stage,
    refreshWhenActive:true, preserveCurrentSelection:true };
}
export async function bindAvatar(store: Store, avatarId: string) {
  if (store.host!=='dots') throw new Error('bind-avatar is for a real Dots pet');
  return store.transaction(state=>{
    if (!state.pet) throw new Error('Allocate the pet identity first');
    const id=text(avatarId,'avatarId');
    if (state.pet.binding && state.pet.binding.avatarId!==id) throw new Error('Target is already bound; preserve the existing Avatar');
    return state.pet.binding ??= {host:'dots',avatarId:id};
  });
}

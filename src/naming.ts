/** User naming after the hatch: invite once, save only the user's own answer, keyed by Pet ID. */
import { identifier, text, type Pet, type State } from './model.js';
import type { Store } from './store.js';

export function namingDue(state: State): boolean {
  return !state.pending && !!state.pet && state.pet.stage !== 'egg' && state.pet.naming?.status === 'unasked';
}
function target(state: State, petId: string): Pet {
  identifier(petId, 'petId');
  if (!state.pet || state.pet.id !== petId) throw new Error('Naming reply belongs to another or missing pet');
  if (state.pending) throw new Error('Finish the unfinished story before naming this pet');
  return state.pet;
}
/** Call after delivering the naming question; a read or a failed hatch cannot mark it asked. */
export async function markNameAsked(store: Store, petId: string) {
  return store.transaction(state => {
    const pet = target(state, petId);
    if (!namingDue(state)) return { petId, asked: false, status: pet.naming?.status ?? 'named' };
    pet.naming = { status: 'asked', askedAt: Date.now() };
    return { petId, asked: true, status: pet.naming.status };
  });
}
export async function namePet(store: Store, petId: string, userName: string) {
  const name = text(userName, 'user supplied name');
  if (name.length > 100 || /[\u0000-\u001f\u007f]/.test(name))
    throw new Error('Name must be one line of at most 100 characters');
  return store.transaction(state => {
    const pet = target(state, petId);
    if (pet.name === name && pet.naming?.status === 'named') return pet;
    pet.name = name;
    pet.naming = {
      status: 'named',
      namedAt: Date.now(),
      ...(pet.naming?.askedAt ? { askedAt: pet.naming.askedAt } : {}),
    };
    pet.revision++;
    return pet;
  });
}

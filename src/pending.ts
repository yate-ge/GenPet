/** Stable references to unfinished work; host adapters do not depend on the story lifecycle. */
import { createHash } from 'node:crypto';
import type { Pending, State } from './model.js';

export function pendingFor(state: State, id: string): Pending {
  const pending = state.pending;
  if (
    !pending ||
    pending.id !== id ||
    !state.pet ||
    pending.petId !== state.pet.id ||
    pending.baseRevision !== state.pet.revision
  )
    throw new Error('Stale story operation; read the persisted record before continuing');
  return pending;
}

/** Artwork accepted for an older saved plan cannot complete the current story. */
export function requestId(state: State): string | null {
  const pending = state.pending;
  if (!pending?.plan) return null;
  return createHash('sha256')
    .update(JSON.stringify([pending.id, pending.petId, pending.baseRevision, pending.plan]))
    .digest('hex')
    .slice(0, 24);
}

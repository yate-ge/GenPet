/** Which saved artwork a story's planned appearance refers to. */
import type { ArtRecord, Stage, State } from './model.js';
import { requestId } from './pending.js';
export { requestId } from './pending.js';

/** A saved appearance of this pet, in this host's format, drawn for this stage. */
export function appearanceFor(state: State, stage: Stage, id: string): ArtRecord {
  const art = state.art.find(
    art => art.id === id && art.petId === state.pet!.id && art.kind === 'atlas' && art.stage === stage,
  );
  if (!art)
    throw new Error('Reusable appearance is missing, belongs to another pet, or is incompatible with this host/stage');
  return art;
}

/** The appearance the pet should show once the pending story completes (or its current one). */
export function desiredAppearance(state: State): ArtRecord | undefined {
  const plan = state.pending?.plan;
  if (!plan?.appearance) return state.art.find(art => art.id === state.pet?.state.appearanceId);
  if (plan.appearance.reuseArtId) return appearanceFor(state, plan.stage!, plan.appearance.reuseArtId);
  const current = requestId(state);
  return state.art.findLast(art => art.petId === state.pet?.id && art.requestId === current && art.kind === 'atlas');
}

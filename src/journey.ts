/** Durable adoption choices. The Agent owns the scene and interprets the user's words. */
import { text } from './model.js';
import { pendingFor } from './pending.js';
import type { Store } from './store.js';

export interface JourneyStep {
  background?: string;
  scene: string;
  options: string[];
  userInput?: string;
  inputRefs: string[];
  complete?: boolean;
}

export async function journeyStep(store: Store, operationId: string, input: JourneyStep) {
  const scene = text(input.scene, 'scene');
  const userInput = input.userInput === undefined ? undefined : text(input.userInput, "the user's actual choice");
  if (!Array.isArray(input.options) || !Array.isArray(input.inputRefs))
    throw new Error('options and inputRefs must be arrays');
  const offered = {
    scene,
    options: input.options.map(option => text(option, 'option')),
    inputRefs: input.inputRefs.map(ref => text(ref, 'input reference')),
  };
  return store.transaction(state => {
    const pending = pendingFor(state, operationId);
    if (pending.mode !== 'initialization' || pending.plan)
      throw new Error('Choices belong to an unplanned adoption journey');
    const journey = (pending.journey ??= { background: input.background?.trim() || scene, rounds: [] });
    if (userInput === undefined) {
      if (journey.completed || journey.rounds.length >= 5) throw new Error('The journey is complete');
      if (journey.awaiting && JSON.stringify(journey.awaiting) !== JSON.stringify(offered))
        throw new Error('Resume the offered scene before replacing it');
      journey.awaiting ??= offered;
      return journey;
    }
    if (
      journey.awaiting &&
      (journey.awaiting.scene !== scene || JSON.stringify(journey.awaiting.options) !== JSON.stringify(offered.options))
    )
      throw new Error('The answer belongs to a different scene');
    const round = { ...offered, userInput };
    const last = journey.rounds.at(-1);
    if (last && JSON.stringify(last) === JSON.stringify(round)) {
      if (input.complete) {
        journey.completed = true;
        delete journey.awaiting;
      }
      return journey;
    }
    if (journey.completed || journey.rounds.length >= 5)
      throw new Error('The journey is complete; continue with its gene design');
    journey.rounds.push(round);
    delete journey.awaiting;
    if (input.complete || journey.rounds.length === 5) journey.completed = true;
    return journey;
  });
}

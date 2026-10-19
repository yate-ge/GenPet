/** Seeded choices over the Agent's grounded proposals. Content stays with the Agent. */
import { createHash, randomBytes } from 'node:crypto';
import { identifier, text, type State, type Story } from './model.js';
import { pendingFor } from './pending.js';
import type { Store } from './store.js';

export const SOURCE_WEIGHTS = { natural: 70, object: 20, imagined: 10 } as const;
export type SourceType = keyof typeof SOURCE_WEIGHTS;
export interface Candidate {
  id: string;
  description: string;
  contextRefs: string[];
  /** Only in records from before 0.10.13, when stories were also chosen from candidates. */
  outputs?: ('appearance' | 'home' | 'item')[];
}

export function seededValue(seed: string, purpose: string): number {
  return createHash('sha256').update(`${seed}\0${purpose}`).digest().readUInt32BE(0) / 0x1_0000_0000;
}

export function sourceFromSeed(seed: string): SourceType {
  const value = seededValue(seed, 'source') * 100;
  return value < SOURCE_WEIGHTS.natural
    ? 'natural'
    : value < SOURCE_WEIGHTS.natural + SOURCE_WEIGHTS.object
      ? 'object'
      : 'imagined';
}

/** What a story showed: a new look, the home, another scene, or a prop. */
export function storyOutputs(story: Story, previous: Story | undefined, state: State): string[] {
  const result: string[] = [];
  const appearanceChanged =
    typeof story.appearanceChanged === 'boolean'
      ? story.appearanceChanged
      : previous
        ? story.appearanceId !== previous.appearanceId
        : state.pet?.soul.acquisition?.storyId === story.id;
  if (story.appearanceId && appearanceChanged) result.push('appearance');
  for (const art of state.art.filter(art => story.mediaIds.includes(art.id)))
    if (art.kind === 'prop') result.push('item');
    else if (art.kind === 'scene') result.push(art.home ? 'home' : 'scene');
  return [...new Set(result)];
}

export function recentContent(state: State, count = 10) {
  const items = state.stories.slice(-Math.max(1, count)).map((story, index, stories) => ({
    id: story.id,
    at: story.at,
    outputs: storyOutputs(story, index ? stories[index - 1] : state.stories[state.stories.indexOf(story) - 1], state),
    stage: story.stage,
    special: story.special,
    text: story.text,
    reason: story.reason,
  }));
  return { items, memory: state.pet?.memory ?? null };
}

export async function chooseSource(store: Store, operationId: string, seed?: string) {
  return store.transaction(state => {
    const pending = pendingFor(state, operationId);
    if (pending.sourceChoice) {
      if (seed && seed !== pending.sourceChoice.seed) throw new Error('The source seed is already saved');
      return pending.sourceChoice;
    }
    const value = seed ? text(seed, 'seed') : randomBytes(16).toString('hex');
    return (pending.sourceChoice = { seed: value, sourceType: sourceFromSeed(value) });
  });
}

export async function chooseCandidate(
  store: Store,
  operationId: string,
  input: { purpose: 'genes'; candidates: Candidate[] },
  seed?: string,
) {
  // Stories are decided by the Agent from the observed situation; only the genes design is seeded.
  if (input.purpose !== 'genes') throw new Error('Choice purpose must be genes; a story is decided directly');
  if (!Array.isArray(input.candidates) || input.candidates.length < 2)
    throw new Error('Provide at least two grounded candidates');
  const candidates = input.candidates.map(candidate => ({
    id: identifier(candidate.id, 'candidateId'),
    description: text(candidate.description, 'candidate description'),
    contextRefs: candidate.contextRefs.map(ref => text(ref, 'context reference')),
  }));
  if (new Set(candidates.map(candidate => candidate.id)).size !== candidates.length)
    throw new Error('Candidate IDs must be unique');
  const hash = createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
  return store.transaction(state => {
    const pending = pendingFor(state, operationId);
    if (pending.selection) {
      if (
        pending.selection.candidateHash !== hash ||
        pending.selection.purpose !== input.purpose ||
        (seed && seed !== pending.selection.seed)
      )
        throw new Error('The selected candidates and seed are already saved; resume them');
      return { ...pending.selection, candidates: pending.candidates };
    }
    const value = seed ?? pending.sourceChoice?.seed ?? randomBytes(16).toString('hex');
    const index = Math.floor(seededValue(value, input.purpose) * candidates.length);
    pending.candidates = candidates;
    pending.selection = {
      seed: value,
      purpose: input.purpose,
      candidateId: candidates[index].id,
      candidateHash: hash,
      ...(pending.sourceChoice ? { sourceType: pending.sourceChoice.sourceType } : {}),
    };
    return { ...pending.selection, candidates };
  });
}

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
  /** Proposed observable outputs, not a subject or activity taxonomy. */
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

export function storyOutputs(story: Story, previous?: Story, state?: State): string[] {
  const result: string[] = [];
  const appearanceChanged =
    typeof story.appearanceChanged === 'boolean'
      ? story.appearanceChanged
      : previous
        ? story.appearanceId !== previous.appearanceId
        : state?.pet?.soul.acquisition?.storyId === story.id;
  if (story.appearanceId && appearanceChanged) result.push('appearance');
  if (story.mediaIds.some(id => !state || state.art.some(art => art.id === id && art.kind !== 'artifact'))) {
    if (story.home !== undefined && story.home !== previous?.home) result.push('home');
    else result.push('item');
  }
  return result;
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
  let textOnlyStreak = 0;
  for (const item of [...items].reverse()) {
    if (item.outputs.length) break;
    textOnlyStreak++;
  }
  return { items, textOnlyStreak, visualRequired: textOnlyStreak >= 2, memory: state.pet?.memory ?? null };
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
  input: { purpose: 'story' | 'genes'; candidates: Candidate[] },
  seed?: string,
) {
  if (!['story', 'genes'].includes(input.purpose)) throw new Error('Choice purpose must be story or genes');
  if (!Array.isArray(input.candidates) || input.candidates.length < 2)
    throw new Error('Provide at least two grounded candidates');
  const candidates = input.candidates.map(candidate => ({
    id: identifier(candidate.id, 'candidateId'),
    description: text(candidate.description, 'candidate description'),
    contextRefs: candidate.contextRefs.map(ref => text(ref, 'context reference')),
    ...(candidate.outputs ? { outputs: candidate.outputs } : {}),
  }));
  if (new Set(candidates.map(candidate => candidate.id)).size !== candidates.length)
    throw new Error('Candidate IDs must be unique');
  if (candidates.some(candidate => candidate.outputs?.some(output => !['appearance', 'home', 'item'].includes(output))))
    throw new Error('Unknown visual output');
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
    const recent = recentContent(state);
    if (input.purpose === 'story' && !candidates.some(candidate => candidate.outputs?.length))
      throw new Error('Include a candidate with a visible output');
    // The Agent lists only candidates that fit the observed situation; the seed picks evenly among them.
    // Only the agreed fallback excludes text: it needs a user-related reference and may not run three times.
    const weights = candidates.map((candidate): number => {
      if (input.purpose !== 'story' || candidate.outputs?.length) return 1;
      return recent.visualRequired || !candidate.contextRefs.length ? 0 : 1;
    });
    let pick = seededValue(value, input.purpose) * weights.reduce((sum, weight) => sum + weight, 0);
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick < 0) {
        index = i;
        break;
      }
    }
    pending.candidates = candidates;
    pending.selection = {
      seed: value,
      purpose: input.purpose,
      candidateId: candidates[index].id,
      candidateHash: hash,
      ...(pending.sourceChoice ? { sourceType: pending.sourceChoice.sourceType } : {}),
    };
    return { ...pending.selection, candidates, weights };
  });
}

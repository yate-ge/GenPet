/** Growth eligibility and latest-time fallbacks, counted only while this Pet is active. */
import { stages, text, identifier, type GrowthClock, type Stage, type State } from './model.js';

const HOUR = 3_600_000,
  DAY = 24 * HOUR;
export const STAGE_CEILING: Partial<Record<Stage, number>> = { egg: 5 * HOUR, hatchling: 7 * DAY, juvenile: 7 * DAY };
export const SPECIAL_INTERVAL = 7 * DAY;
export const SPECIAL_DURATION = 2 * DAY;
export const EXPERIENCES_TO_GROW = 5;
export type GrowthChange = 'advance' | 'enter-special' | 'end-special';
const iso = (time: number) => new Date(time).toISOString();

function stageOrigin(state: State): number {
  const pet = state.pet!;
  const origin = state.legacy?.importedAt ?? pet.adoptedAt;
  if (pet.state.stage === 'egg') return origin;
  const times = state.stories
    .filter(story => story.petId === pet.id && story.stage === pet.state.stage)
    .map(story => story.at);
  return times.length ? Math.min(...times) : origin;
}
function initialClock(state: State): GrowthClock {
  const pet = state.pet!;
  const special = pet.state.special;
  return {
    stage: pet.state.stage,
    stageSince: stageOrigin(state),
    experiences: 0,
    pausedMs: 0,
    stagePausedMs: 0,
    specialPausedMs: 0,
    ...(special ? { specialSince: special.endedAt ?? special.since } : {}),
  };
}
/** Call only from a write transaction; reads use the same fallback without changing records. */
export function ensureGrowthClock(state: State): GrowthClock | null {
  if (!state.pet) return null;
  return (state.growthClock ??= initialClock(state));
}
export function pausedTime(state: State, now = Date.now()): number {
  const clock = state.growthClock;
  return clock ? clock.pausedMs + (clock.pausedAt === undefined ? 0 : Math.max(0, now - clock.pausedAt)) : 0;
}
/** A distinct committed rewrite counts once. Initial adoption and upgrade supplementation count zero. */
export function commitExperience(
  state: State,
  storyId: string,
  memoryText: string,
  at = Date.now(),
  count = true,
): boolean {
  const pet = state.pet;
  if (!pet) throw new Error('No Pet to remember this story');
  const id = identifier(storyId, 'memory storyId');
  const value = text(memoryText, 'memory');
  if (pet.memory.storyId === id || pet.memory.text === value || state.stories.some(story => story.id === id))
    return false;
  const clock = ensureGrowthClock(state)!;
  pet.memory = { text: value, updatedAt: at, storyId: id };
  if (count && state.pending?.mode !== 'initialization' && clock.lastExperienceStoryId !== id) {
    clock.experiences++;
    clock.lastExperienceStoryId = id;
  }
  return true;
}
/** Invoke after changing stage/form; the transition story does not add an experience to the new stage. */
export function stageAdvance(state: State, at = Date.now()): void {
  const pet = state.pet;
  if (!pet) return;
  const clock = ensureGrowthClock(state)!;
  const totalPaused = pausedTime(state, at);
  if (clock.stage !== pet.state.stage) {
    clock.stage = pet.state.stage;
    clock.stageSince = at;
    clock.experiences = 0;
    delete clock.lastExperienceStoryId;
    clock.stagePausedMs = totalPaused;
    clock.specialPausedMs = totalPaused;
  }
  const specialSince = pet.state.special ? (pet.state.special.endedAt ?? pet.state.special.since) : undefined;
  if (clock.specialSince !== specialSince) {
    clock.specialSince = specialSince;
    clock.specialPausedMs = totalPaused;
  }
}
/** Pure inspection: elapsed time alone never mutates stage, memory, or appearance. */
export function growth(state: State, now = Date.now()) {
  const pet = state.pet;
  if (!pet?.soul.genes || state.needsImport) return null;
  const clock = state.growthClock ?? initialClock(state);
  const since = clock.stage === pet.state.stage ? clock.stageSince : stageOrigin(state);
  const paused = pausedTime(state, now);
  const stagePause = Math.max(0, paused - clock.stagePausedMs);
  const ceiling = STAGE_CEILING[pet.state.stage];
  const deadline = ceiling === undefined ? null : since + ceiling + stagePause;
  let required: GrowthChange | null = deadline !== null && now >= deadline ? 'advance' : null;
  let special = null;
  if (pet.state.stage === 'adult') {
    const active = !!pet.state.special && pet.state.special.endedAt === undefined;
    const start = active ? pet.state.special!.since : Math.max(since, pet.state.special?.endedAt ?? 0);
    const specialPause = Math.max(0, paused - clock.specialPausedMs);
    const due = start + (active ? SPECIAL_DURATION : SPECIAL_INTERVAL) + specialPause;
    if (now >= due) required = active ? 'end-special' : 'enter-special';
    special = {
      active,
      ...(active ? { description: pet.state.special!.description } : {}),
      since: iso(start),
      ...(active ? { endBy: iso(due) } : { enterBy: iso(due) }),
    };
  }
  const experiences = clock.stage === pet.state.stage ? clock.experiences : 0;
  return {
    stage: pet.state.stage,
    next: stages[stages.indexOf(pet.state.stage) + 1] ?? null,
    since: iso(since),
    advanceBy: deadline === null ? null : iso(deadline),
    experiences,
    canAdvance: pet.state.stage !== 'adult' && (required === 'advance' || experiences >= EXPERIENCES_TO_GROW),
    paused: clock.pausedAt !== undefined,
    special,
    required,
  };
}

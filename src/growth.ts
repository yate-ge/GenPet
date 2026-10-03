/**
 * Growth pace. The Agent may evolve earlier from accumulated meaningful changes; these ceilings
 * only guarantee that each change happens at the latest by its deadline.
 */
import { stages, type Stage, type State } from './model.js';

const HOUR = 3_600_000,
  DAY = 24 * HOUR;
/** Latest time a stage may last before the next story must advance it. */
export const STAGE_CEILING: Partial<Record<Stage, number>> = { egg: 5 * HOUR, hatchling: 7 * DAY, juvenile: 7 * DAY };
/** An adult enters a special form at most this long after adulthood or the previous form ended. */
export const SPECIAL_INTERVAL = 7 * DAY;
/** A special form ends at most this long after it began. */
export const SPECIAL_DURATION = 2 * DAY;

export type GrowthChange = 'advance' | 'enter-special' | 'end-special';

const iso = (time: number) => new Date(time).toISOString();

/** When the current stage began: its first completed story, else the import or adoption time. */
function stageSince(state: State): number {
  const pet = state.pet!;
  return (
    state.stories.find(story => story.petId === pet.id && story.stage === pet.stage)?.at ??
    state.legacy?.importedAt ??
    pet.adoptedAt
  );
}

/** Where this pet stands against its pace ceilings, and which change the next story must carry, if any. */
export function growth(state: State, now = Date.now()) {
  const pet = state.pet;
  if (!pet?.genes) return null;
  const since = stageSince(state),
    ceiling = STAGE_CEILING[pet.stage],
    deadline = ceiling === undefined ? null : since + ceiling;
  let required: GrowthChange | null = deadline !== null && now >= deadline ? 'advance' : null;
  let special = null;
  if (pet.stage === 'adult') {
    const active = !!pet.special && pet.special.endedAt === undefined;
    const start = active ? pet.special!.since : Math.max(since, pet.special?.endedAt ?? 0);
    const due = start + (active ? SPECIAL_DURATION : SPECIAL_INTERVAL);
    if (now >= due) required = active ? 'end-special' : 'enter-special';
    special = {
      active,
      ...(active ? { description: pet.special!.description } : {}),
      since: iso(start),
      [active ? 'endBy' : 'enterBy']: iso(due),
    };
  }
  return {
    stage: pet.stage,
    next: stages[stages.indexOf(pet.stage) + 1] ?? null,
    since: iso(since),
    advanceBy: deadline === null ? null : iso(deadline),
    special,
    required,
  };
}

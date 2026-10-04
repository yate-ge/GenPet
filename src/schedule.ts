/** Periodic story checks. The Agent's scheduler asks `due`; a trigger ID makes each period run once. */
import { text, type State } from './model.js';
import type { Store } from './store.js';

/** The host runs a check this often; a growth ceiling is therefore met at most one interval late. */
export const CHECK_INTERVAL = 5 * 3_600_000;

/**
 * The period the clock is in, counted from the pet's adoption (the first one belongs to the initialization story).
 * Missed periods coalesce into the current one; a completed trigger is not due again.
 */
export function dueStory(
  state: State,
  now = Date.now(),
  timezone = state.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const period = state.pet ? Math.floor((now - state.pet.adoptedAt) / CHECK_INTERVAL) : 0;
  const triggerId = period >= 1 ? `period:${period}` : null;
  const stopped = isStopped(state);
  return {
    timezone,
    intervalHours: CHECK_INTERVAL / 3_600_000,
    triggerId,
    stopped,
    due: !stopped && !!triggerId && !state.stories.some(story => story.triggerId === triggerId),
    pending: state.pending?.id ?? null,
  };
}

const isStopped = (state: State) => state.schedule?.stoppedAt !== undefined && state.schedule.resumedAt === undefined;
const iso = (time: number) => new Date(time).toISOString();

/**
 * How long the pet has gone without a story, as a user-usage fact for the next story (cause unknown: the user
 * may be busy, the computer off, or the check stopped). A stop or resume after the last story is included.
 */
export function timeSense(state: State, now = Date.now()) {
  const last = state.stories.at(-1)?.at ?? state.pet?.adoptedAt;
  if (last === undefined) return null;
  const schedule = state.schedule;
  const pause = schedule?.stoppedAt !== undefined && schedule.stoppedAt >= last;
  return {
    lastStoryAt: iso(last),
    hoursSinceLastStory: Math.round(((now - last) / 3_600_000) * 10) / 10,
    checkIntervalHours: CHECK_INTERVAL / 3_600_000,
    ...(pause ? { userStoppedCheckAt: iso(schedule.stoppedAt!) } : {}),
    ...(pause && schedule.resumedAt !== undefined ? { checkResumedAt: iso(schedule.resumedAt) } : {}),
  };
}

/** `schedule`: remember the timezone and the Agent's own scheduled-task reference; this also resumes a stopped check. */
export async function setSchedule(store: Store, timezone: string, reference: string) {
  const zone = text(timezone, 'timezone');
  new Intl.DateTimeFormat('en', { timeZone: zone }); // Throws on an unknown timezone.
  const ref = text(reference, 'schedule reference');
  return store.transaction(state => {
    const previous = state.schedule;
    const resumedAt = previous?.stoppedAt !== undefined ? (previous.resumedAt ?? Date.now()) : undefined;
    return (state.schedule = {
      timezone: zone,
      reference: ref,
      ...(previous?.stoppedAt !== undefined ? { stoppedAt: previous.stoppedAt, resumedAt } : {}),
    });
  });
}

/** `schedule-stop`: the user turned the check off. The pet and its history stay; the stop is remembered. */
export async function stopSchedule(store: Store) {
  return store.transaction(state => {
    const previous = state.schedule;
    if (isStopped(state)) return { stopped: true, stoppedAt: previous!.stoppedAt, previousReference: null };
    state.schedule = {
      timezone: previous?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      stoppedAt: Date.now(),
    };
    return { stopped: true, stoppedAt: state.schedule.stoppedAt, previousReference: previous?.reference ?? null };
  });
}

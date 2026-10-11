/** Periodic story checks and growth deadlines, with stable triggers for safe retries. */
import { text, type State } from './model.js';
import type { Store } from './store.js';
import { growth } from './growth.js';

/** Ordinary stories use this interval; the host must also wake for earlier growth deadlines. */
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
  const growing = growth(state, now);
  const special = growing?.special;
  const deadlineAt = growing?.advanceBy ?? (special ? ('endBy' in special ? special.endBy : special.enterBy) : null);
  const deadline = deadlineAt === null ? null : Date.parse(deadlineAt);
  const growthTrigger =
    growing?.required && state.pet ? `growth:${state.pet.id}:${growing.stage}:${growing.required}:${deadline}` : null;
  const triggerId = growthTrigger ?? (period >= 1 ? `period:${period}` : null);
  const stopped =
    isStopped(state) ||
    state.handoff?.status === 'exported' ||
    state.needsImport === true ||
    state.growthClock?.pausedAt !== undefined;
  const completed = !!triggerId && state.stories.some(story => story.triggerId === triggerId);
  // A deadline story also covers its ordinary period, without marking a future period complete.
  const periodCovered =
    !growthTrigger &&
    !!state.pet &&
    state.stories.some(
      story =>
        story.petId === state.pet!.id &&
        story.triggerId.startsWith('growth:') &&
        Math.floor((story.at - state.pet!.adoptedAt) / CHECK_INTERVAL) === period,
    );
  const due = !stopped && !!triggerId && !completed && !periodCovered;
  const nextPeriod = state.pet ? state.pet.adoptedAt + (Math.max(0, period) + 1) * CHECK_INTERVAL : null;
  const nextCheck =
    stopped || nextPeriod === null
      ? null
      : due
        ? now
        : Math.min(nextPeriod, deadline !== null && deadline > now ? deadline : Infinity);
  return {
    timezone,
    intervalHours: CHECK_INTERVAL / 3_600_000,
    triggerId,
    stopped,
    due,
    pending: state.pending?.id ?? null,
    growthRequired: growing?.required ?? null,
    growthDeadlineAt: deadlineAt,
    nextCheckAt: nextCheck === null ? null : iso(nextCheck),
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
    ...(state.pending
      ? {
          pendingStartedAt: iso(state.pending.startedAt),
          pendingHours: Math.round(((now - state.pending.startedAt) / 3_600_000) * 10) / 10,
        }
      : {}),
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
    if (isStopped(state))
      return { stopped: true, stoppedAt: previous!.stoppedAt, previousReference: previous?.reference ?? null };
    state.schedule = {
      ...previous,
      timezone: previous?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      stoppedAt: Date.now(),
    };
    delete state.schedule.resumedAt;
    return { stopped: true, stoppedAt: state.schedule.stoppedAt, previousReference: previous?.reference ?? null };
  });
}

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
  return {
    timezone,
    intervalHours: CHECK_INTERVAL / 3_600_000,
    triggerId,
    due: !!triggerId && !state.stories.some(story => story.triggerId === triggerId),
    pending: state.pending?.id ?? null,
  };
}

/** `schedule`: remember the timezone and the Agent's own scheduled-task reference. */
export async function setSchedule(store: Store, timezone: string, reference: string) {
  const zone = text(timezone, 'timezone');
  new Intl.DateTimeFormat('en', { timeZone: zone }); // Throws on an unknown timezone.
  const schedule = { timezone: zone, reference: text(reference, 'schedule reference') };
  return store.transaction(state => (state.schedule = schedule));
}

/** Daily story triggers. The Agent's scheduler asks `due`; a trigger ID makes each slot run once. */
import { text, type State } from './model.js';
import type { Store } from './store.js';

export const DAILY_TIMES = ['07:00', '12:00', '16:00', '21:00'];

/** The latest slot reached today, and whether its story has run. */
export function dueStory(
  state: State,
  now = Date.now(),
  timezone = state.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (key: string) => parts.find(part => part.type === key)!.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}`;
  const times = state.schedule?.times ?? DAILY_TIMES;
  const slot = times.filter(slot => slot <= time).at(-1);
  const triggerId = slot ? `daily:${date}:${slot}:${timezone.replace(/\//g, '.')}` : null;
  return {
    timezone,
    times,
    triggerId,
    due: !!triggerId && !state.stories.some(story => story.triggerId === triggerId),
    pending: state.pending?.id ?? null,
  };
}

/** `schedule`: remember the timezone and the Agent's own scheduled-task reference. */
export async function setSchedule(store: Store, timezone: string, reference: string) {
  const zone = text(timezone, 'timezone');
  new Intl.DateTimeFormat('en', { timeZone: zone }); // Throws on an unknown timezone.
  const schedule = { timezone: zone, reference: text(reference, 'schedule reference'), times: DAILY_TIMES };
  return store.transaction(state => (state.schedule = schedule));
}

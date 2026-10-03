/** The compact `status` the Agent reads by default; `status --full` returns the whole record. */
import type { State } from './model.js';

const RECENT = { stories: 5, art: 30, chats: 10 };

export function statusView(state: State) {
  const chats = state.chats ?? [];
  return {
    version: state.version,
    host: state.host,
    pet: state.pet,
    pending: state.pending,
    ...(state.schedule ? { schedule: state.schedule } : {}),
    ...(state.legacy ? { legacy: state.legacy } : {}),
    storyCount: state.stories.length,
    stories: state.stories.slice(-RECENT.stories).map(({ steps, hostResult, ...story }) => story),
    artCount: state.art.length,
    art: state.art
      .slice(-RECENT.art)
      .map(({ id, stage, kind, description, file }) => ({ id, stage, kind, description, file })),
    chatCount: chats.length,
    chats: chats.slice(-RECENT.chats).map(({ at, text }) => ({ at, text })),
  };
}

/** Compact Agent status and the brief shared with the cloud Pet. Raw units stay available separately. */
import type { Pet, State } from './model.js';

const RECENT = { stories: 5, art: 30, chats: 10 };
export function briefForPet(pet: Pet): string {
  return JSON.stringify({
    id: pet.id,
    name: pet.name,
    soul: {
      genes: pet.soul.genes,
      ...(pet.soul.personality ? { personality: pet.soul.personality } : {}),
      ...(pet.soul.acquisition
        ? { acquisition: { place: pet.soul.acquisition.place, connection: pet.soul.acquisition.connection } }
        : {}),
    },
    memory: pet.memory.text,
    state: {
      stage: pet.state.stage,
      description: pet.state.description,
      ...(pet.state.home ? { home: pet.state.home } : {}),
      ...(pet.state.special && pet.state.special.endedAt === undefined
        ? { special: pet.state.special.description }
        : {}),
    },
  });
}

/** Cloud metadata has a real 500-character limit. Longer source needs an Agent summary, never truncation. */
export function cloudBriefForPet(pet: Pet, draft?: { petId: string; revision: number; description: string }) {
  const source = briefForPet(pet);
  if (draft !== undefined) {
    if (!draft || draft.petId !== pet.id || draft.revision !== pet.revision)
      throw new Error('Brief draft must match the current Pet ID and revision');
    if (typeof draft.description !== 'string' || !draft.description.trim() || [...draft.description].length > 500)
      throw new Error('Cloud Pet description must contain at most 500 characters');
  }
  const description = draft?.description ?? ([...source].length <= 500 ? source : null);
  return {
    petId: pet.id,
    revision: pet.revision,
    sourceBrief: JSON.parse(source),
    description,
    maxDescriptionLength: 500,
    needsSummary: description === null,
  };
}
export function statusView(state: State) {
  const chats = state.chats ?? [];
  const pending = state.pending ? (({ steps, ...record }) => record)(state.pending) : null;
  return {
    version: state.version,
    host: state.host,
    pet: state.pet,
    pending,
    ...(state.schedule ? { schedule: state.schedule } : {}),
    ...(state.legacy ? { legacy: state.legacy } : {}),
    ...(state.needsImport ? { needsImport: true, legacyFile: state.legacyFile } : {}),
    ...(state.handoff ? { handoff: state.handoff } : {}),
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

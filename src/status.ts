/** Compact Agent status and the adoption line shared with the cloud Pet. Raw units stay available separately. */
import type { ArtRecord, Pet, State } from './model.js';

const RECENT = { stories: 5, art: 30, chats: 10 };

/** The only text written to a Pet's description: its name once the user gave one, then when and where it was adopted. */
export function adoptionLine(pet: Pet): string {
  const at = new Date(pet.adoptedAt);
  const date = `${at.getFullYear()}年${at.getMonth() + 1}月${at.getDate()}日`;
  const place = pet.soul.acquisition?.place.trim();
  const named = pet.naming?.status === 'named' ? `它叫${pet.name}。` : '';
  return `${named}你在${date}${place ? ` ${place}` : ''}领养了这种宠物`;
}

const artLine = ({ id, stage, kind, description, file, home }: ArtRecord) => ({
  id,
  stage,
  kind,
  description,
  file,
  ...(home ? { home } : {}),
});

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
    /** Every look of the pet, so an old one can be worn again. */
    looks: state.art.filter(art => art.kind === 'atlas').map(artLine),
    /** Everything it gave, brought or kept, with where it is now. */
    items: state.items ?? [],
    art: state.art
      .filter(art => art.kind !== 'atlas')
      .slice(-RECENT.art)
      .map(artLine),
    chatCount: chats.length,
    chats: chats.slice(-RECENT.chats).map(({ at, text }) => ({ at, text })),
  };
}

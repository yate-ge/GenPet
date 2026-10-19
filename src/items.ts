/** What the pet gave, brought or kept: checks on a plan's item changes and the commit with the story. */
import { identifier, itemStatuses, text } from './model.js';
import type { ArtRecord, Item, ItemChange, State, Story } from './model.js';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** The id a new item gets, fixed by its place in the plan so a retried plan stays identical. */
const newItemId = (pendingId: string, index: number) => `item-${pendingId}-${index}`;

/** Engineering checks on a plan's item changes; new items get their ids here. */
export function planItems(state: State, pendingId: string, input: unknown, hasHome: boolean): ItemChange[] {
  if (!Array.isArray(input)) throw new Error('items must be an array');
  const known = new Map((state.items ?? []).map(item => [item.id, item]));
  const seen = new Set<string>();
  return input.map((raw, index) => {
    if (!object(raw)) throw new Error('Each item change must be an object');
    if (!itemStatuses.includes(raw.status as never)) throw new Error(`Item status must be ${itemStatuses.join(', ')}`);
    const change: ItemChange = { status: raw.status as ItemChange['status'] };
    const fresh = raw.id === undefined || raw.id === newItemId(pendingId, index);
    if (fresh) {
      change.id = newItemId(pendingId, index);
      change.name = text(raw.name, 'item name');
      change.description = text(raw.description, 'item description');
    } else {
      change.id = identifier(raw.id, 'item id');
      if (!known.has(change.id)) throw new Error(`Unknown item ${change.id}; leave out the id to add a new one`);
      if (raw.name !== undefined) change.name = text(raw.name, 'item name');
      if (raw.description !== undefined) change.description = text(raw.description, 'item description');
    }
    if (seen.has(change.id)) throw new Error(`Item ${change.id} appears twice in one plan`);
    seen.add(change.id);
    if (raw.place !== undefined) change.place = text(raw.place, 'item place');
    if (change.place && change.status !== 'at-home') throw new Error('Only an item at home has a place');
    if (change.status === 'at-home' && !hasHome) throw new Error('An item can be at home only after the home exists');
    if (raw.artId !== undefined) {
      change.artId = identifier(raw.artId, 'item artId');
      const art = state.art.find(art => art.id === change.artId && art.petId === state.pet!.id);
      if (!art || (art.kind !== 'prop' && art.kind !== 'scene'))
        throw new Error('An item image must be this pet’s prop or scene');
    }
    return change;
  });
}

/** Commit a plan's item changes. A new item without an image takes the story's one new prop image. */
export function commitItems(state: State, story: Story, changes: ItemChange[], storyMedia: ArtRecord[]) {
  const items = (state.items ??= []);
  const props = storyMedia.filter(art => art.kind === 'prop');
  const fresh = changes.filter(change => !items.some(item => item.id === change.id));
  for (const change of changes) {
    const existing = items.find(item => item.id === change.id);
    const artId = change.artId ?? (props.length === 1 && fresh.length === 1 && !existing ? props[0].id : undefined);
    if (existing) {
      if (change.name) existing.name = change.name;
      if (change.description) existing.description = change.description;
      if (artId) existing.artId = artId;
      existing.status = change.status;
      if (change.status === 'at-home' && change.place) existing.place = change.place;
      else if (change.status !== 'at-home') delete existing.place;
      existing.updatedAt = story.at;
      existing.updatedStoryId = story.id;
    } else {
      const item: Item = {
        id: change.id!,
        name: change.name!,
        description: change.description!,
        status: change.status,
        ...(change.place ? { place: change.place } : {}),
        storyId: story.id,
        ...(artId ? { artId } : {}),
        updatedAt: story.at,
        updatedStoryId: story.id,
      };
      items.push(item);
    }
  }
  if (changes.length) story.itemIds = changes.map(change => change.id!);
}

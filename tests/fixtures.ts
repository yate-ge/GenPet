import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { actions } from '../src/art.js';
import { beginStory, planStory, recordHostResult, desiredAppearance } from '../src/story.js';
import { bindAvatar } from '../src/hosts.js';
import type { Store } from '../src/store.js';
export const personality =
  'Patient and curious. Offers quiet company without assuming the user needs help. Draws its feelers close when listening and unfolds them when exploring. A fictional individual met beside an unfinished drawing; not a claim about user personality.';
export const initialPlan = {
  text: 'You found an egg beside the unfinished drawing.',
  basis: 'The user is working on a drawing; the encounter is fictional.',
  state: 'A quiet intact egg.',
  stage: 'egg' as const,
  genes:
    'A faceless, low-bodied creature with four short clawed feet, two tactile feelers and a left-curving tail; its back folds develop across stages while these body relationships persist.',
  personality,
  place: 'Beside an unfinished drawing',
  connection: 'A meaningful encounter around an ongoing creative task',
  appearance: { description: 'A complete conventional pixel egg shell with curved gray-blue markings.' },
};
export async function initialization(store: Store, trigger = 'test:init') {
  const result = await beginStory(store, trigger, 'initialization');
  if (result.status !== 'pending' || !result.pending) throw new Error('Expected pending initialization');
  await planStory(store, result.pending.id, initialPlan);
  return result.pending.id;
}
export async function image(file: string, atlas = false, badUnused = false) {
  const width = atlas ? 1536 : 32,
    height = atlas ? 2288 : 32,
    png = new PNG({ width, height });
  for (let row = 0; row < (atlas ? 11 : 1); row++)
    for (let col = 0; col < (atlas ? (row === 0 ? 7 : row < 9 ? actions[row].count : 8) : 1); col++)
      for (let y = 8; y < 18; y++)
        for (let x = 8; x < 18; x++) {
          const i = ((row * (atlas ? 208 : 0) + y) * width + col * (atlas ? 192 : 0) + x) * 4;
          png.data[i] = 180;
          png.data[i + 1] = 80;
          png.data[i + 2] = 40;
          png.data[i + 3] = 255;
        }
  if (badUnused) png.data[(20 * width + 7 * 192 + 20) * 4 + 3] = 255;
  await writeFile(file, PNG.sync.write(png));
}
/** Stand-in for the host step: record an inactive, updated target so a story can finish in isolated data. */
export async function hostDone(store: Store, op: string) {
  if (store.host === 'dots' && !(await store.peek()).pet!.binding) await bindAvatar(store, 'dots:test');
  const state = await store.peek();
  return recordHostResult(store, op, {
    petId: state.pet!.id,
    operationId: op,
    appearanceId: desiredAppearance(state)!.id,
    avatarId: state.pet!.binding?.avatarId ?? `custom:${state.pet!.id}`,
    updated: true,
    active: false,
    refreshRequested: false,
    displayStatus: 'unconfirmed',
  });
}

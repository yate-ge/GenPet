import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { desiredAppearance } from '../src/appearance.js';
import { actions } from '../src/hosts/desktop/atlas.js';
import { bindCloud } from '../src/hosts/cloud.js';
import { recordHostResult } from '../src/hosts/result.js';
import { beginStory, planStory } from '../src/lifecycle.js';
import type { Store } from '../src/store.js';
import { journeyStep } from '../src/journey.js';
export const personality =
  'Patient and curious. Offers quiet company without assuming the user needs help. Draws its feelers close when listening and unfolds them when exploring. A fictional individual met beside an unfinished drawing; not a claim about user personality.';
export const initialPlan = {
  text: 'You found an egg beside the unfinished drawing.',
  reason: 'The user is working on a drawing; the encounter is fictional.',
  contextRefs: ['fixture:creative-task'],
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
  const result = await beginStory(store, trigger);
  if (result.status !== 'pending' || !result.pending) throw new Error('Expected pending initialization');
  await journeyReady(store, result.pending.id);
  await planStory(store, result.pending.id, initialPlan);
  return result.pending.id;
}
export async function journeyReady(store: Store, operationId: string) {
  return journeyStep(store, operationId, {
    scene: 'A fictional unfinished drawing beside a lamp',
    options: ['Inspect the drawing', 'Follow the lamp'],
    userInput: 'I inspect the drawing',
    inputRefs: ['fixture:creative-task', 'fixture:synthetic-context', 'fixture:shared-event'],
    complete: true,
  });
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
  if (!(await store.peek()).pet!.binding) await bindCloud(store, 'pet_testfixture');
  const state = await store.peek();
  const art = desiredAppearance(state)!;
  const readbackFile = path.join(store.root, `host-fixture-${op}.png`);
  await copyFile(art.file, readbackFile);
  return recordHostResult(store, op, {
    petId: state.pet!.id,
    operationId: op,
    appearanceId: art.id,
    avatarId: state.pet!.binding!.cloudId ?? state.pet!.binding!.avatarId,
    updated: true,
    storedArtworkVerified: null,
    readbackFile,
    observed: 'Independent synthetic host copy, no live host or visual acceptance claimed.',
    active: false,
    refreshRequested: false,
    displayStatus: 'unconfirmed',
  });
}

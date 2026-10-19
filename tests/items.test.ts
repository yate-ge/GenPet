import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.js';
import { beginStory, finishStory, planStory } from '../src/lifecycle.js';
import { acceptArt, artRequest } from '../src/art.js';
import { normalizeRecord } from '../src/migration.js';
import { statusView } from '../src/status.js';
import { storyOutputs } from '../src/variety.js';
import { journeyReady, initialPlan, image, hostDone } from './fixtures.js';
import type { ArtKind, ItemChange, StoryPlan } from '../src/model.js';

async function adopted() {
  const root = path.resolve('output/tests/items-tests', randomUUID());
  await mkdir(root, { recursive: true });
  const store = new Store(root, 'cloud');
  const op = (await beginStory(store, 'adopt')).pending!.id;
  await journeyReady(store, op);
  await planStory(store, op, initialPlan);
  const egg = path.join(root, 'egg.png');
  await image(egg, true);
  await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file: egg,
    kind: 'atlas',
    source: 'Synthetic structural fixture, not visual acceptance',
  });
  await hostDone(store, op);
  await finishStory(store, op);
  return { root, store };
}
const base = { reason: 'Synthetic source-backed event', contextRefs: ['fixture:shared-event'], state: 'Calm' };
async function picture(store: Store, root: string, kind: ArtKind, home = false) {
  const file = path.join(root, `${randomUUID()}.png`);
  await image(file);
  return acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind,
    home,
    source: 'Synthetic image; no visual acceptance',
  });
}
async function story(store: Store, trigger: string, plan: Record<string, unknown>, shown?: [ArtKind, boolean?]) {
  const op = (await beginStory(store, trigger)).pending!.id;
  await planStory(store, op, { text: `Story ${trigger}`, ...base, ...plan });
  if (shown) await picture(store, path.dirname((await store.peek()).art[0].file), ...shown);
  return finishStory(store, op);
}

test('a given prop becomes an item tied to its image and the story that brought it', async () => {
  const { store, root } = await adopted();
  const op = (await beginStory(store, 'gift')).pending!.id;
  await planStory(store, op, {
    text: 'A small medal',
    ...base,
    items: [{ name: 'Check medal', description: 'A tin medal engraved with a check mark', status: 'with-user' }],
  });
  const prop = await picture(store, root, 'prop');
  const done = await finishStory(store, op);
  const state = await store.peek();
  assert.equal(state.items!.length, 1);
  assert.deepEqual(
    { name: state.items![0].name, status: state.items![0].status, storyId: state.items![0].storyId },
    { name: 'Check medal', status: 'with-user', storyId: done.id },
  );
  assert.equal(state.items![0].artId, prop.id);
  assert.deepEqual(done.itemIds, [state.items![0].id]);
  assert.deepEqual(storyOutputs(done, undefined, state), ['item']);
  const view = statusView(state);
  assert.equal(view.items.length, 1);
  assert.deepEqual(
    view.looks.map(look => look.kind),
    ['atlas'],
  );
  assert.ok(view.art.every(art => art.kind !== 'atlas'));
});

test('an item moves into the home and out of it; plans with bad changes are refused', async () => {
  const { store, root } = await adopted();
  await store.transaction(state => void (state.pet!.state.home = 'Moss nest'));
  await story(
    store,
    'brought',
    { items: [{ name: 'Postcard', description: 'A postcard from the hill', status: 'carried' }] },
    ['prop'],
  );
  const id = (await store.peek()).items![0].id;
  const op = (await beginStory(store, 'place')).pending!.id;
  for (const items of <ItemChange[][]>[
    [{ id: 'item-missing', status: 'at-home' }],
    [{ id, status: 'carried', place: 'shelf' }],
    [{ id, status: 'on-the-moon' as never }],
    [
      { id, status: 'at-home' },
      { id, status: 'gone' },
    ],
    [{ name: 'No description', status: 'at-home' }],
  ])
    await assert.rejects(planStory(store, op, { text: 'x', ...base, items }));
  await planStory(store, op, {
    text: 'On the shelf',
    ...base,
    items: [{ id, status: 'at-home', place: 'shelf by the window' }],
  });
  await picture(store, root, 'scene', true);
  const done = await finishStory(store, op);
  let item = (await store.peek()).items![0];
  assert.deepEqual([item.status, item.place, item.updatedStoryId], ['at-home', 'shelf by the window', done.id]);
  assert.equal(item.storyId, (await store.peek()).stories[1].id);
  assert.deepEqual(storyOutputs(done, undefined, await store.peek()), ['home']);

  await story(store, 'tidy', { items: [{ id, status: 'gone' }] }, ['scene']);
  item = (await store.peek()).items![0];
  assert.deepEqual([item.status, item.place], ['gone', undefined]);
});

test('an item can sit at home only once a home exists, and a retried plan is identical', async () => {
  const { store } = await adopted();
  const op = (await beginStory(store, 'homeless')).pending!.id;
  const plan: StoryPlan = {
    text: 'x',
    ...base,
    items: [{ name: 'Lamp', description: 'A tiny lamp', status: 'at-home' }],
  };
  await assert.rejects(planStory(store, op, plan), /home exists/);
  const again: StoryPlan = { ...plan, items: [{ ...plan.items![0], status: 'carried' }] };
  const first = await planStory(store, op, again);
  assert.deepEqual((await planStory(store, op, again)).plan, first.plan);
  assert.deepEqual((await planStory(store, op, first.plan as never)).plan, first.plan);
});

test('records written before the three image kinds read as scene and prop, with the home found from its story', async () => {
  const { store } = await adopted();
  const state = await store.peek();
  const art = state.art.find(art => art.kind === 'atlas')!;
  const old = JSON.parse(JSON.stringify(state));
  old.stories.push({ ...old.stories[0], id: 'old-home', home: 'Moss nest', mediaIds: ['old-1'] });
  old.stories.push({ ...old.stories[0], id: 'old-gift', mediaIds: ['old-2'] });
  old.art.push(
    { ...art, id: 'old-1', kind: 'story' },
    { ...art, id: 'old-2', kind: 'artifact' },
    { ...art, id: 'old-3', kind: 'story' },
  );
  const read = normalizeRecord(old, 'cloud');
  const kinds = Object.fromEntries(read.art.map(art => [art.id, [art.kind, art.home]]));
  assert.deepEqual(kinds['old-1'], ['scene', true]);
  assert.deepEqual(kinds['old-2'], ['prop', undefined]);
  assert.deepEqual(kinds['old-3'], ['scene', undefined]);
});

test('only a scene can show the home', async () => {
  const { store, root } = await adopted();
  await store.transaction(state => void (state.pet!.state.home = 'Moss nest'));
  const op = (await beginStory(store, 'kinds')).pending!.id;
  await planStory(store, op, { text: 'x', ...base });
  await assert.rejects(picture(store, root, 'prop', true), /Only a scene/);
  await assert.rejects(picture(store, root, 'story' as ArtKind), /Unknown art kind/);
});

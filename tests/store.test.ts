import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { createPet } from '../src/model.js';

async function rootFor(label: string) {
  const base = path.resolve('output/implementation-20261011/records');
  await mkdir(base, { recursive: true });
  return mkdtemp(path.join(base, `${label}-`));
}
test('hosts have independent identities and read-only status or failed changes publish no files', async () => {
  const root = await rootFor('store-hosts'),
    desktop = new Store(root),
    cloud = new Store(root, 'cloud');
  assert.equal((await desktop.peek()).pet, null);
  await assert.rejects(access(desktop.root));
  const pets = await Promise.all([desktop.createPet({ confirmed: true }), cloud.createPet({ confirmed: true })]);
  assert.equal(new Set(pets.map(state => state.pet!.id)).size, 2);
  assert.notEqual(desktop.file, cloud.file);
  const before = await readFile(desktop.file, 'utf8');
  await cloud.transaction(state => {
    state.pet!.name = 'Cloud only';
  });
  assert.equal(await readFile(desktop.file, 'utf8'), before);
  await assert.rejects(
    desktop.transaction(state => {
      state.pet!.name = 'Unpublished';
      throw new Error('Stop');
    }),
    /Stop/,
  );
  assert.equal(await readFile(desktop.file, 'utf8'), before);
  await writeFile(path.join(root, 'pre-corruption-state.json'), before);
  await writeFile(desktop.file, 'broken');
  await assert.rejects(desktop.peek());
  assert.equal(await readFile(desktop.file, 'utf8'), 'broken');
});

test('host lock preserves concurrent revision increments across independently constructed stores', async () => {
  const root = await rootFor('store-lock');
  const original = new Store(root);
  await original.createPet({ confirmed: true });
  await Promise.all(
    Array.from({ length: 12 }, () =>
      new Store(root).transaction(state => {
        state.pet!.revision++;
      }),
    ),
  );
  assert.equal((await original.peek()).pet!.revision, 12);
});

test('immutable soul fields can be filled once and never replaced by a later callback', async () => {
  const store = new Store(await rootFor('store-soul'));
  await store.transaction(state => {
    state.pet = createPet();
    state.pet.soul.genes = 'Saved synthetic species';
  });
  await store.transaction(state => {
    state.pet!.soul.personality = 'Quiet; says puf.';
  });
  const before = await readFile(store.file, 'utf8');
  await assert.rejects(
    store.transaction(state => {
      state.pet!.soul.genes = 'A different individual';
    }),
    /retains its soul.genes/,
  );
  await assert.rejects(
    store.transaction(state => {
      state.pet!.soul.personality = 'A different voice';
    }),
    /retains its soul.personality/,
  );
  await assert.rejects(
    store.transaction(state => {
      state.pet!.memory.text = 'Written outside a story';
    }),
    /completed story/,
  );
  assert.equal(await readFile(store.file, 'utf8'), before);
});

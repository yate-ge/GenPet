import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, access, rename } from 'node:fs/promises';
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

test('a missing selected or explicit Pet reports its identity and path and never becomes a fresh adoption', async () => {
  const store = new Store(await rootFor('store-missing-record'));
  const first = await store.createPet({ confirmed: true });
  const a = store.forPet(first.pet!.id);
  const second = await store.createPet({ confirmed: true });
  const b = store.forPet(second.pet!.id);
  const registry = await readFile(store.registryFile);
  await rename(b.file, path.join(store.base, 'missing-active-original.json'));
  const missing = (error: any) => {
    assert.equal(error.code, 'GENPET_RECORD_MISSING');
    assert.equal(error.registered, true);
    assert.ok(error.message.includes(second.pet!.id));
    assert.ok(error.message.includes(b.file));
    return true;
  };
  await assert.rejects(store.peek(), missing);
  await assert.rejects(b.peek(), missing);
  await assert.rejects(store.resolveActive(undefined), missing);
  await assert.rejects(store.createPet({ confirmed: true }), missing);
  assert.equal((await a.peek()).pet!.id, first.pet!.id);
  const listed = await store.listPets();
  assert.equal(listed.length, 2);
  assert.ok(listed.find(pet => pet.id === second.pet!.id)!.error!.includes(b.file));
  assert.deepEqual(await readFile(store.registryFile), registry);
  await assert.rejects(store.forPet('explicit-unknown').peek(), (error: any) => {
    assert.equal(error.code, 'GENPET_RECORD_MISSING');
    assert.equal(error.registered, false);
    assert.ok(error.message.includes('explicit-unknown'));
    return true;
  });
});

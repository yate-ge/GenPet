import { retainFixture as rm } from './evidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { pluginRoot } from '../src/config.js';
import { beginStory } from '../src/lifecycle.js';
import { startServer } from '../src/debugger/server.js';
import { readInventory, saveHostPets } from '../src/debugger/inventory.js';
import { hostTestDirectory } from './host-fixtures.js';
test('debugger is read-only, rejects cross-origin actions and stops', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-debugger-')),
    store = new Store(root);
  await beginStory(store, 'init');
  const before = await readFile(store.file, 'utf8');
  const server = await startServer(0, root),
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const { state, token } = await (await fetch(url + '/api/state')).json();
    assert.equal(state.pet.id, (await store.peek()).pet!.id);
    // The launcher replaces a debugger whose package differs, e.g. one left running across an upgrade.
    assert.equal((await (await fetch(url + '/api/health')).json()).pluginRoot, pluginRoot());
    assert.equal(await readFile(store.file, 'utf8'), before);
    assert.equal((await fetch(url + '/api/state', { headers: { Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(url + '/api/action', { method: 'POST', body: '{}' })).status, 403);
    const action = (input: object) =>
      fetch(url + '/api/action', { method: 'POST', headers: { 'X-GenPet-Token': token }, body: JSON.stringify(input) });
    assert.equal((await action({ action: 'adopt' })).status, 400);
    assert.equal(await readFile(store.file, 'utf8'), before);
    for (const route of ['/', '/app.js', '/style.css']) assert.equal((await fetch(url + route)).status, 200);
    // The console lists this machine's GenPet records and labels each story's visible outputs.
    const { records } = await (await fetch(url + '/api/records')).json();
    assert.deepEqual(
      records.map((record: { host: string; id: string }) => [record.host, record.id]),
      [['desktop', state.pet.id]],
    );
    const detail = await (await fetch(url + `/api/state?host=desktop&pet=${encodeURIComponent(state.pet.id)}`)).json();
    assert.deepEqual(
      Object.keys(detail.outputs),
      detail.state.stories.map((story: { id: string }) => story.id),
    );
    assert.equal((await action({ action: 'switch-pet', petId: 'dewey' })).status, 400);
    assert.equal((await action({ action: 'stop' })).status, 200);
  } finally {
    server.close();
    server.closeAllConnections();
    await rm(root, { recursive: true, force: true });
  }
});

test('debugger inventory lists every local Pet and marks GenPets and records hosted here', async () => {
  const base = await hostTestDirectory('inventory-data'),
    home = await hostTestDirectory('inventory-home');
  const scope = JSON.stringify(['account', 'user']);
  await writeFile(
    path.join(home, '.codex-global-state.json'),
    JSON.stringify({
      'electron-persisted-atom-state': {
        'migrated-cloud-pet-ids-v1': { [scope]: { 'custom:old-local': 'pet_migrated' } },
        'cloud-pet-artwork-cache': {
          accountId: 'account',
          userId: 'user',
          pets: [{ id: 'pet_bound' }, { id: 'pet_named' }, { id: 'pet_other' }, { id: 'pet_unnamed' }],
        },
      },
    }),
  );
  for (const [dir, manifest] of [
    ['old-local', { displayName: 'genpet-abc123', genpetId: 'genpet-elsewhere' }],
    ['plain', { displayName: 'Plain' }],
  ] as const) {
    await mkdir(path.join(home, 'pets', dir), { recursive: true });
    await writeFile(path.join(home, 'pets', dir, 'pet.json'), JSON.stringify(manifest));
  }
  const store = new Store(base, 'cloud');
  const adopted = await store.createPet({ confirmed: true, name: 'Mochi' });
  await store.transaction(state => {
    state.pet!.binding = { host: 'cloud', avatarId: 'pet_bound', cloudId: 'pet_bound' };
  });
  const list = path.join(base, 'list-pets.json');
  await writeFile(
    list,
    JSON.stringify([
      { structuredContent: { pets: [{ id: 'pet_named', name: 'genpet-def456' }], cursor: 'next' } },
      {
        pets: [
          { id: 'pet_other', name: 'Other', description: 'not a brief' },
          { id: 'pet_bound', name: 'Mochi', description: JSON.stringify({ id: adopted.pet!.id }) },
        ],
      },
    ]),
  );
  assert.deepEqual(await saveHostPets(base, list), { file: path.join(base, 'debugger', 'host-pets.json'), pets: 3 });
  const inventory = await readInventory(base, home),
    byId = Object.fromEntries(inventory.pets.map(pet => [pet.id, pet]));
  assert.equal(byId.pet_bound.hostedHere, true);
  assert.equal(byId.pet_bound.records[0].petId, adopted.pet!.id);
  assert.equal(inventory.pets[0].id, 'pet_bound');
  assert.deepEqual([byId.pet_migrated.genpet, byId.pet_migrated.hostedHere], [true, false]);
  assert.equal(byId.pet_migrated.localId, 'custom:old-local');
  assert.equal(byId.pet_named.genpet, true);
  assert.equal(byId.pet_other.genpet, false);
  assert.equal(byId['custom:plain'].genpet, false);
  assert.deepEqual([byId.pet_unnamed.genpet, byId.pet_unnamed.name], [null, null]);

  const previousHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = home;
  const server = await startServer(0, base),
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    assert.deepEqual(await (await fetch(url + '/api/inventory')).json(), inventory);
    // The debugger package host is desktop; a cloud record is still readable by host.
    const query = `?host=cloud&pet=${encodeURIComponent(adopted.pet!.id)}`;
    assert.equal((await (await fetch(url + '/api/state' + query)).json()).state.pet.name, 'Mochi');
  } finally {
    if (previousHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousHome;
    server.close();
    server.closeAllConnections();
  }
});

import { retainFixture as rm } from './evidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { pluginRoot } from '../src/config.js';
import { beginStory } from '../src/lifecycle.js';
import { startServer } from '../src/debugger-server.js';
import { readInventory, saveHostPets } from '../src/inventory.js';
import { hostTestDirectory } from './host-fixtures.js';
import { frame, settingsResponse, withAppTools } from './fake-app-tools.js';
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
  assert.equal(byId.codex.genpet, false);

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

test('debugger switches only the host selection to a listed Pet and leaves records unchanged', async () => {
  const base = await hostTestDirectory('switch-data'),
    home = await hostTestDirectory('switch-home');
  await writeFile(path.join(home, '.codex-global-state.json'), JSON.stringify({ 'electron-persisted-atom-state': {} }));
  const store = new Store(base);
  await beginStory(store, 'init');
  const before = await readFile(store.file, 'utf8');
  let selected = 'codex';
  await withAppTools(
    (request, socket) => {
      if (request.params?.tool === 'write_settings')
        selected = request.params.arguments.settings!['selected-avatar-id'] as string;
      socket.write(frame(settingsResponse(request.id, selected)));
    },
    async ({ pipePath, calls }) => {
      const env = { CODEX_HOME: home, CODEX_APP_TOOLS_PIPE_PATH: pipePath, CODEX_THREAD_ID: 'isolated-thread' };
      const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
      Object.assign(process.env, env);
      const server = await startServer(0, base),
        url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      try {
        assert.equal((await (await fetch(url + '/api/health')).json()).appTools, true);
        assert.equal((await (await fetch(url + '/api/selection')).json()).effectiveSelectedPetId, 'codex');
        const { token } = await (await fetch(url + '/api/state')).json();
        const action = (petId: string) =>
          fetch(url + '/api/action', {
            method: 'POST',
            headers: { 'X-GenPet-Token': token },
            body: JSON.stringify({ action: 'switch-pet', petId }),
          });
        assert.equal((await action('pet_unlisted')).status, 400);
        assert.ok(calls.every(call => call.params?.tool === 'read_settings'));
        const switched = await (await action('dewey')).json();
        assert.equal(switched.result.effectiveSelectedPetId, 'dewey');
        assert.equal(switched.result.visualVerified, false);
        assert.equal(await readFile(store.file, 'utf8'), before);
      } finally {
        for (const [key, value] of Object.entries(previous))
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        server.close();
        server.closeAllConnections();
      }
    },
  );
});

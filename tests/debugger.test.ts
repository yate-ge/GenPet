import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { beginStory } from '../src/story.js';
import { startServer } from '../src/debugger-server.js';
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

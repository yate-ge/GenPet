import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { noteChat } from '../src/chat.js';
import { beginStory } from '../src/lifecycle.js';
import { initialization } from './fixtures.js';

test('a chat note is kept for later stories without touching the pet or an unfinished story', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-chat-')),
    store = new Store(root, 'dots');
  try {
    await assert.rejects(() => noteChat(store, 'genpet-none', 'No pet yet'), /another or missing pet/);
    const op = await initialization(store);
    const before = await store.peek();
    const note = await noteChat(store, before.pet!.id, 'The user said they start a new job on Monday.');
    const after = await store.peek();
    assert.deepEqual(after.chats, [note]);
    assert.deepEqual(after.pet, before.pet); // Revision and state are unchanged.
    assert.equal(after.pending!.id, op);
    assert.equal((await beginStory(store, 'test:init')).pending!.id, op); // The story is still resumable.
    await assert.rejects(() => noteChat(store, 'genpet-other', 'Wrong pet'), /another or missing pet/);
    await assert.rejects(() => noteChat(store, before.pet!.id, '  '), /chat note/);
    await assert.rejects(() => noteChat(store, before.pet!.id, 'x'.repeat(1001)), /brief record/);
    assert.equal((await store.peek()).chats!.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

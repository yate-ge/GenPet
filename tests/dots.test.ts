import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/store.js';
import { artRequest, acceptArt } from '../src/art.js';
import { installNative } from '../src/hosts/desktop/publish.js';
import { bindAvatar, hostRequest } from '../src/hosts/dots.js';
import { recordHostResult } from '../src/hosts/result.js';
import { finishStory, beginStory, planStory } from '../src/lifecycle.js';
import { initialization, image } from './fixtures.js';
test('Dots hands the bound target to its own tools, records the result and supports reuse', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-dots-host-')),
    store = new Store(root, 'dots');
  const update = async (op: string) => {
    const r = hostRequest(await store.peek());
    return recordHostResult(store, op, {
      petId: r.petId,
      operationId: r.operationId,
      appearanceId: r.appearanceId,
      avatarId: r.target.avatarId,
      updated: true,
      active: true,
      refreshRequested: true,
      displayStatus: 'unconfirmed',
    });
  };
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    const art = await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Synthetic Dots protocol fixture',
    });
    assert.deepEqual(artRequest(await store.peek())!.referenceFiles, [art.file]);
    const unbound = await store.peek();
    assert.throws(() => hostRequest(unbound), /Bind/);
    await bindAvatar(store, 'dots:self');
    assert.equal(hostRequest(await store.peek()).target!.avatarId, 'dots:self');
    assert.equal((await update(op)).avatarId, 'dots:self');
    await finishStory(store, op);
    await assert.rejects(() => installNative(store), /own Avatar/);
    const next = (await beginStory(store, 'dots:proactive')).pending!.id;
    await planStory(store, next, {
      text: 'The echo revisited its familiar place.',
      basis: 'A relevant proactive event',
      state: 'Resting',
      appearance: { description: 'Existing folded appearance', reuseArtId: art.id },
    });
    await update(next);
    await finishStory(store, next);
    assert.equal((await store.peek()).art.length, 1);
    const third = (await beginStory(store, 'dots:another')).pending!.id;
    await planStory(store, third, {
      text: 'Another story',
      basis: 'Context',
      state: 'Rest',
      appearance: { description: 'Reuse', reuseArtId: art.id },
    });
    const r = hostRequest(await store.peek());
    await assert.rejects(
      () =>
        recordHostResult(store, third, {
          petId: 'another',
          operationId: third,
          appearanceId: r.appearanceId,
          avatarId: 'dots:self',
          updated: true,
          active: true,
          refreshRequested: true,
          displayStatus: 'unconfirmed',
        }),
      /another pet/,
    );
    assert.equal((await store.peek()).stories.length, 2);
    assert.equal((await store.peek()).pending!.id, third);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

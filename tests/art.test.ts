import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/store.js';
import { artRequest, acceptArt, validateImage } from '../src/art.js';
import { exportNative, installNative } from '../src/hosts/desktop/publish.js';
import { finishStory, beginStory, planStory } from '../src/lifecycle.js';
import { initialization, image } from './fixtures.js';
test('native atlas validation rejects wrong layout, blank cells and occupied unused cells', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-validate-'));
  try {
    const file = path.join(root, 'atlas.png');
    await image(file, true);
    assert.equal((await validateImage(file, 'atlas')).height, 2288);
    await image(file, true, true);
    await assert.rejects(() => validateImage(file, 'atlas'), /Unused/);
    await image(file);
    await assert.rejects(() => validateImage(file, 'atlas'), /Atlas must/);
    await writeFile(file, Buffer.from('not an image'));
    await assert.rejects(() => validateImage(file, 'story'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('request freshness and durable media prevent stale or temporary-file installs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-art-')),
    store = new Store(root);
  try {
    await initialization(store);
    const file = path.join(root, 'art.png');
    await image(file, true);
    await assert.rejects(
      () => acceptArt(store, { requestId: 'wrong', file, kind: 'atlas', provenance: 'Test' }),
      /Stale/,
    );
    const request = artRequest(await store.peek())!,
      input = {
        requestId: request.id,
        file,
        kind: 'atlas' as const,
        provenance: 'Synthetic native validation fixture',
      };
    const art = await acceptArt(store, input);
    assert.equal((await acceptArt(store, input)).id, art.id);
    await rm(file);
    await validateImage(art.file, 'atlas');
    assert.equal((await store.peek()).art.length, 1);
    const destination = path.join(root, 'export');
    await exportNative(await store.peek(), destination);
    const first = await readFile(path.join(destination, 'pet.json'), 'utf8');
    await exportNative(await store.peek(), destination);
    assert.equal(await readFile(path.join(destination, 'previous-pet.json'), 'utf8'), first);
    // The host label is the short unique ID, not the user's name, so a rename never changes the entry.
    const petId = (await store.peek()).pet!.id;
    assert.equal(JSON.parse(first).displayName, petId.slice(0, 13));
    assert.match(JSON.parse(first).displayName, /^genpet-[0-9a-f]{6}$/);
    await store.transaction(state => void (state.pet!.name = 'Mochi')); // as if the user named it
    await exportNative(await store.peek(), destination);
    assert.equal(
      JSON.parse(await readFile(path.join(destination, 'pet.json'), 'utf8')).displayName,
      petId.slice(0, 13),
    );
    const foreign = path.join(root, 'foreign');
    await mkdir(foreign);
    await writeFile(path.join(foreign, 'pet.json'), JSON.stringify({ genpetId: 'another-pet' }));
    await assert.rejects(async () => exportNative(await store.peek(), foreign), /another pet/);
    assert.deepEqual(await readdir(foreign), ['pet.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('active and inactive updates retain target ID and never change selection; an undeliverable refresh completes with a notice', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-publish-')),
    store = new Store(root),
    old = process.env.CODEX_HOME;
  process.env.CODEX_HOME = path.join(root, 'codex');
  try {
    const op = await initialization(store),
      file = path.join(root, 'atlas.png');
    await image(file, true);
    await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'atlas',
      provenance: 'Synthetic publish fixture',
    });
    const petId = (await store.peek()).pet!.id;
    const refresh = async () => ({
      automaticRefresh: true,
      refreshRequested: true,
      displayStatus: 'unconfirmed' as const,
      strategy: 'ipc-query-invalidate' as const,
      expectedSpriteSha256: 'fixture',
      notice: 'Delivered',
    });
    const selection = async () => ({
      available: true as const,
      selectedPetId: `custom:${petId}`,
      effectiveSelectedPetId: `custom:${petId}`,
    });
    const result = await installNative(store, { refresh, selection });
    assert.equal(result.avatarId, `custom:${petId}`);
    assert.equal(result.active, true);
    assert.equal(result.displayStatus, 'unconfirmed');
    const failed = await installNative(store, {
      selection,
      refresh: async () => ({ ...(await refresh()), automaticRefresh: false, refreshRequested: false }),
    });
    // An undeliverable refresh is recorded honestly and no longer blocks the story forever.
    assert.equal(failed.refreshRequested, false);
    assert.equal(failed.refreshUnavailable, true);
    assert.match(failed.notice!, /next loads Pets/);
    assert.equal(failed.error, undefined);
    await finishStory(store, op);
    const next = (await beginStory(store, 'story:reuse')).pending!.id,
      art = (await store.peek()).art[0];
    await planStory(store, next, {
      text: 'A new quiet story.',
      basis: 'Same state fits',
      state: 'Quiet',
      appearance: { description: 'Same appearance', reuseArtId: art.id },
    });
    const inactive = await installNative(store, {
      refresh,
      selection: async () => ({ available: true, selectedPetId: 'dewey', effectiveSelectedPetId: 'dewey' }),
    });
    assert.equal(inactive.active, false);
    assert.equal(inactive.avatarId, result.avatarId);
    await finishStory(store, next);
    assert.deepEqual(await readdir(path.join(root, 'codex', 'pets')), [petId]);
  } finally {
    if (old === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = old;
    await rm(root, { recursive: true, force: true });
  }
});

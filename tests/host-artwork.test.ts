import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { image, initialization } from './fixtures.js';
import { hostTestDirectory, noSelection } from './host-fixtures.js';
import { artworkFingerprint, verifyStoredArtwork } from '../src/hosts/artwork.js';
import { Store } from '../src/store.js';
import { acceptArt, artRequest } from '../src/art.js';
import { bindCloud } from '../src/hosts/cloud.js';
import { recordHostResult, validateHostResult } from '../src/hosts/result.js';
import { finishStory } from '../src/lifecycle.js';

test('canonical artwork hashes ignore invisible RGB and preserve every visible pixel', async () => {
  const root = await hostTestDirectory('artwork-hashes');
  const accepted = path.join(root, 'accepted.png');
  const readback = path.join(root, 'readback.png');
  await image(accepted);
  const png = PNG.sync.read(await readFile(accepted));
  png.data[0] = 225;
  await writeFile(readback, PNG.sync.write(png));
  const same = await verifyStoredArtwork(accepted, readback);
  assert.equal(same.storedArtworkVerified, true);
  assert.notEqual(same.acceptedFileSha256, same.storedFileSha256);
  png.data[(8 * png.width + 8) * 4] = 20;
  await writeFile(readback, PNG.sync.write(png));
  assert.equal((await verifyStoredArtwork(accepted, readback)).storedArtworkVerified, false);
  await assert.rejects(artworkFingerprint('relative.png'), /absolute/);
});

test('host success requires actual readback and a mismatched picture leaves the story pending', async () => {
  const root = await hostTestDirectory('readback-required');
  const store = new Store(root, 'cloud');
  const operationId = await initialization(store);
  const file = path.join(root, 'accepted.png');
  await image(file, true);
  const art = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic artwork proof test',
  });
  await bindCloud(store, 'pet_readbackfixture');
  const state = await store.peek();
  const base = {
    petId: state.pet!.id,
    operationId,
    appearanceId: art.id,
    avatarId: 'pet_readbackfixture',
    updated: true,
    storedArtworkVerified: null,
    active: false,
    refreshRequested: false,
    displayStatus: 'unconfirmed' as const,
    observed: 'Synthetic actual host image readback.',
  };
  await assert.rejects(
    recordHostResult(store, operationId, { ...base, storedArtworkVerified: true }, { selection: noSelection }),
    /actual host readback file/,
  );
  await assert.rejects(
    recordHostResult(store, operationId, { ...base, readbackFile: art.file }, { selection: noSelection }),
    /separate file/,
  );
  const readbackFile = path.join(root, 'cloud-readback.png');
  const png = PNG.sync.read(await readFile(file));
  png.data[(8 * png.width + 8) * 4] = 15;
  await writeFile(readbackFile, PNG.sync.write(png));
  const failed = await recordHostResult(store, operationId, { ...base, readbackFile }, { selection: noSelection });
  assert.equal(failed.storedArtworkVerified, false);
  await assert.rejects(finishStory(store, operationId), /stored|verified|Host/i);
  assert.equal((await store.peek()).pending!.id, operationId);
  await copyFile(file, readbackFile);
  const selfReported = { ...base, displayStatus: 'confirmed' as const, observed: 'I can see the new Pet.' };
  assert.throws(() => validateHostResult(state, operationId, selfReported), /displayed image/);
  await assert.rejects(
    recordHostResult(store, operationId, { ...selfReported, readbackFile }, { selection: noSelection }),
    /displayed image/,
  );
  assert.equal(
    (await recordHostResult(store, operationId, { ...base, readbackFile }, { selection: noSelection }))
      .storedArtworkVerified,
    true,
  );
  await finishStory(store, operationId);
  assert.equal((await store.peek()).pending, null);
  // Historical receipts remain readable; this compatibility cannot authorize a new confirmation.
  const saved = JSON.parse(await readFile(store.file, 'utf8'));
  await writeFile(path.join(root, 'before-historical-receipt.json'), JSON.stringify(saved, null, 2));
  saved.stories[0].hostResult.displayStatus = 'confirmed';
  await writeFile(store.file, JSON.stringify(saved));
  assert.equal((await store.peek()).stories[0].hostResult!.displayStatus, 'confirmed');
});

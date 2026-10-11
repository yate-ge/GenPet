import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { acceptArt, artRequest } from '../src/art.js';
import { beginStory, finishStory, planStory } from '../src/lifecycle.js';
import { installNative } from '../src/hosts/desktop/publish.js';
import { repairAppearance, repairResult } from '../src/hosts/repair.js';
import { diagnose } from '../src/hosts/diagnose.js';
import { image, initialization, hostDone } from './fixtures.js';
import { hostTestDirectory, noMigration, noSelection, withHostHome } from './host-fixtures.js';

const skippedRefresh = async () => ({
  automaticRefresh: false,
  refreshRequested: false,
  displayStatus: 'unconfirmed' as const,
  strategy: 'none' as const,
  expectedSpriteSha256: 'fixture',
  notice: 'Isolated refresh skipped',
});

async function accepted(store: Store, root: string) {
  const op = await initialization(store);
  const file = path.join(root, 'atlas.png');
  await image(file, true);
  const art = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic repair fixture',
  });
  return { op, art };
}

test('local appearance repair restores current accepted art and leaves pending story and Pet record byte-for-byte intact', async () => {
  await withHostHome(async home => {
    const root = await hostTestDirectory('repair-local');
    const store = new Store(root, 'desktop');
    const { op, art } = await accepted(store, root);
    await installNative(store, { selection: noSelection, mapping: noMigration, refresh: skippedRefresh });
    await finishStory(store, op);
    const next = (await beginStory(store, 'repair:pending-story')).pending!.id;
    await planStory(store, next, {
      text: 'A later unfinished appearance story.',
      reason: 'Synthetic repair fixture',
      state: 'A future look',
      appearance: { description: 'Future look' },
    });
    const before = await readFile(store.file, 'utf8');
    const result = await repairAppearance(store, {
      home,
      selection: noSelection,
      mapping: noMigration,
      refresh: skippedRefresh,
    });
    assert.equal(result.appearanceId, art.id);
    assert.equal('storedArtworkVerified' in result && result.storedArtworkVerified, true);
    assert.equal('displayStatus' in result && result.displayStatus, 'unconfirmed');
    assert.equal(await readFile(store.file, 'utf8'), before);
    assert.ok(result.reportFile);
    const diagnosis = await diagnose(store, { home, selection: noSelection, ipcSocketPath: null });
    assert.equal(diagnosis.acceptedArtwork!.appearanceId, art.id);
    assert.ok(diagnosis.agentSteps.some(step => 'command' in step && step.command === 'repair-appearance'));
  });
});

test('cloud repair gives same-ID upload steps and verifies separate readback without creating a story', async () => {
  const root = await hostTestDirectory('repair-cloud');
  const store = new Store(root, 'cloud');
  const { op, art } = await accepted(store, root);
  await hostDone(store, op);
  await finishStory(store, op);
  const state = await store.peek();
  const before = await readFile(store.file, 'utf8');
  const request = await repairAppearance(store, { selection: noSelection });
  assert.equal(request.avatarId, state.pet!.binding!.cloudId);
  assert.equal('updated' in request && request.updated, false);
  assert.equal(await readFile(store.file, 'utf8'), before);
  const readbackFile = path.join(root, 'repair-cloud-readback.png');
  await copyFile(art.file, readbackFile);
  const result = await repairResult(
    store,
    state.pet!.id,
    {
      avatarId: request.avatarId,
      appearanceId: art.id,
      updated: true,
      readbackFile,
      observed: 'Synthetic actual host image readback for this Pet.',
    },
    { selection: noSelection },
  );
  assert.equal(result.storedArtworkVerified, true);
  assert.equal(await readFile(store.file, 'utf8'), before);
  assert.equal((await store.peek()).stories.length, 1);
  await assert.rejects(
    repairResult(
      store,
      state.pet!.id,
      { avatarId: 'pet_another', appearanceId: art.id, updated: true, readbackFile, observed: 'Wrong target' },
      { selection: noSelection },
    ),
    /actual host Pet/,
  );
});

test('repair cannot overwrite an uploaded pending appearance and leave its completion proof stale', async () => {
  const root = await hostTestDirectory('repair-pending-upload');
  const store = new Store(root, 'cloud');
  const { op, art } = await accepted(store, root);
  await hostDone(store, op);
  await finishStory(store, op);
  const next = (await beginStory(store, 'repair:uploaded-story')).pending!.id;
  await planStory(store, next, {
    text: 'A new appearance is already uploaded.',
    reason: 'Synthetic pending-upload regression fixture',
    state: 'New appearance',
    appearance: { description: 'New appearance' },
  });
  await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file: art.file,
    kind: 'atlas',
    source: 'Synthetic pending-upload regression fixture',
  });
  await hostDone(store, next);
  const state = await store.peek();
  const before = await readFile(store.file, 'utf8');
  await assert.rejects(repairAppearance(store, { selection: noSelection }), /resume that story/);
  await assert.rejects(
    repairResult(store, state.pet!.id, {
      avatarId: state.pet!.binding!.cloudId!,
      appearanceId: art.id,
      updated: true,
      readbackFile: path.join(root, `host-fixture-${op}.png`),
      observed: 'Older artwork must not replace the pending verified update.',
    }),
    /resume that story/,
  );
  assert.equal(await readFile(store.file, 'utf8'), before);
  assert.equal((await finishStory(store, next)).appearanceId, state.pending!.hostResult!.appearanceId);
});

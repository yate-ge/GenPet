import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { artRequest, acceptArt } from '../src/art.js';
import { installNative } from '../src/hosts/desktop/publish.js';
import { bindCloud, setCloudAppearance } from '../src/hosts/cloud.js';
import { recordHostResult } from '../src/hosts/result.js';
import { finishStory, beginStory, planStory } from '../src/lifecycle.js';
import { initialization, image, storyImage } from './fixtures.js';
import { hostTestDirectory, noSelection } from './host-fixtures.js';

test('shared cloud Pet hands off the exact ID, verifies host readback, and reuses accepted artwork', async () => {
  const root = await hostTestDirectory('cloud-pet');
  const store = new Store(root, 'cloud');
  const update = async (op: string) => {
    const request = await setCloudAppearance(store, { selection: noSelection });
    assert.equal(request.storedArtworkVerified, null);
    assert.equal(request.updated, false);
    assert.equal(request.preserveCurrentSelection, true);
    const readbackFile = path.join(root, `cloud-readback-${op}.png`);
    await copyFile(request.file!, readbackFile);
    return recordHostResult(
      store,
      op,
      {
        petId: request.petId,
        operationId: request.operationId,
        appearanceId: request.appearanceId,
        avatarId: request.avatarId,
        updated: true,
        storedArtworkVerified: null,
        active: false,
        refreshRequested: false,
        displayStatus: 'unconfirmed',
        readbackFile,
        observed: 'Synthetic cloud protocol readback retrieved for the exact requested Pet ID.',
      },
      { selection: noSelection },
    );
  };
  const op = await initialization(store);
  const file = path.join(root, 'atlas.png');
  await image(file, true);
  const art = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic cloud protocol fixture',
  });
  assert.deepEqual(artRequest(await store.peek())!.savedArt, [art]);
  await assert.rejects(() => setCloudAppearance(store, { selection: noSelection }), /Bind|Resolve/);
  await bindCloud(store, 'pet_cloudfixture');
  assert.equal((await setCloudAppearance(store, { selection: noSelection })).target!.avatarId, 'pet_cloudfixture');
  assert.equal((await update(op)).storedArtworkVerified, true);
  await finishStory(store, op);
  await assert.rejects(() => installNative(store), /shared cloud Pet/);
  const next = (await beginStory(store, 'cloud:story')).pending!.id;
  await planStory(store, next, {
    text: 'The companion revisited its familiar place.',
    reason: 'A relevant host event',
    contextRefs: ['fixture:creative-task'],
    state: 'Resting',
    appearance: { description: 'Existing appearance', reuseArtId: art.id },
  });
  await update(next);
  await storyImage(store, root);
  await finishStory(store, next);
  assert.equal((await store.peek()).art.filter(art => art.kind !== 'scene').length, 1);
  const third = (await beginStory(store, 'cloud:another')).pending!.id;
  await planStory(store, third, {
    text: 'Another story',
    reason: 'Context',
    state: 'Rest',
    appearance: { description: 'Reuse', reuseArtId: art.id },
  });
  const request = await setCloudAppearance(store, { selection: noSelection });
  await assert.rejects(
    () =>
      recordHostResult(
        store,
        third,
        {
          petId: 'another',
          operationId: third,
          appearanceId: request.appearanceId,
          avatarId: 'pet_cloudfixture',
          updated: true,
          storedArtworkVerified: null,
          active: false,
          refreshRequested: false,
          displayStatus: 'unconfirmed',
        },
        { selection: noSelection },
      ),
    /another pet/,
  );
  assert.equal((await store.peek()).stories.length, 2);
  assert.equal((await store.peek()).pending!.id, third);
});

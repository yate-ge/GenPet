import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { acceptArt, artRequest } from '../src/art.js';
import { hostFor } from '../src/hosts/index.js';
import { recordHostResult } from '../src/hosts/result.js';
import { Store } from '../src/store.js';
import { image, initialization } from './fixtures.js';
import { hostTestDirectory } from './host-fixtures.js';

test('both runtime environments share the Pet atlas and expose the four host operations', () => {
  const desktop = hostFor('desktop');
  const cloud = hostFor('cloud');
  for (const host of [desktop, cloud]) {
    assert.equal(host.appearanceKind, 'atlas');
    assert.ok(host.artContract);
    for (const operation of ['validateArt', 'findAvatar', 'setAppearance', 'diagnose'] as const)
      assert.equal(typeof host[operation], 'function');
  }
  assert.ok(desktop.commands.publish);
  assert.ok(cloud.commands['bind-cloud']);
  assert.equal('bind-avatar' in cloud.commands, false);
  assert.equal('host-request' in cloud.commands, false);
});

test('legacy Avatar artwork and host results without a bound target are rejected', async () => {
  const root = await hostTestDirectory('hosts');
  const store = new Store(root, 'cloud');
  const op = await initialization(store);
  const file = path.join(root, 'atlas.png');
  await image(file, true);
  const requestId = artRequest(await store.peek())!.id;
  await assert.rejects(
    acceptArt(store, { requestId, file, kind: 'avatar' as any, source: 'Legacy synthetic fixture' }),
    /Unknown|other host format|legacy/i,
  );
  const art = await acceptArt(store, { requestId, file, kind: 'atlas', source: 'Synthetic fixture' });
  const petId = (await store.peek()).pet!.id;
  await assert.rejects(
    recordHostResult(store, op, {
      petId,
      operationId: op,
      appearanceId: art.id,
      avatarId: 'pet_unbound',
      updated: true,
      storedArtworkVerified: null,
      active: false,
      refreshRequested: false,
      displayStatus: 'unconfirmed',
    }),
    /Bind the actual host target/,
  );
});

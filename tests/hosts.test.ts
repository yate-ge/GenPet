import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { acceptArt, artRequest } from '../src/art.js';
import { hostFor } from '../src/hosts/index.js';
import { recordHostResult } from '../src/hosts/result.js';
import { Store } from '../src/store.js';
import { image, initialization } from './fixtures.js';

test('each host declares its appearance format, art contract and only its own commands', () => {
  const desktop = hostFor('desktop');
  const dots = hostFor('dots');
  assert.equal(desktop.appearanceKind, 'atlas');
  assert.equal(dots.appearanceKind, 'avatar');
  assert.ok(desktop.artContract);
  assert.equal(dots.artContract, null);
  assert.deepEqual(Object.keys(desktop.commands).sort(), ['publish', 'switch-pet']);
  assert.deepEqual(Object.keys(dots.commands).sort(), ['bind-avatar', 'host-request']);
});

test('artwork in the other host format and host results without a bound target are rejected', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-hosts-'));
  try {
    const store = new Store(root, 'dots');
    const op = await initialization(store);
    const file = path.join(root, 'avatar.png');
    await image(file);
    const requestId = artRequest(await store.peek())!.id;
    const desktop = new Store(root, 'desktop');
    await initialization(desktop);
    const desktopRequest = artRequest(await desktop.peek())!.id;
    await assert.rejects(
      acceptArt(desktop, { requestId: desktopRequest, file, kind: 'avatar', provenance: 'Synthetic fixture' }),
      /other host format/,
    );
    const art = await acceptArt(store, { requestId, file, kind: 'avatar', provenance: 'Synthetic fixture' });
    const petId = (await store.peek()).pet!.id;
    await assert.rejects(
      recordHostResult(store, op, {
        petId,
        operationId: op,
        appearanceId: art.id,
        avatarId: 'dots:unbound',
        updated: true,
        active: false,
        refreshRequested: false,
        displayStatus: 'unconfirmed',
      }),
      /Bind the actual host target/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

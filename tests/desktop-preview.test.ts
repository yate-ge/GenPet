import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { acceptArt, artRequest } from '../src/art.js';
import { finishStory } from '../src/lifecycle.js';
import { bindCloud } from '../src/hosts/cloud.js';
import { installNative } from '../src/hosts/desktop/publish.js';
import { previewAppearance } from '../src/hosts/desktop/preview.js';
import { image, initialization } from './fixtures.js';
import { hostTestDirectory, noMigration, noSelection, withHostHome } from './host-fixtures.js';

const skippedRefresh = async () => ({
  automaticRefresh: false,
  refreshRequested: false,
  displayStatus: 'unconfirmed' as const,
  strategy: 'none' as const,
  expectedSpriteSha256: 'fixture',
  notice: 'Isolated refresh skipped',
});

async function adopted(store: Store, root: string) {
  const op = await initialization(store);
  const file = path.join(root, 'atlas.png');
  await image(file, true);
  const art = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic preview fixture',
  });
  return { op, art };
}

test('debug preview writes a saved atlas to the local host entry and leaves the Pet record unchanged', async () => {
  await withHostHome(async () => {
    const root = await hostTestDirectory('preview-local');
    const store = new Store(root, 'desktop');
    const { op, art } = await adopted(store, root);
    await installNative(store, { selection: noSelection, mapping: noMigration, refresh: skippedRefresh });
    await finishStory(store, op);
    const before = await readFile(store.file, 'utf8');
    const result = await previewAppearance(store, art.id);
    assert.equal(result.operation, 'preview-local-pet');
    assert.equal('storedArtworkVerified' in result && result.storedArtworkVerified, true);
    assert.equal(result.displayStatus, 'unconfirmed');
    assert.equal(await readFile(store.file, 'utf8'), before);
    await assert.rejects(previewAppearance(store, 'art-missing'), /saved atlas/);
  });
});

test('debug preview of a cloud Pet returns the Agent upload steps without changing records', async () => {
  await withHostHome(async () => {
    const root = await hostTestDirectory('preview-cloud');
    const store = new Store(root, 'desktop');
    const { art } = await adopted(store, root);
    await bindCloud(store, 'pet_previewfixture');
    const before = await readFile(store.file, 'utf8');
    const result = await previewAppearance(store, art.id);
    assert.equal(result.operation, 'preview-cloud-pet');
    assert.ok('agentSteps' in result && result.agentSteps.some(step => 'tool' in step && step.tool === 'update_pet'));
    assert.equal(await readFile(store.file, 'utf8'), before);
  });
});

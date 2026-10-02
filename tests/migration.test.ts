import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/store.js';
import { beginStory } from '../src/story.js';
import { migrateLegacy } from '../src/migration.js';
import { image } from './fixtures.js';
test('legacy migration preserves ID, stage, images and binding without aging or editing the source', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-migrate-')),
    store = new Store(root);
  try {
    const art = path.join(root, 'legacy.png');
    await image(art);
    const file = path.join(root, 'state.json');
    const legacy = {
      version: 1,
      pet: {
        id: 'genpet-existing',
        adoptedAt: Date.now() - 365 * 86400000,
        stage: 'hatchling',
        profile: { name: 'Existing' },
        state: { reason: 'Old story' },
      },
      art: [{ file: art, kind: 'portrait', stage: 'hatchling', createdAt: 1 }],
      nativeExport: { destination: path.join(root, 'codex', 'pets', 'genpet-companion') },
    };
    await writeFile(file, JSON.stringify(legacy));
    const before = await readFile(file, 'utf8');
    await assert.rejects(() => beginStory(store, 'init'), /legacy pet/);
    const state = await migrateLegacy(store, file, {
      genes: 'The individual actually present in its saved portrait.',
      place: 'Origin was not recorded',
      connection: 'Existing user companion; earlier facts are unavailable',
    });
    assert.equal(state.pet!.id, legacy.pet.id);
    assert.equal(state.pet!.stage, 'hatchling');
    assert.equal(state.pet!.binding!.avatarId, 'custom:genpet-companion');
    assert.equal(await readFile(file, 'utf8'), before);
    assert.deepEqual(await readFile(state.art[0].file), await readFile(art));
    assert.equal((await store.peek()).pet!.stage, 'hatchling');
    assert.equal((await beginStory(store, 'work:next')).pet!.id, legacy.pet.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

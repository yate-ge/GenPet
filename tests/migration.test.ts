import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { findLegacyRecord, migrateLegacy } from '../src/migration.js';
import { growth } from '../src/growth.js';

async function rootFor(label: string) {
  const base = path.resolve('output/tests/records');
  await mkdir(base, { recursive: true });
  return mkdtemp(path.join(base, `${label}-`));
}
test('explicit v1 import preserves identity, artwork and binding while leaving original bytes intact', async () => {
  const root = await rootFor('migration-v1'),
    store = new Store(root),
    artFile = path.join(root, 'original-image.png');
  await writeFile(artFile, 'Synthetic preserved image bytes');
  const source = path.join(root, 'state.json');
  const legacy = {
    version: 1,
    pet: {
      id: 'genpet-existing',
      adoptedAt: Date.now() - 365 * 86400000,
      stage: 'hatchling',
      profile: { name: 'Existing' },
      state: { reason: 'Old story' },
    },
    art: [{ file: artFile, kind: 'portrait', stage: 'hatchling', createdAt: 1 }],
    nativeExport: { destination: path.join(root, 'codex', 'pets', 'genpet-companion'), cloudId: 'pet_existing' },
  };
  await writeFile(source, JSON.stringify(legacy));
  const before = await readFile(source);
  assert.equal(await findLegacyRecord(store), source);
  assert.equal((await store.peek()).pet, null);
  const state = await migrateLegacy(store, source, {
    genes: 'The individual already in the saved portrait.',
    place: 'Origin was not recorded',
    connection: 'Existing companion; earlier facts unavailable',
  });
  assert.equal(state.pet!.id, legacy.pet.id);
  assert.equal(state.pet!.state.stage, 'hatchling');
  assert.equal(state.pet!.binding!.avatarId, 'custom:genpet-companion');
  assert.equal(state.pet!.binding!.cloudId, 'pet_existing');
  assert.deepEqual(await readFile(source), before);
  assert.deepEqual(await readFile(state.legacy!.backup), before);
  assert.deepEqual(await readFile(state.art[0].file), await readFile(artFile));
  assert.equal(state.growthClock!.experiences, 0);
  assert.equal(growth(state, state.legacy!.importedAt)!.required, null);
});

test('v2 inspection is side-effect-free and import translates all saved aliases, steps and provenance', async () => {
  const root = await rootFor('migration-v2'),
    store = new Store(root);
  await mkdir(store.root, { recursive: true });
  const artFile = path.join(root, 'legacy-art.png');
  await writeFile(artFile, 'Synthetic v2 artwork');
  const source = path.join(store.root, 'state.json');
  const old = {
    version: 2,
    host: 'desktop',
    pet: {
      id: 'genpet-v2',
      name: 'V2',
      adoptedAt: 1,
      revision: 3,
      genes: 'Recorded source',
      personality: 'Keeps a soft voice',
      stage: 'juvenile',
      home: 'Moss home',
      state: { description: 'Listening', appearanceId: 'art-old', updatedAt: 2 },
      binding: { host: 'desktop', avatarId: 'custom:genpet-v2', cloudId: 'pet_v2' },
    },
    stories: [
      {
        id: 'story-old',
        triggerId: 'period:1',
        petId: 'genpet-v2',
        at: 2,
        text: 'Old story',
        basis: 'Recorded context',
        stage: 'juvenile',
        state: 'Listening',
        mediaIds: [],
        hostResult: {
          petId: 'genpet-v2',
          operationId: 'story-old',
          appearanceId: 'art-old',
          avatarId: 'pet_v2',
          updated: true,
          active: false,
          refreshRequested: false,
          displayStatus: 'unconfirmed',
          evidence: 'Historical host observation',
        },
        steps: [
          {
            id: 'step-old',
            unit: 'carrier',
            at: 2,
            inputRefs: ['old:fact'],
            result: { designBasis: 'A specific recorded source', evidenceIds: ['old:fact'] },
          },
          { id: 'step-review', unit: 'image-review', at: 2, inputRefs: [], result: { visual: 'Old review' } },
        ],
      },
    ],
    art: [
      {
        id: 'art-old',
        petId: 'genpet-v2',
        requestId: 'story-old',
        stage: 'juvenile',
        description: 'Saved art',
        file: artFile,
        kind: 'atlas',
        createdAt: 2,
        provenance: 'Recorded artist result',
      },
    ],
    pending: null,
  };
  await writeFile(source, JSON.stringify(old, null, 2));
  const before = await readFile(source);
  const viewed = await store.peek();
  assert.equal(viewed.version, 3);
  assert.equal(viewed.needsImport, true);
  assert.equal(viewed.pet!.state.home, 'Moss home');
  assert.equal(viewed.stories[0].reason, 'Recorded context');
  assert.equal(viewed.stories[0].hostResult!.storedArtworkVerified, null);
  await assert.rejects(
    store.transaction(state => {
      state.pet!.name = 'Unexpected adoption';
    }),
    /explicit import/,
  );
  assert.deepEqual(await readFile(source), before);
  await assert.rejects(store.importRecord(source, { confirmed: false }), /confirmation/);
  const imported = await store.importRecord(
    source,
    { confirmed: true, memory: 'We remember the already recorded old story.' },
    5000,
  );
  const saved = JSON.parse(await readFile(store.file, 'utf8'));
  assert.equal(imported.pet!.id, 'genpet-v2');
  assert.deepEqual(imported.pet!.binding, old.pet.binding);
  assert.equal(imported.pet!.memory.text, 'We remember the already recorded old story.');
  assert.equal(imported.growthClock!.experiences, 0);
  assert.equal(imported.growthClock!.stageSince, 5000);
  assert.equal(imported.art[0].source, old.art[0].provenance);
  assert.equal(imported.stories[0].hostResult!.observed, 'Historical host observation');
  assert.deepEqual(
    (await store.readSteps('story-old')).map(step => step.unit),
    ['story-item', 'ImageReviewer'],
  );
  assert.equal((await store.readSteps('story-old'))[0].result.designReason, 'A specific recorded source');
  assert.equal('genes' in saved.pet, false);
  assert.equal('stage' in saved.pet, false);
  assert.equal('basis' in saved.stories[0], false);
  assert.equal('provenance' in saved.art[0], false);
  assert.equal('steps' in saved.stories[0], false);
  assert.deepEqual(await readFile(source), before);
  const duplicate = await store.importRecord(source, { confirmed: true, memory: 'An attempted reroll on retry' }, 9999);
  assert.equal(duplicate.legacy!.importedAt, 5000);
  assert.equal(duplicate.pet!.memory.text, imported.pet!.memory.text);
  assert.equal((await store.listPets()).length, 1);
  await store.createPet({ confirmed: true }, 12000);
  assert.notEqual((await store.peek()).pet!.id, 'genpet-v2');
  await store.importRecord(source, { confirmed: true }, 13000);
  assert.equal((await store.peek()).pet!.id, 'genpet-v2');
});

test('confirmed fresh adoption isolates a leftover v2 source and retains it for later explicit import', async () => {
  const root = await rootFor('migration-separate'),
    store = new Store(root);
  await mkdir(store.root, { recursive: true });
  const source = path.join(store.root, 'state.json');
  const old = {
    version: 2,
    host: 'desktop',
    pet: {
      id: 'genpet-unimported',
      name: 'Old',
      adoptedAt: 1,
      revision: 1,
      genes: 'Old genes',
      stage: 'egg',
      state: { description: 'Old egg', updatedAt: 1 },
    },
    stories: [],
    art: [],
    pending: null,
  };
  await writeFile(source, JSON.stringify(old));
  const bytes = await readFile(source);
  const adopted = await store.createPet({ confirmed: true }, 1000);
  assert.notEqual(adopted.pet!.id, old.pet.id);
  assert.equal(adopted.pet!.soul.genes, null);
  assert.equal(adopted.pet!.memory.text, '');
  assert.deepEqual(await readFile(source), bytes);
  assert.equal((await store.listPets()).length, 1);
  const imported = await store.importRecord(source, { confirmed: true }, 2000);
  assert.equal(imported.pet!.id, old.pet.id);
  assert.equal((await store.listPets()).length, 2);
  assert.deepEqual(await readFile(source), bytes);
});

test('legacy gaps can be explicitly supplemented once without counting an experience or replacing known facts', async () => {
  const root = await rootFor('migration-supplement'),
    store = new Store(root);
  await mkdir(store.root, { recursive: true });
  const source = path.join(store.root, 'state.json');
  await writeFile(
    source,
    JSON.stringify({
      version: 2,
      host: 'desktop',
      pet: {
        id: 'genpet-gap',
        name: 'Gap',
        adoptedAt: 1,
        revision: 1,
        genes: 'Saved known individual',
        stage: 'hatchling',
        state: { description: 'Listening', updatedAt: 1 },
      },
      stories: [],
      art: [],
      pending: null,
    }),
  );
  const before = await readFile(source);
  await store.importRecord(source, { confirmed: true }, 1000);
  await assert.rejects(store.supplementLegacy({ confirmed: false, memory: 'Unauthorized fill' }), /confirmation/);
  const updated = await store.supplementLegacy(
    {
      confirmed: true,
      memory: 'A source-backed summary of recorded shared history.',
      personality: 'Quiet; says puf.',
      designReason: 'Observed saved source, with the original physical traits.',
    },
    2000,
  );
  assert.equal(updated.pet!.soul.genes, 'Saved known individual');
  assert.equal(updated.pet!.memory.updatedAt, 2000);
  assert.equal(updated.pet!.memory.storyId, 'legacy');
  assert.equal(updated.growthClock!.experiences, 0);
  const revision = updated.pet!.revision;
  await store.supplementLegacy(
    { confirmed: true, memory: updated.pet!.memory.text, personality: updated.pet!.soul.personality },
    3000,
  );
  assert.equal((await store.peek()).pet!.revision, revision);
  await assert.rejects(store.supplementLegacy({ confirmed: true, memory: 'A replacement summary' }), /only once/);
  await assert.rejects(store.supplementLegacy({ confirmed: true, personality: 'A different personality' }), /retains/);
  assert.deepEqual(await readFile(source), before);
});

test('old personality can acquire missing speaking habits once while its exact text, identity and cloud target remain', async () => {
  const root = await rootFor('migration-voice'),
    store = new Store(root);
  await mkdir(store.root, { recursive: true });
  const source = path.join(store.root, 'state.json');
  const originalPersonality = '  Patient and curious.\nKeeps four saved physical listening habits.  ';
  const old = {
    version: 2,
    host: 'desktop',
    pet: {
      id: 'genpet-old-voice',
      name: 'Existing',
      adoptedAt: 1,
      revision: 3,
      genes: 'The already recorded biological body with its four feelers.',
      personality: originalPersonality,
      stage: 'juvenile',
      state: { description: 'Listening', updatedAt: 1 },
      binding: { host: 'desktop', avatarId: 'custom:old-voice', cloudId: 'pet_old_voice' },
    },
    stories: [],
    art: [],
    pending: null,
  };
  await writeFile(source, JSON.stringify(old));
  const sourceBytes = await readFile(source);
  const imported = await store.importRecord(source, { confirmed: true }, 1000);
  assert.equal(imported.pet!.soul.personality, originalPersonality);
  const voice = 'A soft puf matches its recorded patient manner; short quiet sentences, no claims about the user.';
  const augmented = await store.supplementLegacy({ confirmed: true, voice }, 2000);
  assert.equal(augmented.pet!.soul.personality, `${originalPersonality}\n\nSpeaking habits:\n${voice}`);
  assert.equal(augmented.pet!.id, old.pet.id);
  assert.equal(augmented.pet!.soul.genes, old.pet.genes);
  assert.equal(augmented.pet!.state.stage, old.pet.stage);
  assert.deepEqual(augmented.pet!.binding, old.pet.binding);
  assert.deepEqual(augmented.legacy!.voiceSupplement, { text: voice, at: 2000 });
  assert.equal(augmented.growthClock!.experiences, 0);
  const revision = augmented.pet!.revision;
  await store.supplementLegacy({ confirmed: true, voice }, 3000);
  assert.equal((await store.peek()).pet!.revision, revision);
  assert.equal((await store.peek()).legacy!.voiceSupplement!.at, 2000);
  await assert.rejects(store.supplementLegacy({ confirmed: true, voice: 'A different second habit' }), /only once/);
  await assert.rejects(
    store.transaction(state => {
      state.pet!.soul.personality = 'An ordinary rewrite bypassing the exception';
    }),
    /retains its soul.personality/,
  );
  assert.deepEqual(await readFile(source), sourceBytes);
  const freshStore = new Store(await rootFor('migration-no-new-voice'));
  await freshStore.createPet({ confirmed: true }, 1000);
  await assert.rejects(freshStore.supplementLegacy({ confirmed: true, voice }), /Import the legacy Pet/);
});

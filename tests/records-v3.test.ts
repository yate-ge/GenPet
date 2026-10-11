import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { atomicJson } from '../src/store.js';
import { commitExperience, ensureGrowthClock, growth, stageAdvance, STAGE_CEILING } from '../src/growth.js';
import { createPet, type State, type Story, type GenerationStep } from '../src/model.js';
import { bindCloud } from '../src/hosts/cloud.js';
import { inspectLegacyRecords } from '../src/migration.js';
import { spawn } from 'node:child_process';

const START = Date.parse('2026-10-01T00:00:00Z'),
  HOUR = 3600000,
  DAY = 24 * HOUR;
async function rootFor(label: string) {
  const base = path.resolve('output/implementation-20261011/records');
  await mkdir(base, { recursive: true });
  return mkdtemp(path.join(base, `${label}-`));
}

const previousCodexHome = process.env.CODEX_HOME;
test.before(async () => {
  const home = await rootFor('records-current-account');
  await atomicJson(path.join(home, '.codex-global-state.json'), {
    'electron-persisted-atom-state': {
      'cloud-pet-artwork-cache': { accountId: 'fixture-account', userId: 'fixture-user' },
      'migrated-cloud-pet-ids-v1': {
        '["fixture-account","fixture-user"]': {
          'custom:pet-a': 'pet_a',
          'custom:pet-b': 'pet_b',
          'custom:operation-a': 'pet_operation_a',
          'custom:operation-b': 'pet_operation_b',
          'custom:reused-entry': 'pet_reused',
        },
      },
    },
  });
  process.env.CODEX_HOME = home;
});
test.after(() => {
  if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = previousCodexHome;
});

test(
  'Windows atomic records survive a brief real reader lock without removing the original',
  {
    skip: process.platform !== 'win32' ? 'Windows file-sharing behavior' : false,
  },
  async () => {
    const root = await rootFor('atomic-reader-lock');
    const file = path.join(root, 'record.json');
    await atomicJson(file, { value: 'original' });
    const script = `$taskHandle=[System.IO.File]::Open('${file.replace(/'/g, "''")}',[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite); [Console]::Out.WriteLine('held'); [Console]::Out.Flush(); Start-Sleep -Milliseconds 160; $taskHandle.Dispose()`;
    const reader = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    reader.stderr.on('data', data => (stderr += data.toString()));
    const closed = new Promise<void>((resolve, reject) => {
      reader.once('error', reject);
      reader.once('close', code => (code === 0 ? resolve() : reject(new Error(stderr))));
    });
    try {
      await Promise.race([
        new Promise<void>(resolve => reader.stdout.once('data', () => resolve())),
        closed.then(() => {
          throw new Error('Reader closed before holding the file');
        }),
      ]);
      assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { value: 'original' });
      await atomicJson(file, { value: 'replacement' });
      await closed;
      assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { value: 'replacement' });
    } finally {
      if (reader.exitCode === null) reader.kill();
      await closed.catch(() => undefined);
      await writeFile(path.join(root, 'reader-stderr.txt'), stderr);
    }
  },
);
async function hatchling(store: Store, avatarId: string, cloudId: string, now = START) {
  const created = await store.createPet({ confirmed: true }, now);
  const pinned = store.forPet(created.pet!.id);
  await pinned.transaction(state => {
    state.pet!.soul.genes = 'Specific synthetic red panda cub, rooted physical traits';
    state.pet!.state.stage = 'hatchling';
    state.pet!.binding = { host: store.host, avatarId, cloudId };
    stageAdvance(state, now);
  });
  return pinned;
}
function finish(state: State, id: string, at: number, memory?: string) {
  const story: Story = {
    id,
    triggerId: id,
    petId: state.pet!.id,
    at,
    text: 'Synthetic story preserving source references.',
    reason: 'Fixture context',
    contextRefs: ['fixture:real-interaction'],
    stage: state.pet!.state.stage,
    state: 'Listening',
    mediaIds: [],
    ...(memory ? { memory } : {}),
    ...(state.pending?.steps ? { steps: state.pending.steps } : {}),
  };
  if (memory) commitExperience(state, id, memory, at);
  state.stories.push(story);
  state.pending = null;
  state.pet!.revision++;
}

test('v3 writes nested identity records per Pet and adding another leaves the old record and binding intact', async () => {
  const store = new Store(await rootFor('records-independent'));
  const a = await hatchling(store, 'custom:pet-a', 'pet_a');
  await a.transaction(state => {
    finish(state, 'story-a', START + HOUR, 'A memory belonging only to A.');
  });
  const before = await readFile(a.file);
  const b = await hatchling(store, 'custom:pet-b', 'pet_b', START + 2 * HOUR);
  await b.transaction(state => {
    finish(state, 'story-b', START + 3 * HOUR, 'A memory belonging only to B.');
  });
  assert.deepEqual(await readFile(a.file), before);
  assert.equal((await a.peek()).pet!.memory.text, 'A memory belonging only to A.');
  assert.equal((await b.peek()).pet!.memory.text, 'A memory belonging only to B.');
  const saved = JSON.parse(await readFile(a.file, 'utf8'));
  assert.equal(saved.version, 3);
  assert.deepEqual(
    Object.keys(saved.pet).sort(),
    ['id', 'name', 'adoptedAt', 'revision', 'naming', 'soul', 'memory', 'state', 'binding'].sort(),
  );
  assert.equal(saved.pet.state.stage, 'hatchling');
  assert.equal((await store.listPets()).filter(pet => pet.active).length, 1);
  assert.equal((await store.listPets()).length, 2);
});

test('initial record inventory finds all legacy locations beside a current Pet without adopting or rewriting any', async () => {
  const root = await rootFor('inventory-legacy');
  const store = new Store(root, 'desktop');
  await hatchling(store, 'custom:current', 'pet_current');
  const inputs = [
    ['state.json', { version: 1, pet: { id: 'legacy-root' } }],
    ['desktop/state.json', { version: 2, host: 'desktop', pet: { id: 'legacy-desktop' } }],
    ['dots/state.json', { version: 2, host: 'dots', pet: { id: 'legacy-dots' } }],
  ] as const;
  for (const [name, record] of inputs) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(record));
  }
  const malformed = path.join(root, 'cloud/state.json');
  await mkdir(path.dirname(malformed), { recursive: true });
  await writeFile(malformed, '{broken');
  const files = [...inputs.map(([name]) => path.join(root, name)), malformed, store.registryFile, store.file];
  const before = await Promise.all(files.map(file => readFile(file)));
  const found = await inspectLegacyRecords(root);
  assert.deepEqual(
    found.filter(row => row.petId).map(row => row.petId),
    ['legacy-root', 'legacy-desktop', 'legacy-dots'],
  );
  assert.ok(found.find(row => row.file === malformed)!.problem);
  assert.equal((await store.listPets()).length, 1);
  for (let i = 0; i < files.length; i++) assert.deepEqual(await readFile(files[i]), before[i]);
});

test('both host ID aliases route the same Pet; inactive ceilings pause and selection failures retain last active', async () => {
  const store = new Store(await rootFor('records-route'));
  const a = await hatchling(store, 'custom:pet-a', 'pet_a');
  const aId = (await a.peek()).pet!.id;
  const b = await hatchling(store, 'custom:pet-b', 'pet_b', START + HOUR);
  const bId = (await b.peek()).pet!.id;
  assert.equal(growth(await a.peek(), START + 10 * DAY)!.required, null);
  const routed = await store.resolveActive('pet_a', START + 10 * DAY);
  assert.equal(routed.petId, aId);
  assert.equal(routed.matched, true);
  const resumed = await a.peek();
  assert.equal(growth(resumed, START + 10 * DAY)!.required, null);
  assert.equal(resumed.growthClock!.pausedMs, 10 * DAY - HOUR);
  assert.equal(resumed.growthClock!.lastInactiveAt, START + HOUR);
  assert.equal((await store.resolveActive('custom:pet-a', START + 10 * DAY + 1)).petId, aId);
  assert.equal((await store.resolveActive('built-in:cat', START + 10 * DAY + 2)).petId, aId);
  const unread = await store.resolveActive(undefined, START + 10 * DAY + 3);
  assert.equal(unread.petId, aId);
  assert.equal(unread.selectionRead, false);
  assert.equal((await b.peek()).growthClock!.pausedAt, START + 10 * DAY);
  assert.notEqual(aId, bId);
  const deadline = START + STAGE_CEILING.hatchling! + 10 * DAY - HOUR;
  assert.equal(growth(await a.peek(), deadline)!.required, 'advance');
});

test('offline active time ages normally and never creates a story or changes the stage on read', async () => {
  const store = new Store(await rootFor('records-offline'));
  const a = await hatchling(store, 'custom:active', 'pet_active');
  const before = await readFile(a.file);
  const record = await a.peek();
  assert.equal(growth(record, START + 10 * DAY)!.required, 'advance');
  assert.equal(record.pet!.state.stage, 'hatchling');
  assert.equal(record.stories.length, 0);
  assert.deepEqual(await readFile(a.file), before);
});

test('a story and its raw units remain bound to A after the host selects B, with one atomic memory experience', async () => {
  const store = new Store(await rootFor('records-operation'));
  const a = await hatchling(store, 'custom:operation-a', 'pet_operation_a');
  const aId = (await a.peek()).pet!.id;
  const b = await hatchling(store, 'custom:operation-b', 'pet_operation_b', START + HOUR);
  const bId = (await b.peek()).pet!.id;
  await store.selectPet(aId, START + 2 * HOUR);
  const step: GenerationStep = {
    id: 'step-grounding',
    unit: 'context',
    at: START + 2 * HOUR,
    inputRefs: ['fixture:user-note'],
    result: { facts: ['A supplied user note'] },
  };
  await a.transaction(state => {
    state.pending = {
      id: 'story-in-progress',
      triggerId: 'manual:operation',
      petId: aId,
      baseRevision: state.pet!.revision,
      startedAt: START + 2 * HOUR,
      mode: 'story',
      steps: [step],
    };
  });
  await store.resolveActive('pet_operation_b', START + 3 * HOUR);
  const beforeB = await readFile(b.file);
  const original = await store.forOperation('story-in-progress');
  assert.equal((await original.peek()).pet!.id, aId);
  assert.deepEqual(await original.readSteps('story-in-progress'), [step]);
  await assert.rejects(
    original.transaction(state => {
      finish(state, 'story-in-progress', START + 4 * HOUR, 'A new joint memory.');
      throw new Error('Interrupted before commit');
    }),
    /Interrupted/,
  );
  assert.equal((await original.peek()).pet!.memory.text, '');
  await original.transaction(state => {
    finish(state, 'story-in-progress', START + 4 * HOUR, 'A new joint memory.');
  });
  const committed = await original.peek();
  assert.equal(committed.pet!.memory.storyId, 'story-in-progress');
  assert.equal(committed.growthClock!.experiences, 1);
  assert.deepEqual(await original.readSteps('story-in-progress'), [step]);
  assert.deepEqual(await readFile(b.file), beforeB);
  assert.equal((await store.peek()).pet!.id, bId);
});

test('unit file writes publish only the state-authorized prefix, preserve interrupted attempts, and forbid edits', async () => {
  const store = new Store(await rootFor('records-prefix'));
  const pet = await store.createPet({ confirmed: true }, START);
  const id = pet.pet!.id;
  const first: GenerationStep = {
    id: 'first-step',
    unit: 'story',
    at: START,
    inputRefs: [],
    result: { text: 'Committed' },
  };
  await store.transaction(state => {
    state.pending = {
      id: 'story-prefix',
      triggerId: 'manual:prefix',
      petId: id,
      baseRevision: 0,
      startedAt: START,
      mode: 'initialization',
      steps: [first],
    };
  });
  const stateFile = await readFile(store.file, 'utf8'),
    saved = JSON.parse(stateFile);
  assert.equal('steps' in saved.pending, false);
  assert.equal(saved.pending.stepsCount, 1);
  const file = path.join(store.petDirectory(id), 'stories', 'story-prefix.json');
  const interrupted: GenerationStep = {
    id: 'interrupted-step',
    unit: 'genes',
    at: START + 1,
    inputRefs: [],
    result: { genes: 'Uncommitted candidate retained' },
  };
  await atomicJson(file, { version: 1, petId: id, storyId: 'story-prefix', steps: [first, interrupted] });
  assert.deepEqual(await store.readSteps('story-prefix'), [first]);
  const next: GenerationStep = {
    id: 'next-step',
    unit: 'genes',
    at: START + 2,
    inputRefs: [],
    result: { genes: 'Accepted next candidate' },
  };
  await store.transaction(state => {
    state.pending!.steps!.push(next);
  });
  assert.deepEqual(await store.readSteps('story-prefix'), [first, next]);
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).uncommittedAttempts[0].steps, [interrupted]);
  const historicalTimestamp = new Date('2000-01-01T00:00:00Z');
  await utimes(file, historicalTimestamp, historicalTimestamp);
  const unitTime = (await stat(file)).mtimeMs;
  await store.transaction(state => {
    state.pet!.name = 'A name change needs no unit-file rewrite';
  });
  assert.equal((await stat(file)).mtimeMs, unitTime);
  const before = await readFile(store.file);
  await assert.rejects(
    store.transaction(state => {
      state.pending!.steps![0].result = { text: 'Changed historical result' };
    }),
    /append-only/,
  );
  assert.deepEqual(await readFile(store.file), before);
});

test('replacement creates a new identity on the same cloud entry and archives the old registry record intact', async () => {
  const store = new Store(await rootFor('records-replace'));
  const a = await hatchling(store, 'custom:reused-entry', 'pet_reused');
  const old = await a.peek(),
    before = await readFile(a.file);
  await assert.rejects(store.createPet({ confirmed: false, replace: true }), /confirmation/);
  const replacement = await store.createPet({ confirmed: true, replace: true }, START + DAY);
  assert.notEqual(replacement.pet!.id, old.pet!.id);
  assert.deepEqual(replacement.pet!.binding, old.pet!.binding);
  assert.deepEqual(await readFile(a.file), before);
  const pets = await store.listPets();
  assert.equal(pets.find(pet => pet.id === old.pet!.id)!.archived, true);
  assert.equal((await store.resolveActive('pet_reused', START + DAY + 1)).petId, replacement.pet!.id);
  assert.equal(replacement.pet!.memory.text, '');
  assert.equal(replacement.stories.length, 0);
});

test('a canonical transferred Pet registers without regenerating it or requiring a preexisting target registry', async () => {
  const store = new Store(await rootFor('records-imported'), 'cloud'),
    pet = createPet('Transferred', START);
  pet.binding = { host: 'cloud', avatarId: 'pet_same', cloudId: 'pet_same' };
  const state: State = {
    version: 3,
    host: 'cloud',
    pet,
    stories: [],
    art: [],
    pending: null,
    handoff: { id: 'transfer-fixture', target: 'cloud', status: 'imported', at: START + HOUR },
  };
  ensureGrowthClock(state);
  await atomicJson(path.join(store.petDirectory(pet.id), 'state.json'), state);
  await store.selectPet(pet.id, START + HOUR);
  assert.equal((await store.peek()).pet!.id, pet.id);
  assert.equal((await store.peek()).pet!.name, 'Transferred');
  assert.equal((await store.listPets()).length, 1);
});

test('live Pets cannot share either binding alias and established cloud targets cannot be reassigned', async () => {
  const store = new Store(await rootFor('records-binding-unique'), 'cloud');
  const first = await store.createPet({ confirmed: true }, START),
    a = store.forPet(first.pet!.id);
  await a.transaction(state => {
    state.pet!.binding = { host: 'cloud', avatarId: 'custom:shared-entry', cloudId: 'pet_shared_entry' };
  });
  const second = await store.createPet({ confirmed: true }, START + HOUR),
    b = store.forPet(second.pet!.id);
  const aBefore = await readFile(a.file),
    bBefore = await readFile(b.file);
  await assert.rejects(bindCloud(b, 'pet_shared_entry'), /already assigned/);
  await assert.rejects(
    b.transaction(state => {
      state.pet!.binding = { host: 'cloud', avatarId: 'custom:shared-entry', cloudId: 'pet_own_entry' };
    }),
    /already assigned/,
  );
  assert.deepEqual(await readFile(a.file), aBefore);
  assert.deepEqual(await readFile(b.file), bBefore);
  await bindCloud(b, 'pet_own_entry');
  const bound = await readFile(b.file);
  await assert.rejects(
    b.transaction(state => {
      state.pet!.binding!.cloudId = 'pet_unrelated_target';
    }),
    /retains its cloud binding/,
  );
  await assert.rejects(
    b.transaction(state => {
      state.pet!.binding!.avatarId = 'pet_unrelated_target';
    }),
    /retains its Avatar binding/,
  );
  assert.deepEqual(await readFile(b.file), bound);
  // Replacement is the explicit exception: the retired record remains preserved and cannot accept writes.
  await store.selectPet(first.pet!.id, START + 2 * HOUR);
  const replaced = await store.createPet({ confirmed: true, replace: true }, START + 3 * HOUR);
  assert.deepEqual(replaced.pet!.binding, (await a.peek()).pet!.binding);
  await assert.rejects(
    a.transaction(state => {
      state.pet!.name = 'An archived writer';
    }),
    /archived Pet is read-only/,
  );
  assert.equal((await store.resolveActive('pet_shared_entry', START + 4 * HOUR)).petId, replaced.pet!.id);
});

test('a local binding can acquire its cloud alias and retain the same target across a local-to-cloud transition', async () => {
  const store = new Store(await rootFor('records-binding-alias'));
  await store.createPet({ confirmed: true }, START);
  await store.transaction(state => {
    state.pet!.binding = { host: 'desktop', avatarId: 'custom:known-local' };
  });
  await store.transaction(state => {
    state.pet!.binding!.cloudId = 'pet_known_cloud';
  });
  assert.equal((await store.peek()).pet!.binding!.avatarId, 'custom:known-local');
  await store.transaction(state => {
    state.pet!.binding!.avatarId = 'pet_known_cloud';
  });
  assert.equal((await store.peek()).pet!.binding!.cloudId, 'pet_known_cloud');
  await assert.rejects(
    store.transaction(state => {
      state.pet!.binding!.cloudId = 'pet_wrong_cloud';
    }),
    /retains its cloud binding/,
  );
});

test('an exported main-environment record rejects every Pet write and cannot be unsealed by a generic transaction', async () => {
  const store = new Store(await rootFor('records-export-readonly'), 'cloud');
  await store.createPet({ confirmed: true }, START);
  await store.transaction(state => {
    state.handoff = { id: 'handoff-readonly', target: 'desktop', status: 'exported', at: START + HOUR };
  });
  const file = store.file,
    before = await readFile(file);
  const mutators: Array<(state: State) => void> = [
    state => {
      state.pet!.name = 'A source-side rename';
    },
    state => {
      state.stories.push({
        id: 'bad-story',
        triggerId: 'bad-story',
        petId: state.pet!.id,
        at: START,
        text: 'A second writer',
        reason: 'Not allowed',
        stage: 'egg',
        state: 'Listening',
        mediaIds: [],
      });
    },
    state => {
      state.art.push({
        id: 'bad-art',
        petId: state.pet!.id,
        requestId: 'bad-request',
        stage: 'egg',
        description: 'Source-side art',
        file: '/unused',
        kind: 'artifact',
        createdAt: START,
        source: 'Not allowed',
      });
    },
    state => {
      state.pending = {
        id: 'bad-pending',
        triggerId: 'bad-pending',
        petId: state.pet!.id,
        baseRevision: state.pet!.revision,
        startedAt: START,
        mode: 'story',
      };
    },
    state => {
      state.chats = [{ id: 'bad-chat', petId: state.pet!.id, at: START, text: 'A source-side note' }];
    },
    state => {
      state.growthClock!.experiences++;
    },
    state => {
      state.schedule = { timezone: 'UTC', reference: 'source-side-new-task' };
    },
    state => {
      state.handoff!.status = 'imported';
    },
  ];
  for (const mutate of mutators) {
    await assert.rejects(store.transaction(mutate), /exported Pet record is read-only/);
    assert.deepEqual(await readFile(file), before);
  }
  await store.selectPet((await store.peek()).pet!.id, START + 2 * HOUR);
  assert.deepEqual(await readFile(file), before);
  await assert.rejects(store.createPet({ confirmed: true, replace: true }), /Transfer the Pet back/);
  assert.deepEqual(await readFile(file), before);
  const another = await store.createPet({ confirmed: true }, START + 3 * HOUR);
  assert.notEqual(another.pet!.id, (await store.forPet(JSON.parse(before.toString()).pet.id).peek()).pet!.id);
  assert.deepEqual(await readFile(file), before);
});

test('a returned main-environment transfer replaces stale activity facts and preserves its growth deadline', async () => {
  const store = new Store(await rootFor('records-transfer-clock'), 'cloud');
  const pinned = await hatchling(store, 'custom:transfer-clock', 'pet_transfer_clock');
  await pinned.transaction(state => {
    state.handoff = { id: 'outgoing-clock', target: 'desktop', status: 'exported', at: START + HOUR };
  });
  const incoming = structuredClone(await pinned.peek());
  incoming.handoff = {
    id: 'returning-clock',
    target: 'cloud',
    status: 'imported',
    at: START + 10 * DAY,
    previousTransferId: 'outgoing-clock',
  };
  incoming.growthClock!.pausedMs = 10 * DAY - HOUR;
  incoming.growthClock!.lastActivatedAt = START + 10 * DAY;
  incoming.growthClock!.lastInactiveAt = START + HOUR;
  const expected = growth(incoming, START + 10 * DAY)!;
  const installed = await store.installTransfer(incoming, START + 10 * DAY);
  assert.equal(installed.growthClock!.pausedMs, incoming.growthClock!.pausedMs);
  assert.equal(growth(installed, START + 10 * DAY)!.advanceBy, expected.advanceBy);
  assert.equal(growth(installed, START + 10 * DAY)!.required, null);
  const registry = JSON.parse(await readFile(store.registryFile, 'utf8'));
  assert.equal(
    registry.pets.find((pet: { id: string }) => pet.id === installed.pet!.id).pausedMs,
    incoming.growthClock!.pausedMs,
  );
  await store.transaction(state => {
    finish(state, 'after-transfer', START + 10 * DAY + HOUR, 'A meaningful new memory after returning.');
  });
  const duplicate = await store.installTransfer(incoming, START + 10 * DAY + 2 * HOUR);
  assert.equal(duplicate.pet!.memory.storyId, 'after-transfer');
  assert.equal(duplicate.growthClock!.experiences, 1);
  assert.equal(duplicate.stories.length, 1);
  await assert.rejects(
    store.installTransfer({ ...incoming, handoff: { ...incoming.handoff!, id: 'a-different-return' } }),
    /already writable/,
  );
});

test('simultaneous transfer installs publish only one owner and reject wrong-host records', async () => {
  const target = new Store(await rootFor('records-transfer-race'), 'cloud');
  const pet = createPet('Transfer fixture', START);
  const incoming: State = {
    version: 3,
    host: 'cloud',
    pet,
    stories: [],
    art: [],
    pending: null,
    handoff: { id: 'import-a', target: 'cloud', status: 'imported', at: START },
  };
  const attempts = await Promise.allSettled([
    target.installTransfer(incoming, START),
    target.installTransfer({ ...incoming, handoff: { ...incoming.handoff!, id: 'import-b' } }, START),
  ]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter(result => result.status === 'rejected').length, 1);
  assert.equal((await target.peek()).pet!.id, pet.id);
  await assert.rejects(target.installTransfer({ ...incoming, host: 'desktop' }), /adopted v3 record/);
});

test('a stable local entry can refresh a stale cached cloud mapping while its Avatar identity and destination stay fixed', async () => {
  const root = await rootFor('records-fresh-mapping'),
    store = new Store(root);
  await store.createPet({ confirmed: true }, START);
  const destination = path.join(root, 'codex-pets', 'known-entry');
  await store.transaction(state => {
    state.pet!.binding = { host: 'desktop', avatarId: 'custom:known-entry', destination, cloudId: 'pet_stale_mapping' };
  });
  await store.transaction(state => {
    state.pet!.binding!.cloudId = 'pet_actual_host_mapping';
  });
  const binding = (await store.peek()).pet!.binding!;
  assert.equal(binding.avatarId, 'custom:known-entry');
  assert.equal(binding.destination, destination);
  assert.equal(binding.cloudId, 'pet_actual_host_mapping');
  await assert.rejects(
    store.transaction(state => {
      state.pet!.binding!.destination = path.join(root, 'another-entry');
      state.pet!.binding!.cloudId = 'pet_another_target';
    }),
    /retains/,
  );
  await assert.rejects(
    store.transaction(state => {
      delete state.pet!.binding!.cloudId;
    }),
    /retains its mapped cloud binding/,
  );
});

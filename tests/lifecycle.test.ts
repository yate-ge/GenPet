import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access, readdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { beginStory, cancelStory, planStory, finishStory, resetPet } from '../src/lifecycle.js';
import { growth } from '../src/growth.js';
import { recordHostResult } from '../src/hosts/result.js';
import { dueStory, setSchedule, stopSchedule, timeSense } from '../src/schedule.js';
import { artRequest, acceptArt } from '../src/art.js';
import { bindAvatar } from '../src/hosts/dots.js';
import { createPet } from '../src/model.js';
import { initialPlan, initialization, image, hostDone } from './fixtures.js';
test('identity is persisted once, reads do not age it, and competing triggers cannot create another pet', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-story-'));
  const store = new Store(root);
  try {
    const first = await beginStory(store, 'manual:first');
    const before = await readFile(store.file, 'utf8');
    assert.equal((await store.peek()).pet!.stage, 'egg');
    assert.equal(await readFile(store.file, 'utf8'), before);
    assert.equal((await beginStory(new Store(root), 'manual:first')).pet!.id, first.pet!.id);
    await assert.rejects(() => beginStory(store, 'manual:second'), /Unfinished/);
    await planStory(store, first.pending!.id, initialPlan);
    await assert.rejects(
      () => planStory(store, first.pending!.id, { ...initialPlan, genes: 'Different random pet' }),
      /saved/,
    );
    await assert.rejects(() => finishStory(store, first.pending!.id), /artwork is unfinished/);
    assert.equal((await store.peek()).pet!.revision, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('saved state art is reusable across stories; completion and retries preserve genes and story count', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-reuse-')),
    store = new Store(root, 'dots');
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    const art = await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Synthetic fixture, not generated Pet art',
    });
    await hostDone(store, op);
    await finishStory(store, op);
    const identity = (await store.peek()).pet!;
    assert.equal((await beginStory(store, 'test:init')).status, 'completed');
    assert.equal((await finishStory(store, op)).id, op);
    const next = (await beginStory(store, 'manual:later')).pending!.id;
    await planStory(store, next, {
      text: 'The folded echo returned to its familiar resting layers.',
      basis: 'Fits the existing state',
      state: 'Resting layers',
      appearance: { description: 'Reuse the same folded state', reuseArtId: art.id },
    });
    assert.equal(artRequest(await store.peek())!.status, 'ready');
    await hostDone(store, next);
    await finishStory(store, next);
    const s = await store.peek();
    assert.equal(s.pet!.id, identity.id);
    assert.equal(s.pet!.genes, initialPlan.genes);
    assert.equal(s.art.length, 1);
    assert.equal(s.stories.length, 2);
    assert.equal(s.pet!.state.appearanceId, art.id);
    await access(art.file);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('host failure leaves current stage intact and active refresh is required before completion', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-host-gate-')),
    store = new Store(root, 'dots');
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    const firstArt = await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Synthetic host gate fixture',
    });
    await bindAvatar(store, 'dots-owner');
    const petId = (await store.peek()).pet!.id,
      result = {
        petId,
        operationId: op,
        appearanceId: firstArt.id,
        avatarId: 'dots-owner',
        updated: true,
        active: true,
        refreshRequested: false,
        displayStatus: 'unconfirmed' as const,
      };
    await recordHostResult(store, op, result);
    await assert.rejects(() => finishStory(store, op), /refresh is unfinished/);
    await recordHostResult(store, op, { ...result, active: null });
    await assert.rejects(() => finishStory(store, op), /refresh is unfinished/);
    await assert.rejects(
      () => recordHostResult(store, op, { ...result, avatarId: 'another-avatar' }),
      /different Avatar/,
    );
    await assert.rejects(() => recordHostResult(store, op, { ...result, displayStatus: 'confirmed' }), /evidence/);
    await recordHostResult(store, op, { ...result, refreshRequested: true });
    await finishStory(store, op);
    const next = (await beginStory(store, 'work:changed')).pending!.id;
    await planStory(store, next, {
      text: 'New work made its folded layers unfold.',
      basis: 'Agent observed a meaningful change in recent work',
      state: 'First unfolding',
      stage: 'hatchling',
      appearance: { description: 'Develop the same layered resonance' },
    });
    await assert.rejects(() => finishStory(store, next), /artwork is unfinished/);
    assert.equal((await store.peek()).pet!.stage, 'egg');
    const nextArt = await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Synthetic evolution fixture',
    });
    await recordHostResult(store, next, { ...result, operationId: next, appearanceId: nextArt.id, active: false });
    await finishStory(store, next);
    assert.equal((await store.peek()).pet!.stage, 'hatchling');
    assert.equal((await store.peek()).pet!.genes, initialPlan.genes);
    const last = (await beginStory(store, 'manual:third')).pending!.id;
    await assert.rejects(
      () => planStory(store, last, { text: 'Reverse', basis: 'Invalid', state: 'Egg', stage: 'egg' }),
      /reverse/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('story checks run every five hours from adoption, coalesce missed checks and deduplicate completion', () => {
  const adopted = Date.parse('2026-10-02T00:00:00Z'),
    HOUR = 3600000;
  const s = {
    version: 2 as const,
    host: 'dots' as const,
    pet: createPet('Test', adopted),
    stories: [],
    art: [],
    pending: null,
  };
  assert.equal(dueStory(s, adopted + 5 * HOUR - 1).due, false); // still the initialization period
  const due = dueStory(s, adopted + 5 * HOUR, 'Asia/Taipei');
  assert.equal(due.triggerId, 'period:1');
  assert.equal(due.timezone, 'Asia/Taipei');
  assert.equal(dueStory(s, adopted + 24 * HOUR).triggerId, 'period:4'); // missed periods coalesce
  assert.equal(dueStory({ ...s, pet: null }, adopted + 24 * HOUR).due, false);
  const done = {
    ...s,
    stories: [
      {
        id: 'done',
        triggerId: due.triggerId!,
        petId: 'test',
        at: 0,
        text: 'Story',
        basis: 'Test',
        stage: 'egg' as const,
        state: 'Rest',
        mediaIds: [],
      },
    ],
  };
  assert.equal(dueStory(done, adopted + 5 * HOUR + 60000).due, false);
});
test('a stopped check is remembered, no longer due, and resumes with the gap known to the next story', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-stop-')),
    store = new Store(root, 'dots');
  try {
    const first = await beginStory(store, 'manual:adopt');
    assert.equal(first.status === 'pending' && first.time!.hoursSinceLastStory < 1, true);
    assert.equal(first.status === 'pending' && first.time!.pendingHours! < 1, true); // an unfinished story's age is visible
    await setSchedule(store, 'Asia/Shanghai', 'automation:pet');
    const adopted = (await store.peek()).pet!.adoptedAt;
    const stopped = await stopSchedule(store);
    assert.equal(stopped.previousReference, 'automation:pet');
    assert.equal((await stopSchedule(store)).stoppedAt, stopped.stoppedAt); // idempotent
    let state = await store.peek();
    assert.equal(state.schedule!.reference, undefined);
    const later = adopted + 30 * 3600000;
    assert.equal(dueStory(state, later).due, false);
    assert.equal(dueStory(state, later).stopped, true);
    // The gap and the stop are facts for the next story, with no cause guessed.
    const sense = timeSense(state, later)!; // the egg itself is the last event: adoption
    assert.equal(sense.hoursSinceLastStory, Math.round(((later - adopted) / 3600000) * 10) / 10);
    assert.equal(sense.userStoppedCheckAt, new Date(stopped.stoppedAt!).toISOString());
    // Resuming sets the check again and keeps the stop and resume times.
    await setSchedule(store, 'Asia/Shanghai', 'automation:pet-2');
    state = await store.peek();
    assert.equal(state.schedule!.reference, 'automation:pet-2');
    assert.ok(state.schedule!.resumedAt! >= state.schedule!.stoppedAt!);
    assert.equal(dueStory(state, later).stopped, false);
    assert.equal(dueStory(state, later).due, true);
    assert.ok(timeSense(state, later)!.checkResumedAt);
    // A story after the resume no longer carries the old stop.
    state.stories.push({
      id: 's',
      triggerId: 't',
      petId: 'p',
      at: later,
      text: 'x',
      basis: 'x',
      stage: 'egg',
      state: 'x',
      mediaIds: [],
    });
    assert.equal('userStoppedCheckAt' in timeSense(state, later + 1)!, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('replacement artwork invalidates an earlier host confirmation for the same story', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-stale-display-')),
    store = new Store(root, 'dots');
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    const request = artRequest(await store.peek())!.id;
    const first = await acceptArt(store, {
      requestId: request,
      file,
      kind: 'avatar',
      provenance: 'Synthetic old appearance',
    });
    await bindAvatar(store, 'dots-owner');
    const result = {
      petId: (await store.peek()).pet!.id,
      operationId: op,
      appearanceId: first.id,
      avatarId: 'dots-owner',
      updated: true,
      active: true,
      refreshRequested: true,
      displayStatus: 'unconfirmed' as const,
    };
    await recordHostResult(store, op, result);
    const replacement = PNG.sync.read(await readFile(file));
    replacement.data[(8 * 32 + 8) * 4] = 60;
    await writeFile(file, PNG.sync.write(replacement));
    const second = await acceptArt(store, {
      requestId: request,
      file,
      kind: 'avatar',
      provenance: 'Synthetic revised appearance',
    });
    assert.notEqual(first.id, second.id);
    await assert.rejects(() => finishStory(store, op), /unfinished/);
    await recordHostResult(store, op, { ...result, appearanceId: second.id });
    await finishStory(store, op);
    assert.equal((await store.peek()).pet!.state.appearanceId, second.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('an explicit reset changes identity once, preserving the bound surface, schedule and previous archive', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-reset-')),
    store = new Store(root, 'dots');
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Synthetic reset fixture',
    });
    await hostDone(store, op);
    await finishStory(store, op);
    await store.transaction(state => {
      state.pet!.binding = { host: 'dots', avatarId: 'same-surface' };
      state.schedule = {
        timezone: 'Asia/Taipei',
        reference: 'test-only-task',
      };
      state.legacy = { backup: 'test-only-legacy', importedAt: 0 };
    });
    const previous = await store.peek(),
      reset = await resetPet(store, 'reset-unit');
    assert.ok(reset.backup);
    assert.deepEqual(JSON.parse(await readFile(reset.backup!, 'utf8')), previous);
    const next = await store.peek();
    assert.notEqual(next.pet!.id, previous.pet!.id);
    assert.equal(next.pet!.genes, null);
    assert.equal(next.pet!.stage, 'egg');
    assert.deepEqual(next.pet!.binding, previous.pet!.binding);
    assert.deepEqual(next.schedule, previous.schedule);
    assert.equal(next.legacy, undefined);
    assert.equal(next.replacesPetId, previous.pet!.id);
    assert.equal(next.stories.length, 0);
    assert.equal(next.art.length, 0);
    assert.equal((await resetPet(store, 'reset-unit')).pet!.id, next.pet!.id);
    assert.equal((await readdir(path.join(store.root, 'backups'))).length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('growth ceilings make the next story advance one stage, and adults enter and leave special forms', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-growth-')),
    store = new Store(root, 'dots');
  const ago = (ms: number) => Date.now() - ms,
    HOUR = 3_600_000,
    DAY = 24 * HOUR;
  const story = { text: 'A new day.', basis: 'Test', state: 'Calm' };
  const look = { appearance: { description: 'Planned appearance' } };
  try {
    const op = await initialization(store),
      file = path.join(root, 'avatar.png');
    await image(file);
    await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'avatar',
      provenance: 'Fixture',
    });
    await hostDone(store, op);
    await finishStory(store, op);
    const begin = async (trigger: string) => (await beginStory(store, trigger)).pending!.id;

    let next = await begin('manual:egg');
    assert.equal(growth(await store.peek())!.required, null);
    await assert.rejects(() => planStory(store, next, { ...story, home: 'A nest' }), /home begins after hatching/);
    await assert.rejects(() => planStory(store, next, { ...story, stage: 'juvenile', ...look }), /at most one stage/);
    await store.transaction(state => void (state.pet!.adoptedAt = ago(6 * HOUR))); // The egg counts from adoption.
    assert.equal(growth(await store.peek())!.required, 'advance');
    await assert.rejects(() => planStory(store, next, story), /Growth is due: this story advances to hatchling/);
    await planStory(store, next, { ...story, stage: 'hatchling', home: 'A moss nest', ...look });
    await cancelStory(store, next);

    await store.transaction(state => void (state.pet!.stage = 'adult'));
    assert.equal(growth(await store.peek())!.required, null); // An adult first has its own interval.
    await store.transaction(state => void (state.pet!.adoptedAt = ago(8 * DAY))); // No adult story: adoption time.
    assert.equal(growth(await store.peek())!.required, 'enter-special');
    next = await begin('manual:adult');
    await assert.rejects(() => planStory(store, next, story), /special form is due/);
    await assert.rejects(() => planStory(store, next, { ...story, special: 'Shadowed' }), /requires an appearance/);
    await assert.rejects(() => planStory(store, next, { ...story, special: null }), /no special form to end/);
    await planStory(store, next, { ...story, special: 'Shadowed after long nights', ...look });
    await cancelStory(store, next);

    await store.transaction(state => {
      state.pet!.special = { description: 'Shadowed', since: ago(3 * DAY), storyId: 'test' };
    });
    assert.equal(growth(await store.peek())!.required, 'end-special');
    next = await begin('manual:return');
    await assert.rejects(() => planStory(store, next, { ...story, special: 'Still shadowed' }), /due to end/);
    await planStory(store, next, { ...story, special: null, ...look });
    await cancelStory(store, next);

    await store.transaction(state => {
      state.pet!.special = { description: 'Shadowed', since: ago(3 * DAY), storyId: 'test', endedAt: ago(HOUR) };
    });
    assert.equal(growth(await store.peek())!.required, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('an unfinished initialization that cannot be completed can be abandoned by reset, not by cancel', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-abandon-'));
  const store = new Store(root);
  try {
    const op = await initialization(store);
    const stuck = (await store.peek()).pet!.id;
    await assert.rejects(() => cancelStory(store, op), /reset the pet/);
    const reset = await resetPet(store, 'abandon-1');
    assert.equal(reset.status, 'pending');
    const state = await store.peek();
    assert.notEqual(state.pet!.id, stuck);
    assert.equal(state.pending!.mode, 'initialization');
    assert.ok(reset.backup);
    await assert.rejects(() => beginStory(store, 'manual:other-trigger'), /Unfinished/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('a visible state change gives the Avatar a variant without changing the stage, and a later story reuses a saved look', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-variant-')),
    store = new Store(root, 'dots');
  const story = { text: 'It found a rain hat.', basis: 'Test', state: 'Wearing a rain hat' };
  const file = path.join(root, 'avatar.png');
  try {
    await image(file);
    const draw = async (operationId: string) => {
      await acceptArt(store, {
        requestId: artRequest(await store.peek())!.id,
        file,
        kind: 'avatar',
        provenance: 'Fixture',
      });
      await hostDone(store, operationId);
      return finishStory(store, operationId);
    };
    await draw(await initialization(store));
    let op = (await beginStory(store, 'manual:hatch')).pending!.id;
    await planStory(store, op, { ...story, stage: 'hatchling', appearance: { description: 'Plain hatchling' } });
    const plain = (await draw(op)).appearanceId!;
    op = (await beginStory(store, 'manual:hat')).pending!.id;
    await planStory(store, op, { ...story, appearance: { description: 'The same hatchling wearing a rain hat' } });
    const hat = (await draw(op)).appearanceId!;
    let state = await store.peek();
    assert.equal(state.pet!.stage, 'hatchling');
    assert.equal(state.pet!.state.appearanceId, hat);
    assert.notEqual(hat, plain);
    op = (await beginStory(store, 'manual:plain-again')).pending!.id;
    await planStory(store, op, {
      ...story,
      state: 'Back to plain',
      appearance: { description: 'Hat off again', reuseArtId: plain },
    });
    await hostDone(store, op);
    await finishStory(store, op);
    state = await store.peek();
    assert.equal(state.pet!.state.appearanceId, plain);
    assert.equal(state.art.filter(art => art.kind === 'avatar').length, 3); // egg, plain, hat: nothing was redrawn
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

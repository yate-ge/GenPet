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
import { dueStory } from '../src/schedule.js';
import { artRequest, acceptArt } from '../src/art.js';
import { bindAvatar } from '../src/hosts/dots.js';
import { initialPlan, initialization, image, hostDone } from './fixtures.js';
test('identity is persisted once, reads do not age it, and competing triggers cannot create another pet', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-story-'));
  const store = new Store(root);
  try {
    const first = await beginStory(store, 'manual:first', 'initialization');
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
test('daily slots use user timezone, coalesce missed checks and deduplicate completion', () => {
  const s = { version: 2 as const, host: 'dots' as const, pet: null, stories: [], art: [], pending: null };
  assert.equal(dueStory(s, Date.parse('2026-10-02T22:00:00Z'), 'Asia/Taipei').due, false);
  const due = dueStory(s, Date.parse('2026-10-02T08:01:00Z'), 'Asia/Taipei');
  assert.equal(due.triggerId, 'daily:2026-10-02:16:00:Asia.Taipei');
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
  assert.equal(dueStory(done, Date.parse('2026-10-02T08:02:00Z'), 'Asia/Taipei').due, false);
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
    await assert.rejects(() => resetPet(store, 'competing-reset'), /unfinished/);
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
    await store.transaction(state => void (state.stories[0].at = ago(6 * HOUR)));
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

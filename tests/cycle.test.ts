import { retainFixture as rm } from './evidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { beginStory, planStory, finishStory, cancelStory, resetPet } from '../src/lifecycle.js';
import { artRequest, acceptArt } from '../src/art.js';
import { growth } from '../src/growth.js';
import { dueStory } from '../src/schedule.js';
import { recordHostResult } from '../src/hosts/result.js';
import { journeyReady, initialPlan, image, hostDone } from './fixtures.js';
import type { StoryPlan } from '../src/model.js';

const HOUR = 3600000,
  DAY = 24 * HOUR;
// Five independent identities: early decisions, exact ceilings, overdue coalescing,
// cancellation/failed host retry, and saved-art recovery. No live host calls occur.
for (let group = 1; group <= 5; group++) {
  test(`pet group ${group}: committed egg → hatchling → juvenile → adult → special → recovery → new special`, async t => {
    const root = await mkdtemp(path.join(tmpdir(), `genpet-cycle-${group}-`));
    const store = new Store(root, 'cloud');
    let now = Date.parse('2026-10-01T00:00:00Z') + group * HOUR;
    t.mock.method(Date, 'now', () => now);
    const file = path.join(root, 'fixture.png');
    await image(file, true);
    const snapshots: unknown[] = [];
    try {
      const commit = async (trigger: string, plan: StoryPlan, failHost = false) => {
        const before = (await store.peek()).pet;
        // Group 1 forces each stage change; a forced grow in adulthood always changes the special form.
        const forceGrowth = group === 1 && !!before && !!plan.stage && plan.stage !== before.state.stage;
        const begun = await beginStory(store, trigger, { forceGrowth }),
          op = begun.pending!.id;
        assert.equal((await beginStory(store, trigger)).pending!.id, op);
        if (begun.pending!.mode === 'initialization') await journeyReady(store, op);
        await planStory(store, op, plan);
        assert.deepEqual((await store.peek()).pet, before ?? begun.pet);
        if (plan.appearance) {
          if (!plan.appearance.reuseArtId)
            await acceptArt(store, {
              requestId: artRequest(await store.peek())!.id,
              file,
              kind: 'atlas',
              source: 'Synthetic lifecycle fixture; not visual acceptance',
            });
          if (failHost) {
            await assert.rejects(() => finishStory(store, op), /unfinished/);
            assert.deepEqual((await store.peek()).pet, before ?? begun.pet);
            const success = await hostDone(store, op);
            await recordHostResult(store, op, {
              ...success,
              storedArtworkVerified: null,
              updated: false,
              error: 'Simulated host unavailable',
            });
            await assert.rejects(() => finishStory(store, op), /unfinished/);
            assert.deepEqual((await store.peek()).pet, before ?? begun.pet);
          }
          await hostDone(store, op);
        }
        const completed = await finishStory(store, op);
        assert.equal((await finishStory(store, op)).id, completed.id);
        assert.equal((await beginStory(store, trigger)).status, 'completed');
        const state = await store.peek();
        assert.equal(state.pending, null);
        snapshots.push(structuredClone(state));
        return completed;
      };
      await commit(`group:${group}:adopt`, { ...initialPlan, genes: `${initialPlan.genes} Test identity ${group}.` });
      const identity = (await store.peek()).pet!;
      const plain = {
        text: 'A fixture story from this pet.',
        reason: 'Synthetic cycle',
        contextRefs: ['fixture:synthetic-context'],
        state: 'Resting',
      };
      let op = (await beginStory(store, `group:${group}:rejected`)).pending!.id;
      await assert.rejects(
        () => planStory(store, op, { ...plain, home: 'Premature nest' }),
        /home begins after hatching/,
      );
      await assert.rejects(() => planStory(store, op, { ...plain, special: 'Premature glow' }), /adulthood/);
      await assert.rejects(
        () => planStory(store, op, { ...plain, stage: 'juvenile', appearance: { description: 'Skipped hatchling' } }),
        /at most one stage/,
      );
      await cancelStory(store, op);
      assert.deepEqual((await store.peek()).pet, identity);
      const delay = (ceiling: number) => (group === 1 ? ceiling / 2 : group === 3 ? ceiling + 30 * DAY : ceiling);
      now += delay(5 * HOUR);
      assert.equal(growth(await store.peek())!.required, group === 1 ? null : 'advance');
      await commit(
        `group:${group}:hatch`,
        {
          ...plain,
          stage: 'hatchling',
          home: `Moss nest ${group}`,
          appearance: { description: 'Undeveloped synthetic hatchling' },
        },
        group === 4,
      );
      const hatchState = await store.peek();
      assert.equal(hatchState.pet!.state.home, `Moss nest ${group}`);
      now += delay(7 * DAY);
      await commit(`group:${group}:juvenile`, {
        ...plain,
        stage: 'juvenile',
        home: `Moss nest ${group} with a sheltered alcove`,
        appearance: { description: 'Synthetic juvenile' },
      });
      assert.equal((await store.peek()).stories[1].home, `Moss nest ${group}`);
      now += delay(7 * DAY);
      await commit(`group:${group}:adult`, {
        ...plain,
        stage: 'adult',
        appearance: { description: 'Synthetic adult' },
      });
      const adult = (await store.peek()).pet!,
        adultArt = adult.state.appearanceId!;
      const home = adult.state.home;
      now += delay(7 * DAY);
      await commit(`group:${group}:special`, {
        ...plain,
        special: 'Lantern glow',
        appearance: { description: 'Synthetic glowing adult' },
      });
      const special = (await store.peek()).pet!.state.special!;
      now += HOUR;
      await commit(`group:${group}:special-update`, { ...plain, special: 'Lantern glow with quiet sparks' });
      assert.equal((await store.peek()).pet!.state.special!.since, special.since);
      assert.equal((await store.peek()).pet!.state.special!.storyId, special.storyId);
      now = special.since + (group === 1 ? DAY : 2 * DAY);
      await commit(`group:${group}:recover`, {
        ...plain,
        special: null,
        appearance: { description: 'Return to saved adult', reuseArtId: adultArt },
      });
      const recovered = (await store.peek()).pet!;
      assert.equal(recovered.state.appearanceId, adultArt);
      assert.equal(recovered.state.special!.endedAt, now);
      assert.equal(growth(await store.peek(), now + 7 * DAY - 1)!.special!.available, false);
      assert.equal(growth(await store.peek(), now + 7 * DAY)!.special!.available, true);
      assert.equal(growth(await store.peek(), now + 7 * DAY)!.required, null);
      now += 7 * DAY;
      await commit(`group:${group}:special-again`, {
        ...plain,
        special: 'Dew glow',
        appearance: { description: 'Second synthetic special form' },
      });
      const final = await store.peek();
      assert.equal(final.pet!.state.special!.since, now);
      assert.notEqual(final.pet!.state.special!.storyId, special.storyId);
      assert.equal(final.pet!.id, identity.id);
      assert.equal(final.pet!.soul.genes, identity.soul.genes);
      assert.equal(final.pet!.soul.personality, identity.soul.personality);
      assert.equal(final.pet!.state.home, home);
      assert.equal(final.pet!.revision, 8);
      assert.equal(final.stories.length, 8);
      assert.equal(final.art.length, 6); // Recovery reuses adult artwork; special-update keeps it.
      assert.equal(
        final.stories.every(story => story.petId === identity.id),
        true,
      );
      assert.equal(new Set(final.stories.map(story => story.id)).size, 8);

      op = (await beginStory(store, `group:${group}:cancelled-home`)).pending!.id;
      await planStory(store, op, { ...plain, home: 'This uncommitted home must not persist' });
      await assert.rejects(() => resetPet(store, 'pending-protection'), /Resume or cancel/);
      await cancelStory(store, op);
      assert.deepEqual((await store.peek()).pet, final.pet);

      if (group === 5) {
        await assert.rejects(
          () => store.transaction(state => state.art.push({ ...state.art[0], id: 'foreign-art', petId: 'other-pet' })),
          /must not mix identities/,
        );
        op = (await beginStory(store, 'group:5:foreign')).pending!.id;
        await assert.rejects(
          () => planStory(store, op, { ...plain, appearance: { description: 'Wrong pet', reuseArtId: 'foreign-art' } }),
          /another pet/,
        );
        await planStory(store, op, plain);
        assert.equal(
          artRequest(await store.peek())!.savedArt.some(art => art.petId !== identity.id),
          false,
        );
        await cancelStory(store, op);
      }
      if (process.env.GENPET_TEST_EVIDENCE_DIR) {
        await mkdir(process.env.GENPET_TEST_EVIDENCE_DIR, { recursive: true });
        await writeFile(
          path.join(process.env.GENPET_TEST_EVIDENCE_DIR, `cycle-${group}.json`),
          JSON.stringify({ synthetic: true, snapshots }, null, 2),
        );
      }
    } finally {
      t.mock.restoreAll();
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('failed initialization reset preserves exact backup and ordinary pending story protects identity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-reset-cycle-')),
    store = new Store(root, 'cloud');
  try {
    const op = (await beginStory(store, 'initialization-failure')).pending!.id;
    await journeyReady(store, op);
    await planStory(store, op, initialPlan);
    await assert.rejects(() => finishStory(store, op), /artwork is unfinished/);
    const before = await store.peek();
    const reset = await resetPet(store, 'failed-init-reset');
    assert.deepEqual(JSON.parse(await readFile(reset.backup!, 'utf8')), before);
    assert.notEqual(reset.pet!.id, before.pet!.id);
    assert.equal((await resetPet(store, 'failed-init-reset')).pet!.id, reset.pet!.id);
    assert.equal((await readdir(path.join(store.root, 'backups'))).length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('periodic retry retains pending operation and carries an overdue hatch across missed periods', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-periodic-cycle-')),
    store = new Store(root, 'cloud');
  let now = Date.parse('2026-10-02T23:00:00Z');
  t.mock.method(Date, 'now', () => now);
  try {
    const first = await beginStory(store, 'manual:adopt');
    assert.equal((await beginStory(store, 'manual:adopt')).pending!.id, first.pending!.id);
    assert.equal(dueStory(await store.peek(), now).pending, first.pending!.id);
    await journeyReady(store, first.pending!.id);
    await planStory(store, first.pending!.id, initialPlan);
    const file = path.join(root, 'egg.png');
    await image(file, true);
    await acceptArt(store, {
      requestId: artRequest(await store.peek())!.id,
      file,
      kind: 'atlas',
      source: 'Synthetic periodic fixture',
    });
    await hostDone(store, first.pending!.id);
    await finishStory(store, first.pending!.id);
    assert.equal(dueStory(await store.peek(), now).due, false); // the initialization period
    now += 5 * HOUR;
    const hatchTrigger = dueStory(await store.peek(), now).triggerId;
    assert.match(hatchTrigger!, /^growth:.*:egg:advance:/);
    now += 13 * HOUR + 5 * 60000; // missed checks coalesce into the current period
    const next = dueStory(await store.peek(), now);
    assert.equal(next.triggerId, hatchTrigger);
    assert.equal(next.due, true);
    assert.equal((await store.peek()).stories.length, 1);
  } finally {
    t.mock.restoreAll();
    await rm(root, { recursive: true, force: true });
  }
});

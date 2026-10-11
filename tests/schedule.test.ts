import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createPet, fresh, type Stage, type State, type Story } from '../src/model.js';
import { ensureGrowthClock, growth, stageAdvance } from '../src/growth.js';
import { CHECK_INTERVAL, dueStory } from '../src/schedule.js';
import { Store } from '../src/store.js';
import { beginStory } from '../src/lifecycle.js';

const START = Date.parse('2026-10-01T00:00:00Z');
const HOUR = 3_600_000;
function fixture(stage: Stage, since = START + 4 * HOUR): State {
  const state = fresh('cloud');
  state.pet = createPet('Synthetic schedule fixture', START);
  state.pet.state.stage = stage;
  state.pet.soul.genes = 'Synthetic fixed identity';
  ensureGrowthClock(state)!.stageSince = since;
  return state;
}
function story(state: State, triggerId: string, at: number): Story {
  return {
    id: `story-${randomUUID()}`,
    triggerId,
    petId: state.pet!.id,
    at,
    text: 'Synthetic completed story',
    reason: 'Schedule regression fixture',
    stage: state.pet!.state.stage,
    state: 'Resting',
    mediaIds: [],
  };
}

for (const [stage, change, hours] of [
  ['egg', 'advance', 9],
  ['hatchling', 'advance', 172],
  ['juvenile', 'advance', 172],
  ['adult', 'enter-special', 172],
] as const) {
  test(`${stage}: a nonaligned growth deadline bypasses a completed ordinary period`, () => {
    const state = fixture(stage);
    const deadline = START + hours * HOUR;
    const period = Math.floor((deadline - START) / CHECK_INTERVAL);
    state.stories.push(story(state, `period:${period}`, START + period * CHECK_INTERVAL));
    const before = JSON.stringify(state);
    assert.equal(dueStory(state, deadline - 1).due, false);
    assert.equal(dueStory(state, deadline - 1).nextCheckAt, new Date(deadline).toISOString());
    const due = dueStory(state, deadline);
    assert.equal(due.due, true);
    assert.equal(due.growthRequired, change);
    assert.notEqual(due.triggerId, `period:${period}`);
    assert.ok(due.triggerId!.includes(state.pet!.id));
    assert.equal(dueStory(state, deadline + 3 * HOUR).triggerId, due.triggerId);
    assert.equal(JSON.stringify(state), before);
  });
}

test('a special-form end and a later reentry have distinct stable triggers', () => {
  const state = fixture('adult');
  state.pet!.state.special = { description: 'Synthetic form', since: START + 4 * HOUR, storyId: 'form-1' };
  stageAdvance(state, START + 4 * HOUR);
  state.stories.push(story(state, 'period:10', START + 50 * HOUR));
  const deadline = START + 52 * HOUR;
  const due = dueStory(state, deadline);
  assert.equal(due.due, true);
  assert.equal(due.growthRequired, 'end-special');
  state.stories.push(story(state, due.triggerId!, deadline));
  assert.equal(dueStory(state, deadline).due, false);
  state.pet!.state.special!.endedAt = deadline;
  stageAdvance(state, deadline);
  const later = dueStory(state, deadline + 7 * 24 * HOUR);
  assert.equal(later.growthRequired, 'enter-special');
  assert.notEqual(later.triggerId, due.triggerId);
});

test('deadline completion covers that ordinary period, and only that period', () => {
  const state = fixture('hatchling');
  const deadline = START + 172 * HOUR;
  const due = dueStory(state, deadline);
  state.pet!.state.stage = 'juvenile';
  stageAdvance(state, deadline);
  state.stories.push(story(state, due.triggerId!, deadline));
  assert.equal(dueStory(state, deadline).due, false);
  assert.equal(dueStory(state, deadline).nextCheckAt, new Date(START + 175 * HOUR).toISOString());
  assert.equal(dueStory(state, START + 175 * HOUR).triggerId, 'period:35');
  assert.equal(dueStory(state, START + 175 * HOUR).due, true);
});

test('inactive, stopped, exported and unimported records schedule no wake; pause totals shift the deadline', () => {
  const state = fixture('hatchling');
  state.growthClock!.pausedMs = 2 * HOUR;
  state.stories.push(story(state, 'period:34', START + 170 * HOUR));
  assert.equal(dueStory(state, START + 171 * HOUR).nextCheckAt, new Date(START + 174 * HOUR).toISOString());
  for (const blocked of [
    { ...state, growthClock: { ...state.growthClock!, pausedAt: START + 171 * HOUR } },
    { ...state, schedule: { timezone: 'UTC', stoppedAt: START } },
    { ...state, handoff: { id: 'transfer', target: 'desktop' as const, status: 'exported' as const, at: START } },
    { ...state, needsImport: true },
    fresh('cloud'),
  ]) {
    assert.equal(dueStory(blocked, START + 200 * HOUR).due, false);
    assert.equal(dueStory(blocked, START + 200 * HOUR).nextCheckAt, null);
  }
});

test('production beginStory opens the deadline after a completed ordinary trigger, then resumes it on retry', async t => {
  const root = path.resolve('output/implementation-20261011/scheduling-regression', randomUUID());
  await mkdir(root, { recursive: true });
  const store = new Store(root, 'cloud');
  const deadline = START + 172 * HOUR;
  t.mock.method(Date, 'now', () => deadline);
  await store.transaction(state => {
    Object.assign(state, fixture('hatchling'));
    state.stories.push(story(state, 'period:34', START + 170 * HOUR));
  });
  assert.equal((await beginStory(store, 'period:34')).status, 'completed');
  const due = dueStory(await store.peek(), deadline);
  const opened = await beginStory(store, due.triggerId!);
  assert.equal(opened.status, 'pending');
  assert.equal(opened.growth!.required, 'advance');
  assert.equal((await beginStory(store, due.triggerId!)).pending!.id, opened.pending!.id);
  assert.equal(growth(await store.peek(), deadline)!.stage, 'hatchling');
});

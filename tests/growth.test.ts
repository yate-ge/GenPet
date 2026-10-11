import test from 'node:test';
import assert from 'node:assert/strict';
import {
  growth,
  commitExperience,
  stageAdvance,
  ensureGrowthClock,
  STAGE_CEILING,
  SPECIAL_INTERVAL,
  SPECIAL_DURATION,
} from '../src/growth.js';
import { createPet, fresh, type Stage, type State } from '../src/model.js';

const START = Date.parse('2026-10-01T00:00:00Z');
function fixture(stage: Stage): State {
  const state = fresh('cloud');
  state.pet = createPet('Test', START);
  state.pet.state.stage = stage;
  state.pet.soul.genes = 'Synthetic test identity';
  return state;
}
for (const stage of ['egg', 'hatchling', 'juvenile'] as const) {
  test(`${stage}: latest-time boundary requires exactly one next stage, and reading leaves state unchanged`, () => {
    const state = fixture(stage),
      before = JSON.stringify(state),
      deadline = START + STAGE_CEILING[stage]!;
    assert.equal(growth(state, deadline - 1)!.required, null);
    assert.equal(growth(state, deadline)!.required, 'advance');
    assert.equal(growth(state, deadline + 1)!.required, 'advance');
    assert.equal(
      growth(state, deadline + 100 * 86400000)!.next,
      { egg: 'hatchling', hatchling: 'juvenile', juvenile: 'adult' }[stage],
    );
    assert.equal(JSON.stringify(state), before);
  });
}
test('a stage clock begins at its first stage story, then import, then adoption; unimported views are not live', () => {
  const state = fixture('hatchling');
  state.legacy = { backup: 'synthetic', importedAt: START + 1000 };
  assert.equal(growth(state, START)!.since, new Date(START + 1000).toISOString());
  state.stories = [
    {
      id: 'first',
      triggerId: 'manual:first',
      petId: state.pet!.id,
      at: START + 2000,
      text: 'First hatch.',
      reason: 'Fixture',
      stage: 'hatchling',
      state: 'Resting',
      mediaIds: [],
    },
  ];
  assert.equal(growth(state, START)!.since, new Date(START + 2000).toISOString());
  state.stories = [];
  delete state.legacy;
  assert.equal(growth(state, START)!.since, new Date(START).toISOString());
  state.needsImport = true;
  assert.equal(growth(state), null);
  delete state.needsImport;
  state.pet!.soul.genes = null;
  assert.equal(growth(state, START + 999999999), null);
  assert.equal(growth(fresh('cloud'), START), null);
});
test('actual memory rewrites count once, unchanged content and retrying any committed story count zero', () => {
  const state = fixture('hatchling');
  assert.equal(commitExperience(state, 'initial', 'Our first meeting.', START, false), true);
  assert.equal(growth(state, START)!.experiences, 0);
  for (let index = 1; index <= 5; index++) {
    const id = `experience-${index}`;
    assert.equal(commitExperience(state, id, `A meaningful new memory ${index}.`, START + index), true);
    assert.equal(commitExperience(state, id, `A retry cannot rewrite memory ${index}.`, START + index), false);
    state.stories.push({
      id,
      triggerId: id,
      petId: state.pet!.id,
      at: START + index,
      text: 'Saved story.',
      reason: 'Recorded real interaction.',
      stage: 'hatchling',
      state: 'Resting',
      mediaIds: [],
    });
  }
  assert.equal(growth(state, START + 5)!.experiences, 5);
  assert.equal(growth(state, START + 5)!.canAdvance, true);
  assert.equal(growth(state, START + 5)!.required, null);
  assert.equal(commitExperience(state, 'experience-1', 'An old retry after later stories.', START + 6), false);
  assert.equal(commitExperience(state, 'same-content', state.pet!.memory.text, START + 7), false);
  assert.equal(growth(state, START + 7)!.experiences, 5);
  state.pet!.state.stage = 'juvenile';
  stageAdvance(state, START + 8);
  assert.equal(growth(state, START + 8)!.experiences, 0);
  assert.equal(growth(state, START + 8)!.canAdvance, false);
  assert.equal(growth(state, START + 8)!.since, new Date(START + 8).toISOString());
});
test('five egg experiences do not bypass the five-hour hatch, and initial plans count no experience', () => {
  const state = fixture('egg');
  for (let i = 1; i <= 5; i++) commitExperience(state, `egg-${i}`, `New egg memory ${i}`, START + i);
  assert.equal(growth(state, START + 5)!.canAdvance, false);
  assert.equal(growth(state, START + 5 * 3600000)!.canAdvance, true);
  state.pending = {
    id: 'init',
    triggerId: 'init',
    petId: state.pet!.id,
    baseRevision: 0,
    startedAt: START,
    mode: 'initialization',
  };
  const count = growth(state, START)!.experiences;
  commitExperience(state, 'adoption-memory', 'The completed adoption journey.', START + 6);
  assert.equal(growth(state, START)!.experiences, count);
});
test('inactive time pauses stage and special ceilings while offline active time advances normally', () => {
  const state = fixture('hatchling'),
    hour = 3600000,
    day = 24 * hour;
  const clock = ensureGrowthClock(state)!;
  clock.pausedAt = START + hour;
  assert.equal(growth(state, START + 10 * day)!.required, null);
  const resumed = START + 10 * day;
  clock.pausedMs = resumed - clock.pausedAt;
  delete clock.pausedAt;
  const deadline = START + STAGE_CEILING.hatchling! + clock.pausedMs;
  assert.equal(growth(state, deadline - 1)!.required, null);
  assert.equal(growth(state, deadline)!.required, 'advance');
  const active = fixture('hatchling');
  assert.equal(growth(active, START + 10 * day)!.required, 'advance');
  state.pet!.state.stage = 'adult';
  stageAdvance(state, resumed);
  state.pet!.state.special = { description: 'Lantern glow', since: resumed, storyId: 'form' };
  stageAdvance(state, resumed);
  clock.pausedAt = resumed + hour;
  assert.equal(growth(state, resumed + 20 * day)!.required, null);
});
test('special form boundaries and recovery reset the next interval, including prior pause baselines', () => {
  const state = fixture('adult');
  assert.equal(growth(state, START + SPECIAL_INTERVAL - 1)!.required, null);
  assert.equal(growth(state, START + SPECIAL_INTERVAL)!.required, 'enter-special');
  ensureGrowthClock(state);
  state.pet!.state.special = { description: 'Lantern glow', since: START + 1000, storyId: 'form' };
  stageAdvance(state, START + 1000);
  assert.equal(growth(state, START + 1000 + SPECIAL_DURATION - 1)!.required, null);
  assert.equal(growth(state, START + 1000 + SPECIAL_DURATION)!.required, 'end-special');
  const endedAt = START + SPECIAL_DURATION + 2000;
  state.pet!.state.special.endedAt = endedAt;
  stageAdvance(state, endedAt);
  assert.equal(growth(state, endedAt + SPECIAL_INTERVAL - 1)!.required, null);
  assert.equal(growth(state, endedAt + SPECIAL_INTERVAL)!.required, 'enter-special');
});

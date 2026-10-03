import test from 'node:test';
import assert from 'node:assert/strict';
import { growth, STAGE_CEILING, SPECIAL_INTERVAL, SPECIAL_DURATION } from '../src/growth.js';
import { createPet, fresh, type Stage, type State } from '../src/model.js';
import { dueStory } from '../src/schedule.js';

const START = Date.parse('2026-10-01T00:00:00Z');
function fixture(stage: Stage): State {
  const state = fresh('dots');
  state.pet = { ...createPet('Test', START), stage, genes: 'Synthetic test identity' };
  return state;
}
for (const stage of ['egg', 'hatchling', 'juvenile'] as const) {
  test(`${stage}: one millisecond before, at and after latest growth deadline`, () => {
    const state = fixture(stage);
    const deadline = START + STAGE_CEILING[stage]!;
    assert.equal(growth(state, deadline - 1)!.required, null);
    assert.equal(growth(state, deadline)!.required, 'advance');
    assert.equal(growth(state, deadline + 1)!.required, 'advance');
    assert.equal(
      growth(state, deadline + 100 * 86400000)!.next,
      { egg: 'hatchling', hatchling: 'juvenile', juvenile: 'adult' }[stage],
    );
  });
}
test('growth origin prefers this pet first completed stage story, then import, then adoption', () => {
  const state = fixture('hatchling');
  state.legacy = { backup: 'synthetic', importedAt: START + 1000 };
  assert.equal(growth(state, START)!.since, new Date(START + 1000).toISOString());
  const story = {
    id: 'first',
    triggerId: 'manual:first',
    petId: state.pet!.id,
    at: START + 2000,
    text: 'A first hatch.',
    basis: 'Fixture',
    stage: 'hatchling' as const,
    state: 'Resting',
    mediaIds: [],
  };
  state.stories = [
    { ...story, id: 'foreign', petId: 'another-pet', at: START - 5000 },
    { ...story, id: 'egg', stage: 'egg', at: START - 2000 },
    story,
    { ...story, id: 'later', at: START + 9000 },
  ];
  assert.equal(growth(state, START)!.since, new Date(story.at).toISOString());
  state.stories = [];
  delete state.legacy;
  assert.equal(growth(state, START)!.since, new Date(START).toISOString());
  state.pet!.genes = null;
  assert.equal(growth(state, START + 999999999), null);
  assert.equal(growth(fresh('dots'), START), null);
});
test('adult special boundaries and recovery reset the next special deadline', () => {
  const state = fixture('adult');
  assert.equal(growth(state, START + SPECIAL_INTERVAL - 1)!.required, null);
  assert.equal(growth(state, START + SPECIAL_INTERVAL)!.required, 'enter-special');
  state.pet!.special = { description: 'Lantern glow', since: START + 1000, storyId: 'form' };
  assert.equal(growth(state, START + 1000 + SPECIAL_DURATION - 1)!.required, null);
  assert.equal(growth(state, START + 1000 + SPECIAL_DURATION)!.required, 'end-special');
  const endedAt = START + SPECIAL_DURATION + 2000;
  state.pet!.special.endedAt = endedAt;
  assert.equal(growth(state, endedAt + SPECIAL_INTERVAL - 1)!.required, null);
  assert.equal(growth(state, endedAt + SPECIAL_INTERVAL)!.required, 'enter-special');
  assert.equal(growth(state, endedAt)!.special!.since, new Date(endedAt).toISOString());
});
test('egg hatches by adoption plus five hours even when initialization completes one hour later', () => {
  const state = fixture('egg');
  state.stories.push({
    id: 'delayed-initialization',
    triggerId: 'test:delayed-init',
    petId: state.pet!.id,
    at: START + 3600000,
    text: 'The egg finally arrived.',
    basis: 'Synthetic delayed artwork',
    stage: 'egg',
    state: 'Resting',
    mediaIds: [],
  });
  // Product meta.md: egg must hatch within five hours of adoption, not completed artwork.
  assert.equal(growth(state, START + 5 * 3600000)!.required, 'advance');
});
test('daily slots use local dates across midnight and timezone/DST transitions', () => {
  const state = fresh('dots');
  assert.equal(dueStory(state, Date.parse('2026-10-02T22:59:59Z'), 'Asia/Shanghai').triggerId, null);
  assert.equal(
    dueStory(state, Date.parse('2026-10-02T23:00:00Z'), 'Asia/Shanghai').triggerId,
    'daily:2026-10-03:07:00:Asia.Shanghai',
  );
  assert.equal(
    dueStory(state, Date.parse('2026-10-02T23:00:00Z'), 'America/New_York').triggerId,
    'daily:2026-10-02:16:00:America.New_York',
  );
  assert.equal(dueStory(state, Date.parse('2026-11-01T11:59:59Z'), 'America/New_York').triggerId, null);
  assert.equal(
    dueStory(state, Date.parse('2026-11-01T12:00:00Z'), 'America/New_York').triggerId,
    'daily:2026-11-01:07:00:America.New_York',
  );
  assert.throws(() => dueStory(state, START, 'Invalid/Timezone'), RangeError);
});

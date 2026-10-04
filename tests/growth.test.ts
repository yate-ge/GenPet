import test from 'node:test';
import assert from 'node:assert/strict';
import { growth, STAGE_CEILING, SPECIAL_INTERVAL, SPECIAL_DURATION } from '../src/growth.js';
import { createPet, fresh, type Stage, type State } from '../src/model.js';
import { CHECK_INTERVAL, dueStory } from '../src/schedule.js';

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
test('story checks are five-hourly from adoption, so a growth ceiling is met at most one interval late', () => {
  const state = fixture('hatchling');
  const check = (hours: number) => dueStory(state, START + hours * 3600000);
  assert.equal(check(4.99).triggerId, null);
  assert.equal(check(5).triggerId, 'period:1');
  assert.equal(check(9.99).triggerId, 'period:1');
  assert.equal(check(10).triggerId, 'period:2');
  // The egg's own ceiling coincides with the first check, so a hatch is due then.
  const egg = fixture('egg');
  assert.equal(growth(egg, START + CHECK_INTERVAL)!.required, 'advance');
  assert.equal(dueStory(egg, START + CHECK_INTERVAL).due, true);
  // The one-week ceiling (168h) falls inside period 33 (165-170h): the check at 170h carries it, 2h late at most.
  const deadline = START + STAGE_CEILING.hatchling!;
  assert.equal(growth(state, START + 165 * 3600000)!.required, null);
  assert.equal(dueStory(state, deadline - 1).triggerId, 'period:33');
  assert.equal(growth(state, START + 170 * 3600000)!.required, 'advance');
  assert.equal(dueStory(state, START + 170 * 3600000).triggerId, 'period:34');
  assert.ok(START + 170 * 3600000 - deadline <= CHECK_INTERVAL);
});

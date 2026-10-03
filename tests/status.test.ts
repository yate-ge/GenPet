import test from 'node:test';
import assert from 'node:assert/strict';
import { createPet, fresh, type State } from '../src/model.js';
import { statusView } from '../src/status.js';

test('the default status keeps the pet and pending work whole but trims history to the most recent records', () => {
  const state: State = { ...fresh('desktop'), pet: createPet() };
  const pet = state.pet!;
  for (let i = 0; i < 8; i++) {
    state.stories.push({
      id: `s${i}`,
      triggerId: `t${i}`,
      petId: pet.id,
      at: i,
      text: `Story ${i}`,
      basis: 'b',
      stage: 'egg',
      state: 'x',
      mediaIds: [],
      steps: [{ id: 'step', unit: 'story', at: 0, inputRefs: [], result: { big: 'x'.repeat(1000) } }],
    });
    state.chats = [...(state.chats ?? []), { id: `c${i}`, petId: pet.id, at: i, text: `Note ${i}` }];
  }
  for (let i = 0; i < 40; i++)
    state.art.push({
      id: `a${i}`,
      petId: pet.id,
      requestId: 'r',
      stage: 'egg',
      description: `Art ${i}`,
      file: `/f${i}.png`,
      kind: 'story',
      createdAt: i,
      provenance: 'p'.repeat(500),
    });
  const view = statusView(state);
  assert.deepEqual(view.pet, pet);
  assert.equal(view.storyCount, 8);
  assert.deepEqual(
    view.stories.map(story => story.id),
    ['s3', 's4', 's5', 's6', 's7'],
  );
  assert.equal('steps' in view.stories[0], false);
  assert.equal(view.artCount, 40);
  assert.equal(view.art.length, 30);
  assert.equal(view.art.at(-1)!.id, 'a39');
  assert.equal('provenance' in view.art[0], false);
  assert.equal(view.chatCount, 8);
  assert.equal(view.chats.length, 8);
  assert.ok(JSON.stringify(view).length < JSON.stringify(state).length / 2);
});

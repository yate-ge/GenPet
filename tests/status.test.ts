import test from 'node:test';
import assert from 'node:assert/strict';
import { createPet, fresh, type State } from '../src/model.js';
import { statusView, adoptionLine } from '../src/status.js';

test('default status preserves current soul, memory, state and retry metadata while trimming raw history', () => {
  const state: State = { ...fresh('desktop'), pet: createPet() },
    pet = state.pet!;
  pet.soul.genes = 'Synthetic source';
  pet.memory.text = 'We remember a real, source-backed first meeting.';
  state.pending = {
    id: 'pending',
    triggerId: 'pending',
    petId: pet.id,
    baseRevision: 0,
    startedAt: 10,
    mode: 'story',
    selection: { seed: 'saved-seed', purpose: 'story', candidateId: 'chosen' },
    steps: [{ id: 'raw-pending', unit: 'story', at: 10, inputRefs: [], result: { large: 'x'.repeat(5000) } }],
    stepsCount: 1,
  };
  for (let i = 0; i < 8; i++) {
    state.stories.push({
      id: `s${i}`,
      triggerId: `t${i}`,
      petId: pet.id,
      at: i,
      text: `Story ${i}`,
      reason: 'Saved source',
      stage: 'egg',
      state: 'Resting',
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
      kind: 'scene',
      createdAt: i,
      source: 'p'.repeat(500),
    });
  const view = statusView(state);
  assert.deepEqual(view.pet, pet);
  assert.equal(view.pending!.selection!.seed, 'saved-seed');
  assert.equal('steps' in view.pending!, false);
  assert.equal(view.storyCount, 8);
  assert.deepEqual(
    view.stories.map(story => story.id),
    ['s3', 's4', 's5', 's6', 's7'],
  );
  assert.equal('steps' in view.stories[0], false);
  assert.equal(view.artCount, 40);
  assert.equal(view.art.length, 30);
  assert.equal('source' in view.art[0], false);
  assert.equal(view.chatCount, 8);
  assert.ok(JSON.stringify(view).length < JSON.stringify(state).length / 2);
});

test('the cloud description is only the name once given, then the adoption date and place', () => {
  const pet = createPet('Fixture');
  pet.adoptedAt = new Date(2026, 9, 18, 12).getTime();
  pet.name = 'Moss';
  pet.memory.text = 'We finished the small clock together.';
  pet.soul.personality = 'Soft chirp; patient and playful';
  pet.soul.acquisition = { place: '灯笼林', connection: 'The saved adoption choices', storyId: 'init' };
  pet.naming = { status: 'unasked' };
  const before = JSON.stringify(pet);
  assert.equal(adoptionLine(pet), '你在2026年10月18日 灯笼林领养了这种宠物');
  assert.equal(JSON.stringify(pet), before);
  pet.naming = { status: 'named', namedAt: 1 };
  assert.equal(adoptionLine(pet), '它叫Moss。你在2026年10月18日 灯笼林领养了这种宠物');
  delete pet.soul.acquisition;
  pet.naming = { status: 'unasked' };
  assert.equal(adoptionLine(pet), '你在2026年10月18日领养了这种宠物');
});

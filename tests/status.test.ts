import test from 'node:test';
import assert from 'node:assert/strict';
import { createPet, fresh, type State } from '../src/model.js';
import { statusView, briefForPet, cloudBriefForPet } from '../src/status.js';

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
      kind: 'story',
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

test('cloud brief reads the same current records and leaves full journey, timestamps and ended forms internal', () => {
  const pet = createPet('Moss', 10);
  pet.soul = {
    genes: 'Red panda cub with a rooted design',
    personality: 'Soft chirp; patient and playful',
    acquisition: {
      place: 'A fictional lantern grove',
      connection: 'The saved adoption choices',
      storyId: 'init',
      journey: { background: 'A very long journey record', rounds: [] },
    },
  };
  pet.memory = { text: 'We finished the small clock together.', updatedAt: 20, storyId: 'memory' };
  pet.state = {
    stage: 'adult',
    description: 'Wearing the oversized goggles from that clock story.',
    updatedAt: 30,
    home: 'Moss nook',
    special: { description: 'Past lantern form', since: 20, storyId: 'form', endedAt: 25 },
  };
  const brief = JSON.parse(briefForPet(pet));
  assert.equal(brief.id, pet.id);
  assert.equal(brief.name, 'Moss');
  assert.equal(brief.soul.genes, pet.soul.genes);
  assert.equal(brief.soul.personality, pet.soul.personality);
  assert.equal(brief.memory, pet.memory.text);
  assert.equal(brief.state.description, pet.state.description);
  assert.equal(brief.state.home, 'Moss nook');
  assert.equal('journey' in brief.soul.acquisition, false);
  assert.equal('special' in brief.state, false);
  assert.equal('revision' in brief, false);
});

test('overlong cloud source requires an Agent summary and preserves every source field without clipping', () => {
  const pet = createPet('Fixture rhythm Pet');
  pet.soul.genes = 'A grounded synthetic design. '.repeat(30);
  pet.soul.personality = 'Patient and playful; its greeting is ta.';
  pet.memory.text = 'We kept the loose thread from the fictional journey.';
  pet.state.stage = 'hatchling';
  const before = JSON.stringify(pet);
  const source = cloudBriefForPet(pet);
  assert.equal(source.description, null);
  assert.equal(source.needsSummary, true);
  assert.equal(source.sourceBrief.soul.genes, pet.soul.genes);
  assert.equal(source.sourceBrief.soul.personality, pet.soul.personality);
  assert.equal(JSON.stringify(pet), before);
  const description = JSON.stringify({
    name: pet.name,
    soul: 'Synthetic soft rhythm Pet; says ta.',
    memory: pet.memory.text,
    state: 'hatchling',
  });
  const result = cloudBriefForPet(pet, { petId: pet.id, revision: pet.revision, description });
  assert.equal(result.description, description);
  assert.equal(result.needsSummary, false);
  assert.equal(JSON.stringify(pet), before);
});

test('cloud brief rejects wrong identity, stale revision and descriptions above the actual connector limit', () => {
  const pet = createPet('Fixture');
  const draft = { petId: pet.id, revision: pet.revision, description: 'A fixture brief.' };
  assert.throws(() => cloudBriefForPet(pet, { ...draft, petId: 'another-pet' }), /Pet ID and revision/);
  assert.throws(() => cloudBriefForPet(pet, { ...draft, revision: pet.revision - 1 }), /Pet ID and revision/);
  assert.throws(() => cloudBriefForPet(pet, { ...draft, description: 'x'.repeat(501) }), /500 characters/);
  assert.equal([...cloudBriefForPet(pet, { ...draft, description: '🌱'.repeat(500) }).description!].length, 500);
});

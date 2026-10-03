import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { createPet } from '../src/model.js';
import { requestId } from '../src/appearance.js';
import { beginStory, planStory, finishStory } from '../src/lifecycle.js';
import { unitRequest, validateUnitResult, recordStep } from '../src/generation.js';
import { initialPlan } from './fixtures.js';

const context = {
  inputRefs: ['fixture:sparse'],
  result: { facts: [], unknowns: ['Only an adoption request was provided.'] },
};
test('a unit request requires its fixed upstream inputs and captures that exact request', () => {
  const fixture = {
    inputRefs: ['fixture:first'],
    inputs: {
      context: { facts: [], unknowns: ['No profile available'] },
      encounter: { place: 'A place in the pet world' },
    },
  };
  const first = unitRequest('genes', fixture);
  assert.equal(first.promptHash, unitRequest('genes', fixture).promptHash);
  assert.notEqual(
    first.promptHash,
    unitRequest('genes', { ...fixture, inputs: { ...fixture.inputs, encounter: { place: 'Another pet-world place' } } })
      .promptHash,
  );
  assert.throws(() => unitRequest('genes', { inputs: { context: {} } }), /Missing genes input: encounter/);
  assert.throws(() => unitRequest('nonexistent', fixture), /Unknown generation unit/);
  assert.throws(() => unitRequest('genes', { ...fixture, inputRefs: [''] }), /input reference/);
});
test('contract checks allow open design and extra fields while rejecting missing fields and invalid control values', () => {
  const genes = {
    inputRefs: [],
    result: {
      designBasis:
        'A garden snail lends its soft body and feelers to an encounter about returning to an unfinished drawing; the body leaves a curling trace as a visual interpretation of retained sketch lines.',
      genes:
        'Inspired by a garden snail and the adoption story beside an unfinished drawing: a faceless soft-bodied creature with two tactile feelers and a curling body trace; these traits develop while its original body relationships persist.',
      eggAppearance: 'A complete conventional egg shell with curved markings.',
      individualNotes: { anything: 'open content' },
    },
  };
  assert.deepEqual(validateUnitResult('genes', genes), genes);
  assert.throws(
    () => validateUnitResult('genes', { inputRefs: [], result: { genes: 'Just a new color' } }),
    /eggAppearance/,
  );
  const { designBasis, ...withoutBasis } = genes.result;
  assert.throws(() => validateUnitResult('genes', { inputRefs: [], result: withoutBasis }), /designBasis/);
  assert.throws(
    () => validateUnitResult('genes', { ...genes, result: { ...genes.result, designBasis: ' ' } }),
    /designBasis/,
  );
  assert.throws(
    () => validateUnitResult('context', { ...context, result: { facts: 'Not an array', unknowns: [] } }),
    /facts/,
  );
  assert.throws(
    () =>
      validateUnitResult('evolution', {
        inputRefs: [],
        result: {
          stage: 'ancient',
          state: 'Resting',
          basis: 'Test',
          specialChange: null,
        },
      }),
    /Invalid evolution.stage/,
  );
  assert.throws(
    () =>
      validateUnitResult('image-review', {
        inputRefs: [],
        result: { file: '/fixture.png', verdict: 'maybe', observations: [], repair: null },
      }),
    /Invalid image-review.verdict/,
  );
  assert.deepEqual(
    validateUnitResult('appearance', { inputRefs: [], result: { appearance: null, visuals: [] } }).result,
    { appearance: null, visuals: [] },
  );
});
test('step retries deduplicate, revisions remain observable, and logging cannot mutate the saved plan or advance a pet', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-step-')),
    store = new Store(root, 'dots');
  try {
    const operation = (await beginStory(store, 'unit:logging', 'initialization')).pending!.id;
    await planStory(store, operation, initialPlan);
    const before = await store.peek(),
      hash = requestId(before);
    const first = await recordStep(store, operation, 'context', context);
    const reordered = await recordStep(store, operation, 'context', {
      result: { unknowns: context.result.unknowns, facts: [] },
      inputRefs: context.inputRefs,
    });
    assert.equal(reordered.id, first.id);
    const revised = await recordStep(store, operation, 'context', {
      ...context,
      result: { facts: [], unknowns: ['Another explicit unknown.'] },
    });
    assert.notEqual(revised.id, first.id);
    const after = await store.peek();
    assert.equal(after.pending!.steps!.length, 2);
    assert.equal(requestId(after), hash);
    assert.deepEqual(after.pending!.plan, before.pending!.plan);
    assert.deepEqual(after.pet, before.pet);
    assert.equal(after.stories.length, 0);
    const saved = await readFile(store.file, 'utf8');
    await assert.rejects(() => recordStep(store, 'another-operation', 'context', context), /another or missing story/);
    await assert.rejects(
      () => recordStep(store, operation, 'context', { ...context, result: { facts: [] } }),
      /unknowns/,
    );
    assert.equal(await readFile(store.file, 'utf8'), saved);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('completed stories keep their unit artifacts and accept an internal output result without changing story text', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-completed-step-')),
    store = new Store(root, 'dots');
  try {
    await store.transaction(state => {
      state.pet = createPet();
      state.pet.genes = 'Existing individual';
    });
    const operation = (await beginStory(store, 'unit:completed')).pending!.id;
    await planStory(store, operation, {
      text: 'The same pet listened to its familiar echoes.',
      basis: 'A test-only story',
      state: 'Listening',
    });
    const first = await recordStep(store, operation, 'context', context),
      story = await finishStory(store, operation);
    assert.equal(story.steps![0].id, first.id);
    const pet = (await store.peek()).pet;
    await recordStep(store, operation, 'output', {
      inputRefs: [first.id],
      result: { text: story.text, mediaRefs: [] },
    });
    const state = await store.peek();
    assert.deepEqual(state.pet, pet);
    assert.equal(state.stories[0].text, story.text);
    assert.equal(state.stories[0].steps!.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('CLI unit request and contract verification are read-only and story output excludes internal steps', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-unit-cli-'));
  const data = path.join(root, 'no-pet-records'),
    env = {
      ...process.env,
      GENPET_DATA_DIR: data,
      CODEX_HOME: path.join(root, 'codex-home'),
      CODEX_APP_TOOLS_PATH: path.join(root, 'disabled-app-tools'),
    };
  const cli = path.resolve('src/cli.ts');
  const call = (...args: string[]) =>
    JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', cli, ...args], { env, encoding: 'utf8' }));
  try {
    const fixture = path.resolve('tests/agent/contexts/sparse.json'),
      resultFile = path.join(root, 'result.json');
    await writeFile(resultFile, JSON.stringify(context));
    assert.equal(call('unit-request', 'context', fixture).unit, 'context');
    assert.equal(call('verify-unit', 'context', resultFile).contractValid, true);
    await assert.rejects(() => access(data));
    await assert.rejects(() => access(env.CODEX_HOME));
    const store = new Store(data, 'desktop');
    await store.transaction(state => {
      state.pet = createPet();
      state.pet.genes = 'Test genes';
      state.stories.push({
        id: 'completed-test',
        triggerId: 'unit:output',
        petId: state.pet.id,
        at: 0,
        text: 'A story only.',
        basis: 'Internal basis',
        stage: 'egg',
        state: 'Resting',
        mediaIds: [],
        steps: [{ id: 'step-private', unit: 'context', at: 0, ...context }],
      });
    });
    const visible = call('story-output', 'completed-test');
    assert.equal(visible.text, 'A story only.');
    assert.equal('steps' in visible, false);
    assert.equal('basis' in visible, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.js';
import { beginStory, finishStory, planStory, storyOutput } from '../src/lifecycle.js';
import { journeyStep } from '../src/journey.js';
import { chooseCandidate, chooseSource, sourceFromSeed, recentContent } from '../src/variety.js';
import { journeyReady, initialPlan, image, hostDone } from './fixtures.js';
import { acceptArt, artRequest } from '../src/art.js';
import { recordStep } from '../src/generation.js';
import { growth } from '../src/growth.js';
import { dueStory } from '../src/schedule.js';
import { namePet } from '../src/naming.js';

async function isolated() {
  const root = path.resolve('output/implementation-20261011/flow-tests', randomUUID());
  await mkdir(root, { recursive: true });
  return { root, store: new Store(root, 'cloud') };
}

async function adopted(store: Store, root: string) {
  const op = (await beginStory(store, 'adopt')).pending!.id;
  await journeyReady(store, op);
  await planStory(store, op, initialPlan);
  const file = path.join(root, 'egg.png');
  await image(file, true);
  await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic structural fixture, not visual acceptance',
  });
  await hostDone(store, op);
  await finishStory(store, op);
  return (await store.peek()).pet!.id;
}

test('a paused adoption journey starts the egg clock only after the actual initial story finishes', async t => {
  const { store, root } = await isolated();
  const start = Date.parse('2026-10-01T00:00:00Z');
  let now = start;
  t.mock.method(Date, 'now', () => now);
  const op = (await beginStory(store, 'paused-adoption')).pending!.id;
  const petId = (await store.peek()).pet!.id;
  await journeyReady(store, op);
  await planStory(store, op, initialPlan);
  const file = path.join(root, 'egg.png');
  await image(file, true);
  await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic clock regression; no visual acceptance',
  });
  now += 3 * 24 * 3_600_000;
  await hostDone(store, op);
  const completed = await finishStory(store, op);
  const state = await store.peek();
  assert.equal(state.pet!.id, petId);
  assert.equal(state.pet!.adoptedAt, completed.at);
  assert.equal(growth(state, now)!.since, new Date(now).toISOString());
  assert.equal(growth(state, now + 5 * 3_600_000 - 1)!.required, null);
  assert.equal(growth(state, now + 5 * 3_600_000)!.required, 'advance');
  assert.equal(growth(state, now)!.experiences, 0);
  assert.equal(dueStory(state, now).due, false);
  assert.equal(dueStory(state, now + 5 * 3_600_000).due, true);
  const retry = await finishStory(store, op);
  assert.equal(retry.at, completed.at);
  assert.equal((await store.peek()).pet!.adoptedAt, completed.at);
});

test('adoption choices keep raw free text, resume, deduplicate retries and stop at five rounds', async () => {
  const { store } = await isolated();
  const op = (await beginStory(store, 'journey')).pending!.id;
  const offered = { scene: 'Fixture scene 1', options: ['Bridge', 'Lantern'], inputRefs: ['fixture:choice-1'] };
  await journeyStep(store, op, offered);
  assert.equal((await store.forOperation(op)).host, store.host);
  assert.equal((await store.peek()).pending!.journey!.rounds.length, 0);
  assert.equal((await store.peek()).pending!.journey!.awaiting!.scene, offered.scene);
  for (let round = 1; round <= 5; round++) {
    const input = {
      scene: `Fixture scene ${round}`,
      options: ['Bridge', 'Lantern'],
      userInput: `I choose my own path ${round}`,
      inputRefs: [`fixture:choice-${round}`],
    };
    const saved = await journeyStep(store, op, input);
    assert.equal(saved.rounds.length, round);
    assert.equal((await journeyStep(store, op, input)).rounds.length, round);
  }
  const saved = (await store.peek()).pending!.journey!;
  assert.equal(saved.completed, true);
  assert.equal(saved.rounds[0].userInput, 'I choose my own path 1');
  await assert.rejects(
    () => journeyStep(store, op, { scene: 'Sixth', options: [], userInput: 'Continue', inputRefs: [] }),
    /complete/,
  );
});

test('a saved actual choice can close the adoption journey later without adding another round', async () => {
  const { store } = await isolated();
  const op = (await beginStory(store, 'delayed-journey-close')).pending!.id;
  const answer = {
    scene: 'A synthetic quiet fork',
    options: ['Follow the sound', 'Stay by the marker'],
    userInput: 'I keep my own small detour',
    inputRefs: ['fixture:actual-choice'],
  };
  await journeyStep(store, op, { ...answer, userInput: undefined });
  await journeyStep(store, op, answer);
  await assert.rejects(() => planStory(store, op, initialPlan), /Complete the adoption choice journey/);
  const closed = await journeyStep(store, op, { ...answer, complete: true });
  assert.equal(closed.completed, true);
  assert.equal(closed.rounds.length, 1);
  assert.equal(closed.rounds[0].userInput, answer.userInput);
  assert.equal(closed.awaiting, undefined);
  await journeyStep(store, op, { ...answer, complete: true });
  assert.equal((await store.peek()).pending!.journey!.rounds.length, 1);
  await planStory(store, op, initialPlan);
});

test('source weights are reproducible and all source types are sampled without a fixed source catalog', () => {
  const counts = { natural: 0, object: 0, imagined: 0 };
  for (let i = 0; i < 10000; i++) {
    const seed = `source-fixture-${i}`;
    const result = sourceFromSeed(seed);
    assert.equal(sourceFromSeed(seed), result);
    counts[result]++;
  }
  assert.ok(counts.natural > 6600 && counts.natural < 7400);
  assert.ok(counts.object > 1700 && counts.object < 2300);
  assert.ok(counts.imagined > 800 && counts.imagined < 1200);
});

test('a saved source/candidate choice resumes exactly and rejects revised candidates', async () => {
  const { store } = await isolated();
  const op = (await beginStory(store, 'random')).pending!.id;
  const source = await chooseSource(store, op, 'actual-fixed-seed');
  assert.deepEqual(await chooseSource(store, op), source);
  const input = {
    purpose: 'genes' as const,
    candidates: [
      { id: 'a', description: 'Specific source A grounded in a choice', contextRefs: ['fixture:choice'] },
      { id: 'b', description: 'Specific source B grounded in the same choice', contextRefs: ['fixture:choice'] },
    ],
  };
  const first = await chooseCandidate(store, op, input);
  const retry = await chooseCandidate(store, op, input);
  assert.equal(first.candidateId, retry.candidateId);
  assert.equal(first.seed, retry.seed);
  assert.deepEqual(first.candidates, retry.candidates);
  await assert.rejects(
    () =>
      chooseCandidate(store, op, {
        ...input,
        candidates: [{ ...input.candidates[0], description: 'Changed' }, input.candidates[1]],
      }),
    /already saved/,
  );
});

test('unreferenced text is rejected and two committed text-only stories force visible content', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  for (let i = 0; i < 2; i++) {
    const op = (await beginStory(store, `text-${i}`)).pending!.id;
    await planStory(store, op, {
      text: `A source-grounded thought ${i}`,
      reason: 'Synthetic context',
      state: 'Calm',
      contextRefs: ['fixture:shared-event'],
    });
    await finishStory(store, op);
  }
  const op = (await beginStory(store, 'third-text')).pending!.id;
  await planStory(store, op, {
    text: 'Third thought',
    reason: 'Same context',
    state: 'Calm',
    contextRefs: ['fixture:shared-event'],
  });
  await assert.rejects(() => finishStory(store, op), /At most two/);
  const choice = await chooseCandidate(
    store,
    op,
    {
      purpose: 'story',
      candidates: [
        { id: 'text', description: 'Only text', contextRefs: ['fixture:shared-event'] },
        {
          id: 'hat',
          description: 'Visible hat based on the unfinished repair',
          contextRefs: ['fixture:shared-event'],
          outputs: ['appearance'],
        },
      ],
    },
    'third-check',
  );
  assert.equal(choice.candidateId, 'hat');
  assert.equal((await store.peek()).pending!.id, op);
});

test('a made-up context reference cannot complete a text-only story', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  const op = (await beginStory(store, 'invented-reference')).pending!.id;
  await planStory(store, op, {
    text: 'A thought',
    reason: 'Synthetic attempted reference',
    state: 'Calm',
    contextRefs: ['missing:user-fact'],
  });
  await assert.rejects(() => finishStory(store, op), /not present in the saved inputs/);
  assert.equal((await store.peek()).stories.length, 1);
});

test('story-output gives the output its Pet name only after the user names it', async () => {
  const { store, root } = await isolated();
  const petId = await adopted(store, root);
  assert.equal(storyOutput(await store.peek()).name, null);
  await namePet(store, petId, '小耳朵');
  assert.equal(storyOutput(await store.peek()).name, '小耳朵');
});

test('the story choice picks evenly among fitting candidates; only the text fallback excludes one', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  await store.transaction(state => {
    const first = state.stories[0];
    for (let i = 1; i <= 3; i++)
      state.stories.push({ ...first, id: `visible-${i}`, triggerId: `visible-${i}`, appearanceChanged: true });
  });
  const op = (await beginStory(store, 'even')).pending!.id;
  const candidates = {
    purpose: 'story' as const,
    candidates: [
      { id: 'thought', description: 'A thought about the shared choice', contextRefs: ['fixture:shared-event'] },
      {
        id: 'outfit',
        description: 'A visible outfit from that choice',
        contextRefs: ['fixture:shared-event'],
        outputs: ['appearance' as const],
      },
      { id: 'ungrounded', description: 'A thought with no user reference', contextRefs: [] },
    ],
  };
  const choice = await chooseCandidate(store, op, candidates, 'even-choice');
  assert.ok('weights' in choice);
  assert.deepEqual(choice.weights, [1, 1, 0]);
  assert.equal((await chooseCandidate(store, op, candidates)).candidateId, choice.candidateId);
});

test('after two text-only stories the choice cannot pick text', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  await store.transaction(state => {
    const first = state.stories[0];
    for (let i = 1; i <= 2; i++)
      state.stories.push({
        ...first,
        id: `text-${i}`,
        triggerId: `text-${i}`,
        appearanceChanged: false,
        mediaIds: [],
      });
  });
  const op = (await beginStory(store, 'after-text')).pending!.id;
  const choice = await chooseCandidate(
    store,
    op,
    {
      purpose: 'story',
      candidates: [
        { id: 'thought', description: 'A third thought', contextRefs: ['fixture:shared-event'] },
        { id: 'item', description: 'A visible object', contextRefs: ['fixture:shared-event'], outputs: ['item'] },
      ],
    },
    'after-text-choice',
  );
  assert.ok('weights' in choice);
  assert.deepEqual(choice.weights, [0, 1]);
  assert.equal(choice.candidateId, 'item');
});

test('a saved Pet-only story or its memory ID cannot substitute for a user-related text context', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  await store.transaction(state => {
    const previous = state.stories[0];
    state.stories.push({
      ...previous,
      id: 'pet-only-world',
      triggerId: 'pet-only-world',
      text: 'A fictional cloud passed its window without any user-related input.',
      contextRefs: [],
    });
    state.pet!.memory = { text: 'A cloud passed.', storyId: 'pet-only-world', updatedAt: Date.now() };
  });
  const op = (await beginStory(store, 'pet-only-reference')).pending!.id;
  await planStory(store, op, {
    text: 'Another thought about that cloud.',
    reason: 'Pet-only reference is a negative fixture.',
    state: 'Quiet',
    contextRefs: ['pet-only-world'],
  });
  await assert.rejects(() => finishStory(store, op), /not present in the saved inputs/);
  assert.equal((await store.peek()).pending!.id, op);
});

test('a final nonempty story item cannot silently finish without its actual image', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  const op = (await beginStory(store, 'required-item-image')).pending!.id;
  await recordStep(store, op, 'story-item', {
    inputRefs: ['fixture:shared-event'],
    result: { reason: 'A synthetic wedge must be visible.', item: { purpose: 'Show the actual wedge' } },
  });
  await planStory(store, op, {
    text: 'The wedge fits the small gap.',
    reason: 'Synthetic source-backed event',
    contextRefs: ['fixture:shared-event'],
    state: 'Calm',
  });
  const before = await store.peek();
  await assert.rejects(() => finishStory(store, op), /accept its actual media/);
  assert.equal((await store.peek()).pending!.id, op);
  assert.equal((await store.peek()).stories.length, before.stories.length);
  const file = path.join(root, 'synthetic-wedge.png');
  await image(file);
  const media = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'story',
    source: 'Synthetic media completion regression; no semantic acceptance',
  });
  assert.ok((await finishStory(store, op)).mediaIds.includes(media.id));
});

test('the latest item decision may explicitly omit its image while a requested home image remains mandatory', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  const op = (await beginStory(store, 'final-item-omitted')).pending!.id;
  await recordStep(store, op, 'story-item', {
    inputRefs: [],
    result: { reason: 'Earlier visual idea', item: { purpose: 'Earlier idea' } },
  });
  await recordStep(store, op, 'story-item', {
    inputRefs: [],
    result: { reason: 'Final story only recalls the shared event', item: null },
  });
  await planStory(store, op, {
    text: 'A remembered shared event.',
    reason: 'Synthetic source',
    contextRefs: ['fixture:shared-event'],
    state: 'Calm',
  });
  await finishStory(store, op);
  const next = (await beginStory(store, 'required-home-image')).pending!.id;
  await recordStep(store, next, 'home', {
    inputRefs: [],
    result: { home: 'A synthetic warm nook', visual: { purpose: 'Show the nook' } },
  });
  await planStory(store, next, {
    text: 'The nook has changed.',
    reason: 'Synthetic home source',
    contextRefs: ['fixture:shared-event'],
    state: 'Resting',
  });
  await assert.rejects(() => finishStory(store, next), /accept its actual media/);
});

test('an imported Pet without story history still permits only two consecutive text-only stories', async () => {
  const { store, root } = await isolated();
  await adopted(store, root);
  const source = await store.peek();
  source.stories = [];
  const sourceFile = path.join(root, 'imported-existing-pet-without-history.json');
  await writeFile(sourceFile, JSON.stringify(source, null, 2));
  const imported = new Store(path.join(root, 'import-destination'), 'cloud');
  await imported.importRecord(sourceFile, { confirmed: true });
  for (let i = 0; i < 2; i++) {
    const op = (await beginStory(imported, `imported-text-${i}`)).pending!.id;
    await planStory(imported, op, {
      text: `A thought about the preserved journey ${i}`,
      reason: 'Synthetic preserved journey input',
      state: 'Calm',
      contextRefs: ['fixture:shared-event'],
    });
    const story = await finishStory(imported, op);
    assert.equal(story.appearanceChanged, false);
    assert.equal(recentContent(await imported.peek()).textOnlyStreak, i + 1);
  }
  const op = (await beginStory(imported, 'imported-third-text')).pending!.id;
  await planStory(imported, op, {
    text: 'A third consecutive thought',
    reason: 'Synthetic preserved journey input',
    state: 'Calm',
    contextRefs: ['fixture:shared-event'],
  });
  await assert.rejects(() => finishStory(imported, op), /At most two/);
  assert.equal((await imported.peek()).stories.length, 2);
});

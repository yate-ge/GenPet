/** Installed package outside repository dependencies, with isolated Pet and host fixtures. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const plugin = path.resolve(process.argv[2]);
const source = path.resolve(process.argv[3]);
const parent = path.resolve(
  process.env.GENPET_TEST_EVIDENCE_DIR || path.join(source, 'output/implementation-20261011/installed-tests'),
);
await mkdir(parent, { recursive: true });
const run = await mkdtemp(path.join(parent, 'installed-'));
const home = path.join(run, 'codex-home');
await mkdir(home);
await writeFile(path.join(home, '.codex-global-state.json'), '{}');
const env = {
  ...process.env,
  GENPET_DATA_DIR: path.join(run, 'data'),
  CODEX_HOME: home,
  CODEX_APP_TOOLS_PIPE_PATH: '',
  CODEX_THREAD_ID: '',
  GENPET_SKIP_NATIVE_REFRESH: '1',
};
const call = (...args) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(plugin, 'dist/cli.js'), ...args], {
      cwd: run,
      env,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
const input = async (name, value) => {
  const file = path.join(run, name + '.json');
  await writeFile(file, JSON.stringify(value));
  return file;
};
assert.equal(call('status').pet, null);
const begun = call('begin-story', 'smoke:adopt');
const petId = begun.pet.id;
assert.equal(call('begin-story', 'smoke:adopt').pet.id, petId);
call(
  'journey-step',
  begun.pending.id,
  await input('journey', {
    scene: 'A fictional lantern by a bridge',
    options: ['Bridge', 'Garden'],
    userInput: 'I walk into the garden',
    inputRefs: ['fixture:simulated-choice'],
    complete: true,
  }),
);
const plan = {
  text: 'A synthetic garden encounter ended with a literal egg.',
  reason: 'Synthetic test data',
  contextRefs: ['fixture:simulated-choice'],
  memory: 'The fictional journey began beside a bridge.',
  state: 'An intact quiet egg',
  stage: 'egg',
  genes: 'Synthetic pixel moth companion; literal egg first.',
  personality: 'A patient curious companion whose fluttering hello is ff.',
  place: 'A fictional garden',
  connection: 'Simulated choice of the garden',
  appearance: { description: 'A conventional egg with pale moss markings' },
};
call('plan-story', begun.pending.id, await input('plan', plan));
const request = call('art-request');
const fixture = path.join(source, 'tests/fixtures/mystery-egg.webp');
const art = call(
  'accept-art',
  request.id,
  fixture,
  'atlas',
  'Synthetic installed format fixture; no generated visual acceptance',
);
const published = call('set-appearance');
assert.equal(published.petId, petId);
assert.equal(published.storedArtworkVerified, true);
assert.equal(published.displayStatus, 'unconfirmed');
const manifest = JSON.parse(await readFile(path.join(published.destination, 'pet.json'), 'utf8'));
assert.equal(manifest.genpetId, petId);
assert.deepEqual(await readFile(path.join(published.destination, manifest.spritesheetPath)), await readFile(fixture));
call('finish-story', begun.pending.id);
assert.equal(call('begin-story', 'smoke:adopt').status, 'completed');
assert.equal(call('status').pet.soul.personality, plan.personality);
assert.equal(call('status').namingDue, false);
assert.equal(call('status').version, 3);
call('name-pet', petId, 'Fixture name');
assert.equal(call('status').pet.name, 'Fixture name');
const story = call('begin-story', 'smoke:reuse').pending.id;
call(
  'plan-story',
  story,
  await input('reuse', {
    text: 'The companion remembers the garden.',
    reason: 'Synthetic shared choice',
    contextRefs: ['fixture:simulated-choice'],
    state: 'Quiet',
    appearance: { description: 'Saved appearance', reuseArtId: art.id },
  }),
);
assert.equal(call('art-request').status, 'ready');
call('set-appearance');
call('finish-story', story);
assert.equal(call('status').artCount, 1);
assert.equal(call('status').storyCount, 2);
const reset = call('reset', 'smoke:replace');
assert.notEqual(reset.pet.id, petId);
assert.equal(reset.pet.binding.avatarId, published.avatarId);
call(
  'journey-step',
  reset.pending.id,
  await input('replacement-journey', {
    scene: 'A new fictional garden path',
    options: ['Lantern', 'Gate'],
    userInput: 'I choose the lantern',
    inputRefs: ['fixture:simulated-replacement-choice'],
    complete: true,
  }),
);
call('plan-story', reset.pending.id, await input('replacement-plan', plan));
const replacementRequest = call('art-request');
call('accept-art', replacementRequest.id, fixture, 'atlas', 'Synthetic replacement fixture');
call('set-appearance');
call('finish-story', reset.pending.id);
assert.equal(call('reset', 'smoke:replace').status, 'completed');
assert.equal(call('status').pet.id, reset.pet.id);
await writeFile(
  path.join(run, 'RESULT.json'),
  JSON.stringify(
    { ok: true, isolated: true, visualAcceptance: false, petId, replacementPetId: reset.pet.id, sourcePlugin: plugin },
    null,
    2,
  ),
);
console.log(
  'Installed v3 CLI, adoption choices, accepted-art host readback, identity, reuse and replacement: passed. Evidence: ' +
    run,
);

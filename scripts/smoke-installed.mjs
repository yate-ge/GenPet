/** Check installed CLI wiring and native export; detailed behavior lives in tests/. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || '.');
const fixtureRoot = path.resolve(process.argv[3] || root);
const temp = await mkdtemp(path.join(tmpdir(), 'genpet-installed-'));
const env = { ...process.env, GENPET_DATA_DIR: path.join(temp, 'data'), CODEX_HOME: path.join(temp, 'codex') };
const call = (...args) => JSON.parse(execFileSync(process.execPath, ['dist/cli.js', ...args], {
  cwd: root, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}));

try {
  call('configure', 'autoContext=false');
  assert.equal(call('adopt', 'Smoke Egg').stage, 'egg');
  const request = call('art-request');
  assert.equal(request.status, 'pending');
  const fixture = path.join(fixtureRoot, 'assets/pets/mystery-egg/spritesheet.webp');
  for (const kind of ['portrait', 'atlas']) {
    call('accept-art', request.id, fixture, kind, 'Isolated installation fixture; not personalized visual evidence.');
  }
  const installed = call('install-native');
  assert.equal(path.resolve(installed.destination), path.join(temp, 'codex', 'pets', 'genpet-companion'));
  const manifest = JSON.parse(await readFile(path.join(installed.destination, 'pet.json'), 'utf8'));
  assert.equal(manifest.id, 'genpet-companion');
  assert.equal(manifest.spriteVersionNumber, 2);
  assert.deepEqual(await readFile(path.join(installed.destination, manifest.spritesheetPath)), await readFile(fixture));
  assert.deepEqual(await readdir(path.join(temp, 'codex', 'pets')), ['genpet-companion']);
  assert.equal(call('status').pet.stage, 'egg');

  // Exercise each debug command once; identity, retries and cached art are unit-tested.
  assert.equal(call('debug-grow', 'next', 'smoke-hatch').state.pet.stage, 'hatchling');
  assert.equal(call('debug-state', 'create', 'smoke-brush').artRequest.visual.prop, 'brush');
  assert.equal(call('debug-reset', 'smoke-reset').state.pet.stage, 'egg');
  console.log('Installed CLI adoption, artwork acceptance, export and debug commands: passed (isolated state).');
} finally {
  await rm(temp, { recursive: true, force: true });
}

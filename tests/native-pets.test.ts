import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getNativePetCatalog } from '../src/native-pets.js';

async function withHome(run: (home: string) => Promise<void>) {
  const home = await mkdtemp(path.join(tmpdir(), 'genpet-catalog-'));
  try { await run(home); }
  finally { await rm(home, { recursive: true, force: true }); }
}

async function legacy(home: string, value: unknown) {
  await writeFile(path.join(home, '.codex-global-state.json'), JSON.stringify({ 'electron-persisted-atom-state': { 'selected-avatar-id': value } }));
}

async function manifest(home: string, folder: string, id: string, data: unknown) {
  const directory = path.join(home, folder, id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, folder === 'pets' ? 'pet.json' : 'avatar.json'), JSON.stringify(data));
}

test('absent settings infer the default without creating files or claiming live activation', () => withHome(async home => {
  const result = await getNativePetCatalog(home);
  assert.equal(result.pets.filter(pet => pet.source === 'builtin').length, 9);
  assert.deepEqual(result.selection, { selectedPetId: 'codex', genpetSelected: false, source: 'default', liveVerified: false });
  assert.equal(result.activation.immediate, false);
  assert.equal(result.errors, undefined);
  assert.deepEqual(await readdir(home), []);
}));

test('TOML selection takes precedence over legacy and leaves both files unchanged', () => withHome(async home => {
  const config = '[desktop]\n"selected-avatar-id" = "custom:genpet-companion" # chosen\n';
  await writeFile(path.join(home, 'config.toml'), config);
  await legacy(home, 'dewey');
  const before = await readFile(path.join(home, '.codex-global-state.json'), 'utf8');
  const result = await getNativePetCatalog(home);
  assert.deepEqual(result.selection, { selectedPetId: 'custom:genpet-companion', genpetSelected: true, source: 'config', liveVerified: false });
  assert.equal(await readFile(path.join(home, 'config.toml'), 'utf8'), config);
  assert.equal(await readFile(path.join(home, '.codex-global-state.json'), 'utf8'), before);
}));

test('TOML dotted keys and literal strings are supported', () => withHome(async home => {
  await writeFile(path.join(home, 'config.toml'), "desktop.'selected-avatar-id' = 'custom:genpet-companion'\n");
  assert.equal((await getNativePetCatalog(home)).selection.genpetSelected, true);
}));

test('missing TOML selection falls back to legacy, while explicit strings remain exact', () => withHome(async home => {
  await legacy(home, 'custom:genpet-companion');
  for (const config of ['', '[desktop]\nother = true\n']) {
    await writeFile(path.join(home, 'config.toml'), config);
    assert.equal((await getNativePetCatalog(home)).selection.source, 'legacy');
  }
  for (const value of ['none', 'pet_cloud-example', '']) {
    await writeFile(path.join(home, 'config.toml'), `[desktop]\nselected-avatar-id = ${JSON.stringify(value)}\n`);
    const result = await getNativePetCatalog(home);
    assert.equal(result.selection.selectedPetId, value);
    assert.equal(result.selection.source, 'config');
    assert.equal(result.selection.genpetSelected, false);
  }
}));

test('explicit legacy null is retained and does not select GenPet', () => withHome(async home => {
  await legacy(home, null);
  const result = await getNativePetCatalog(home);
  assert.deepEqual(result.selection, { selectedPetId: null, genpetSelected: false, source: 'legacy', liveVerified: false });
}));

test('invalid or unreadable TOML reports unknown even when legacy has a selection', () => withHome(async home => {
  await legacy(home, 'custom:genpet-companion');
  for (const config of ['[desktop\n', '[desktop]\nselected-avatar-id = true\n', 'desktop = []\n']) {
    await writeFile(path.join(home, 'config.toml'), config);
    const result = await getNativePetCatalog(home);
    assert.deepEqual(result.selection, { selectedPetId: null, genpetSelected: null, source: 'unavailable', liveVerified: false });
    assert.ok(result.errors?.some(error => error.startsWith('config.toml:')));
  }
  await rm(path.join(home, 'config.toml'));
  await mkdir(path.join(home, 'config.toml'));
  assert.equal((await getNativePetCatalog(home)).selection.genpetSelected, null);
}));

test('corrupt legacy settings do not become a known default selection', () => withHome(async home => {
  for (const state of ['{', '[]', '{"electron-persisted-atom-state":[]}']) {
    await writeFile(path.join(home, '.codex-global-state.json'), state);
    assert.equal((await getNativePetCatalog(home)).selection.source, 'unavailable');
  }
  await legacy(home, 42);
  assert.equal((await getNativePetCatalog(home)).selection.genpetSelected, null);
}));

test('catalog merges by directory ID, prefers pets, and does not need sprite files', () => withHome(async home => {
  await manifest(home, 'avatars', 'companion', { id: 'ignored-id', displayName: 'Old companion' });
  await manifest(home, 'pets', 'companion', { id: 'different-id', displayName: ' New companion ', spritesheetPath: 'missing.webp' });
  await manifest(home, 'avatars', 'legacy', { id: 'Legacy name' });
  await manifest(home, 'pets', 'nameless', {});
  const local = (await getNativePetCatalog(home)).pets.filter(pet => pet.source === 'local');
  assert.deepEqual(local.map(pet => [pet.id, pet.displayName]).sort(), [
    ['custom:companion', 'New companion'],
    ['custom:legacy', 'Legacy name'],
    ['custom:nameless', 'nameless'],
  ]);
}));

test('one broken manifest does not hide valid entries or selection evidence', () => withHome(async home => {
  await manifest(home, 'pets', 'valid', { displayName: 'Valid' });
  await manifest(home, 'pets', 'invalid', { displayName: 42 });
  await manifest(home, 'pets', 'null', null);
  await manifest(home, 'pets', 'broken', {});
  await writeFile(path.join(home, 'pets', 'broken', 'pet.json'), '{');
  const result = await getNativePetCatalog(home);
  assert.deepEqual(result.pets.filter(pet => pet.source === 'local').map(pet => pet.id), ['custom:valid']);
  assert.equal(result.errors?.length, 3);
  assert.equal(result.selection.source, 'default');
}));

test('a failed local directory read is reported without losing the builtin catalog', () => withHome(async home => {
  await writeFile(path.join(home, 'pets'), 'not a directory');
  const result = await getNativePetCatalog(home);
  assert.equal(result.pets.length, 9);
  assert.ok(result.errors?.some(error => error.startsWith('pets:')));
}));

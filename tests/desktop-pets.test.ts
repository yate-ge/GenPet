import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listPets } from '../src/hosts/desktop/switch.js';

async function withHome(run: (home: string) => Promise<void>) {
  const home = await mkdtemp(path.join(tmpdir(), 'genpet-catalog-'));
  try {
    await run(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function manifest(home: string, folder: string, id: string, data: unknown) {
  const directory = path.join(home, folder, id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, folder === 'pets' ? 'pet.json' : 'avatar.json'), JSON.stringify(data));
}

test('an empty Codex home lists the builtin pets without creating files', () =>
  withHome(async home => {
    const result = await listPets(home);
    assert.equal(result.pets.filter(pet => pet.source === 'builtin').length, 9);
    assert.equal(result.errors, undefined);
    assert.deepEqual(await readdir(home), []);
  }));

test('catalog merges by directory ID, prefers pets, and does not need sprite files', () =>
  withHome(async home => {
    await manifest(home, 'avatars', 'companion', { id: 'ignored-id', displayName: 'Old companion' });
    await manifest(home, 'pets', 'companion', {
      id: 'different-id',
      displayName: ' New companion ',
      spritesheetPath: 'missing.webp',
    });
    await manifest(home, 'avatars', 'legacy', { id: 'Legacy name' });
    await manifest(home, 'pets', 'nameless', {});
    const local = (await listPets(home)).pets.filter(pet => pet.source === 'local');
    assert.deepEqual(local.map(pet => [pet.id, pet.displayName]).sort(), [
      ['custom:companion', 'New companion'],
      ['custom:legacy', 'Legacy name'],
      ['custom:nameless', 'nameless'],
    ]);
  }));

test('one broken manifest is reported without hiding valid entries', () =>
  withHome(async home => {
    await manifest(home, 'pets', 'valid', { displayName: 'Valid' });
    await manifest(home, 'pets', 'invalid', { displayName: 42 });
    await manifest(home, 'pets', 'null', null);
    await manifest(home, 'pets', 'broken', {});
    await writeFile(path.join(home, 'pets', 'broken', 'pet.json'), '{');
    const result = await listPets(home);
    assert.deepEqual(
      result.pets.filter(pet => pet.source === 'local').map(pet => pet.id),
      ['custom:valid'],
    );
    assert.equal(result.errors?.length, 3);
  }));

test('a failed local directory read is reported without losing the builtin catalog', () =>
  withHome(async home => {
    await writeFile(path.join(home, 'pets'), 'not a directory');
    const result = await listPets(home);
    assert.equal(result.pets.length, 9);
    assert.ok(result.errors?.some(error => error.startsWith('pets:')));
  }));

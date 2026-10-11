import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPet, fresh } from '../src/model.js';
import { Store } from '../src/store.js';
import { findAvatar } from '../src/hosts/identity.js';
import { readMigrationMap } from '../src/hosts/desktop/mapping.js';
import { listPets } from '../src/hosts/desktop/switch.js';
import { diagnose } from '../src/hosts/diagnose.js';
import { hostTestDirectory, noSelection } from './host-fixtures.js';

const scope = JSON.stringify(['test-account', 'test-user']);
async function mapping(home: string, value: unknown, cache = true, pending: unknown = {}) {
  await writeFile(
    path.join(home, '.codex-global-state.json'),
    JSON.stringify({
      'electron-persisted-atom-state': {
        'migrated-cloud-pet-ids-v1': value,
        'pending-cloud-pet-migrations-v1': pending,
        ...(cache ? { 'cloud-pet-artwork-cache': { accountId: 'test-account', userId: 'test-user' } } : {}),
        unrelated: 'private-host-setting-must-not-escape',
      },
    }),
  );
}

test('each lookup freshly resolves a custom alias and recognizes either selected ID', async () => {
  const home = await hostTestDirectory('mapping');
  const state = fresh('desktop');
  state.pet = createPet();
  state.pet.binding = { host: 'desktop', avatarId: 'custom:test', cloudId: 'pet_stale' };
  await mapping(home, { [scope]: { 'custom:test': 'pet_first' } });
  const localSelected = () =>
    Promise.resolve({ available: true as const, selectedPetId: 'custom:test', effectiveSelectedPetId: 'custom:test' });
  const first = await findAvatar(state, { home, selection: localSelected });
  assert.equal(first.avatarId, 'pet_first');
  assert.equal(first.active, true);
  assert.deepEqual(first.aliases, ['custom:test', 'pet_first']);
  await mapping(home, { [scope]: { 'custom:test': 'pet_second' } });
  const second = await findAvatar(state, {
    home,
    selection: async () => ({ available: true, selectedPetId: 'pet_second', effectiveSelectedPetId: 'pet_second' }),
  });
  assert.equal(second.avatarId, 'pet_second');
  assert.equal(second.active, true);
  assert.equal(state.pet.binding.cloudId, 'pet_stale');
});

test('unknown, stale and cross-account mappings cannot justify an update', async () => {
  const home = await hostTestDirectory('unknown-mapping');
  const state = fresh('desktop');
  state.pet = createPet();
  state.pet.binding = { host: 'desktop', avatarId: 'custom:test', cloudId: 'pet_cached' };
  assert.equal((await findAvatar(state, { home, selection: noSelection })).avatarId, null);
  await mapping(home, { [scope]: {}, other: { 'custom:test': 'pet_otheraccount' } });
  const stale = await findAvatar(state, { home, selection: noSelection });
  assert.equal(stale.avatarId, null);
  assert.match(stale.reason!, /does not confirm/);
  await mapping(home, { [scope]: { 'custom:test': 'pet_test' }, other: { 'custom:test': 'pet_other' } }, false);
  assert.equal((await readMigrationMap(home)).available, false);
  // One leftover scope still cannot identify the currently signed-in account.
  await mapping(home, { [scope]: { 'custom:test': 'pet_old_account' } }, false);
  assert.equal((await readMigrationMap(home)).available, false);
  assert.equal((await findAvatar(state, { home, selection: noSelection })).avatarId, null);
  await mkdir(path.join(home, 'pets', 'test'), { recursive: true });
  await writeFile(
    path.join(home, 'pets', 'test', 'pet.json'),
    JSON.stringify({ displayName: 'Synthetic old account' }),
  );
  const catalog = await listPets(home);
  assert.ok(catalog.pets.some(pet => pet.id === 'custom:test'));
  assert.ok(!catalog.pets.some(pet => pet.id === 'pet_old_account'));
  await writeFile(path.join(home, '.codex-global-state.json'), '{');
  assert.equal((await readMigrationMap(home)).available, false);
});

test('host migration pending blocks local proof and exposes the reason', async () => {
  const home = await hostTestDirectory('pending-migration');
  const state = fresh('desktop');
  state.pet = createPet();
  state.pet.binding = { host: 'desktop', avatarId: 'custom:test' };
  await mapping(home, { [scope]: {} }, true, { [scope]: { 'custom:test': { attempt: 1 } } });
  const result = await findAvatar(state, { home, selection: noSelection });
  assert.equal(result.migrationPending, true);
  assert.equal(result.avatarId, null);
  assert.match(result.reason!, /migrating/);
});

test('diagnosis reads registry and host facts without creating or changing a record', async () => {
  const home = await hostTestDirectory('diagnose-home');
  const root = await hostTestDirectory('diagnose-record');
  await mapping(home, {});
  await mkdir(path.join(home, 'pets'), { recursive: true });
  const store = new Store(root, 'desktop');
  const result = await diagnose(store, { home, selection: noSelection, ipcSocketPath: null });
  assert.equal(result.record.exists, false);
  assert.equal(result.record.petId, null);
  assert.equal(result.displayStatus, 'unconfirmed');
  assert.equal(result.schedule.hostConfirmed, null);
  assert.ok(result.agentSteps.some(step => 'tool' in step && step.tool === 'list_pets'));
  assert.equal((await store.peek()).pet, null);
  assert.equal(JSON.stringify(result).includes('private-host-setting-must-not-escape'), false);
});

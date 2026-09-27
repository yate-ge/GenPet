import test from 'node:test';
import assert from 'node:assert/strict';
import { createPet, evolvePet, addContext, addContextBatch, removeContext, updateProfile, DEFAULT_PROFILE, DEFAULT_POLICY, HOUR, DAY } from '../src/core.js';

const start = 1_700_000_000_000;
const make = () => createPet({ ...DEFAULT_PROFILE }, start, 'test-seed');

test('egg hatches at exactly five hours and grows each subsequent 24 hours', () => {
  const pet = make();
  assert.equal(evolvePet(pet, start + 5 * HOUR - 1).stage, 'egg');
  const hatch = evolvePet(pet, start + 5 * HOUR);
  assert.equal(hatch.stage, 'hatchling');
  assert.equal(hatch.growth.days, 0);
  assert.equal(evolvePet(pet, start + 29 * HOUR - 1).growth.days, 0);
  assert.equal(evolvePet(pet, start + 29 * HOUR).growth.days, 1);
  assert.deepEqual(hatch.dna, pet.dna);
  assert.equal(pet.stage, 'egg');
});
test('daily evaluation, duplicate evaluation, and offline catch-up agree', () => {
  let stepped = make();
  for (let hours = 1; hours <= 21 * 24 + 5; hours++) stepped = evolvePet(stepped, start + hours * HOUR);
  const direct = evolvePet(make(), start + (21 * 24 + 5) * HOUR);
  assert.deepEqual(direct, stepped);
  assert.deepEqual(evolvePet(direct, direct.lastEvaluatedAt), direct);
  assert.deepEqual(evolvePet(direct, start), direct);
  assert.equal(direct.stage, 'adult');
  assert.equal(evolvePet(make(), start + 5 * HOUR + 7 * DAY - 1).stage, 'hatchling');
  assert.equal(evolvePet(make(), start + 5 * HOUR + 7 * DAY).stage, 'juvenile');
});
test('growth is bounded without use and long offline history is bounded', () => {
  const pet = evolvePet(make(), start + 3650 * DAY);
  assert.equal(pet.stage, 'adult');
  assert.equal(pet.growth.size, 1.25);
  assert.ok(pet.events.length <= DEFAULT_POLICY.maxEvents);
  assert.ok(pet.events.every(event => !event.message.includes('penalty')));
});
test('context windows are half-open and only the last closed window selects a setting', () => {
  let pet = addContext(make(), { kind: 'research', source: 'user', summary: 'Reading' }, start + HOUR);
  pet = addContext(pet, { kind: 'create', source: 'codex-local', summary: 'Creating' }, start + 5 * HOUR);
  assert.equal(pet.state.kind, 'research');
  assert.equal(pet.state.prop, 'book');
  assert.equal(evolvePet(pet, start + 10 * HOUR).state.kind, 'create');
  assert.equal(evolvePet(pet, start + 15 * HOUR).state.kind, null);
});
test('context validates timestamps, retention, enums and unicode summary length', () => {
  const input = { kind: 'build' as const, source: 'user' as const };
  assert.throws(() => addContext(make(), { ...input, occurredAt: start + 1 }, start), /future/);
  assert.throws(() => addContext(make(), { ...input, occurredAt: start - 1 }, start), /predates/);
  assert.throws(() => addContext(make(), { ...input, occurredAt: start }, start + 8 * DAY), /expired/);
  assert.throws(() => addContext(make(), { ...input, summary: '蛋'.repeat(241) }, start), /240/);
  assert.equal(addContext(make(), { ...input, summary: '🐣'.repeat(240) }, start).context.length, 1);
  assert.throws(() => evolvePet(make(), Number.NaN), /timestamp/);
});
test('withdrawal removes context-derived state and keeps chronological growth', () => {
  let pet = addContext(make(), { kind: 'create', source: 'user', milestone: true }, start + 6 * HOUR);
  const id = pet.context[0]!.id;
  pet = evolvePet(pet, start + 29 * HOUR);
  assert.ok(pet.growth.temperament.playful > 0.25);
  const removed = removeContext(pet, id, pet.lastEvaluatedAt);
  assert.equal(removed.growth.days, 1);
  assert.equal(removed.growth.decorationLevel, 0);
  assert.equal(removed.growth.temperament.playful, 0.25);
  assert.equal(removed.context.length, 0);
  assert.ok(!removed.events.some(e => e.type === 'context' || e.type === 'milestone'));
  const recent = addContext(make(), { kind: 'research', source: 'user' }, start + HOUR);
  assert.equal(removeContext(recent, recent.context[0]!.id, start + 5 * HOUR).state.kind, null);
});
test('different seeds personalize DNA and profile changes preserve identity', () => {
  const pet = make();
  assert.notDeepEqual(pet.dna, createPet({ ...DEFAULT_PROFILE }, start, 'other-seed').dna);
  assert.deepEqual(pet, make());
  const updated = updateProfile(pet, { name: 'Bean', palette: 'lilac', temperament: 'calm' });
  assert.deepEqual(updated.dna, pet.dna);
  assert.equal(updated.profile.name, 'Bean');
  assert.equal(updated.growth.temperament.calm, 0.5);
  assert.throws(() => updateProfile(pet, { name: ' ' }), /Name/);
});
test('an adopted egg has shell cues only and no future creature identity', () => {
  const pet = make();
  assert.deepEqual(Object.keys(pet.dna).sort(), ['hue', 'pattern', 'patternSeed']);
  assert.equal(pet.hatchIdentity, null);
  const incubating = addContext(pet, { kind: 'create', source: 'user' }, start + 4 * HOUR);
  assert.equal(incubating.hatchIdentity, null);
  assert.equal(evolvePet(incubating, start + 5 * HOUR - 1).hatchIdentity, null);
  const born = evolvePet(incubating, start + 5 * HOUR);
  assert.equal(born.hatchIdentity?.resolvedAt, start + 5 * HOUR);
  assert.equal(born.hatchIdentity?.algorithmVersion, 'egg-first-v1');
});
test('birth identity is frozen against later context, late evidence, profile edits and withdrawal', () => {
  const egg = addContext(make(), { kind: 'learn', source: 'user' }, start + HOUR);
  const born = evolvePet(egg, start + 5 * HOUR);
  let later = addContext(born, { kind: 'create', source: 'user' }, start + 6 * HOUR);
  later = addContext(later, { kind: 'research', source: 'codex-local', occurredAt: start + 2 * HOUR }, start + 7 * HOUR);
  later = removeContext(later, egg.context[0]!.id, start + 8 * HOUR);
  later = updateProfile(later, { interest: 'create', temperament: 'playful' });
  later = evolvePet(later, start + 30 * DAY);
  assert.deepEqual(later.hatchIdentity, born.hatchIdentity);
});
test('a late scan resolves birth only after the full batch and excludes the hatch boundary', () => {
  const inputs = [
    { kind: 'create' as const, source: 'codex-local' as const, occurredAt: start + HOUR },
    { kind: 'research' as const, source: 'codex-local' as const, occurredAt: start + 2 * HOUR },
    { kind: 'research' as const, source: 'codex-local' as const, occurredAt: start + 3 * HOUR },
    { kind: 'learn' as const, source: 'codex-local' as const, occurredAt: start + 5 * HOUR },
  ];
  const batch = addContextBatch(make(), inputs, start + 6 * HOUR);
  assert.equal(batch.hatchIdentity?.evidenceCount, 3);
  assert.equal(batch.hatchIdentity?.influence, 'research');
  assert.deepEqual(addContextBatch(batch, inputs, start + 6 * HOUR), batch);
  const reversed = addContextBatch(make(), inputs.toReversed(), start + 6 * HOUR);
  assert.deepEqual(reversed.hatchIdentity, batch.hatchIdentity);
  let sequential = make();
  for (const input of inputs.slice(0, 3)) sequential = addContext(sequential, input, input.occurredAt);
  assert.deepEqual(evolvePet(sequential, start + 6 * HOUR).hatchIdentity, batch.hatchIdentity);
  assert.deepEqual(evolvePet(sequential, start + 30 * DAY).hatchIdentity, batch.hatchIdentity);
});

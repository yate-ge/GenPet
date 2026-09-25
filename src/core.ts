/** Deterministic, local-first life cycle. Times are epoch milliseconds. */
export type Palette = 'sage' | 'peach' | 'sky' | 'lilac';
export type Interest = 'build' | 'research' | 'create' | 'learn';
export type Temperament = 'calm' | 'curious' | 'playful';
export type ContextKind = Interest | 'rest';
export type ContextSource = 'user' | 'codex-summary' | 'codex-local';
export type Stage = 'egg' | 'hatchling' | 'juvenile' | 'adult';
export type Prop = 'none' | 'tool' | 'book' | 'brush' | 'star' | 'pillow';
export type Scene = 'nest' | 'workshop' | 'library' | 'studio' | 'garden' | 'meadow';
export interface Profile { name: string; palette: Palette; interest: Interest; temperament: Temperament }
export interface AdoptionTrace {
  algorithmVersion: 'adoption-map-v1';
  mode: 'automatic' | 'no-dominant-activity' | 'disabled';
  selectedActivity: ContextKind | null;
  activityCounts: Record<ContextKind, number>;
  explicitFields: Array<keyof Profile>;
  capturedAt: number;
}
export interface GrowthPolicy {
  hatchHours: number; growthHours: number; contextHours: number;
  juvenileDays: number; adultDays: number;
  maxEvents: number; maxContextEntries: number; contextRetentionDays: number;
}
export interface ContextInput {
  kind: ContextKind; summary?: string; source: ContextSource;
  occurredAt?: number; milestone?: boolean;
}
export interface ContextEntry extends Required<ContextInput> { id: string; submittedAt: number }
export interface PetEvent {
  id: string; type: 'adopted' | 'hatched' | 'growth' | 'stage' | 'context' | 'milestone';
  at: number; message: string;
}
export interface HatchIdentity {
  family: 'roundling'; bodyShape: 'round' | 'pear' | 'bean';
  appendage: 'buds' | 'leaflets' | 'soft-fins'; roundness: number;
  resolvedAt: number; evidenceCount: number; influence: ContextKind | null;
  identitySeed: number; algorithmVersion: 'egg-first-v1' | 'legacy-migration-v1';
}
export interface Pet {
  id: string; seed: string; adoptedAt: number; lastEvaluatedAt: number;
  profile: Profile;
  /** Bounded design provenance for new adoptions; absent on older pets. */
  adoptionTrace?: AdoptionTrace;
  // Shell-only cues: no hidden face, species, ears, limbs, or future silhouette.
  dna: { hue: number; pattern: 'speckles' | 'stripes' | 'patches'; patternSeed: number };
  hatchIdentity: HatchIdentity | null;
  stage: Stage; ageDays: number;
  growth: { days: number; size: number; temperament: Record<Temperament, number>;
    milestoneDays: number[]; decorationLevel: number };
  context: ContextEntry[];
  state: { windowIndex: number; kind: ContextKind | null; prop: Prop; scene: Scene;
    reason: string; updatedAt: number };
  events: PetEvent[]; policy: GrowthPolicy;
}
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const DEFAULT_PROFILE: Readonly<Profile> = Object.freeze({
  name: 'GenPet', palette: 'sage', interest: 'build', temperament: 'curious',
});
export const DEFAULT_POLICY: Readonly<GrowthPolicy> = Object.freeze({
  hatchHours: 5, growthHours: 24, contextHours: 5, juvenileDays: 7, adultDays: 21,
  maxEvents: 80, maxContextEntries: 200, contextRetentionDays: 7,
});
/** Early growth must remain legible after a full portrait is fitted into a native cell. */
export function growthMaturity(days:number,adultDays:number):number {
  return Math.sqrt(Math.min(1,Math.max(0,days/adultDays)));
}
const kinds: ContextKind[] = ['build', 'research', 'create', 'learn', 'rest'];
const temperaments: Temperament[] = ['calm', 'curious', 'playful'];
const paletteHue: Record<Palette, number> = { sage: 145, peach: 24, sky: 204, lilac: 273 };
export const situations: Record<ContextKind, { prop: Prop; scene: Scene }> = {
  build: { prop: 'tool', scene: 'workshop' }, research: { prop: 'book', scene: 'library' },
  create: { prop: 'brush', scene: 'studio' }, learn: { prop: 'star', scene: 'garden' },
  rest: { prop: 'pillow', scene: 'meadow' },
};
const expression: Record<ContextKind, Temperament> = {
  build: 'calm', research: 'curious', create: 'playful', learn: 'curious', rest: 'calm',
};
function timestamp(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 8.64e15) throw new Error(`${field} must be a valid nonnegative epoch timestamp`);
}
function validateProfile(profile: Profile): void {
  if (typeof profile.name !== 'string' || !profile.name.trim() || [...profile.name].length > 60) throw new Error('Name must contain 1–60 characters');
  if (!Object.hasOwn(paletteHue, profile.palette)) throw new Error('Invalid palette');
  if (!kinds.slice(0, 4).includes(profile.interest)) throw new Error('Invalid interest');
  if (!temperaments.includes(profile.temperament)) throw new Error('Invalid temperament');
}
function validatePolicy(policy: GrowthPolicy): void {
  for (const [key, value] of Object.entries(policy)) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid policy: ${key}`);
  }
  for (const key of ['juvenileDays', 'adultDays', 'maxEvents', 'maxContextEntries'] as const) {
    if (!Number.isInteger(policy[key])) throw new Error(`Policy ${key} must be an integer`);
  }
  if (policy.adultDays <= policy.juvenileDays) throw new Error('Adult threshold must follow juvenile threshold');
  if (policy.maxEvents > 1000 || policy.maxContextEntries > 10_000) throw new Error('History limits are too large');
}
function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) { result ^= character.codePointAt(0)!; result = Math.imul(result, 16777619); }
  return result >>> 0;
}
function resolveHatchIdentity(pet: Pet): HatchIdentity {
  const resolvedAt = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const evidence = pet.context.filter(e => e.occurredAt >= pet.adoptedAt && e.occurredAt < resolvedAt);
  const counts = kinds.map(kind => evidence.filter(e => e.kind === kind).length);
  const maximum = Math.max(...counts);
  const influence = maximum > 0 && counts.filter(count => count === maximum).length === 1
    ? kinds[counts.indexOf(maximum)]! : null;
  // The morphology decision is made here, at birth. Tags supply at most a 6%
  // nudge, with seed-dependent directions, never a category-to-species mapping.
  const base = hash(`${pet.seed}:birth-shape`);
  const bias = influence ? ((hash(`${pet.seed}:gentle-bias:${influence}`) % 2001) / 1000 - 1) * 0.06 : 0;
  const appendageRoll = Math.max(0, Math.min(0.999999, hash(`${pet.seed}:birth-appendage`) / 2 ** 32 + bias));
  return {
    family: 'roundling', bodyShape: (['round', 'pear', 'bean'] as const)[base % 3]!,
    appendage: (['buds', 'leaflets', 'soft-fins'] as const)[Math.floor(appendageRoll * 3)]!,
    roundness: Math.round((0.88 + ((base >>> 8) % 101) / 2000 + bias / 3) * 1000) / 1000,
    resolvedAt, evidenceCount: evidence.length, influence,
    identitySeed: hash(`${pet.seed}:egg-first-v1:${counts.join(',')}`), algorithmVersion: 'egg-first-v1',
  };
}
/** Upgrade persisted companions without changing adoption time or resetting their life. */
export function migratePet(original: Pet): Pet {
  const pet = structuredClone(original);
  const oldDna = pet.dna as Pet['dna'] & { earStyle?: string };
  pet.dna = { hue: oldDna.hue, pattern: oldDna.pattern, patternSeed: oldDna.patternSeed };
  if (pet.stage === 'egg') pet.hatchIdentity = null;
  else if (!pet.hatchIdentity) {
    pet.hatchIdentity = { ...resolveHatchIdentity(pet), algorithmVersion: 'legacy-migration-v1',
      appendage: oldDna.earStyle === 'pointed' ? 'leaflets' : oldDna.earStyle === 'floppy' ? 'soft-fins' : 'buds' };
  }
  return pet;
}
function baseline(temperament: Temperament): Record<Temperament, number> {
  return { calm: temperament === 'calm' ? 0.5 : 0.25,
    curious: temperament === 'curious' ? 0.5 : 0.25,
    playful: temperament === 'playful' ? 0.5 : 0.25 };
}
function event(pet: Pet, type: PetEvent['type'], at: number, message: string, key = ''): void {
  const id = `${type}-${at}-${key}`;
  if (!pet.events.some(item => item.id === id)) pet.events.push({ id, type, at, message });
  pet.events = pet.events.slice(-pet.policy.maxEvents);
}
/** Adoption-relative windows, [start, end), make boundaries deterministic. */
function refreshState(pet: Pet, now: number): void {
  const duration = pet.policy.contextHours * HOUR;
  const windowIndex = Math.floor((now - pet.adoptedAt) / duration);
  const end = pet.adoptedAt + windowIndex * duration;
  const entries = pet.context.filter(entry => entry.occurredAt >= end - duration && entry.occurredAt < end);
  const counts = new Map<ContextKind, number>();
  for (const entry of entries) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  // Ties are resolved by the latest observation, then a fixed kind ordering.
  const winner = [...counts.keys()].sort((a, b) => {
    const count = counts.get(b)! - counts.get(a)!;
    if (count) return count;
    const latest = (kind: ContextKind) => Math.max(...entries.filter(e => e.kind === kind).map(e => e.occurredAt));
    return latest(b) - latest(a) || kinds.indexOf(a) - kinds.indexOf(b);
  })[0] ?? null;
  pet.state = { windowIndex, kind: winner,
    ...(winner ? situations[winner] : { prop: 'none' as const, scene: 'nest' as const }),
    reason: winner ? `${counts.get(winner)} ${winner} observation(s) in the last closed ${pet.policy.contextHours}-hour window.`
      : windowIndex === 0 ? 'Settling into the nest; the first context window is still open.'
        : 'No observations in the last closed window; resting comfortably.',
    updatedAt: end };
}
/** A modest expression bias from at most seven completed growth days; not a personality inference. */
function refreshExpression(pet: Pet): void {
  const scores = baseline(pet.profile.temperament);
  const hatch = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const dayLength = pet.policy.growthHours * HOUR;
  for (let day = Math.max(0, pet.growth.days - 7); day < pet.growth.days; day++) {
    const start = hatch + day * dayLength;
    const entries = pet.context.filter(e => e.occurredAt >= start && e.occurredAt < start + dayLength);
    if (!entries.length) continue;
    // Each day has equal weight regardless of how much someone works.
    for (const entry of entries) scores[expression[entry.kind]] += 0.025 / entries.length;
  }
  const total = scores.calm + scores.curious + scores.playful;
  pet.growth.temperament = { calm: scores.calm / total, curious: scores.curious / total, playful: scores.playful / total };
}
export function createPet(profile: Profile = { ...DEFAULT_PROFILE }, nowMs = Date.now(), seed?: string | number,
  overrides: Partial<GrowthPolicy> = {}): Pet {
  timestamp(nowMs, 'nowMs'); validateProfile(profile);
  const policy = { ...DEFAULT_POLICY, ...overrides }; validatePolicy(policy);
  const identity = String(seed ?? globalThis.crypto.randomUUID());
  if (!identity || identity.length > 200) throw new Error('Seed must contain 1–200 characters');
  const gene = hash(identity);
  const pet: Pet = {
    id: `genpet-${hash(`${identity}:${nowMs}`).toString(36)}`, seed: identity,
    adoptedAt: nowMs, lastEvaluatedAt: nowMs, profile: { ...profile, name: profile.name.trim() },
    dna: { hue: paletteHue[profile.palette] + gene % 17 - 8,
      pattern: (['speckles', 'stripes', 'patches'] as const)[gene % 3]!, patternSeed: gene },
    hatchIdentity: null,
    stage: 'egg', ageDays: 0,
    growth: { days: 0, size: 0.68, temperament: baseline(profile.temperament), milestoneDays: [], decorationLevel: 0 },
    context: [], state: { windowIndex: 0, kind: null, prop: 'none', scene: 'nest', reason: '', updatedAt: nowMs },
    events: [], policy,
  };
  refreshState(pet, nowMs); event(pet, 'adopted', nowMs, `${pet.profile.name} was adopted as a unique egg.`);
  return pet;
}
export function evolvePet(original: Pet, nowMs: number): Pet {
  timestamp(nowMs, 'nowMs');
  const pet = migratePet(original);
  // Wall-clock correction never reverses growth or replays a completed window.
  const now = Math.max(nowMs, pet.lastEvaluatedAt, pet.adoptedAt);
  const hatch = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const days = now < hatch ? 0 : Math.floor((now - hatch) / (pet.policy.growthHours * HOUR));
  const stage: Stage = now < hatch ? 'egg' : days >= pet.policy.adultDays ? 'adult'
    : days >= pet.policy.juvenileDays ? 'juvenile' : 'hatchling';
  // Resolve before retention pruning, including after a long offline interval.
  if (stage !== 'egg' && !pet.hatchIdentity) pet.hatchIdentity = resolveHatchIdentity(pet);
  if (pet.stage === 'egg' && stage !== 'egg') event(pet, 'hatched', hatch, `${pet.profile.name} hatched.`);
  // Catch-up is O(history limit), even after years offline.
  for (let day = Math.max(pet.growth.days + 1, days - pet.policy.maxEvents + 1); day <= days; day++) {
    const at = hatch + day * pet.policy.growthHours * HOUR;
    event(pet, 'growth', at, `Growth day ${day}: a little bigger.`, String(day));
    if (day === pet.policy.juvenileDays || day === pet.policy.adultDays) event(pet, 'stage', at,
      day === pet.policy.adultDays ? 'Reached the adult stage.' : 'Reached the juvenile stage.');
  }
  pet.ageDays = Math.floor((now - pet.adoptedAt) / DAY);
  pet.growth.days = days;
  pet.growth.size = stage === 'egg' ? 0.68 : 0.74 + 0.51 * growthMaturity(days,pet.policy.adultDays);
  pet.stage = stage; pet.lastEvaluatedAt = now;
  pet.context = pet.context.filter(e => e.occurredAt >= now - pet.policy.contextRetentionDays * DAY)
    .slice(-pet.policy.maxContextEntries);
  // Derived state only uses retained evidence, preserving repeated-tick idempotence.
  refreshState(pet, now); refreshExpression(pet);
  return pet;
}
function insertContext(pet: Pet, input: ContextInput, nowMs: number): void {
  timestamp(nowMs, 'nowMs');
  if (!kinds.includes(input.kind)) throw new Error('Invalid context kind');
  if (!['user', 'codex-summary', 'codex-local'].includes(input.source)) throw new Error('Invalid context source');
  if (input.summary !== undefined && typeof input.summary !== 'string') throw new Error('Summary must be text');
  if ([...(input.summary ?? '')].length > 240) throw new Error('Summary must not exceed 240 characters');
  if (input.milestone !== undefined && typeof input.milestone !== 'boolean') throw new Error('Milestone must be boolean');
  const occurredAt = input.occurredAt ?? nowMs; timestamp(occurredAt, 'occurredAt');
  if (occurredAt > nowMs) throw new Error('Context cannot be in the future');
  if (occurredAt < pet.adoptedAt || occurredAt < Math.max(nowMs, pet.lastEvaluatedAt) - pet.policy.contextRetentionDays * DAY)
    throw new Error('Context is expired or predates adoption');
  const summary = (input.summary ?? '').trim();
  const id = `ctx-${hash(JSON.stringify([pet.id, input.source, input.kind, occurredAt, summary, !!input.milestone])).toString(36)}`;
  if (pet.context.some(entry => entry.id === id)) return;
  pet.context.push({ id, kind: input.kind, source: input.source, summary, occurredAt,
    submittedAt: nowMs, milestone: input.milestone ?? false });
  pet.context.sort((a, b) => a.occurredAt - b.occurredAt || a.id.localeCompare(b.id));
  event(pet, 'context', nowMs, `Recorded a ${input.kind} activity tag.`, id);
  if (input.milestone) {
    const day = Math.floor((occurredAt - pet.adoptedAt) / DAY);
    if (!pet.growth.milestoneDays.includes(day)) {
      pet.growth.milestoneDays = [...pet.growth.milestoneDays, day].sort((a, b) => a - b).slice(-90);
      pet.growth.decorationLevel = Math.min(3, pet.growth.milestoneDays.length);
      event(pet, 'milestone', nowMs, 'A meaningful day added a small keepsake.', String(day));
    }
  }
}
/** Insert an entire scan before the one-time birth decision; failures are atomic. */
export function addContextBatch(original: Pet, inputs: readonly ContextInput[], nowMs: number): Pet {
  timestamp(nowMs, 'nowMs');
  const pet = migratePet(original);
  for (const input of inputs) insertContext(pet, input, nowMs);
  return evolvePet(pet, nowMs);
}
export function addContext(original: Pet, input: ContextInput, nowMs: number): Pet {
  return addContextBatch(original, [input], nowMs);
}
export function removeContext(original: Pet, id: string, nowMs: number): Pet {
  const pet = evolvePet(original, nowMs);
  const removed = pet.context.find(entry => entry.id === id);
  if (!removed) return pet;
  pet.context = pet.context.filter(entry => entry.id !== id);
  pet.events = pet.events.filter(entry => !entry.id.endsWith(`-${id}`));
  if (removed.milestone) {
    const day = Math.floor((removed.occurredAt - pet.adoptedAt) / DAY);
    if (!pet.context.some(entry => entry.milestone && Math.floor((entry.occurredAt - pet.adoptedAt) / DAY) === day)) {
      pet.growth.milestoneDays = pet.growth.milestoneDays.filter(value => value !== day);
      pet.growth.decorationLevel = Math.min(3, pet.growth.milestoneDays.length);
      pet.events = pet.events.filter(entry => !(entry.type === 'milestone' && entry.id.endsWith(`-${day}`)));
    }
  }
  refreshState(pet, pet.lastEvaluatedAt); refreshExpression(pet);
  return pet;
}
export function updateProfile(original: Pet, patch: Partial<Profile>): Pet {
  const pet = migratePet(original);
  pet.profile = { ...pet.profile, ...patch }; validateProfile(pet.profile);
  pet.profile.name = pet.profile.name.trim();
  // DNA is the persistent identity; preference edits cannot rewrite it.
  refreshExpression(pet);
  return pet;
}

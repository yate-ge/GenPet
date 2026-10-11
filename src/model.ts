/** Persisted identities and open creative records. Only engineering invariants live here. */
import { randomUUID } from 'node:crypto';

export const stages = ['egg', 'hatchling', 'juvenile', 'adult'] as const;
export type Stage = (typeof stages)[number];
export type Host = 'desktop' | 'cloud';
export type SourceType = 'natural' | 'object' | 'imagined';

/** Keep the local identity and the latest host-owned cloud mapping together. */
export interface Binding {
  host: Host;
  avatarId: string;
  cloudId?: string;
  destination?: string;
}
export interface Soul {
  genes: string | null;
  personality?: string;
  designReason?: string;
  acquisition?: { place: string; connection: string; storyId: string; journey?: Pending['journey'] };
}
export interface Memory {
  text: string;
  updatedAt: number;
  storyId?: string;
}
export interface PetState {
  stage: Stage;
  description: string;
  appearanceId?: string;
  storyId?: string;
  updatedAt: number;
  home?: string;
  special?: { description: string; since: number; storyId: string; endedAt?: number };
}
export interface Pet {
  id: string;
  name: string;
  adoptedAt: number;
  revision: number;
  naming?: { status: 'unasked' | 'asked' | 'named'; askedAt?: number; namedAt?: number };
  soul: Soul;
  memory: Memory;
  state: PetState;
  binding?: Binding;
}

/** avatar is readable historical artwork; both current hosts use the shared atlas format. */
export type ArtKind = 'portrait' | 'atlas' | 'avatar' | 'story' | 'artifact';
export const artKinds: ArtKind[] = ['portrait', 'atlas', 'story', 'artifact'];
export interface ArtRecord {
  id: string;
  petId: string;
  requestId: string;
  stage: Stage;
  description: string;
  file: string;
  kind: ArtKind;
  createdAt: number;
  source: string;
}

/** The story comes first; optional memory rewrites commit with the resulting state. */
export interface StoryPlan {
  text: string;
  reason: string;
  state: string;
  stage?: Stage;
  genes?: string;
  designReason?: string;
  place?: string;
  connection?: string;
  personality?: string;
  memory?: string;
  contextRefs?: string[];
  home?: string;
  special?: string | null;
  appearance?: { description: string; reuseArtId?: string };
  mediaIds?: string[];
}
export interface HostResult {
  petId: string;
  operationId: string;
  appearanceId: string;
  avatarId: string;
  cloudId?: string;
  updated: boolean;
  storedArtworkVerified: boolean | null;
  storedArtworkSha256?: string;
  acceptedArtworkSha256?: string;
  storedFileSha256?: string;
  acceptedFileSha256?: string;
  active: boolean | null;
  refreshRequested: boolean;
  displayStatus: 'confirmed' | 'unconfirmed';
  refreshUnavailable?: boolean;
  notice?: string;
  observed?: string;
  error?: string;
}
export interface GenerationStep {
  id: string;
  unit: string;
  at: number;
  inputRefs: string[];
  result: Record<string, unknown>;
}
export interface Story {
  id: string;
  triggerId: string;
  petId: string;
  at: number;
  text: string;
  reason: string;
  designReason?: string;
  contextRefs?: string[];
  stage: Stage;
  state: string;
  memory?: string;
  home?: string;
  special?: string | null;
  appearanceId?: string;
  /** Actual change committed by this story; carrying an existing image is not a visible update. */
  appearanceChanged?: boolean;
  mediaIds: string[];
  hostResult?: HostResult;
  journey?: Pending['journey'];
  random?: Pick<Pending, 'sourceChoice' | 'selection' | 'candidates'>;
  /** Hydrated only for runtime callers; persisted separately in stories/<id>.json. */
  steps?: GenerationStep[];
  stepsCount?: number;
}
export interface Candidate {
  id: string;
  description: string;
  contextRefs: string[];
  visualIntent?: string;
  outputs?: ('appearance' | 'home' | 'item')[];
}
export interface JourneyRound {
  scene: string;
  options: string[];
  userInput: string;
  inputRefs: string[];
}
export interface Pending {
  id: string;
  triggerId: string;
  petId: string;
  baseRevision: number;
  startedAt: number;
  mode: 'initialization' | 'story';
  forceGrowth?: boolean;
  plan?: StoryPlan;
  hostResult?: HostResult;
  sourceChoice?: { seed: string; sourceType: SourceType };
  candidates?: Candidate[];
  selection?: {
    seed: string;
    purpose: 'story' | 'genes';
    candidateId: string;
    sourceType?: SourceType;
    candidateHash?: string;
  };
  journey?: {
    background: string;
    rounds: JourneyRound[];
    completed?: boolean;
    awaiting?: { scene: string; options: string[]; inputRefs: string[] };
  };
  steps?: GenerationStep[];
  stepsCount?: number;
}
export interface Chat {
  id: string;
  petId: string;
  at: number;
  text: string;
}
/** Internal pace accounting. Counters are never user-facing progression. */
export interface GrowthClock {
  stage: Stage;
  stageSince: number;
  experiences: number;
  lastExperienceStoryId?: string;
  pausedAt?: number;
  /** Lifetime pause total and its baselines when the current stage/form began. */
  pausedMs: number;
  stagePausedMs: number;
  specialPausedMs: number;
  specialSince?: number;
  lastActivatedAt?: number;
  lastInactiveAt?: number;
}
export interface State {
  version: 3;
  host: Host;
  pet: Pet | null;
  stories: Story[];
  art: ArtRecord[];
  pending: Pending | null;
  chats?: Chat[];
  growthClock?: GrowthClock;
  schedule?: { timezone: string; reference?: string; stoppedAt?: number; resumedAt?: number };
  legacy?: {
    backup: string;
    importedAt: number;
    source?: string;
    sourceVersion?: number;
    memorySupplementedAt?: number;
    voiceSupplement?: { text: string; at: number };
  };
  replacesPetId?: string;
  handoff?: {
    id: string;
    target: Host;
    status: 'exported' | 'imported';
    at: number;
    previousTransferId?: string;
  };
  /** Read-only legacy views are never silently adopted by a mutation. */
  needsImport?: boolean;
  legacyFile?: string;
}
export const fresh = (host: Host): State => ({ version: 3, host, pet: null, stories: [], art: [], pending: null });
export function createPet(name?: string, now = Date.now()): Pet {
  return {
    id: `genpet-${randomUUID()}`,
    name: name === undefined ? 'GenPet' : text(name, 'name'),
    adoptedAt: now,
    revision: 0,
    naming: name === undefined ? { status: 'unasked' } : { status: 'named', namedAt: now },
    soul: { genes: null },
    memory: { text: '', updatedAt: now },
    state: { stage: 'egg', description: '', updatedAt: now },
  };
}
export function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be nonempty text`);
  return value.trim();
}
export function identifier(value: unknown, field = 'id'): string {
  const result = text(value, field);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(result)) throw new Error(`Invalid ${field}`);
  return result;
}
/** Stages only move forward. */
export function validateStage(current: Stage, target: unknown): Stage {
  if (!stages.includes(target as Stage)) throw new Error('Invalid stage');
  if (stages.indexOf(target as Stage) < stages.indexOf(current))
    throw new Error('Evolution cannot reverse the current stage');
  return target as Stage;
}

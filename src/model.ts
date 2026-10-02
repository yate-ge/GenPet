/** Persisted data model and the small shared validators. Creative content stays open text. */
import { randomUUID } from 'node:crypto';

export const stages = ['egg', 'hatchling', 'juvenile', 'adult'] as const;
export type Stage = (typeof stages)[number];
export type Host = 'desktop' | 'dots';

/** The one host surface (desktop Pet entry or Dots Avatar) this pet updates by ID. */
export interface Binding {
  host: Host;
  avatarId: string;
  destination?: string;
}

export interface Pet {
  id: string;
  name: string;
  adoptedAt: number;
  revision: number;
  genes: string | null;
  personality?: string;
  naming?: { status: 'unasked' | 'asked' | 'named'; askedAt?: number; namedAt?: number };
  acquisition?: { place: string; connection: string; storyId: string };
  stage: Stage;
  state: { description: string; appearanceId?: string; storyId?: string; updatedAt: number };
  binding?: Binding;
}

/** Storage purposes, not story categories. `atlas` is the desktop format, `avatar` the Dots format. */
export type ArtKind = 'portrait' | 'atlas' | 'avatar' | 'story' | 'artifact';
export const artKinds: ArtKind[] = ['portrait', 'atlas', 'avatar', 'story', 'artifact'];

export interface ArtRecord {
  id: string;
  petId: string;
  requestId: string;
  stage: Stage;
  description: string;
  file: string;
  kind: ArtKind;
  createdAt: number;
  provenance: string;
}

/** What the Agent decided for one story: the story first, then its state and appearance. */
export interface StoryPlan {
  text: string;
  basis: string;
  state: string;
  stage?: Stage;
  genes?: string;
  place?: string;
  connection?: string;
  personality?: string;
  appearance?: { description: string; reuseArtId?: string };
  mediaIds?: string[];
}

export interface HostResult {
  petId: string;
  operationId: string;
  appearanceId: string;
  avatarId: string;
  updated: boolean;
  active: boolean | null;
  refreshRequested: boolean;
  displayStatus: 'confirmed' | 'unconfirmed';
  evidence?: string;
  error?: string;
}

/** An internal generation-unit result kept with its story. */
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
  basis: string;
  stage: Stage;
  state: string;
  appearanceId?: string;
  mediaIds: string[];
  hostResult?: HostResult;
  steps?: GenerationStep[];
}

/** The one unfinished story; retries resume it instead of starting another. */
export interface Pending {
  id: string;
  triggerId: string;
  petId: string;
  baseRevision: number;
  startedAt: number;
  mode: 'initialization' | 'story' | 'grow';
  plan?: StoryPlan;
  hostResult?: HostResult;
  steps?: GenerationStep[];
}

export interface State {
  version: 2;
  host: Host;
  pet: Pet | null;
  stories: Story[];
  art: ArtRecord[];
  pending: Pending | null;
  schedule?: { timezone: string; reference: string; times: string[] };
  legacy?: { backup: string; importedAt: number };
  replacesPetId?: string;
}

export const fresh = (host: Host): State => ({ version: 2, host, pet: null, stories: [], art: [], pending: null });

export function createPet(name?: string, now = Date.now()): Pet {
  return {
    id: `genpet-${randomUUID()}`,
    name: name === undefined ? 'GenPet' : text(name, 'name'),
    adoptedAt: now,
    revision: 0,
    naming: name === undefined ? { status: 'unasked' } : { status: 'named', namedAt: now },
    genes: null,
    stage: 'egg',
    state: { description: '', updatedAt: now },
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

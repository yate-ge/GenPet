import { randomUUID } from 'node:crypto';
export const stages = ['egg', 'hatchling', 'juvenile', 'adult'] as const;
export type Stage = typeof stages[number];
export type Host = 'desktop' | 'dots';
export interface Binding { host: Host; avatarId: string; destination?: string; }
export interface Pet {
  id: string; name: string; adoptedAt: number; revision: number; genes: string | null;
  personality?: string;
  naming?: { status: 'unasked' | 'asked' | 'named'; askedAt?: number; namedAt?: number };
  acquisition?: { place: string; connection: string; storyId: string };
  stage: Stage;
  state: { description: string; appearanceId?: string; storyId?: string; updatedAt: number };
  binding?: Binding;
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
export function createPet(name?: string, now = Date.now()): Pet {
  return { id: `genpet-${randomUUID()}`, name: name === undefined ? 'GenPet' : text(name, 'name'), adoptedAt: now, revision: 0,
    naming: name === undefined ? { status: 'unasked' } : { status: 'named', namedAt: now },
    genes: null, stage: 'egg', state: { description: '', updatedAt: now } };
}
export function validateStage(current: Stage, target: unknown): Stage {
  if (!stages.includes(target as Stage)) throw new Error('Invalid stage');
  if (stages.indexOf(target as Stage) < stages.indexOf(current)) throw new Error('Evolution cannot reverse the current stage');
  return target as Stage;
}

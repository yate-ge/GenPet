import { mkdir, readFile, rename, writeFile, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { identifier, validateStage, type Host, type Pet, type Stage } from './core.js';
export type ArtKind = 'portrait' | 'atlas' | 'avatar' | 'story' | 'artifact';
export interface ArtRecord {
  id: string; petId: string; requestId: string; stage: Stage; description: string;
  file: string; kind: ArtKind; createdAt: number; provenance: string;
}
export interface StoryPlan {
  text: string; basis: string; state: string; stage?: Stage;
  genes?: string; place?: string; connection?: string;
  appearance?: { description: string; reuseArtId?: string }; mediaIds?: string[];
}
export interface HostResult {
  petId: string; operationId: string; appearanceId: string; avatarId: string; updated: boolean; active: boolean | null;
  refreshRequested: boolean; displayStatus: 'confirmed' | 'unconfirmed'; evidence?: string; error?: string;
}
export interface GenerationStep {
  id: string; unit: string; at: number; inputRefs: string[]; result: Record<string,unknown>;
}
export interface Story {
  id: string; triggerId: string; petId: string; at: number; text: string; basis: string;
  stage: Stage; state: string; appearanceId?: string; mediaIds: string[]; hostResult?: HostResult; steps?: GenerationStep[];
}
export interface Pending {
  id: string; triggerId: string; petId: string; baseRevision: number; startedAt: number;
  mode: 'initialization' | 'story' | 'grow'; plan?: StoryPlan; hostResult?: HostResult; steps?: GenerationStep[];
}
export interface State {
  version: 2; host: Host; pet: Pet | null; stories: Story[]; art: ArtRecord[]; pending: Pending | null;
  schedule?: { timezone: string; reference: string; times: string[] };
  legacy?: { backup: string; importedAt: number };
  replacesPetId?: string;
}
export const dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), '.genpet');
export const fresh = (host: Host): State => ({ version: 2, host, pet: null, stories: [], art: [], pending: null });
export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await rename(tmp, file); }
  finally { await rm(tmp, { force: true }); }
}
/** A separate namespace per host, even when both packages share an explicit root. */
export class Store {
  readonly base: string; readonly root: string; readonly file: string;
  constructor(root = dataRoot(), readonly demo = false, readonly host: Host = 'desktop') {
    this.base = path.resolve(root);
    this.root = path.resolve(this.base, host, ...(demo ? ['demo'] : []));
    this.file = path.join(this.root, 'state.json');
  }
  now() { return Date.now(); }
  async peek(): Promise<State> {
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8')) as State;
      if (state.version !== 2 || state.host !== this.host) throw new Error('Unsupported or mismatched pet record');
      if (state.pet) { identifier(state.pet.id, 'petId'); validateStage('egg',state.pet.stage); }
      return state;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fresh(this.host); throw error; }
  }
  /** Read-only; elapsed time never evolves a pet. */
  current() { return this.peek(); }
  async legacyCandidate(): Promise<string | null> {
    if (this.host !== 'desktop' || this.demo) return null;
    const file = path.join(this.base,'state.json');
    try { const old=JSON.parse(await readFile(file,'utf8')); return old.version===1&&old.pet?file:null; }
    catch(error) { if ((error as NodeJS.ErrnoException).code==='ENOENT') return null; throw error; }
  }
  async transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = this.file + '.lock'; let acquired = false;
    for (let i = 0; i < 100; i++) {
      try { await mkdir(lock); acquired = true; break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const age = await stat(lock).then(info => Date.now() - info.mtimeMs).catch(() => 0);
        if (age > 120_000) await rm(lock, { recursive: true, force: true });
        else await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    if (!acquired) throw new Error('Another pet operation is running; resume it before starting another');
    try {
      const state = await this.peek(); const result = await fn(state);
      await atomicJson(this.file, state);
      if (state.pet) await atomicJson(path.join(this.root, 'pets', state.pet.id, 'record.json'), state);
      return result;
    } finally { await rm(lock, { recursive: true, force: true }); }
  }
}

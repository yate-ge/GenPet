/** Persistence only: one state.json per host, read without side effects, changed inside a locked transaction. */
import { mkdir, readFile, rename, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataRoot } from './config.js';
import { fresh, identifier, validateStage, type Host, type State } from './model.js';

export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(tmp, file);
  } finally {
    await rm(tmp, { force: true });
  }
}

/** A separate namespace per host, even when both packages share an explicit root. */
export class Store {
  readonly base: string;
  readonly root: string;
  readonly file: string;
  constructor(
    root = dataRoot(),
    readonly host: Host = 'desktop',
  ) {
    this.base = path.resolve(root);
    this.root = path.resolve(this.base, host);
    this.file = path.join(this.root, 'state.json');
  }

  /** Read-only; a missing file is an empty record, and elapsed time never changes a pet. */
  async peek(): Promise<State> {
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8')) as State;
      if (state.version !== 2 || state.host !== this.host) throw new Error('Unsupported or mismatched pet record');
      const pet = state.pet;
      if (pet) {
        identifier(pet.id, 'petId');
        validateStage('egg', pet.stage);
        if (pet.personality !== undefined && (typeof pet.personality !== 'string' || !pet.personality.trim()))
          throw new Error('Invalid personality');
        if ((pet.naming?.status as string) === 'deferred') pet.naming!.status = 'asked'; // 0.6.0 records
        if (pet.naming && !['unasked', 'asked', 'named'].includes(pet.naming.status))
          throw new Error('Invalid naming status');
      }
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fresh(this.host);
      throw error;
    }
  }

  /** Serializes changes across processes; the record is written only if `fn` succeeds. */
  async transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = this.file + '.lock';
    let acquired = false;
    for (let i = 0; i < 100 && !acquired; i++) {
      try {
        await mkdir(lock);
        acquired = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const age = await stat(lock).then(
          info => Date.now() - info.mtimeMs,
          () => 0,
        );
        if (age > 120_000) await rm(lock, { recursive: true, force: true });
        else await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    if (!acquired) throw new Error('Another pet operation is running; resume it before starting another');
    try {
      const state = await this.peek();
      const result = await fn(state);
      await atomicJson(this.file, state);
      return result;
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
}

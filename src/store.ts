/** Per-Pet records, a small host selection ledger, and append-only story-unit snapshots. */
import { mkdir, readFile, readdir, rename, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataRoot } from './config.js';
import {
  createPet as newIdentity,
  fresh,
  identifier,
  text,
  validateStage,
  type Binding,
  type GenerationStep,
  type Host,
  type Stage,
  type State,
} from './model.js';
import { ensureGrowthClock } from './growth.js';
import { readMigrationMap } from './hosts/desktop/mapping.js';
import { normalizeRecord, normalizeStep, prepareImport, type ImportOptions } from './migration.js';

export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(tmp, file);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '') || attempt >= 4)
          throw error;
        // Windows readers can briefly deny replacing an otherwise valid existing record.
        await new Promise(resolve => setTimeout(resolve, 20 * 2 ** attempt));
      }
    }
  } finally {
    await rm(tmp, { force: true });
  }
}
async function readJson(file: string): Promise<any | null> {
  try {
    const record = JSON.parse(await readFile(file, 'utf8'));
    if (record === null) throw new Error('Record is null');
    return record;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Cannot read Pet record ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
interface Activity {
  id: string;
  pausedMs: number;
  pausedAt?: number;
  lastActivatedAt?: number;
  lastInactiveAt?: number;
  transferId?: string;
  archived?: { at: number; replacesPetId: string };
}
interface Registry {
  version: 1;
  host: Host;
  activePetId?: string;
  pets: Activity[];
}
export interface StoredPet {
  id: string;
  name: string;
  stage?: Stage;
  binding?: Binding;
  active: boolean;
  archived: boolean;
  directory: string;
  file: string;
  error?: string;
}
const jsonEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const key = (id: string) => encodeURIComponent(identifier(id)).replace(/\./g, '%2E');

export class Store {
  readonly base: string;
  readonly root: string;
  readonly registryFile: string;
  private selectedId?: string;
  private pinnedId?: string;
  constructor(
    root = dataRoot(),
    readonly host: Host = 'desktop',
    petId?: string,
  ) {
    this.base = path.resolve(root);
    this.root = path.join(this.base, host);
    this.registryFile = path.join(this.root, 'registry.json');
    this.pinnedId = petId === undefined ? undefined : identifier(petId, 'petId');
    this.selectedId = this.pinnedId;
  }
  get file() {
    return this.selectedId
      ? path.join(this.petDirectory(this.selectedId), 'state.json')
      : path.join(this.root, 'current.json');
  }
  petDirectory(id: string) {
    return path.join(this.root, 'pets', key(id));
  }
  forPet(id: string) {
    return new Store(this.base, this.host, id);
  }

  private async canonicalIds(): Promise<string[]> {
    try {
      const dirs = await readdir(path.join(this.root, 'pets'), { withFileTypes: true });
      // A damaged JSON file still has an identity and must remain visible in the inventory.
      return dirs.filter(dir => dir.isDirectory()).map(dir => identifier(decodeURIComponent(dir.name), 'petId'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
  private async registry(): Promise<Registry> {
    const raw = await readJson(this.registryFile);
    if (raw) {
      if (raw.version !== 1 || raw.host !== this.host || !Array.isArray(raw.pets))
        throw new Error('Invalid Pet registry');
      for (const pet of raw.pets) {
        identifier(pet.id, 'registered petId');
        if (!Number.isFinite(pet.pausedMs) || pet.pausedMs < 0) throw new Error('Invalid activation clock');
      }
      return raw;
    }
    const ids = await this.canonicalIds();
    const records = await Promise.all(
      ids.map(id => readJson(path.join(this.petDirectory(id), 'state.json')).catch(() => ({ recordError: true }))),
    );
    const order = ids
      .map((id, index) => ({ id, at: records[index]?.pet?.adoptedAt ?? 0 }))
      .filter((_, index) => records[index] !== null)
      .sort((a, b) => a.at - b.at);
    const activePetId = order.at(-1)?.id;
    return {
      version: 1,
      host: this.host,
      ...(activePetId ? { activePetId } : {}),
      pets: ids.flatMap((id, index) =>
        records[index] === null
          ? []
          : [
              {
                id,
                pausedMs: records[index]?.growthClock?.pausedMs ?? 0,
                ...(records[index]?.handoff?.activityTransferId
                  ? { transferId: records[index].handoff.activityTransferId }
                  : {}),
                ...(records[index]?.growthClock?.pausedAt !== undefined
                  ? { pausedAt: records[index].growthClock.pausedAt }
                  : {}),
              },
            ],
      ),
    };
  }
  private async readPet(id: string, registry: Registry, allowNew = false, recoverTransfer = false): Promise<State> {
    const file = path.join(this.petDirectory(id), 'state.json');
    const raw = await readJson(file);
    const activity = registry.pets.find(pet => pet.id === id);
    if (raw === null) {
      if (allowNew && !activity && registry.activePetId !== id) return fresh(this.host);
      throw Object.assign(new Error(`Pet ${id} record is missing: ${file}`), {
        code: 'GENPET_RECORD_MISSING',
        registered: !!activity || registry.activePetId === id,
      });
    }
    let state: State;
    try {
      state = normalizeRecord(raw, this.host, file);
      if (state.pet?.id !== id) throw new Error('Pet directory identity mismatch');
    } catch (error) {
      throw new Error(
        `Pet ${id} record is invalid: ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const incompleteTransfer =
      state.handoff?.status === 'imported' &&
      state.handoff.activityTransferId !== undefined &&
      state.handoff.activityTransferId !== activity?.transferId;
    if (incompleteTransfer && !recoverTransfer)
      throw Object.assign(
        new Error(`Pet ${id} transfer activity is not committed: ${file}; resume the same transfer`),
        {
          code: 'GENPET_TRANSFER_INCOMPLETE',
        },
      );
    if (activity && state.pet && !incompleteTransfer) {
      const clock = ensureGrowthClock(state)!;
      clock.pausedMs = activity.pausedMs;
      if (activity.pausedAt !== undefined) clock.pausedAt = activity.pausedAt;
      else delete clock.pausedAt;
      if (activity.lastActivatedAt !== undefined) clock.lastActivatedAt = activity.lastActivatedAt;
      if (activity.lastInactiveAt !== undefined) clock.lastInactiveAt = activity.lastInactiveAt;
    }
    await this.hydrateSteps(state);
    return state;
  }
  private async hydrateSteps(state: State) {
    if (!state.pet) return;
    for (const owner of [...state.stories, ...(state.pending ? [state.pending] : [])]) {
      if (owner.stepsCount === undefined) continue;
      const file = path.join(this.petDirectory(state.pet.id), 'stories', `${key(owner.id)}.json`);
      if (!Number.isSafeInteger(owner.stepsCount) || owner.stepsCount < 0)
        throw new Error(`Invalid story steps count: ${file}`);
      const saved = await readJson(file);
      if (
        !saved ||
        saved.petId !== state.pet.id ||
        saved.storyId !== owner.id ||
        !Array.isArray(saved.steps) ||
        saved.steps.length < owner.stepsCount
      )
        throw new Error(`Story unit snapshot is missing or incomplete: ${file}`);
      owner.steps = saved.steps.slice(0, owner.stepsCount).map(normalizeStep);
    }
  }
  /** No files, registry entries, legacy migrations, or time-based Pet changes are written here. */
  async peek(): Promise<State> {
    const registry = await this.registry();
    const id = this.pinnedId ?? registry.activePetId;
    if (id) {
      this.selectedId = id;
      return this.readPet(id, registry);
    }
    this.selectedId = undefined;
    const legacyFile = path.join(this.root, 'state.json');
    const legacy = await readJson(legacyFile);
    if (legacy) return normalizeRecord(legacy, this.host, legacyFile);
    const empty = await readJson(this.file);
    return empty ? normalizeRecord(empty, this.host, this.file) : fresh(this.host);
  }
  async listPets(): Promise<StoredPet[]> {
    const registry = await this.registry();
    const ids = [
      ...new Set([
        ...registry.pets.map(pet => pet.id),
        ...(registry.activePetId ? [registry.activePetId] : []),
        ...(await this.canonicalIds()),
      ]),
    ];
    const result: StoredPet[] = [];
    for (const id of ids) {
      const entry = registry.pets.find(pet => pet.id === id);
      const row: StoredPet = {
        id,
        name: id,
        active: registry.activePetId === id,
        archived: !!entry?.archived,
        directory: this.petDirectory(id),
        file: path.join(this.petDirectory(id), 'state.json'),
      };
      try {
        const state = await this.readPet(id, registry);
        row.name = state.pet!.name;
        row.stage = state.pet!.state.stage;
        if (state.pet!.binding) row.binding = state.pet!.binding;
      } catch (error) {
        row.error = error instanceof Error ? error.message : String(error);
        // Readable identity/binding can still route a broken snapshot to an explicit error.
        const raw = await readJson(row.file).catch(() => null);
        try {
          const state = normalizeRecord(raw, this.host, row.file);
          if (state.pet?.id === id) {
            row.name = state.pet.name;
            row.stage = state.pet.state.stage;
            if (state.pet.binding) row.binding = state.pet.binding;
          }
        } catch {
          // The error and original path remain on the row; no record is repaired or removed.
        }
      }
      result.push(row);
    }
    return result;
  }
  /** An operation stays attached to its original Pet even when the host selection changes. */
  async forOperation(id: string): Promise<Store> {
    identifier(id, 'operationId');
    const pets = await this.listPets();
    for (const pet of pets) {
      if (pet.error) {
        const raw = await readJson(pet.file).catch(() => null);
        if (
          raw?.pending?.id === id ||
          (Array.isArray(raw?.stories) && raw.stories.some((story: { id: string }) => story.id === id))
        )
          throw new Error(pet.error);
        continue;
      }
      const candidate = this.forPet(pet.id),
        state = await candidate.peek();
      if (state.pending?.id === id) {
        if (pet.archived) throw new Error('This pending operation belongs to an archived Pet');
        return candidate;
      }
      if (state.stories.some(story => story.id === id)) return candidate;
    }
    const current = await this.peek();
    if (current.pending?.id === id || current.stories.some(story => story.id === id)) return this;
    const errors = pets.filter(pet => pet.error).map(pet => pet.error);
    throw new Error(
      `Operation belongs to a missing Pet${errors.length ? `; unreadable records: ${errors.join('; ')}` : ''}`,
    );
  }
  async readSteps(storyId: string): Promise<GenerationStep[]> {
    const state = await this.peek();
    const owner = state.pending?.id === storyId ? state.pending : state.stories.find(story => story.id === storyId);
    if (!owner) throw new Error('No story unit snapshot for this Pet');
    return owner.steps ?? [];
  }

  private async locked<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const lock = this.registryFile + '.lock';
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
    if (!acquired) throw new Error('Another Pet operation is running; resume it before starting another');
    try {
      return await fn();
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
  private activate(registry: Registry, id: string, now: number) {
    const current = registry.pets.find(pet => pet.id === registry.activePetId);
    if (current && current.id !== id && current.pausedAt === undefined) {
      current.pausedAt = now;
      current.lastInactiveAt = now;
    }
    let target = registry.pets.find(pet => pet.id === id);
    if (!target) {
      target = { id, pausedMs: 0 };
      registry.pets.push(target);
    }
    if (target.archived) throw new Error('An archived Pet must be explicitly restored before activation');
    if (target.pausedAt !== undefined) {
      target.pausedMs += Math.max(0, now - target.pausedAt);
      delete target.pausedAt;
    }
    if (registry.activePetId !== id || target.lastActivatedAt === undefined) target.lastActivatedAt = now;
    registry.activePetId = id;
  }
  /** Only GenPet's activation ledger changes; this does not change the user's host selection. */
  async selectPet(id: string, now = Date.now()) {
    identifier(id, 'petId');
    return this.locked(async () => {
      const registry = await this.registry(),
        state = await this.readPet(id, registry);
      if (!state.pet || state.needsImport) throw new Error('No adopted v3 Pet to activate');
      if (!registry.pets.some(pet => pet.id === id))
        registry.pets.push({
          id,
          pausedMs: state.growthClock?.pausedMs ?? 0,
          ...(state.growthClock?.pausedAt !== undefined ? { pausedAt: state.growthClock.pausedAt } : {}),
        });
      this.activate(registry, id, now);
      await atomicJson(this.registryFile, registry);
      this.selectedId = id;
      if (this.pinnedId !== undefined) this.pinnedId = id;
      return { petId: id, active: true };
    });
  }
  async resolveActive(selectedHostId: string | null | undefined, now = Date.now()) {
    const pets = await this.listPets();
    const migration =
      selectedHostId &&
      this.host === 'desktop' &&
      pets.some(pet => !pet.archived && pet.binding?.avatarId.startsWith('custom:'))
        ? await readMigrationMap()
        : null;
    const matches = selectedHostId
      ? pets.filter(pet => {
          const binding = pet.binding;
          if (pet.archived || !binding) return false;
          // A cached cloud alias cannot identify a migrated local Pet in the current account.
          const cloudId =
            this.host === 'desktop' && binding.avatarId.startsWith('custom:')
              ? migration?.available
                ? migration.mappings[binding.avatarId]
                : undefined
              : binding.cloudId;
          return [binding.avatarId, cloudId].includes(selectedHostId);
        })
      : [];
    if (matches.length > 1) throw new Error('Host binding maps to more than one GenPet');
    const registry = await this.registry();
    const id = matches[0]?.id ?? registry.activePetId ?? pets.find(pet => !pet.archived && !pet.error)?.id;
    if (id) await this.selectPet(id, now);
    return {
      petId: id ?? null,
      matched: !!matches.length,
      selectionRead: selectedHostId !== undefined,
      selectedHostId: selectedHostId ?? null,
      ...(pets.some(pet => pet.error)
        ? { errors: pets.filter(pet => pet.error).map(pet => ({ petId: pet.id, file: pet.file, error: pet.error })) }
        : {}),
    };
  }

  private validate(state: State, before?: State) {
    if (state.version !== 3 || state.host !== this.host || state.needsImport)
      throw new Error('Only an adopted v3 record may be written');
    const pet = state.pet;
    if (!pet) return;
    identifier(pet.id, 'petId');
    validateStage('egg', pet.state.stage);
    if (typeof pet.memory.text !== 'string' || !Number.isFinite(pet.memory.updatedAt))
      throw new Error('Invalid memory record');
    if (state.pending && state.pending.petId !== pet.id) throw new Error('Pending story belongs to another Pet');
    if (state.stories.some(story => story.petId !== pet.id) || state.art.some(art => art.petId !== pet.id))
      throw new Error('Pet records must not mix identities');
    const old = before?.pet;
    if (old?.id !== pet.id) return;
    if (old.binding) {
      const binding = pet.binding;
      if (!binding) throw new Error('An existing Pet retains its host binding');
      const cloudId =
        old.binding.cloudId ?? (old.binding.avatarId.startsWith('pet_') ? old.binding.avatarId : undefined);
      const stableLocalAlias =
        old.binding.avatarId.startsWith('custom:') &&
        binding.avatarId === old.binding.avatarId &&
        binding.destination === old.binding.destination;
      if (
        cloudId &&
        !stableLocalAlias &&
        ((binding.cloudId !== undefined && binding.cloudId !== cloudId) ||
          (binding.cloudId === undefined && binding.avatarId !== cloudId))
      )
        throw new Error('An existing Pet retains its cloud binding');
      if (old.binding.cloudId && !stableLocalAlias && binding.cloudId !== old.binding.cloudId)
        throw new Error('An existing Pet retains its cloud binding');
      if (stableLocalAlias && old.binding.cloudId && !binding.cloudId)
        throw new Error('An existing Pet retains its mapped cloud binding');
      if (
        binding.avatarId !== old.binding.avatarId &&
        !(
          old.binding.avatarId.startsWith('custom:') &&
          cloudId &&
          binding.avatarId === cloudId &&
          binding.cloudId === cloudId
        )
      )
        throw new Error('An existing Pet retains its Avatar binding');
      if (
        binding.host !== old.binding.host ||
        (old.binding.destination !== undefined && binding.destination !== old.binding.destination)
      )
        throw new Error('An existing Pet retains its host binding');
    }
    for (const field of ['genes', 'personality', 'acquisition', 'designReason'] as const) {
      const value = old.soul[field];
      if (value !== null && value !== undefined && !jsonEqual(value, pet.soul[field]))
        throw new Error(`An existing Pet retains its soul.${field}`);
    }
    validateStage(old.state.stage, pet.state.stage);
    if (
      !jsonEqual(old.memory, pet.memory) &&
      !state.stories.some(
        story => story.id === pet.memory.storyId && !before!.stories.some(previous => previous.id === story.id),
      )
    )
      throw new Error('Memory is written only by a completed story');
  }
  private async validateBindingUniqueness(state: State, registry: Registry) {
    const pet = state.pet;
    if (!pet?.binding) return;
    const aliases = [
      text(pet.binding.avatarId, 'Avatar ID'),
      ...(pet.binding.cloudId ? [text(pet.binding.cloudId, 'cloud ID')] : []),
    ];
    const ids = new Set([...registry.pets.map(peer => peer.id), ...(await this.canonicalIds())]);
    for (const id of ids) {
      if (id === pet.id || registry.pets.find(peer => peer.id === id)?.archived) continue;
      const saved = await readJson(path.join(this.petDirectory(id), 'state.json'));
      const binding = saved?.pet?.binding;
      if (binding && [binding.avatarId, binding.cloudId].some(alias => alias && aliases.includes(alias)))
        throw new Error(`Host binding is already assigned to Pet ${id}`);
    }
  }
  private async persist(state: State, registry: Registry, before?: State, now = Date.now()) {
    this.validate(state, before);
    const id = state.pet?.id;
    if (!id) {
      await atomicJson(path.join(this.root, 'current.json'), state);
      return;
    }
    ensureGrowthClock(state);
    const entry = registry.pets.find(pet => pet.id === id);
    if (!entry) this.activate(registry, id, now);
    else if (before?.pet && before.pet.id !== id) this.activate(registry, id, now);
    if (state.replacesPetId && state.replacesPetId !== id) {
      const replaced = registry.pets.find(pet => pet.id === state.replacesPetId);
      if (replaced) replaced.archived ??= { at: now, replacesPetId: id };
    }
    if (!before?.pet || !jsonEqual(before.pet.binding, state.pet?.binding))
      await this.validateBindingUniqueness(state, registry);
    const record = structuredClone(state);
    delete record.needsImport;
    delete record.legacyFile;
    for (const owner of [...record.stories, ...(record.pending ? [record.pending] : [])]) {
      if (owner.steps === undefined) continue;
      const steps = owner.steps;
      const previous =
        before?.pending?.id === owner.id ? before.pending : before?.stories.find(story => story.id === owner.id);
      const committed = previous?.steps ?? [];
      if (steps.length < committed.length || committed.some((step, index) => !jsonEqual(step, steps[index])))
        throw new Error('Committed generation units are append-only');
      if (previous?.stepsCount === steps.length && jsonEqual(committed, steps)) {
        owner.stepsCount = steps.length;
        delete owner.steps;
        continue;
      }
      const file = path.join(this.petDirectory(id), 'stories', `${key(owner.id)}.json`);
      const existing = await readJson(file);
      const uncommittedAttempts = existing?.uncommittedAttempts ?? [];
      if (existing?.steps?.length > committed.length && !jsonEqual(existing.steps, steps))
        uncommittedAttempts.push({ at: now, steps: existing.steps.slice(committed.length) });
      await atomicJson(file, {
        version: 1,
        petId: id,
        storyId: owner.id,
        steps,
        ...(uncommittedAttempts.length ? { uncommittedAttempts } : {}),
      });
      owner.stepsCount = steps.length;
      delete owner.steps;
    }
    // Unit files are written first. Their committed prefix is published only by this atomic state write.
    await atomicJson(path.join(this.petDirectory(id), 'state.json'), record);
    await atomicJson(this.registryFile, registry);
    this.selectedId = id;
    if (this.pinnedId !== undefined) this.pinnedId = id;
  }
  /** One host lock serializes Pet writes and selection, while failed callbacks publish nothing. */
  async transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
    return this.locked(async () => {
      const state = await this.peek();
      if (state.needsImport) throw new Error('The legacy Pet needs explicit import before it can be changed');
      const before = structuredClone(state),
        registry = await this.registry();
      if (state.pet && registry.pets.find(pet => pet.id === state.pet!.id)?.archived)
        throw new Error('An archived Pet is read-only until explicitly restored');
      const result = await fn(state);
      if (before.handoff?.status === 'exported') {
        const frozen: (keyof State)[] = [
          'pet',
          'stories',
          'art',
          'items',
          'pending',
          'chats',
          'growthClock',
          'schedule',
          'handoff',
          'legacy',
          'replacesPetId',
        ];
        if (frozen.some(field => !jsonEqual(before[field], state[field])))
          throw new Error('The exported Pet record is read-only until its main environment is transferred back');
      }
      await this.persist(state, registry, before);
      return result;
    });
  }
  /** Confirmed new adoption can keep all historical files separate without first importing them. */
  async createPet(options: { confirmed: boolean; replace?: boolean; name?: string }, now = Date.now()): Promise<State> {
    if (!options.confirmed) throw new Error('New adoption requires explicit user confirmation');
    return this.locked(async () => {
      const before = await this.peek(),
        registry = await this.registry();
      if (options.replace && before.handoff?.status === 'exported')
        throw new Error('Transfer the Pet back to this environment before replacing its bound resource');
      if (before.pending?.mode === 'story')
        throw new Error('Finish or cancel the existing story before adopting another Pet');
      const state = { ...fresh(this.host), pet: newIdentity(options.name, now) };
      if (options.replace && before.pet) {
        const backup = path.join(this.root, 'backups', `replaced-${before.pet.id}-${now}.json`);
        await atomicJson(backup, before);
        if (before.pet.binding) state.pet.binding = structuredClone(before.pet.binding);
        state.replacesPetId = before.pet.id;
        if (before.schedule) state.schedule = structuredClone(before.schedule);
      }
      await this.persist(state, registry, undefined, now);
      return this.readPet(state.pet.id, registry);
    });
  }
  async importRecord(file: string, options: ImportOptions, now = Date.now()): Promise<State> {
    if (!options.confirmed) throw new Error('Import requires explicit user confirmation');
    if (!path.isAbsolute(file)) throw new Error('Legacy file must be absolute');
    return this.locked(async () => {
      const source = await readJson(file);
      if (!source?.pet?.id) throw new Error('No Pet to import');
      const id = identifier(source.pet.id, 'petId'),
        registry = await this.registry();
      const existing = await this.readPet(id, registry, true);
      if (existing.pet) {
        this.activate(registry, id, now);
        await atomicJson(this.registryFile, registry);
        this.selectedId = id;
        if (this.pinnedId !== undefined) this.pinnedId = id;
        return this.readPet(id, registry);
      }
      const state = await prepareImport(this, file, options, now);
      await this.persist(state, registry, undefined, now);
      return this.readPet(id, registry);
    });
  }

  /** The Agent supplies a source-backed upgrade summary or missing voice once, without a growth experience. */
  async supplementLegacy(
    options: { confirmed: boolean; memory?: string; personality?: string; designReason?: string; voice?: string },
    now = Date.now(),
  ): Promise<State> {
    if (!options.confirmed) throw new Error('Legacy supplementation requires explicit user confirmation');
    return this.locked(async () => {
      const state = await this.peek(),
        registry = await this.registry();
      if (!state.pet || !state.legacy || state.needsImport)
        throw new Error('Import the legacy Pet before filling its missing records');
      if (state.handoff?.status === 'exported')
        throw new Error('The exported Pet record is read-only until its main environment is transferred back');
      if (state.pending) throw new Error('Finish the pending story before supplementing its records');
      let changed = false;
      for (const field of ['personality', 'designReason'] as const) {
        if (options[field] === undefined) continue;
        const value = text(options[field], field),
          current = state.pet.soul[field];
        if (current !== undefined && current !== value) throw new Error(`An existing Pet retains its soul.${field}`);
        if (current === undefined) {
          state.pet.soul[field] = value;
          changed = true;
        }
      }
      if (options.voice !== undefined) {
        if (state.legacy.sourceVersion === 3)
          throw new Error('Speaking habits are supplemented only for imported legacy Pets');
        const voice = text(options.voice, 'voice');
        const previous = state.legacy.voiceSupplement;
        if (previous && previous.text !== voice) throw new Error('Legacy speaking habits are supplemented only once');
        if (!previous) {
          if (!state.pet.soul.personality)
            throw new Error('Fill the legacy personality before adding its missing speaking habits');
          state.pet.soul.personality += `\n\nSpeaking habits:\n${voice}`;
          state.legacy.voiceSupplement = { text: voice, at: now };
          changed = true;
        }
      }
      if (options.memory !== undefined) {
        const value = text(options.memory, 'memory');
        if (state.pet.memory.text && state.pet.memory.text !== value)
          throw new Error('Legacy memory is supplemented only once');
        if (!state.pet.memory.text) {
          if (state.legacy.memorySupplementedAt !== undefined)
            throw new Error('Legacy memory was already supplemented');
          state.pet.memory = { text: value, updatedAt: now, storyId: 'legacy' };
          state.legacy.memorySupplementedAt = now;
          changed = true;
        }
      }
      if (changed) {
        state.pet.revision++;
        await this.persist(state, registry, undefined, now);
      }
      return state;
    });
  }
}

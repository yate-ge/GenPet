/**
 * Debugger inventory: every Pet this machine knows, whether it is a GenPet and whether its full GenPet
 * record lives here. Read-only. Cloud names are not cached locally; they come from a saved host
 * `list_pets` result when the Agent provides one.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { codexHome } from './config.js';
import type { Host } from './model.js';
import { Store, type StoredPet } from './store.js';
import { isCloudId, readCloudPetIds, readMigrationMap, type MigrationMap } from './hosts/desktop/mapping.js';
import { listPets } from './hosts/desktop/switch.js';

interface HostPet {
  id: string;
  name?: string;
  description?: string;
}

export interface InventoryRow {
  id: string;
  name: string | null;
  /** builtin, local (~/.codex/pets), cloud-cache (host artwork cache), host-list (saved list_pets), record */
  sources: string[];
  localId?: string;
  /** null: nothing on this machine shows whether it is a GenPet. */
  genpet: boolean | null;
  /** A full GenPet record for it lives in this machine's data directory. */
  hostedHere: boolean;
  evidence: string[];
  records: { host: Host; petId: string; name: string; stage?: string; archived: boolean; error?: string }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const hostPetsFile = (base: string) => path.join(base, 'debugger', 'host-pets.json');

/** Save the Agent's `list_pets` result for the debugger. Any wrapping is accepted: each object with an `id` is a Pet. */
export async function saveHostPets(base: string, file: string) {
  if (!path.isAbsolute(file ?? '')) throw new Error('--host-pets requires an absolute JSON file');
  const pets = new Map<string, HostPet>();
  const collect = (value: unknown, depth: number): void => {
    if (depth > 6) return;
    if (Array.isArray(value)) return value.forEach(item => collect(item, depth + 1));
    if (!isRecord(value)) return;
    if (typeof value.id === 'string' && value.id)
      return void pets.set(value.id, {
        id: value.id,
        ...(typeof value.name === 'string' ? { name: value.name } : {}),
        ...(typeof value.description === 'string' ? { description: value.description } : {}),
      });
    for (const item of Object.values(value)) collect(item, depth + 1);
  };
  collect(JSON.parse(await readFile(file, 'utf8')), 0);
  if (!pets.size) throw new Error('No pets with an id were found in the host list');
  const target = hostPetsFile(base),
    tmp = `${target}.${randomUUID()}`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(tmp, JSON.stringify({ savedAt: new Date().toISOString(), pets: [...pets.values()] }, null, 2));
  await rename(tmp, target);
  return { file: target, pets: pets.size };
}

/** The host entry a record is bound to, using the same local-to-cloud mapping as appearance updates. */
function hostIdFor(host: Host, pet: StoredPet, migration: MigrationMap) {
  const binding = pet.binding,
    cloudId = [binding?.avatarId, binding?.cloudId].find(isCloudId);
  if (cloudId) return cloudId;
  const localId = binding?.avatarId.startsWith('custom:')
    ? binding.avatarId
    : binding?.destination
      ? `custom:${path.basename(binding.destination)}`
      : !binding && host === 'desktop'
        ? `custom:${pet.id}`
        : null;
  return localId && ((migration.available && migration.mappings[localId]) || localId);
}

/** GenPet IDs are `genpet-<uuid>`; host names start with the same prefix until the Pet is named. */
function hostEvidence(pet: HostPet) {
  const found: string[] = [];
  if (pet.name?.startsWith('genpet-')) found.push(`宿主名称 ${pet.name}`);
  try {
    const brief = JSON.parse(pet.description ?? '');
    if (typeof brief?.id === 'string' && brief.id.startsWith('genpet-')) found.push(`宿主描述 id=${brief.id}`);
  } catch {
    // A plain-text description carries no GenPet identity.
  }
  return found;
}

export async function readInventory(base: string, home = codexHome()) {
  const rows = new Map<string, InventoryRow>();
  const at = (id: string) => {
    let row = rows.get(id);
    if (!row)
      rows.set(id, (row = { id, name: null, sources: [], genpet: null, hostedHere: false, evidence: [], records: [] }));
    return row;
  };
  const errors: string[] = [];
  const [catalog, cloud, migration, saved] = await Promise.all([
    listPets(home),
    readCloudPetIds(home),
    readMigrationMap(home),
    readFile(hostPetsFile(base), 'utf8').then(
      text => JSON.parse(text) as { savedAt: string; pets: HostPet[] },
      error => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push('宿主列表快照无法读取');
        return null;
      },
    ),
  ]);
  errors.push(...(catalog.errors ?? []));
  for (const pet of catalog.pets) {
    const row = at(pet.id);
    row.name = pet.displayName;
    row.sources.push(pet.source === 'builtin' ? 'builtin' : 'local');
    if (pet.localId) row.localId = pet.localId;
    if (pet.source === 'builtin') row.genpet = false;
    if (pet.genpetId) row.evidence.push(`本地清单 genpetId=${pet.genpetId}`);
  }
  for (const id of cloud.ids) at(id).sources.push('cloud-cache');
  for (const pet of saved?.pets ?? []) {
    const row = at(pet.id);
    row.sources.push('host-list');
    row.name = pet.name ?? row.name;
    row.evidence.push(...hostEvidence(pet));
  }
  for (const pet of catalog.pets)
    if (pet.source !== 'builtin' && pet.displayName.startsWith('genpet-'))
      at(pet.id).evidence.push(`本地名称 ${pet.displayName}`);
  for (const host of ['desktop', 'cloud'] as const) {
    let pets: StoredPet[];
    try {
      pets = await new Store(base, host).listPets();
    } catch (error) {
      errors.push(`${host} 记录：${(error as Error).message}`);
      continue;
    }
    for (const pet of pets) {
      const row = at(hostIdFor(host, pet, migration) ?? `${host}:${pet.id}`);
      row.sources.push('record');
      row.records.push({
        host,
        petId: pet.id,
        name: pet.name,
        ...(pet.stage ? { stage: pet.stage } : {}),
        archived: pet.archived,
        ...(pet.error ? { error: pet.error } : {}),
      });
    }
  }
  for (const row of rows.values()) {
    row.sources = [...new Set(row.sources)];
    row.hostedHere = row.records.length > 0;
    if (row.hostedHere || row.evidence.length) row.genpet = true;
    else if (row.genpet === null && row.name !== null) row.genpet = false;
  }
  const rank = (row: InventoryRow) => (row.hostedHere ? 0 : row.genpet ? 1 : row.genpet === null ? 2 : 3);
  return {
    codexHome: home,
    dataDirectory: base,
    cloudCache: cloud.available ? { pets: cloud.ids.length } : { error: cloud.reason },
    migration: migration.available ? { mapped: Object.keys(migration.mappings).length } : { error: migration.reason },
    hostList: saved ? { savedAt: saved.savedAt, pets: saved.pets.length } : null,
    pets: [...rows.values()].sort((a, b) => rank(a) - rank(b) || (a.name ?? a.id).localeCompare(b.name ?? b.id)),
    ...(errors.length ? { errors } : {}),
  };
}

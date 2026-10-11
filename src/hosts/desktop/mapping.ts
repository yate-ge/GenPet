/** Read only the host's Pet migration state; never infer a cloud target from stale plugin records. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { codexHome } from '../../config.js';

export interface MigrationMap {
  available: boolean;
  mappings: Record<string, string>;
  pending: string[];
  reason?: string;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const isCloudId = (value: unknown): value is string =>
  typeof value === 'string' && /^pet_[a-zA-Z0-9_-]+$/.test(value);

/** Keys verified in desktop 26.1007.2314.0. Account scopes are never merged. */
export async function readMigrationMap(home = codexHome()): Promise<MigrationMap> {
  try {
    const state: unknown = JSON.parse(await readFile(path.join(home, '.codex-global-state.json'), 'utf8'));
    if (!record(state)) throw new Error('Invalid host Pet state');
    const atoms = state['electron-persisted-atom-state'] ?? {};
    if (!record(atoms)) throw new Error('Invalid host Pet state');
    const migrations = atoms['migrated-cloud-pet-ids-v1'] ?? {};
    const pending = atoms['pending-cloud-pet-migrations-v1'] ?? {};
    if (!record(migrations) || !record(pending)) throw new Error('Invalid host Pet migration map');
    const cache = atoms['cloud-pet-artwork-cache'];
    const accountKey =
      record(cache) &&
      typeof cache.accountId === 'string' &&
      cache.accountId.trim() &&
      typeof cache.userId === 'string' &&
      cache.userId.trim()
        ? JSON.stringify([cache.accountId, cache.userId])
        : undefined;
    const scopes = [...new Set([...Object.keys(migrations), ...Object.keys(pending)])];
    if (accountKey === undefined && scopes.length > 0)
      return { available: false, mappings: {}, pending: [], reason: 'Current Pet account scope is unknown' };
    const scope = accountKey;
    const mappings = scope ? (migrations[scope] ?? {}) : {};
    const unfinished = scope ? (pending[scope] ?? {}) : {};
    if (!record(mappings) || !record(unfinished)) throw new Error('Invalid host Pet migration scope');
    const result: Record<string, string> = {};
    for (const [localId, cloudId] of Object.entries(mappings)) {
      if (!localId.startsWith('custom:') || !isCloudId(cloudId)) throw new Error('Invalid host Pet migration target');
      result[localId] = cloudId;
    }
    return {
      available: true,
      mappings: result,
      pending: Object.keys(unfinished).filter(id => id.startsWith('custom:')),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      available: false,
      mappings: {},
      pending: [],
      reason:
        code === 'ENOENT'
          ? 'Host Pet migration state is unavailable'
          : 'Host Pet migration state cannot be read safely',
    };
  }
}

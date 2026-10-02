import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { parse } from 'smol-toml';

export interface NativePetEntry {
  id: string;
  displayName: string;
  source: 'builtin' | 'local';
}

export interface NativePetSelection {
  selectedPetId: string | null;
  genpetSelected: boolean | null;
  source: 'config' | 'legacy' | 'default' | 'unavailable' | 'app-tools';
  /** True confirms the running host's setting, not an independently observed image. */
  liveVerified: boolean;
}

export interface NativePetCatalog {
  pets: NativePetEntry[];
  selection: NativePetSelection;
  activation: { immediate: boolean; reason: string };
  errors?: string[];
}

// Static catalog verified in Codex 26.924.2738.0. This is not a live host query
// and does not include account-specific cloud pets.
export const BUILTIN_PET_CATALOG: ReadonlyArray<Readonly<NativePetEntry>> = [
  { id: 'codex', displayName: 'Codex', source: 'builtin' },
  { id: 'dewey', displayName: 'Dewey', source: 'builtin' },
  { id: 'fireball', displayName: 'Fireball', source: 'builtin' },
  { id: 'hoots', displayName: 'Hoots', source: 'builtin' },
  { id: 'rocky', displayName: 'Rocky', source: 'builtin' },
  { id: 'seedy', displayName: 'Seedy', source: 'builtin' },
  { id: 'stacky', displayName: 'Stacky', source: 'builtin' },
  { id: 'bsod', displayName: 'BSOD', source: 'builtin' },
  { id: 'null-signal', displayName: 'Null Signal', source: 'builtin' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selection(value: string | null, source: NativePetSelection['source']): NativePetSelection {
  return {
    selectedPetId: value,
    genpetSelected: source === 'unavailable' ? null : value === 'custom:genpet-companion',
    source,
    liveVerified: false,
  };
}

async function optionalText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function readSelection(home: string, errors: string[]): Promise<NativePetSelection> {
  let config: string | undefined;
  try {
    config = await optionalText(path.join(home, 'config.toml'));
  } catch {
    errors.push('config.toml: 无法读取选择设置');
    return selection(null, 'unavailable');
  }
  if (config !== undefined) {
    let parsed: Record<string, unknown>;
    try {
      parsed = parse(config, { integersAsBigInt: true });
    } catch {
      errors.push('config.toml: TOML 格式无效，无法确定选择设置');
      return selection(null, 'unavailable');
    }
    const desktop = parsed.desktop;
    if (desktop !== undefined && !isRecord(desktop)) {
      errors.push('config.toml: desktop 必须是表');
      return selection(null, 'unavailable');
    }
    if (isRecord(desktop) && Object.hasOwn(desktop, 'selected-avatar-id')) {
      const value = desktop['selected-avatar-id'];
      if (typeof value !== 'string') {
        errors.push('config.toml: selected-avatar-id 必须是字符串');
        return selection(null, 'unavailable');
      }
      // Preserve unknown IDs, including cloud pet IDs. A stored value is not
      // evidence that the running desktop has activated it.
      return selection(value, 'config');
    }
  }

  let legacy: string | undefined;
  try {
    legacy = await optionalText(path.join(home, '.codex-global-state.json'));
  } catch {
    errors.push('.codex-global-state.json: 无法读取旧选择设置');
    return selection(null, 'unavailable');
  }
  if (legacy !== undefined) {
    try {
      const state: unknown = JSON.parse(legacy);
      if (!isRecord(state)) throw new Error('Invalid state');
      const atoms = state['electron-persisted-atom-state'];
      if (atoms !== undefined && !isRecord(atoms)) throw new Error('Invalid atoms');
      if (isRecord(atoms) && Object.hasOwn(atoms, 'selected-avatar-id')) {
        const value = atoms['selected-avatar-id'];
        if (value !== null && typeof value !== 'string') throw new Error('Invalid selection');
        return selection(value, 'legacy');
      }
    } catch {
      errors.push('.codex-global-state.json: 旧选择设置格式无效');
      return selection(null, 'unavailable');
    }
  }
  // The host resolves an absent selection to Codex. This remains a disk-based
  // inference, not confirmation of the live renderer's selection.
  return selection('codex', 'default');
}

async function localPets(home: string, errors: string[]): Promise<NativePetEntry[]> {
  const pets = new Map<string, NativePetEntry>();
  for (const [directory, filename] of [
    ['avatars', 'avatar.json'],
    ['pets', 'pet.json'],
  ]) {
    let entries;
    try {
      entries = await readdir(path.join(home, directory), { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(`${directory}: 无法读取宠物目录`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const label = `${directory}/${entry.name}/${filename}`;
      try {
        const text = await optionalText(path.join(home, directory, entry.name, filename));
        if (text === undefined) continue;
        const manifest: unknown = JSON.parse(text);
        if (!isRecord(manifest)) throw new Error('Invalid manifest');
        for (const key of ['id', 'displayName']) {
          if (manifest[key] !== undefined && (typeof manifest[key] !== 'string' || !(manifest[key] as string).trim()))
            throw new Error('Invalid name');
        }
        const id = `custom:${entry.name}`;
        const displayName = ((manifest.displayName ?? manifest.id ?? entry.name) as string).trim();
        pets.set(id, { id, displayName, source: 'local' });
      } catch {
        errors.push(`${label}: 无法读取有效宠物清单`);
      }
    }
  }
  return [...pets.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Read manifests and persisted selection only; never load artwork or alter the host. */
export async function getNativePetCatalog(
  home = process.env.CODEX_HOME || path.join(homedir(), '.codex'),
): Promise<NativePetCatalog> {
  const errors: string[] = [];
  const selected = await readSelection(home, errors);
  const local = await localPets(home, errors);
  return {
    pets: [...BUILTIN_PET_CATALOG.map(pet => ({ ...pet })), ...local],
    selection: selected,
    activation: { immediate: false, reason: '当前为磁盘快照；即时切换需要可用的 Codex app-tools 会话通道。' },
    ...(errors.length ? { errors } : {}),
  };
}

/**
 * List and switch the ordinary desktop Pet. Switching uses the running app's own app-tools channel,
 * so the choice applies immediately; config files are never edited.
 */
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { codexHome } from '../../config.js';
import { encodeFrame, readFrames } from './frames.js';

export interface PetEntry {
  id: string;
  displayName: string;
  source: 'builtin' | 'local';
}

// Static catalog verified in Codex 26.924.2738.0; it does not include account-specific cloud pets.
const BUILTIN_PETS: PetEntry[] = [
  ['codex', 'Codex'],
  ['dewey', 'Dewey'],
  ['fireball', 'Fireball'],
  ['hoots', 'Hoots'],
  ['rocky', 'Rocky'],
  ['seedy', 'Seedy'],
  ['stacky', 'Stacky'],
  ['bsod', 'BSOD'],
  ['null-signal', 'Null Signal'],
].map(([id, displayName]) => ({ id, displayName, source: 'builtin' }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Builtin pets plus local manifests; one broken manifest is reported without hiding the rest. */
export async function listPets(home = codexHome()): Promise<{ pets: PetEntry[]; errors?: string[] }> {
  const errors: string[] = [];
  const local = new Map<string, PetEntry>();
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
      let text: string;
      try {
        text = await readFile(path.join(home, directory, entry.name, filename), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        errors.push(`${directory}/${entry.name}/${filename}: 无法读取有效宠物清单`);
        continue;
      }
      try {
        const manifest: unknown = JSON.parse(text);
        if (!isRecord(manifest)) throw new Error('Invalid manifest');
        for (const key of ['id', 'displayName'])
          if (manifest[key] !== undefined && (typeof manifest[key] !== 'string' || !(manifest[key] as string).trim()))
            throw new Error('Invalid name');
        const id = `custom:${entry.name}`;
        const displayName = ((manifest.displayName ?? manifest.id ?? entry.name) as string).trim();
        local.set(id, { id, displayName, source: 'local' });
      } catch {
        errors.push(`${directory}/${entry.name}/${filename}: 无法读取有效宠物清单`);
      }
    }
  }
  const sorted = [...local.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { pets: [...BUILTIN_PETS.map(pet => ({ ...pet })), ...sorted], ...(errors.length ? { errors } : {}) };
}

export interface AppToolsOptions {
  /** Explicit null disables the environment fallback, for isolated tests. */
  pipePath?: string | null;
  threadId?: string | null;
  timeoutMs?: number;
}

interface Selection {
  selectedPetId: string | null;
  effectiveSelectedPetId: string | null;
}

export type SelectionRead = ({ available: true } & Selection) | { available: false; reason: string };

/** The running host's selection; unavailable outside a Codex desktop session. */
export async function readSelectedPet(options: AppToolsOptions = {}): Promise<SelectionRead> {
  try {
    return { available: true, ...(await callSettings(options)) };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : 'Live Codex pet selection is unavailable.',
    };
  }
}

/** Write the selection through the host, then read it back. Never falls back to a disk write. */
export async function selectPet(petId: string, options: AppToolsOptions = {}) {
  if (
    typeof petId !== 'string' ||
    petId.trim() !== petId ||
    petId.length === 0 ||
    petId.length > 512 ||
    /[\x00-\x1f\x7f]/.test(petId)
  )
    throw new Error('A valid pet ID is required.');
  await callSettings(options, petId);
  const result = await callSettings(options);
  if (result.selectedPetId !== petId || result.effectiveSelectedPetId !== petId)
    throw new Error('The live Codex selection did not match the requested pet; its current selection is unconfirmed.');
  return {
    ...result,
    immediate: true as const,
    restartRequired: false as const,
    hostStateConfirmed: true as const,
    visualVerified: false as const,
  };
}

const SWITCH_USAGE = 'Usage: switch-pet [PET_ID|--current|--list|--help]';

/** CLI entry for /genpet-switch. */
export async function switchPet(args: string[]) {
  if (args.length > 1) throw new Error(SWITCH_USAGE);
  const target = args[0] ?? '--current';
  if (target === '--help')
    return { usage: SWITCH_USAGE, examples: ['switch-pet --list', 'switch-pet --current', 'switch-pet dewey'] };
  if (target === '--current') {
    const current = await readSelectedPet();
    if (!current.available) throw new Error(current.reason);
    return current;
  }
  if (target.startsWith('-') && target !== '--list') throw new Error(SWITCH_USAGE);
  const catalog = await listPets();
  if (target === '--list') return catalog;
  if (!catalog.pets.some(pet => pet.id === target))
    throw new Error(`Unknown pet ID: ${target}. Use switch-pet --list.`);
  return selectPet(target);
}

const SELECTED_KEY = 'selected-avatar-id';

function appToolsConnection(options: AppToolsOptions) {
  const pick = (key: 'pipePath' | 'threadId', env: string | undefined) =>
    (Object.hasOwn(options, key) ? options[key] : env)?.trim();
  const pipePath = pick('pipePath', process.env.CODEX_APP_TOOLS_PIPE_PATH);
  const threadId = pick('threadId', process.env.CODEX_THREAD_ID);
  if (!pipePath || !threadId) throw new Error('The current Codex app tools pipe and thread ID are unavailable.');
  if (process.platform === 'win32' && !pipePath.startsWith('\\\\.\\pipe\\'))
    throw new Error('Expected a local Windows named pipe for Codex app tools.');
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('The Codex app tools timeout must be positive.');
  return { pipePath, threadId, timeoutMs };
}

function projectSelection(value: unknown): Selection {
  if (!isRecord(value) || !isRecord(value.settings) || !isRecord(value.effectiveSettings))
    throw new Error('Codex returned an invalid settings response.');
  const selectedPetId = value.settings[SELECTED_KEY] ?? null;
  const effectiveSelectedPetId = value.effectiveSettings[SELECTED_KEY] ?? null;
  if (
    (selectedPetId !== null && typeof selectedPetId !== 'string') ||
    (effectiveSelectedPetId !== null && typeof effectiveSelectedPetId !== 'string')
  )
    throw new Error('Codex returned an invalid pet selection.');
  return { selectedPetId, effectiveSelectedPetId };
}

/** One app-tools call: read_settings, or write_settings for the single pet field. */
async function callSettings(options: AppToolsOptions, petId?: string): Promise<Selection> {
  const { pipePath, threadId, timeoutMs } = appToolsConnection(options);
  const id = 1;
  const request = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      namespace: 'codex_app',
      tool: petId === undefined ? 'read_settings' : 'write_settings',
      arguments: petId === undefined ? { include_config: false } : { settings: { [SELECTED_KEY]: petId } },
      callerSource: 'codex',
      threadId,
      callId: `mcp-call-${randomUUID()}`,
      // These fallbacks follow the bundled app-tools MCP's request metadata.
      turnId: `mcp-turn-${randomUUID()}`,
    },
  };
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(pipePath);
    let settled = false;
    let sent = false;
    const finish = (error?: Error, result?: Selection, cancel = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancel && sent && !socket.destroyed) {
        socket.end(encodeFrame({ jsonrpc: '2.0', id, method: 'tools/cancel' }));
        socket.destroySoon();
      } else socket.destroy();
      if (error) reject(error);
      else resolve(result!);
    };
    const timer = setTimeout(
      () => finish(new Error('Codex app tools timed out; the current selection is unconfirmed.'), undefined, true),
      timeoutMs,
    );
    socket.once('connect', () => {
      sent = true;
      socket.write(encodeFrame(request));
    });
    socket.on('error', error =>
      finish(
        new Error(`Codex app tools connection failed (${(error as NodeJS.ErrnoException).code ?? 'socket error'}).`),
      ),
    );
    socket.on('close', () => finish(new Error('Codex app tools closed before confirming the pet selection.')));
    socket.on(
      'data',
      readFrames(
        8 * 1024 * 1024,
        response => {
          if (settled || !isRecord(response) || response.id !== id) return;
          if (response.error !== undefined) return finish(new Error('Codex rejected the app tool request.'));
          const result = response.result;
          if (!isRecord(result) || result.success !== true || !Array.isArray(result.contentItems))
            return finish(new Error('Codex could not complete the pet settings request.'));
          const item = result.contentItems.find(item => isRecord(item) && item.type === 'inputText');
          if (!isRecord(item) || typeof item.text !== 'string')
            return finish(new Error('Codex returned no pet settings result.'));
          try {
            finish(undefined, projectSelection(JSON.parse(item.text)));
          } catch {
            finish(new Error('Codex returned an invalid pet settings result.'));
          }
        },
        problem =>
          finish(
            new Error(
              problem === 'too-large'
                ? 'Codex app tools response exceeded the size limit.'
                : 'Codex app tools returned invalid JSON.',
            ),
          ),
      ),
    );
  });
}

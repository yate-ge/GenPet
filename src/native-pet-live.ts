import { randomUUID } from 'node:crypto';
import net from 'node:net';

export interface NativePetLiveOptions {
  /** Explicit null disables environment fallback, useful for isolated tests. */
  pipePath?: string | null;
  threadId?: string | null;
  timeoutMs?: number;
}

interface PetSelection {
  selectedPetId: string | null;
  effectiveSelectedPetId: string | null;
}

export type NativePetLiveRead = ({ available: true } & PetSelection) | { available: false; reason: string };

export interface NativePetLiveSelection extends PetSelection {
  immediate: true;
  restartRequired: false;
  hostStateConfirmed: true;
  visualVerified: false;
}

const maxFrameBytes = 8 * 1024 * 1024;
const selectedKey = 'selected-avatar-id';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function connection(options: NativePetLiveOptions) {
  const pipePath = (
    Object.hasOwn(options, 'pipePath') ? options.pipePath : process.env.CODEX_APP_TOOLS_PIPE_PATH
  )?.trim();
  const threadId = (Object.hasOwn(options, 'threadId') ? options.threadId : process.env.CODEX_THREAD_ID)?.trim();
  if (!pipePath || !threadId) throw new Error('The current Codex app tools pipe and thread ID are unavailable.');
  if (process.platform === 'win32' && !pipePath.startsWith('\\\\.\\pipe\\')) {
    throw new Error('Expected a local Windows named pipe for Codex app tools.');
  }
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('The Codex app tools timeout must be positive.');
  return { pipePath, threadId, timeoutMs };
}

function frame(message: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}

function projectSelection(value: unknown): PetSelection {
  if (!record(value) || !record(value.settings) || !record(value.effectiveSettings)) {
    throw new Error('Codex returned an invalid settings response.');
  }
  const selectedPetId = value.settings[selectedKey] ?? null;
  const effectiveSelectedPetId = value.effectiveSettings[selectedKey] ?? null;
  if (
    (selectedPetId !== null && typeof selectedPetId !== 'string') ||
    (effectiveSelectedPetId !== null && typeof effectiveSelectedPetId !== 'string')
  ) {
    throw new Error('Codex returned an invalid pet selection.');
  }
  return { selectedPetId, effectiveSelectedPetId };
}

/** Only the two settings operations and one pet field can cross this bridge. */
async function requestSelection(options: NativePetLiveOptions, petId?: string): Promise<PetSelection> {
  const { pipePath, threadId, timeoutMs } = connection(options);
  const id = 1;
  const request = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      namespace: 'codex_app',
      tool: petId === undefined ? 'read_settings' : 'write_settings',
      arguments: petId === undefined ? { include_config: false } : { settings: { [selectedKey]: petId } },
      callerSource: 'codex',
      threadId,
      callId: `mcp-call-${randomUUID()}`,
      // These fallbacks follow the bundled app-tools MCP's request metadata.
      turnId: `mcp-turn-${randomUUID()}`,
    },
  };
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(pipePath);
    let pending = Buffer.alloc(0);
    let settled = false;
    let sent = false;
    const finish = (error?: Error, result?: PetSelection, cancel = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancel && sent && !socket.destroyed) {
        socket.end(frame({ jsonrpc: '2.0', id, method: 'tools/cancel' }));
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
      socket.write(frame(request));
    });
    socket.on('error', error =>
      finish(
        new Error(`Codex app tools connection failed (${(error as NodeJS.ErrnoException).code ?? 'socket error'}).`),
      ),
    );
    socket.on('close', () => finish(new Error('Codex app tools closed before confirming the pet selection.')));
    socket.on('data', bytes => {
      if (settled) return;
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= 4) {
        const length = pending.readUInt32LE(0);
        if (length > maxFrameBytes) return finish(new Error('Codex app tools response exceeded the size limit.'));
        if (pending.length < length + 4) return;
        let response: unknown;
        try {
          response = JSON.parse(pending.subarray(4, length + 4).toString('utf8'));
        } catch {
          return finish(new Error('Codex app tools returned invalid JSON.'));
        }
        pending = pending.subarray(length + 4);
        if (!record(response) || response.id !== id) continue;
        if (response.error !== undefined) return finish(new Error('Codex rejected the app tool request.'));
        const result = response.result;
        if (!record(result) || result.success !== true || !Array.isArray(result.contentItems)) {
          return finish(new Error('Codex could not complete the pet settings request.'));
        }
        const item = result.contentItems.find(item => record(item) && item.type === 'inputText');
        if (!record(item) || typeof item.text !== 'string')
          return finish(new Error('Codex returned no pet settings result.'));
        try {
          finish(undefined, projectSelection(JSON.parse(item.text)));
        } catch {
          finish(new Error('Codex returned an invalid pet settings result.'));
        }
      }
    });
  });
}

/** Read the running host's selection, returning no unrelated app settings. */
export async function readNativePetLive(options: NativePetLiveOptions = {}): Promise<NativePetLiveRead> {
  try {
    return { available: true, ...(await requestSelection(options)) };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : 'Live Codex pet selection is unavailable.',
    };
  }
}

/** The host persists this choice and notifies its windows; no restart is used. */
export async function selectNativePetLive(
  petId: string,
  options: NativePetLiveOptions = {},
): Promise<NativePetLiveSelection> {
  if (
    typeof petId !== 'string' ||
    petId.trim() !== petId ||
    petId.length === 0 ||
    petId.length > 512 ||
    /[\x00-\x1f\x7f]/.test(petId)
  ) {
    throw new Error('A valid pet ID is required.');
  }
  await requestSelection(options, petId);
  // Never fall back to a disk write: an earlier request may already have applied.
  const result = await requestSelection(options);
  if (result.selectedPetId !== petId || result.effectiveSelectedPetId !== petId) {
    throw new Error('The live Codex selection did not match the requested pet; its current selection is unconfirmed.');
  }
  return { ...result, immediate: true, restartRequired: false, hostStateConfirmed: true, visualVerified: false };
}

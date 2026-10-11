/** Ask the running desktop app to reload custom Pets through its existing IPC router. */
import net from 'node:net';
import { lstat, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { codexHome } from '../../config.js';
import { encodeFrame, readFrames } from './frames.js';

export interface IpcRefreshResult {
  socketPath: string;
  handshakeConfirmed: true;
  relayConfirmed: true;
  hostRefreshRequested: boolean;
  queryKeys: string[][];
}

export interface RefreshOutcome {
  automaticRefresh: boolean;
  refreshRequested: boolean;
  displayStatus: 'unconfirmed';
  strategy: 'ipc-query-invalidate' | 'none';
  ipc?: IpcRefreshResult;
  expectedSpriteSha256: string;
  notice: string;
  errors?: string[];
}

export interface RefreshOptions {
  expectedSpritePath: string;
  /** Override for isolated tests; null disables IPC. */
  ipcSocketPath?: string | null;
  timeoutMs?: number;
  /** A migrated Pet reloads cloud resources instead of its obsolete local atlas. */
  cloudId?: string;
}

export const CLOUD_PET_QUERY = ['cloud-pets', 'list'];

export function desktopIpcPath(): string {
  return process.platform === 'win32' ? '\\\\.\\pipe\\codex-ipc' : path.join(codexHome(), 'ipc', 'ipc.sock');
}

/** A GenPet entry in the current Codex home. Isolated tests set GENPET_SKIP_NATIVE_REFRESH=1. */
export function isLiveDestination(destination: string) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === '1') return false;
  const relative = path.relative(path.resolve(codexHome(), 'pets'), path.resolve(destination));
  return /^genpet-[a-zA-Z0-9_-]+$/.test(relative);
}

/** Request a refresh; the visible sprite is never claimed as confirmed. */
export async function refreshNativePet(options: RefreshOptions): Promise<RefreshOutcome> {
  const expectedSpriteSha256 = createHash('sha256')
    .update(await readFile(options.expectedSpritePath))
    .digest('hex');
  const useIpc =
    options.ipcSocketPath !== null &&
    (typeof options.ipcSocketPath === 'string' ||
      (options.cloudId !== undefined && process.env.GENPET_SKIP_NATIVE_REFRESH !== '1') ||
      isLiveDestination(path.dirname(options.expectedSpritePath)));
  const errors: string[] = [];
  if (useIpc) {
    try {
      const ipc = await refreshViaIpc(options.ipcSocketPath ?? undefined, options.timeoutMs ?? 2000, [
        options.cloudId ? CLOUD_PET_QUERY : ['custom-avatars'],
      ]);
      return {
        automaticRefresh: true,
        refreshRequested: true,
        displayStatus: 'unconfirmed',
        strategy: 'ipc-query-invalidate',
        ipc,
        expectedSpriteSha256,
        notice:
          'Automatic refresh requested through the existing desktop IPC channel. Router relay confirmed; the displayed sprite hash was not measured.',
      };
    } catch (error) {
      errors.push(`ipc: ${(error as Error).message}`);
    }
  }
  return {
    automaticRefresh: false,
    refreshRequested: false,
    displayStatus: 'unconfirmed',
    strategy: 'none',
    expectedSpriteSha256,
    notice: useIpc
      ? 'Files committed to the same GenPet entry. IPC refresh failed; retry when the desktop is running and ready. Visible update remains unconfirmed.'
      : 'Files committed to the same GenPet entry. IPC refresh was skipped for this destination. Visible update remains unconfirmed.',
    ...(errors.length ? { errors } : {}),
  };
}

type Message = Record<string, any>;
interface Client {
  id: string;
  send: (message: Message) => void;
  onMessage: (listener: (message: Message) => void) => void;
}

/**
 * Two short-lived router clients: one broadcasts `query-cache-invalidate` for Pet resources,
 * the other observes the relay. No server, background process or app code is involved.
 */
export async function refreshViaIpc(
  socketPath = desktopIpcPath(),
  timeoutMs = 2000,
  queryKeys: string[][] = [['custom-avatars']],
): Promise<IpcRefreshResult> {
  return relayInvalidations(socketPath, timeoutMs, queryKeys, false);
}

/** Diagnose the channel with a broadcast delivered only to our temporary observer, never the app. */
export async function probeIpc(socketPath = desktopIpcPath(), timeoutMs = 2000): Promise<IpcRefreshResult> {
  return relayInvalidations(socketPath, timeoutMs, [['custom-avatars']], true);
}

async function relayInvalidations(
  socketPath: string,
  timeoutMs: number,
  queryKeys: string[][],
  observerOnly: boolean,
): Promise<IpcRefreshResult> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw Error('IPC timeout must be positive');
  if (
    !queryKeys.length ||
    queryKeys.some(
      key =>
        JSON.stringify(key) !== JSON.stringify(['custom-avatars']) &&
        JSON.stringify(key) !== JSON.stringify(CLOUD_PET_QUERY),
    )
  )
    throw Error('Only known Pet resource query keys may be refreshed');
  await assertPrivateSocket(socketPath);
  const sockets = new Set<net.Socket>();
  const waiting = new Set<(error: Error) => void>();
  let failure: Error | undefined;
  const fail = (error: Error) => {
    failure ??= error;
    for (const reject of [...waiting]) reject(error);
  };
  const deadline = setTimeout(() => fail(Error('IPC refresh timed out')), timeoutMs);

  const connect = () =>
    new Promise<Client>((resolve, reject) => {
      if (failure) return reject(failure);
      waiting.add(reject);
      const socket = net.createConnection(socketPath);
      sockets.add(socket);
      const requestId = randomUUID();
      let listener: ((message: Message) => void) | undefined;
      const send = (message: Message) => {
        if (failure) throw failure;
        socket.write(encodeFrame(message));
      };
      socket.on('error', fail);
      socket.on('close', () => fail(Error('IPC connection closed')));
      socket.on('connect', () =>
        send({
          type: 'request',
          requestId,
          sourceClientId: 'genpet',
          version: 0,
          method: 'initialize',
          params: { clientType: 'genpet' },
        }),
      );
      socket.on(
        'data',
        readFrames(
          16 * 1024 * 1024,
          value => {
            if (!value || typeof value !== 'object') return fail(Error('Invalid IPC message'));
            const message = value as Message;
            if (message.type === 'response' && message.requestId === requestId) {
              if (message.resultType !== 'success' || typeof message.result?.clientId !== 'string')
                return fail(Error('IPC initialization rejected'));
              waiting.delete(reject);
              resolve({ id: message.result.clientId, send, onMessage: fn => (listener = fn) });
            }
            listener?.(message); // Unrelated broadcasts are neither stored nor logged.
          },
          problem => fail(Error(problem === 'too-large' ? 'IPC frame too large' : 'Invalid IPC JSON')),
        ),
      );
    });

  try {
    const observer = await connect();
    const sender = await connect();
    for (const queryKey of queryKeys)
      await new Promise<void>((resolve, reject) => {
        const invalidate = { queryKey, reset: false };
        if (failure) return reject(failure);
        waiting.add(reject);
        observer.onMessage(message => {
          if (
            message.type === 'broadcast' &&
            message.method === 'query-cache-invalidate' &&
            message.version === 0 &&
            message.sourceClientId === sender.id &&
            JSON.stringify(message.params) === JSON.stringify(invalidate)
          ) {
            waiting.delete(reject);
            resolve();
          }
        });
        sender.send({
          type: 'broadcast',
          method: 'query-cache-invalidate',
          version: 0,
          sourceClientId: sender.id,
          params: invalidate,
          ...(observerOnly ? { targetClientIds: [observer.id] } : {}),
        });
      });
    return {
      socketPath,
      handshakeConfirmed: true,
      relayConfirmed: true,
      hostRefreshRequested: !observerOnly,
      queryKeys,
    };
  } finally {
    clearTimeout(deadline);
    for (const socket of sockets) {
      socket.removeAllListeners('close');
      socket.destroy();
    }
  }
}

async function assertPrivateSocket(socketPath: string) {
  if (process.platform === 'win32') {
    if (!socketPath.startsWith('\\\\.\\pipe\\')) throw Error('Expected a local Windows named pipe');
    return;
  }
  const [file, directory] = await Promise.all([lstat(socketPath), lstat(path.dirname(socketPath))]);
  const uid = process.getuid?.();
  if (
    uid == null ||
    file.uid !== uid ||
    directory.uid !== uid ||
    !file.isSocket() ||
    !directory.isDirectory() ||
    directory.mode & 0o022
  )
    throw Error('IPC socket must belong to the current user in a protected directory');
}

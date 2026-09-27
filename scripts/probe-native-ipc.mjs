/** Experimental, bounded probe of the running desktop's existing IPC router.
 * Does not import host code, launch/restart the app, or alter pet files.
 * A relayed broadcast is NOT proof that the visible pet refreshed.
 */
import net from 'node:net';
import path from 'node:path';
import os from 'node:os';
import { lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const mode = process.argv[2] ?? 'probe';
if (!['probe', 'refresh'].includes(mode)) throw Error('Usage: node scripts/probe-native-ipc.mjs [probe|refresh]');
const socketPath = process.platform === 'win32'
  ? '\\\\.\\pipe\\codex-ipc'
  : path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'ipc', 'ipc.sock');
if (process.platform !== 'win32') {
  const [socketInfo, directoryInfo] = await Promise.all([lstat(socketPath), lstat(path.dirname(socketPath))]);
  const uid = process.getuid?.();
  if (uid == null || socketInfo.uid !== uid || directoryInfo.uid !== uid || !socketInfo.isSocket() || !directoryInfo.isDirectory() || (directoryInfo.mode & 0o022)) {
    throw Error('Expected a current-user-owned socket in a non-writable-by-others directory');
  }
}

function connect() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const requestId = randomUUID();
    let buffer = Buffer.alloc(0);
    let clientId;
    const listeners = new Set();
    const timer = setTimeout(() => { socket.destroy(); reject(Error('IPC initialize timeout')); }, 2000);
    socket.on('error', error => { clearTimeout(timer); reject(error); });
    function send(message) {
      const body = Buffer.from(JSON.stringify(message));
      const header = Buffer.alloc(4);
      header.writeUInt32LE(body.length);
      socket.write(Buffer.concat([header, body]));
    }
    socket.on('connect', () => send({ type: 'request', requestId, sourceClientId: 'genpet-probe', version: 0, method: 'initialize', params: { clientType: 'genpet-probe' } }));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 4) {
        const length = buffer.readUInt32LE(0);
        if (length > 16 * 1024 * 1024) { clearTimeout(timer); socket.destroy(); reject(Error('Unexpected oversized IPC frame')); return; }
        if (buffer.length < length + 4) return;
        let message;
        try { message = JSON.parse(buffer.subarray(4, length + 4).toString()); }
        catch { clearTimeout(timer); socket.destroy(); reject(Error('Invalid IPC JSON')); return; }
        buffer = buffer.subarray(length + 4);
        if (message.type === 'response' && message.requestId === requestId) {
          clearTimeout(timer);
          if (message.resultType !== 'success' || typeof message.result?.clientId !== 'string') {
            socket.destroy(); reject(Error('IPC initialization rejected')); return;
          }
          clientId = message.result.clientId;
          resolve({ socket, send, listeners, clientId });
        }
        // Ignore unrelated host traffic; neither persist nor print its contents.
        if (clientId) for (const listener of listeners) listener(message);
      }
    });
  });
}

const clients = [];
try {
  const observer = await connect(); clients.push(observer);
  const sender = await connect(); clients.push(sender);
  const queryKey = ['custom-avatars'];
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Broadcast relay timeout')), 2000);
    observer.listeners.add(message => {
      if (message.type === 'broadcast' && message.method === 'query-cache-invalidate' && message.sourceClientId === sender.clientId && JSON.stringify(message.params?.queryKey) === JSON.stringify(queryKey)) {
        clearTimeout(timer); resolve(true);
      }
    });
  });
  // Probe mode targets ONLY our second connection; refresh reaches host clients.
  sender.send({ type: 'broadcast', method: 'query-cache-invalidate', version: 0,
    sourceClientId: sender.clientId, params: { queryKey, reset: false },
    ...(mode === 'probe' ? { targetClientIds: [observer.clientId] } : {}) });
  await received;
  console.log(JSON.stringify({ mode, socketPath, handshakeConfirmed: true, relayConfirmed: true,
    hostRefreshRequested: mode === 'refresh', queryKey, displayStatus: 'unconfirmed',
    note: 'Router relay confirmation does not acknowledge renderer processing or prove visible refresh.' }, null, 2));
} finally {
  for (const client of clients) client.socket.destroy();
}

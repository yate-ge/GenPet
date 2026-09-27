import net from 'node:net';
import { lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { homedir } from 'node:os';

export interface IpcRefreshEvidence {
  socketPath: string;
  handshakeConfirmed: true;
  relayConfirmed: true;
  hostRefreshRequested: true;
}

/** Existing desktop router; no new server, host imports, or background process. */
export async function refreshViaIpc(socketPath = path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'ipc', 'ipc.sock'), timeoutMs = 2000): Promise<IpcRefreshEvidence> {
  const [file, directory] = await Promise.all([lstat(socketPath), lstat(path.dirname(socketPath))]);
  const uid = process.getuid?.();
  if (uid == null || file.uid !== uid || directory.uid !== uid || !file.isSocket() || !directory.isDirectory() || (directory.mode & 0o022)) {
    throw Error('IPC socket must belong to the current user in a protected directory');
  }
  const sockets = new Set<net.Socket>();
  const pending = new Set<(error: Error) => void>();
  let failure: Error | undefined;
  const fail = (error: Error) => {
    failure ??= error;
    for (const reject of [...pending]) reject(error);
  };
  const deadline = setTimeout(() => fail(Error('IPC refresh timed out')), timeoutMs);
  type Message = Record<string, any>;
  function connect() {
    return new Promise<{id: string; send: (message: Message) => void; onMessage: (listener: (message: Message) => void) => void}>((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      const socket = net.createConnection(socketPath);
      sockets.add(socket);
      const requestId = randomUUID();
      let buffer = Buffer.alloc(0);
      let listener: ((message: Message) => void) | undefined;
      const send = (message: Message) => {
        if (failure) throw failure;
        const body = Buffer.from(JSON.stringify(message));
        const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
        socket.write(Buffer.concat([header, body]));
      };
      socket.on('error', fail);
      socket.on('close', () => fail(Error('IPC connection closed')));
      socket.on('connect', () => send({type:'request',requestId,sourceClientId:'genpet',version:0,method:'initialize',params:{clientType:'genpet'}}));
      socket.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
          const length = buffer.readUInt32LE(0);
          if (length > 16 * 1024 * 1024) { fail(Error('IPC frame too large')); return; }
          if (buffer.length < length + 4) return;
          let message: Message;
          try { message = JSON.parse(buffer.subarray(4, length + 4).toString()); }
          catch { fail(Error('Invalid IPC JSON')); return; }
          buffer = buffer.subarray(length + 4);
          if (!message || typeof message !== 'object') { fail(Error('Invalid IPC message')); return; }
          if (message.type === 'response' && message.requestId === requestId) {
            if (message.resultType !== 'success' || typeof message.result?.clientId !== 'string') { fail(Error('IPC initialization rejected')); return; }
            pending.delete(reject);
            resolve({id:message.result.clientId,send,onMessage:fn=>{listener=fn;}});
          }
          listener?.(message); // Unrelated broadcasts are neither stored nor logged.
        }
      });
    });
  }
  try {
    const observer = await connect();
    const sender = await connect();
    await new Promise<void>((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      observer.onMessage(message => {
        if (message.type === 'broadcast' && message.method === 'query-cache-invalidate' && message.version === 0 && message.sourceClientId === sender.id && JSON.stringify(message.params) === JSON.stringify({queryKey:['custom-avatars'],reset:false})) {
          pending.delete(reject); resolve();
        }
      });
      sender.send({type:'broadcast',method:'query-cache-invalidate',version:0,sourceClientId:sender.id,params:{queryKey:['custom-avatars'],reset:false}});
    });
    return {socketPath,handshakeConfirmed:true,relayConfirmed:true,hostRefreshRequested:true};
  } finally {
    clearTimeout(deadline);
    for (const socket of sockets) { socket.removeAllListeners('close'); socket.destroy(); }
  }
}

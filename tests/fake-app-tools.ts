/** A fake Codex app-tools pipe for desktop switch tests: decodes requests and lets each test reply. */
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { encodeFrame } from '../src/hosts/desktop/frames.js';

export const frame = encodeFrame;
/** Placed in every reply; must never appear in GenPet output. */
export const PRIVATE_SETTING = 'unrelated-host-setting-must-not-escape';

export type AppToolsRequest = {
  id: number;
  method: string;
  params?: {
    namespace: string;
    tool: string;
    arguments: { settings?: Record<string, unknown>; include_config?: boolean };
    callerSource: string;
    threadId: string;
  };
};

export function settingsResponse(id: number, selected: unknown, effective: unknown = selected) {
  const text = JSON.stringify({
    settings: { 'selected-avatar-id': selected, private: PRIVATE_SETTING },
    effectiveSettings: { 'selected-avatar-id': effective, other: PRIVATE_SETTING },
  });
  return { jsonrpc: '2.0', id, result: { success: true, contentItems: [{ type: 'inputText', text }] } };
}

export async function withAppTools(
  handler: (request: AppToolsRequest, socket: net.Socket) => void,
  run: (host: { pipePath: string; calls: AppToolsRequest[]; connections: () => number }) => Promise<void>,
) {
  const pipePath =
    process.platform === 'win32'
      ? `\\\\.\\pipe\\genpet-app-tools-${randomUUID()}`
      : path.join(tmpdir(), `genpet-app-tools-${randomUUID()}.sock`);
  const calls: AppToolsRequest[] = [];
  const sockets = new Set<net.Socket>();
  let connections = 0;
  const server = net.createServer(socket => {
    connections++;
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let pending = Buffer.alloc(0);
    socket.on('data', bytes => {
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= 4 && pending.length >= pending.readUInt32LE(0) + 4) {
        const length = pending.readUInt32LE(0);
        const request = JSON.parse(pending.subarray(4, length + 4).toString('utf8')) as AppToolsRequest;
        pending = pending.subarray(length + 4);
        calls.push(request);
        handler(request, socket);
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(pipePath, resolve);
  });
  try {
    await run({ pipePath, calls, connections: () => connections });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

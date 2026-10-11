import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  CLOUD_PET_QUERY,
  desktopIpcPath,
  probeIpc,
  refreshViaIpc,
  refreshNativePet,
} from '../src/hosts/desktop/refresh.js';
import { hostTestDirectory } from './host-fixtures.js';

async function fixture(mode = 'relay', expectedQueries = [['custom-avatars']]) {
  const dir = await hostTestDirectory('ipc');
  const socketPath =
    process.platform === 'win32' ? `\\\\.\\pipe\\genpet-test-${randomUUID()}` : path.join(dir, 'ipc.sock');
  const clients = new Map<net.Socket, string>();
  let next = 0;
  let broadcasts = 0;
  const requests: any[] = [];
  const server = net.createServer(socket => {
    clients.set(socket, '');
    socket.on('error', () => {});
    socket.on('close', () => clients.delete(socket));
    let buffer = Buffer.alloc(0);
    function send(target: net.Socket, message: any) {
      const body = Buffer.from(JSON.stringify(message)),
        header = Buffer.alloc(4);
      header.writeUInt32LE(body.length);
      const frame = Buffer.concat([header, body]);
      target.write(frame.subarray(0, 2));
      setImmediate(() => {
        if (!target.destroyed) target.write(frame.subarray(2));
      });
    }
    socket.on('data', chunk => {
      if (mode === 'silent') return;
      if (mode === 'disconnect') {
        socket.end();
        return;
      }
      if (mode === 'oversized') {
        const b = Buffer.alloc(4);
        b.writeUInt32LE(20 * 1024 * 1024);
        socket.write(b);
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 4) {
        const len = buffer.readUInt32LE(0);
        if (buffer.length < len + 4) return;
        const m = JSON.parse(buffer.subarray(4, len + 4).toString());
        requests.push(m);
        buffer = buffer.subarray(len + 4);
        if (m.method === 'initialize') {
          const id = String(++next);
          clients.set(socket, id);
          send(socket, {
            type: 'response',
            requestId: m.requestId,
            resultType: 'success',
            method: 'initialize',
            result: { clientId: id },
          });
        } else if (m.type === 'broadcast') {
          broadcasts++;
          assert.ok(
            expectedQueries.some(queryKey => JSON.stringify(m.params) === JSON.stringify({ queryKey, reset: false })),
          );
          for (const peer of clients.keys())
            if (peer !== socket && (!m.targetClientIds || m.targetClientIds.includes(clients.get(peer))))
              send(peer, { ...m, sourceClientId: clients.get(socket) });
        }
      }
    });
  });
  await new Promise<void>(r => server.listen(socketPath, r));
  return {
    dir,
    socketPath,
    get broadcasts() {
      return broadcasts;
    },
    requests,
    close: async () => {
      for (const s of clients.keys()) s.destroy();
      await new Promise<void>(r => server.close(() => r()));
      await writeFile(path.join(dir, 'requests.json'), JSON.stringify(requests, null, 2));
    },
  };
}

test('desktop IPC address follows the host platform', () => {
  assert.equal(
    desktopIpcPath(),
    process.platform === 'win32'
      ? '\\\\.\\pipe\\codex-ipc'
      : path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'ipc', 'ipc.sock'),
  );
});

test('read-only IPC diagnosis targets only its temporary observer and never refreshes the host', async () => {
  const f = await fixture();
  try {
    const result = await probeIpc(f.socketPath);
    assert.equal(result.relayConfirmed, true);
    assert.equal(result.hostRefreshRequested, false);
    const broadcast = f.requests.find(request => request.type === 'broadcast');
    assert.deepEqual(broadcast.targetClientIds, ['1']);
  } finally {
    await f.close();
  }
});

test('migrated cloud Pet refresh invalidates cloud list and its by-ID resource prefix', async () => {
  const f = await fixture('relay', [CLOUD_PET_QUERY]);
  try {
    const sprite = path.join(f.dir, 'sprite.webp');
    await writeFile(sprite, 'synthetic-fixture');
    const result = await refreshNativePet({
      expectedSpritePath: sprite,
      cloudId: 'pet_fixture',
      ipcSocketPath: f.socketPath,
    });
    assert.equal(result.refreshRequested, true);
    assert.deepEqual(result.ipc!.queryKeys, [['cloud-pets', 'list']]);
    assert.equal(result.displayStatus, 'unconfirmed');
    assert.equal(
      f.requests.some(request => request.params?.queryKey?.[0] === 'custom-avatars'),
      false,
    );
  } finally {
    await f.close();
  }
});

test('IPC rejects unknown cache keys without sending a broadcast', async () => {
  const f = await fixture();
  try {
    await assert.rejects(refreshViaIpc(f.socketPath, 1000, [['unrelated-cache']]), /known Pet resource/);
    assert.equal(f.broadcasts, 0);
  } finally {
    await f.close();
  }
});

test('IPC refresh handles fragmented frames and broadcasts only custom-avatar invalidation', async () => {
  const f = await fixture();
  try {
    const r = await refreshViaIpc(f.socketPath);
    assert.equal(r.relayConfirmed, true);
    assert.equal(f.broadcasts, 1);
  } finally {
    await f.close();
  }
});
for (const [mode, pattern] of [
  ['silent', /timed out/],
  ['disconnect', /closed/],
  ['oversized', /too large/],
] as const)
  test(`IPC fails boundedly on ${mode}`, async () => {
    const f = await fixture(mode);
    try {
      await assert.rejects(refreshViaIpc(f.socketPath, 150), pattern);
    } finally {
      await f.close();
    }
  });
test(
  'IPC rejects writable-by-others directories before connecting',
  { skip: process.platform === 'win32' },
  async () => {
    const f = await fixture();
    try {
      await chmod(f.dir, 0o777);
      await assert.rejects(refreshViaIpc(f.socketPath), /protected directory/);
      assert.equal(f.broadcasts, 0);
    } finally {
      await f.close();
    }
  },
);
test('native adapter uses IPC but preserves unmeasured display status', async () => {
  const f = await fixture();
  try {
    const sprite = path.join(f.dir, 'sprite.webp');
    await writeFile(sprite, 'fixture');
    const r = await refreshNativePet({ expectedSpritePath: sprite, ipcSocketPath: f.socketPath });
    assert.equal(r.automaticRefresh, true);
    assert.equal(r.refreshRequested, true);
    assert.equal(r.displayStatus, 'unconfirmed');
    assert.equal(r.strategy, 'ipc-query-invalidate');
    assert.equal(r.ipc?.relayConfirmed, true);
  } finally {
    await f.close();
  }
});
test('missing IPC reports failure and no refresh request', async () => {
  const f = await fixture();
  try {
    const sprite = path.join(f.dir, 'sprite.webp');
    await writeFile(sprite, 'fixture');
    const missing =
      process.platform === 'win32' ? `\\\\.\\pipe\\genpet-missing-${randomUUID()}` : path.join(f.dir, 'missing.sock');
    const r = await refreshNativePet({ expectedSpritePath: sprite, ipcSocketPath: missing, timeoutMs: 150 });
    assert.equal(r.automaticRefresh, false);
    assert.equal(r.refreshRequested, false);
    assert.equal(r.strategy, 'none');
    assert.ok(r.errors?.some(e => e.startsWith('ipc:')));
  } finally {
    await f.close();
  }
});

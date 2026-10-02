import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readNativePetLive, selectNativePetLive } from '../src/native-pet-live.js';

type Request = {
  id: number;
  method: string;
  params?: { tool: string; arguments: unknown; threadId: string; callerSource: string; callId: string; turnId: string };
};

function frame(value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(bytes.length);
  return Buffer.concat([header, bytes]);
}

function response(id: number, selection: string | null) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      success: true,
      contentItems: [
        {
          type: 'inputText',
          text: JSON.stringify({
            settings: { 'selected-avatar-id': selection, private: 'must not escape' },
            effectiveSettings: { 'selected-avatar-id': selection, other: 42 },
          }),
        },
      ],
    },
  };
}

async function withHost(
  handler: (request: Request, socket: net.Socket) => void,
  run: (options: { pipePath: string; threadId: string; timeoutMs: number }) => Promise<void>,
) {
  const pipePath =
    process.platform === 'win32'
      ? `\\\\.\\pipe\\genpet-live-test-${randomUUID()}`
      : path.join(tmpdir(), `genpet-live-${randomUUID()}.sock`);
  const sockets = new Set<net.Socket>();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let pending = Buffer.alloc(0);
    socket.on('data', bytes => {
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= 4 && pending.length >= pending.readUInt32LE(0) + 4) {
        const length = pending.readUInt32LE(0);
        const request = JSON.parse(pending.subarray(4, length + 4).toString('utf8')) as Request;
        pending = pending.subarray(length + 4);
        handler(request, socket);
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(pipePath, resolve);
  });
  try {
    await run({ pipePath, threadId: 'isolated-test-thread', timeoutMs: 1000 });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test('read projects only pet fields and handles fragmented native pipe frames', async () => {
  await withHost(
    (request, socket) => {
      assert.equal(request.params?.tool, 'read_settings');
      assert.deepEqual(request.params?.arguments, { include_config: false });
      assert.equal(request.params?.threadId, 'isolated-test-thread');
      assert.equal(request.params?.callerSource, 'codex');
      const bytes = frame(response(request.id, 'custom:test'));
      socket.write(bytes.subarray(0, 2));
      setImmediate(() => socket.write(bytes.subarray(2)));
    },
    async options => {
      assert.deepEqual(await readNativePetLive(options), {
        available: true,
        selectedPetId: 'custom:test',
        effectiveSelectedPetId: 'custom:test',
      });
    },
  );
});

test('select writes only the pet key, then confirms with an independent read', async () => {
  const calls: string[] = [];
  let selected = 'codex';
  await withHost(
    (request, socket) => {
      calls.push(request.params!.tool);
      if (request.params?.tool === 'write_settings') {
        assert.deepEqual(request.params.arguments, { settings: { 'selected-avatar-id': 'dewey' } });
        selected = 'dewey';
      }
      socket.write(frame(response(request.id, selected)));
    },
    async options => {
      assert.deepEqual(await selectNativePetLive('dewey', options), {
        selectedPetId: 'dewey',
        effectiveSelectedPetId: 'dewey',
        immediate: true,
        restartRequired: false,
        hostStateConfirmed: true,
        visualVerified: false,
      });
      assert.deepEqual(calls, ['write_settings', 'read_settings']);
    },
  );
});

test('missing environment is explicit and cannot trigger a write', async () => {
  const options = { pipePath: null, threadId: null };
  assert.equal((await readNativePetLive(options)).available, false);
  await assert.rejects(selectNativePetLive('dewey', options), /unavailable/);
});

test('a rejected write is not retried and never falls back to config files', async () => {
  const calls: string[] = [];
  await withHost(
    (request, socket) => {
      calls.push(request.params!.tool);
      socket.write(
        frame({
          jsonrpc: '2.0',
          id: request.id,
          result: { success: false, contentItems: [{ type: 'inputText', text: 'private diagnostic' }] },
        }),
      );
    },
    async options => {
      await assert.rejects(selectNativePetLive('dewey', options), /could not complete/);
      assert.deepEqual(calls, ['write_settings']);
    },
  );
});

test('readback mismatch rejects even after a successful write response', async () => {
  await withHost(
    (request, socket) =>
      socket.write(frame(response(request.id, request.params?.tool === 'write_settings' ? 'dewey' : 'codex'))),
    async options => {
      await assert.rejects(selectNativePetLive('dewey', options), /did not match/);
    },
  );
});

test('timeouts and oversized responses return unavailable without exposing payloads', async () => {
  await withHost(
    () => {},
    async options => {
      const result = await readNativePetLive({ ...options, timeoutMs: 20 });
      assert.equal(result.available, false);
      if (!result.available) assert.match(result.reason, /timed out/);
    },
  );
  await withHost(
    (_request, socket) => {
      const header = Buffer.alloc(4);
      header.writeUInt32LE(8 * 1024 * 1024 + 1);
      socket.write(header);
    },
    async options => {
      const result = await readNativePetLive(options);
      assert.equal(result.available, false);
      if (!result.available) assert.match(result.reason, /size limit/);
    },
  );
});

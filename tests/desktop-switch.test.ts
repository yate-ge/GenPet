import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { readSelectedPet, selectPet } from '../src/hosts/desktop/switch.js';

import { frame, settingsResponse, withAppTools, type AppToolsRequest } from './fake-app-tools.js';

const response = (id: number, selection: string | null) => settingsResponse(id, selection);

function withHost(
  handler: (request: AppToolsRequest, socket: net.Socket) => void,
  run: (options: { pipePath: string; threadId: string; timeoutMs: number }) => Promise<void>,
) {
  return withAppTools(handler, ({ pipePath }) => run({ pipePath, threadId: 'isolated-test-thread', timeoutMs: 1000 }));
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
      assert.deepEqual(await readSelectedPet(options), {
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
      assert.deepEqual(await selectPet('dewey', options), {
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
  assert.equal((await readSelectedPet(options)).available, false);
  await assert.rejects(selectPet('dewey', options), /unavailable/);
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
      await assert.rejects(selectPet('dewey', options), /could not complete/);
      assert.deepEqual(calls, ['write_settings']);
    },
  );
});

test('readback mismatch rejects even after a successful write response', async () => {
  await withHost(
    (request, socket) =>
      socket.write(frame(response(request.id, request.params?.tool === 'write_settings' ? 'dewey' : 'codex'))),
    async options => {
      await assert.rejects(selectPet('dewey', options), /did not match/);
    },
  );
});

test('timeouts and oversized responses return unavailable without exposing payloads', async () => {
  await withHost(
    () => {},
    async options => {
      const result = await readSelectedPet({ ...options, timeoutMs: 20 });
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
      const result = await readSelectedPet(options);
      assert.equal(result.available, false);
      if (!result.available) assert.match(result.reason, /size limit/);
    },
  );
});

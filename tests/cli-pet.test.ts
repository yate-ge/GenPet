import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);
const threadId = 'isolated-cli-pet-test';
const privateSetting = 'unrelated-host-setting-must-not-escape';
type Request = {
  id: number;
  method: string;
  params?: { namespace: string; tool: string; arguments: { settings?: Record<string, unknown> }; callerSource: string; threadId: string };
};
type Result = { code: number; stdout: string; stderr: string };

function frame(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}

async function withHost(run: (host: { pipePath: string; calls: Request[]; connections: () => number }) => Promise<void>) {
  const pipePath = process.platform === 'win32'
    ? `\\\\.\\pipe\\genpet-cli-test-${randomUUID()}`
    : path.join(tmpdir(), `genpet-cli-${randomUUID()}.sock`);
  const calls: Request[] = [];
  const sockets = new Set<net.Socket>();
  let connections = 0;
  let selected: unknown = 'cloud:host-selection';
  let effective: unknown = 'dewey';
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
        const request = JSON.parse(pending.subarray(4, length + 4).toString('utf8')) as Request;
        pending = pending.subarray(length + 4);
        calls.push(request);
        if (request.params?.tool === 'write_settings') {
          selected = request.params.arguments.settings?.['selected-avatar-id'];
          effective = selected;
        }
        socket.write(frame({ jsonrpc: '2.0', id: request.id, result: { success: true, contentItems: [{
          type: 'inputText',
          text: JSON.stringify({
            settings: { 'selected-avatar-id': selected, private: privateSetting },
            effectiveSettings: { 'selected-avatar-id': effective, other: privateSetting },
          }),
        }] } }));
      }
    });
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(pipePath, resolve); });
  try { await run({ pipePath, calls, connections: () => connections }); }
  finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

async function withCli(pipePath: string, run: (cli: (...args: string[]) => Promise<Result>) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-cli-pet-'));
  const home = path.join(root, 'codex');
  const data = path.join(root, 'data');
  const config = '# Must remain byte-for-byte unchanged\n[desktop]\nselected-avatar-id = "codex"\n';
  try {
    await mkdir(path.join(home, 'pets', 'cli-companion'), { recursive: true });
    await mkdir(data);
    await writeFile(path.join(home, 'pets', 'cli-companion', 'pet.json'), JSON.stringify({ displayName: 'CLI Companion' }));
    await writeFile(path.join(home, 'config.toml'), config);
    const cli = async (...args: string[]): Promise<Result> => {
      const env = {
        ...process.env,
        CODEX_HOME: home,
        GENPET_DATA_DIR: data,
        CODEX_APP_TOOLS_PIPE_PATH: pipePath,
        CODEX_THREAD_ID: pipePath ? threadId : '',
      };
      try {
        return { code: 0, ...await execute(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
          cwd: path.resolve(import.meta.dirname, '..'), env, timeout: 10000, maxBuffer: 1024 * 1024,
        }) };
      } catch (error) {
        const failed = error as { code: unknown; stdout: string; stderr: string };
        if (typeof failed.code !== 'number') throw error;
        return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
      }
    };
    await run(cli);
    assert.equal(await readFile(path.join(home, 'config.toml'), 'utf8'), config);
  } finally { await rm(root, { recursive: true, force: true }); }
}

function output(result: Result): unknown {
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes(privateSetting));
  return JSON.parse(result.stdout);
}

test('switch-pet current and default read only the live host pet fields', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    for (const args of [[], ['--current']]) {
      assert.deepEqual(output(await cli('switch-pet', ...args)), {
        available: true, selectedPetId: 'cloud:host-selection', effectiveSelectedPetId: 'dewey',
      });
    }
    assert.deepEqual(host.calls.map(call => call.params?.tool), ['read_settings', 'read_settings']);
    for (const call of host.calls) {
      assert.equal(call.method, 'tools/call');
      assert.equal(call.params?.namespace, 'codex_app');
      assert.equal(call.params?.callerSource, 'codex');
      assert.equal(call.params?.threadId, threadId);
      assert.deepEqual(call.params?.arguments, { include_config: false });
    }
  }));
});

test('switch-pet list includes builtin and local pets without connecting to the host', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    const result = output(await cli('switch-pet', '--list')) as { pets: { id: string; displayName: string; source: string }[] };
    assert.ok(result.pets.some(pet => pet.id === 'codex' && pet.source === 'builtin'));
    assert.ok(result.pets.some(pet => pet.id === 'dewey' && pet.source === 'builtin'));
    assert.ok(result.pets.some(pet => pet.id === 'custom:cli-companion' && pet.displayName === 'CLI Companion' && pet.source === 'local'));
    assert.equal(host.connections(), 0);
    assert.deepEqual(host.calls, []);
  }));
});

test('switch-pet writes a known builtin or local ID then independently confirms it', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    for (const petId of ['dewey', 'custom:cli-companion']) {
      assert.deepEqual(output(await cli('switch-pet', petId)), {
        selectedPetId: petId, effectiveSelectedPetId: petId, immediate: true,
        restartRequired: false, hostStateConfirmed: true, visualVerified: false,
      });
    }
    assert.deepEqual(host.calls.map(call => call.params?.tool), ['write_settings', 'read_settings', 'write_settings', 'read_settings']);
    assert.deepEqual(host.calls[0].params?.arguments, { settings: { 'selected-avatar-id': 'dewey' } });
    assert.deepEqual(host.calls[2].params?.arguments, { settings: { 'selected-avatar-id': 'custom:cli-companion' } });
    assert.equal(host.connections(), 4);
  }));
});

test('switch-pet missing pipe fails current and switch without changing config', async () => {
  await withCli('', async cli => {
    for (const argument of ['--current', 'dewey']) {
      const result = await cli('switch-pet', argument);
      assert.notEqual(result.code, 0);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /unavailable/i);
    }
  });
});

test('switch-pet rejects unknown IDs before any host connection or write', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    const result = await cli('switch-pet', 'custom:missing-pet');
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Unknown pet ID/);
    assert.equal(host.connections(), 0);
    assert.deepEqual(host.calls, []);
  }));
});

test('switch-pet rejects demo, extra arguments and unknown flags without host calls', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    for (const args of [
      ['--demo', 'switch-pet', 'dewey'],
      ['switch-pet', '--demo'],
      ['switch-pet', 'dewey', 'codex'],
      ['switch-pet', '--current', 'dewey'],
      ['switch-pet', '--unknown'],
    ]) {
      const result = await cli(...args);
      assert.notEqual(result.code, 0);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /--demo|Usage:/);
    }
    assert.equal(host.connections(), 0);
    assert.deepEqual(host.calls, []);
  }));
});

test('switch-pet help works without a host connection', async () => {
  await withHost(async host => withCli(host.pipePath, async cli => {
    assert.match((output(await cli('switch-pet', '--help')) as { usage: string }).usage, /Usage: switch-pet/);
    assert.equal(host.connections(), 0);
  }));
});

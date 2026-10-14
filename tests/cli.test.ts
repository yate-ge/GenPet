import { retainFixture as rm } from './evidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';

import { frame, PRIVATE_SETTING, settingsResponse, withAppTools, type AppToolsRequest } from './fake-app-tools.js';

const execute = promisify(execFile);
const threadId = 'isolated-cli-pet-test';
type Result = { code: number; stdout: string; stderr: string };
type Host = { pipePath: string; calls: AppToolsRequest[]; connections: () => number };

/** A host whose selection changes on write, like the running desktop app. */
function withHost(run: (host: Host) => Promise<void>) {
  let selected: unknown = 'cloud:host-selection';
  let effective: unknown = 'dewey';
  return withAppTools((request, socket) => {
    if (request.params?.tool === 'write_settings') {
      selected = request.params.arguments.settings?.['selected-avatar-id'];
      effective = selected;
    }
    socket.write(frame(settingsResponse(request.id, selected, effective)));
  }, run);
}

async function withCli(
  pipePath: string,
  run: (cli: (...args: string[]) => Promise<Result>, home: string) => Promise<void>,
  hasTurn = true,
) {
  const root = await mkdtemp(path.join(tmpdir(), 'genpet-cli-pet-'));
  const home = path.join(root, 'codex');
  const data = path.join(root, 'data');
  const config = '# Must remain byte-for-byte unchanged\n[desktop]\nselected-avatar-id = "codex"\n';
  try {
    await mkdir(path.join(home, 'pets', 'cli-companion'), { recursive: true });
    await mkdir(data);
    await writeFile(
      path.join(home, 'pets', 'cli-companion', 'pet.json'),
      JSON.stringify({ displayName: 'CLI Companion' }),
    );
    await writeFile(path.join(home, 'config.toml'), config);
    const cli = async (...args: string[]): Promise<Result> => {
      const env = {
        ...process.env,
        CODEX_HOME: home,
        GENPET_DATA_DIR: data,
        CODEX_APP_TOOLS_PIPE_PATH: pipePath,
        CODEX_THREAD_ID: pipePath ? threadId : '',
        CODEX_TURN_ID: hasTurn ? 'isolated-cli-turn' : '',
      };
      try {
        return {
          code: 0,
          ...(await execute(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
            cwd: path.resolve(import.meta.dirname, '..'),
            env,
            timeout: 10000,
            maxBuffer: 1024 * 1024,
          })),
        };
      } catch (error) {
        const failed = error as { code: unknown; stdout: string; stderr: string };
        if (typeof failed.code !== 'number') throw error;
        return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
      }
    };
    await run(cli, home);
    assert.equal(await readFile(path.join(home, 'config.toml'), 'utf8'), config);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function output(result: Result): unknown {
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes(PRIVATE_SETTING));
  return JSON.parse(result.stdout);
}

async function routingPets(home: string, savedCloudId?: string) {
  const store = new Store(path.join(path.dirname(home), 'data'));
  const create = async (avatarId: string, cloudId?: string) => {
    const created = await store.createPet({ confirmed: true });
    const pet = store.forPet(created.pet!.id);
    await pet.transaction(state => {
      state.pet!.soul.genes = 'Synthetic red panda cub with source-grounded traits';
      state.pet!.binding = { host: 'desktop', avatarId, ...(cloudId ? { cloudId } : {}) };
    });
    return pet;
  };
  const a = await create('custom:route-a');
  const b = await create('custom:route-b', savedCloudId);
  await store.selectPet((await a.peek()).pet!.id);
  return { a, b };
}

test('accept-art reports a missing request ID before reading shifted file arguments or writing state', async () => {
  await withCli('', async (cli, home) => {
    const data = path.join(path.dirname(home), 'data');
    const missingImage = path.join(home, 'must-not-be-read.webp');
    const before = await readdir(data);
    const shifted = await cli('accept-art', missingImage, 'atlas', 'Synthetic fixture');
    assert.equal(shifted.code, 1);
    assert.match(shifted.stderr, /accept-art REQUEST_ID/);
    assert.match(shifted.stderr, /art-request\.id/);
    const empty = await cli('accept-art', '', missingImage, 'atlas', 'Synthetic fixture');
    assert.equal(empty.code, 1);
    assert.match(empty.stderr, /REQUEST_ID.*art-request\.id/);
    assert.deepEqual(await readdir(data), before);
  });
});

test('mapped host selection routes a custom-only B story without changing A or an explicitly pinned target', async () => {
  await withAppTools(
    (request, socket) => {
      socket.write(frame(settingsResponse(request.id, 'pet_current', 'pet_current')));
    },
    async host =>
      withCli(host.pipePath, async (cli, home) => {
        const { a, b } = await routingPets(home);
        const aId = (await a.peek()).pet!.id;
        const bId = (await b.peek()).pet!.id;
        await writeFile(
          path.join(home, '.codex-global-state.json'),
          JSON.stringify({
            'electron-persisted-atom-state': {
              'cloud-pet-artwork-cache': { accountId: 'current-account', userId: 'current-user' },
              'migrated-cloud-pet-ids-v1': {
                '["current-account","current-user"]': { 'custom:route-b': 'pet_current' },
                '["foreign-account","foreign-user"]': { 'custom:route-b': 'pet_foreign' },
              },
            },
          }),
        );
        const beforeA = await readFile(a.file);
        const opened = output(await cli('begin-story', 'test:mapped-b')) as {
          pet: { id: string };
          pending: { petId: string };
        };
        assert.equal(opened.pet.id, bId);
        assert.equal(opened.pending.petId, bId);
        assert.equal((await b.peek()).pending!.petId, bId);
        assert.deepEqual(await readFile(a.file), beforeA);
        assert.deepEqual(
          host.calls.map(call => call.params?.tool),
          ['read_settings'],
        );
        const beforeB = await readFile(b.file);
        const pinned = output(await cli('begin-story', 'test:pinned-a', '--pet', aId)) as { pet: { id: string } };
        assert.equal(pinned.pet.id, aId);
        assert.deepEqual(await readFile(b.file), beforeB);
        assert.equal(host.calls.length, 1);
      }),
  );
});

test('authoritative current-account mapping rejects a stale saved cloud alias and routes the actual one', async () => {
  await withCli('', async (cli, home) => {
    const { a, b } = await routingPets(home, 'pet_stale');
    const aId = (await a.peek()).pet!.id;
    const bId = (await b.peek()).pet!.id;
    await writeFile(
      path.join(home, '.codex-global-state.json'),
      JSON.stringify({
        'electron-persisted-atom-state': {
          'cloud-pet-artwork-cache': { accountId: 'current-account', userId: 'current-user' },
          'migrated-cloud-pet-ids-v1': {
            '["current-account","current-user"]': { 'custom:route-b': 'pet_current' },
          },
        },
      }),
    );
    const before = await Promise.all([readFile(a.file), readFile(b.file)]);
    const stale = output(await cli('resolve-active', 'pet_stale')) as { petId: string; matched: boolean };
    assert.equal(stale.petId, aId);
    assert.equal(stale.matched, false);
    const actual = output(await cli('resolve-active', 'pet_current')) as { petId: string; matched: boolean };
    assert.equal(actual.petId, bId);
    assert.equal(actual.matched, true);
    assert.deepEqual(await readFile(a.file), before[0]);
    assert.deepEqual(await readFile(b.file), before[1]);
  });
});

test('unknown account and a foreign-only scope cannot route B through foreign or cached cloud aliases', async () => {
  for (const savedCloudId of [undefined, 'pet_foreign']) {
    await withCli('', async (cli, home) => {
      const { a, b } = await routingPets(home, savedCloudId);
      const aId = (await a.peek()).pet!.id;
      const before = await Promise.all([readFile(a.file), readFile(b.file)]);
      for (const cache of [undefined, { accountId: 'current-account', userId: 'current-user' }]) {
        await writeFile(
          path.join(home, '.codex-global-state.json'),
          JSON.stringify({
            'electron-persisted-atom-state': {
              ...(cache ? { 'cloud-pet-artwork-cache': cache } : {}),
              'migrated-cloud-pet-ids-v1': {
                '["foreign-account","foreign-user"]': { 'custom:route-b': 'pet_foreign' },
              },
            },
          }),
        );
        const result = output(await cli('resolve-active', 'pet_foreign')) as { petId: string; matched: boolean };
        assert.equal(result.petId, aId);
        assert.equal(result.matched, false);
      }
      assert.deepEqual(await readFile(a.file), before[0]);
      assert.deepEqual(await readFile(b.file), before[1]);
    });
  }
});

test('switch-pet current and default read only the live host pet fields', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      for (const args of [[], ['--current']]) {
        assert.deepEqual(output(await cli('switch-pet', ...args)), {
          available: true,
          selectedPetId: 'cloud:host-selection',
          effectiveSelectedPetId: 'dewey',
        });
      }
      assert.deepEqual(
        host.calls.map(call => call.params?.tool),
        ['read_settings', 'read_settings'],
      );
      for (const call of host.calls) {
        assert.equal(call.method, 'tools/call');
        assert.equal(call.params?.namespace, 'codex_app');
        assert.equal(call.params?.callerSource, 'codex');
        assert.equal(call.params?.threadId, threadId);
        assert.deepEqual(call.params?.arguments, { include_config: false });
      }
    }),
  );
});

test('switch-pet list includes builtin and local pets without connecting to the host', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      const result = output(await cli('switch-pet', '--list')) as {
        pets: { id: string; displayName: string; source: string }[];
      };
      assert.ok(result.pets.some(pet => pet.id === 'codex' && pet.source === 'builtin'));
      assert.ok(result.pets.some(pet => pet.id === 'dewey' && pet.source === 'builtin'));
      assert.ok(
        result.pets.some(
          pet => pet.id === 'custom:cli-companion' && pet.displayName === 'CLI Companion' && pet.source === 'local',
        ),
      );
      assert.equal(host.connections(), 0);
      assert.deepEqual(host.calls, []);
    }),
  );
});

test('migrated entries and legacy alias requests select the current account cloud ID', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async (cli, home) => {
      await writeFile(
        path.join(home, '.codex-global-state.json'),
        JSON.stringify({
          'electron-persisted-atom-state': {
            'cloud-pet-artwork-cache': { accountId: 'current-account', userId: 'current-user' },
            'migrated-cloud-pet-ids-v1': {
              '["current-account","current-user"]': { 'custom:cli-companion': 'pet_current' },
              '["other-account","other-user"]': { 'custom:cli-companion': 'pet_other' },
            },
          },
        }),
      );
      const catalog = output(await cli('switch-pet', '--list')) as { pets: { id: string; localId?: string }[] };
      assert.ok(catalog.pets.some(pet => pet.id === 'pet_current' && pet.localId === 'custom:cli-companion'));
      assert.ok(!catalog.pets.some(pet => pet.id === 'pet_other' || pet.id === 'custom:cli-companion'));
      assert.equal(host.connections(), 0);
      for (const requested of ['custom:cli-companion', 'pet_current']) {
        const selected = output(await cli('switch-pet', requested)) as { selectedPetId: string };
        assert.equal(selected.selectedPetId, 'pet_current');
      }
      assert.deepEqual(
        host.calls.flatMap(call => (call.params?.tool === 'write_settings' ? [call.params.arguments.settings] : [])),
        [{ 'selected-avatar-id': 'pet_current' }, { 'selected-avatar-id': 'pet_current' }],
      );
      const connections = host.connections();
      assert.notEqual((await cli('switch-pet', 'pet_other')).code, 0);
      assert.equal(host.connections(), connections);
    }),
  );
});

test('switch-pet writes a known builtin or local ID then independently confirms it', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      for (const petId of ['dewey', 'custom:cli-companion']) {
        assert.deepEqual(output(await cli('switch-pet', petId)), {
          selectedPetId: petId,
          effectiveSelectedPetId: petId,
          immediate: true,
          restartRequired: false,
          hostStateConfirmed: true,
          visualVerified: false,
        });
      }
      assert.deepEqual(
        host.calls.map(call => call.params?.tool),
        ['write_settings', 'read_settings', 'write_settings', 'read_settings'],
      );
      assert.deepEqual(host.calls[0].params?.arguments, { settings: { 'selected-avatar-id': 'dewey' } });
      assert.deepEqual(host.calls[2].params?.arguments, { settings: { 'selected-avatar-id': 'custom:cli-companion' } });
      assert.equal(host.connections(), 4);
    }),
  );
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

test('without the active turn the CLI hands a known builtin to the host tool instead of issuing a false write', async () => {
  await withHost(async host =>
    withCli(
      host.pipePath,
      async cli => {
        const result = output(await cli('switch-pet', 'dewey')) as {
          selected: boolean;
          targetId: string;
          agentSteps: { tool?: string }[];
        };
        assert.equal(result.selected, false);
        assert.equal(result.targetId, 'dewey');
        assert.equal(result.agentSteps[0].tool, 'select_pet');
        assert.equal(host.connections(), 0);
      },
      false,
    ),
  );
});

test('switch-pet rejects unknown IDs before any host connection or write', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      const result = await cli('switch-pet', 'custom:missing-pet');
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /Unknown pet ID/);
      assert.equal(host.connections(), 0);
      assert.deepEqual(host.calls, []);
    }),
  );
});

test('switch-pet rejects extra arguments and unknown flags without host calls', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      for (const args of [
        ['switch-pet', '--demo'],
        ['switch-pet', 'dewey', 'codex'],
        ['switch-pet', '--current', 'dewey'],
        ['switch-pet', '--unknown'],
      ]) {
        const result = await cli(...args);
        assert.notEqual(result.code, 0);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /Usage:/);
      }
      assert.equal(host.connections(), 0);
      assert.deepEqual(host.calls, []);
    }),
  );
});

test('global help is successful, read-only and requires no host connection', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async (cli, home) => {
      const data = path.join(path.dirname(home), 'data');
      const before = await readdir(data);
      for (const flag of ['help', '--help']) {
        const result = output(await cli(flag)) as { commands: string[] };
        assert.ok(result.commands.includes('art-request'));
        assert.ok(result.commands.some(usage => usage.startsWith('accept-art REQUEST_ID')));
      }
      assert.equal(host.connections(), 0);
      assert.deepEqual(await readdir(data), before);
    }),
  );
});

test('switch-pet help works without a host connection', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      assert.match((output(await cli('switch-pet', '--help')) as { usage: string }).usage, /Usage: switch-pet/);
      assert.equal(host.connections(), 0);
    }),
  );
});

test('an unknown command lists the shared commands and this package host commands only', async () => {
  await withHost(async host =>
    withCli(host.pipePath, async cli => {
      const result = await cli('no-such-command');
      assert.notEqual(result.code, 0);
      for (const usage of ['status', 'begin-story', 'accept-art', 'host-result', 'publish', 'switch-pet'])
        assert.match(result.stderr, new RegExp(`^  ${usage}\\b`, 'm'));
      assert.doesNotMatch(result.stderr, /bind-avatar|host-request/);
      assert.equal(host.connections(), 0);
    }),
  );
});

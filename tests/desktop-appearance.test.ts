import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../src/store.js';
import { acceptArt, artRequest } from '../src/art.js';
import { installNative } from '../src/hosts/desktop/publish.js';
import { recordHostResult } from '../src/hosts/result.js';
import { initialization, image } from './fixtures.js';
import { hostTestDirectory, noMigration, withHostHome } from './host-fixtures.js';
import { frame, settingsResponse, withAppTools } from './fake-app-tools.js';

async function appearance() {
  const root = await hostTestDirectory('desktop-appearance');
  const store = new Store(root, 'desktop');
  const op = await initialization(store);
  const file = path.join(root, 'atlas.png');
  await image(file, true);
  const art = await acceptArt(store, {
    requestId: artRequest(await store.peek())!.id,
    file,
    kind: 'atlas',
    source: 'Synthetic desktop appearance fixture',
  });
  return { root, store, op, art };
}

const skippedRefresh = async () => ({
  automaticRefresh: false,
  refreshRequested: false,
  displayStatus: 'unconfirmed' as const,
  strategy: 'none' as const,
  expectedSpriteSha256: 'synthetic',
  notice: 'Isolated refresh skipped',
});

test('migrated desktop update targets the actual cloud Pet and leaves local-only proof incomplete', async () => {
  await withHostHome(async home => {
    const { store, op } = await appearance();
    const id = (await store.peek()).pet!.id;
    const localId = `custom:${id}`;
    const destination = path.join(home, 'pets', id);
    await store.transaction(state => {
      state.pet!.binding = { host: 'desktop', avatarId: localId, cloudId: 'pet_old', destination };
    });
    let refreshes = 0;
    const result = await installNative(store, {
      mapping: async () => ({ available: true, mappings: { [localId]: 'pet_actual' }, pending: [] }),
      selection: async () => ({ available: true, selectedPetId: localId, effectiveSelectedPetId: localId }),
      refresh: async () => {
        refreshes++;
        return skippedRefresh();
      },
    });
    assert.equal(result.avatarId, 'pet_actual');
    assert.equal(result.active, true);
    assert.equal(result.updated, false);
    assert.equal(result.storedArtworkVerified, null);
    assert.equal(result.operation, 'update-cloud-pet');
    assert.equal(refreshes, 0);
    assert.equal((await store.peek()).pet!.binding!.avatarId, localId);
    assert.equal((await store.peek()).pet!.binding!.cloudId, 'pet_actual');
    assert.equal((await store.peek()).pending!.id, op);
    await assert.rejects(readdir(destination), /ENOENT/);
  });
});

test('a newly migrated entry cannot finish from the local atlas written before migration', async () => {
  await withHostHome(async home => {
    const { store } = await appearance();
    const id = (await store.peek()).pet!.id;
    let lookups = 0;
    const result = await installNative(store, {
      mapping: async () => ({
        available: true,
        mappings: ++lookups === 1 ? {} : { [`custom:${id}`]: 'pet_justmigrated' },
        pending: [],
      }),
      selection: async () => ({ available: true, selectedPetId: 'dewey', effectiveSelectedPetId: 'dewey' }),
      refresh: skippedRefresh,
    });
    assert.equal(lookups, 2);
    assert.equal(result.avatarId, 'pet_justmigrated');
    assert.equal(result.storedArtworkVerified, null);
    assert.equal((await store.peek()).pending!.hostResult!.storedArtworkVerified, null);
    const manifest = JSON.parse(await readFile(path.join(home, 'pets', id, 'pet.json'), 'utf8'));
    assert.equal(manifest.genpetId, id);
  });
});

test('unmigrated local update reads back its stored manifest and accepted pixels', async () => {
  await withHostHome(async home => {
    const { store } = await appearance();
    const result = await installNative(store, {
      mapping: noMigration,
      selection: async () => ({ available: true, selectedPetId: 'dewey', effectiveSelectedPetId: 'dewey' }),
      refresh: skippedRefresh,
    });
    assert.equal(result.updated, true);
    assert.equal(result.storedArtworkVerified, true);
    assert.equal(result.acceptedArtworkSha256, result.storedArtworkSha256);
    assert.equal(result.active, false);
    assert.equal(result.displayStatus, 'unconfirmed');
    assert.equal(result.destination, path.join(home, 'pets', (await store.peek()).pet!.id));
  });
});

test('actual cloud readback refreshes cloud resources and uses read-only selection calls', async () => {
  await withHostHome(async home => {
    const { root, store, op, art } = await appearance();
    const id = (await store.peek()).pet!.id;
    const localId = `custom:${id}`;
    await store.transaction(state => {
      state.pet!.binding = { host: 'desktop', avatarId: localId, destination: path.join(home, 'pets', id) };
    });
    const readbackFile = path.join(root, 'actual-host-readback.png');
    await copyFile(art.file, readbackFile);
    const mapping = async () => ({ available: true, mappings: { [localId]: 'pet_cloudtarget' }, pending: [] });
    let cloudRefresh: string | undefined;
    await withAppTools(
      (request, socket) => socket.write(frame(settingsResponse(request.id, 'dewey'))),
      async host => {
        const previousPipe = process.env.CODEX_APP_TOOLS_PIPE_PATH;
        const previousThread = process.env.CODEX_THREAD_ID;
        process.env.CODEX_APP_TOOLS_PIPE_PATH = host.pipePath;
        process.env.CODEX_THREAD_ID = 'isolated-host-proof';
        try {
          const result = await recordHostResult(
            store,
            op,
            {
              petId: id,
              operationId: op,
              appearanceId: art.id,
              avatarId: 'pet_cloudtarget',
              updated: true,
              storedArtworkVerified: null,
              readbackFile,
              active: true,
              refreshRequested: true,
              displayStatus: 'confirmed',
              observed: 'Synthetic download from host for the exact cloud Pet ID.',
            },
            {
              mapping,
              refresh: async options => {
                cloudRefresh = options.cloudId;
                return skippedRefresh();
              },
            },
          );
          assert.equal(result.storedArtworkVerified, true);
          assert.equal(result.active, false);
          assert.equal(result.refreshRequested, false);
          assert.equal(result.displayStatus, 'unconfirmed');
          assert.equal(cloudRefresh, 'pet_cloudtarget');
          assert.ok(host.calls.length > 0);
          assert.ok(host.calls.every(call => call.params?.tool === 'read_settings'));
          await assert.rejects(
            recordHostResult(store, op, { ...result, avatarId: localId, readbackFile }, { mapping }),
            /different Avatar/,
          );
        } finally {
          if (previousPipe === undefined) delete process.env.CODEX_APP_TOOLS_PIPE_PATH;
          else process.env.CODEX_APP_TOOLS_PIPE_PATH = previousPipe;
          if (previousThread === undefined) delete process.env.CODEX_THREAD_ID;
          else process.env.CODEX_THREAD_ID = previousThread;
        }
      },
    );
  });
});

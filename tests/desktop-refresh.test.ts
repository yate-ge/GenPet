import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { refreshNativePet, isLiveDestination } from '../src/hosts/desktop/refresh.js';

test('refresh for an isolated destination reports unconfirmed and never claims automatic refresh', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'genpet-refresh-'));
  try {
    const sprite = path.join(dir, 'spritesheet.webp');
    await writeFile(sprite, Buffer.from('fixture-sprite-bytes'));
    const outcome = await refreshNativePet({
      expectedSpritePath: sprite,
      timeoutMs: 200,
    });
    assert.equal(outcome.automaticRefresh, false);
    assert.equal(outcome.displayStatus, 'unconfirmed');
    assert.equal(outcome.strategy, 'none');
    assert.equal(
      outcome.expectedSpriteSha256,
      createHash('sha256').update(Buffer.from('fixture-sprite-bytes')).digest('hex'),
    );
    assert.match(outcome.notice, /unconfirmed/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('isLiveDestination matches GenPet entries in the current Codex home unless skipped', () => {
  const home = process.env.CODEX_HOME;
  const skip = process.env.GENPET_SKIP_NATIVE_REFRESH;
  try {
    delete process.env.GENPET_SKIP_NATIVE_REFRESH;
    process.env.CODEX_HOME = '/Users/genpet-test/.codex';
    assert.equal(isLiveDestination('/Users/genpet-test/.codex/pets/genpet-companion'), true);
    assert.equal(isLiveDestination('/Users/genpet-test/.codex/pets/genpet-companion-2'), true);
    assert.equal(isLiveDestination('/Users/genpet-test/.codex/pets/unrelated-pet'), false);
    assert.equal(isLiveDestination('/Users/genpet-test/.codex/pets/genpet-a/nested'), false);
    process.env.CODEX_HOME = '/Users/genpet-test/CustomCodexHome';
    assert.equal(isLiveDestination('/Users/genpet-test/CustomCodexHome/pets/genpet-companion'), true);
    process.env.GENPET_SKIP_NATIVE_REFRESH = '1';
    assert.equal(isLiveDestination('/Users/genpet-test/.codex/pets/genpet-companion'), false);
  } finally {
    if (home === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = home;
    if (skip === undefined) delete process.env.GENPET_SKIP_NATIVE_REFRESH;
    else process.env.GENPET_SKIP_NATIVE_REFRESH = skip;
  }
});

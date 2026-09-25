import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { hashSpriteDataUrl, refreshNativePet, isLiveNativeDestination, LIVE_REFRESH_ATTEMPTS } from '../src/native-refresh.js';

test('hashSpriteDataUrl matches raw image bytes for css url and bare data url', () => {
  const bytes = Buffer.from('not-a-real-sprite');
  const b64 = bytes.toString('base64');
  const expected = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hashSpriteDataUrl(`url("data:image/webp;base64,${b64}")`), expected);
  assert.equal(hashSpriteDataUrl(`url(data:image/png;base64,${b64})`), expected);
  assert.equal(hashSpriteDataUrl(`data:image/webp;base64,${b64}`), expected);
  assert.equal(hashSpriteDataUrl('url(https://example.invalid/sprite.webp)'), null);
  assert.equal(hashSpriteDataUrl(''), null);
});

test('live refresh invalidates the host query cache and does not click settings', () => {
  assert.deepEqual([...LIVE_REFRESH_ATTEMPTS], ['cdp-query-invalidate']);
});

test('refresh without a debug channel reports unconfirmed and never claims automatic refresh', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'genpet-refresh-'));
  try {
    const sprite = path.join(dir, 'spritesheet.webp');
    await writeFile(sprite, Buffer.from('fixture-sprite-bytes'));
    const outcome = await refreshNativePet({
      expectedSpritePath: sprite,
      petId: 'custom:genpet-companion',
      debugPorts: [1], // nothing listens on port 1
      timeoutMs: 200,
      allowUiRefresh: false,
    });
    assert.equal(outcome.automaticRefresh, false);
    assert.equal(outcome.displayStatus, 'unconfirmed');
    assert.equal(outcome.strategy, 'none');
    assert.equal(outcome.expectedSpriteSha256, createHash('sha256').update(Buffer.from('fixture-sprite-bytes')).digest('hex'));
    assert.match(outcome.notice, /unconfirmed|remote-debugging/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('isLiveNativeDestination only matches the real genpet-companion entry', () => {
  const home = process.env.CODEX_HOME;
  const skip = process.env.GENPET_SKIP_NATIVE_REFRESH;
  try {
    delete process.env.GENPET_SKIP_NATIVE_REFRESH;
    process.env.CODEX_HOME = '/Users/genpet-test/.codex';
    assert.equal(isLiveNativeDestination('/Users/genpet-test/.codex/pets/genpet-companion'), true);
    assert.equal(isLiveNativeDestination('/Users/genpet-test/.codex/pets/genpet-companion-2'), false);
    process.env.CODEX_HOME = '/var/folders/xx/genpet-test/codex';
    assert.equal(isLiveNativeDestination('/var/folders/xx/genpet-test/codex/pets/genpet-companion'), false);
    process.env.CODEX_HOME = '/Users/genpet-test/CustomCodexHome';
    assert.equal(isLiveNativeDestination('/Users/genpet-test/CustomCodexHome/pets/genpet-companion'), true);
    process.env.GENPET_SKIP_NATIVE_REFRESH = '1';
    assert.equal(isLiveNativeDestination('/Users/genpet-test/.codex/pets/genpet-companion'), false);
  } finally {
    if (home === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = home;
    if (skip === undefined) delete process.env.GENPET_SKIP_NATIVE_REFRESH;
    else process.env.GENPET_SKIP_NATIVE_REFRESH = skip;
  }
});

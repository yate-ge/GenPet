import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
const verifier = path.resolve('scripts/verify-install.mjs');
const versionGate = path.resolve('scripts/verify-release-version.mjs');

test('installed verification rejects stale content, version mismatch and extra files', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'genpet-integrity-'));
  try {
    const expected = path.join(dir, 'expected'),
      installed = path.join(dir, 'installed');
    await mkdir(path.join(expected, '.codex-plugin'), { recursive: true });
    for (const name of ['package.json', '.codex-plugin/plugin.json'])
      await writeFile(path.join(expected, name), JSON.stringify({ version: '0.1.1' }));
    await writeFile(path.join(expected, 'SKILL.md'), 'Delegate image generation');
    await cp(expected, installed, { recursive: true });
    const check = () => spawnSync(process.execPath, [verifier, installed, expected], { encoding: 'utf8' });
    assert.equal(check().status, 0);
    await writeFile(path.join(installed, 'SKILL.md'), 'Do not delegate');
    assert.notEqual(check().status, 0);
    await cp(expected, installed, { recursive: true });
    await writeFile(path.join(installed, 'package.json'), JSON.stringify({ version: '0.1.0' }));
    assert.notEqual(check().status, 0);
    await cp(expected, installed, { recursive: true });
    await writeFile(path.join(installed, 'obsolete.js'), 'stale runtime');
    assert.notEqual(check().status, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('release gate rejects same-version payload changes and permits a consistent patch bump', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'genpet-version-'));
  try {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
    git('init');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    const manifests = ['package.json', 'plugins/genpet/package.json', 'plugins/genpet/.codex-plugin/plugin.json'];
    const setVersion = async (version: string) => {
      for (const f of manifests) {
        await mkdir(path.dirname(path.join(dir, f)), { recursive: true });
        await writeFile(path.join(dir, f), JSON.stringify({ version }));
      }
      await writeFile(path.join(dir, 'package-lock.json'), JSON.stringify({ version, packages: { '': { version } } }));
    };
    await setVersion('0.1.0');
    git('add', '.');
    git('commit', '-m', 'baseline');
    const check = () =>
      spawnSync(process.execPath, [versionGate], {
        cwd: dir,
        env: { ...process.env, GENPET_RELEASE_BASE: 'HEAD' },
        encoding: 'utf8',
      });
    assert.equal(check().status, 0);
    await writeFile(path.join(dir, 'plugins/genpet/SKILL.md'), 'new behavior');
    assert.notEqual(check().status, 0);
    await setVersion('0.1.1');
    assert.equal(check().status, 0);
    await writeFile(
      path.join(dir, 'package-lock.json'),
      JSON.stringify({ version: '0.1.0', packages: { '': { version: '0.1.0' } } }),
    );
    assert.notEqual(check().status, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('findCodex reports why a Codex is unusable and never replaces an explicit CODEX_BIN', async () => {
  if (process.platform === 'win32') return;
  const { findCodex } = await import('../scripts/codex-bin.mjs');
  const dir = await mkdtemp(path.join(tmpdir(), 'genpet-codex-bin-'));
  try {
    const script = async (name: string, body: string) => {
      const file = path.join(dir, name);
      await writeFile(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
      return file;
    };
    const good = await script('good', 'echo codex-cli 9.9.9');
    const old = await script('old', 'case "$1 $2" in "--version "*) echo codex-cli 0.1.0;; *) exit 2;; esac');
    const broken = path.join(dir, 'missing');
    assert.equal(findCodex({ CODEX_BIN: good }, []).version, 'codex-cli 9.9.9');
    // A Codex without the plugin subcommands is rejected with the reason, not a spawn error.
    assert.throws(() => findCodex({ CODEX_BIN: old }, [good]), /no `codex plugin marketplace add`/);
    // An explicit CODEX_BIN is not silently replaced by a bundled one.
    assert.throws(() => findCodex({ CODEX_BIN: broken }, [good]), /CODEX_BIN is not usable[\s\S]*not found/);
    // Without CODEX_BIN, an unusable PATH codex falls back to a working bundled CLI and says so.
    const found = findCodex({ PATH: dir + path.delimiter + '/nonexistent' }, [broken, good]);
    assert.equal(found.bin, good);
    assert.ok(found.note);
    assert.throws(() => findCodex({ PATH: '/nonexistent' }, [broken]), /No usable Codex CLI found/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

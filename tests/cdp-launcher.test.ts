import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installCdpLauncher, removeCdpLauncher, launcherAppPath, launchAgentPath, startupMonitorPath, CDP_PORT } from '../src/cdp-launcher.js';

test('cdp launcher writes a user-home app bundle and removes it cleanly', async () => {
  const homeDir = await mkdtemp(path.join(tmpdir(), 'genpet-launcher-'));
  try {
    const result = await installCdpLauncher({ port: CDP_PORT, homeDir });
    assert.equal(result.launcherApp, launcherAppPath(homeDir));
    assert.equal(result.port, 9222);
    await access(path.join(result.launcherApp, 'Contents', 'MacOS', 'launch-genpet-cdp'));
    const script = await readFile(path.join(result.launcherApp, 'Contents', 'MacOS', 'launch-genpet-cdp'), 'utf8');
    assert.match(script, /--remote-debugging-port/);
    assert.match(script, /ChatGPT\.app\/Contents\/MacOS\/ChatGPT/);
    const plist = await readFile(path.join(result.launcherApp, 'Contents', 'Info.plist'), 'utf8');
    assert.match(plist, /com\.genpet\.chatgpt-cdp/);
    await assert.rejects(() => access(launchAgentPath(homeDir)));
    await assert.rejects(() => access(startupMonitorPath(homeDir)));
    await removeCdpLauncher({ homeDir });
    await assert.rejects(() => access(path.join(launcherAppPath(homeDir), 'Contents', 'Info.plist')));
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
});

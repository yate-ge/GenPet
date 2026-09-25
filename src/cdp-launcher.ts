import { chmod, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const CDP_PORT = 9222;
export const LAUNCHER_APP_NAME = 'ChatGPT CDP.app';
export const CHATGPT_BINARY = '/Applications/ChatGPT.app/Contents/MacOS/ChatGPT';

export function launcherAppPath(homeDir = homedir()) {
  return path.join(homeDir, 'Applications', LAUNCHER_APP_NAME);
}

export function launchAgentPath(homeDir = homedir()) {
  return path.join(homeDir, 'Library', 'LaunchAgents', 'com.genpet.codex-cdp-bootstrap.plist');
}

export function startupMonitorPath(homeDir = homedir()) {
  return path.join(homeDir, '.genpet', 'bin', 'codex-cdp-bootstrap');
}

function launcherScript(port: number) {
  return `#!/bin/bash
# GenPet helper: start Codex/ChatGPT with a local remote-debugging port
# so GenPet can auto-refresh the same native Pet after artwork updates.
set -euo pipefail
PORT=${port}
BIN="${CHATGPT_BINARY}"
if [[ ! -x "$BIN" ]]; then
  BIN="/Applications/ChatGPT.app/Contents/MacOS/ChatGPT"
fi
if [[ ! -x "$BIN" ]]; then
  osascript -e 'display alert "ChatGPT.app was not found in /Applications." as critical' || true
  exit 1
fi
# Reuse an already-running instance if it already exposes the port.
if curl -sf -m 0.3 "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  open -a ChatGPT
  exit 0
fi
exec "$BIN" --remote-debugging-port="$PORT"
`;
}

function infoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleDisplayName</key><string>ChatGPT CDP</string>
  <key>CFBundleExecutable</key><string>launch-genpet-cdp</string>
  <key>CFBundleIdentifier</key><string>com.genpet.chatgpt-cdp</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>ChatGPT CDP</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><false/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`;
}

export async function isCdpAvailable(port = CDP_PORT) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(400) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeLegacyStartupMonitor(homeDir = homedir()) {
  const agentPath = launchAgentPath(homeDir);
  if (homeDir === homedir()) {
    const domain = `gui/${process.getuid?.() ?? 0}`;
    try {
      await execFileAsync('/bin/launchctl', ['bootout', domain, agentPath]);
    } catch { /* not loaded */ }
  }
  await rm(agentPath, { force: true });
  await rm(startupMonitorPath(homeDir), { force: true });
}

export async function installCdpLauncher(options: { port?: number; homeDir?: string } = {}) {
  const port = options.port ?? CDP_PORT;
  const homeDir = options.homeDir ?? homedir();
  await removeLegacyStartupMonitor(homeDir);
  const appRoot = launcherAppPath(homeDir);
  const contents = path.join(appRoot, 'Contents');
  const macOS = path.join(contents, 'MacOS');
  const bin = path.join(macOS, 'launch-genpet-cdp');

  await rm(appRoot, { recursive: true, force: true });
  await mkdir(macOS, { recursive: true });
  await writeFile(path.join(contents, 'Info.plist'), infoPlist());
  await writeFile(bin, launcherScript(port));
  await chmod(bin, 0o755);

  return {
    launcherApp: appRoot,
    port,
    launchAgent: { installed: false, path: launchAgentPath(homeDir) },
    howToUse: `Open ${LAUNCHER_APP_NAME} from ~/Applications only when a debugging channel is needed. No background monitor is installed.`,
    securityNote: 'The debug port listens on localhost only. Any local process could control Codex while it runs with this flag. Prefer this launcher on a personal machine; do not expose the port over the network.',
  };
}

export async function removeCdpLauncher(options: { homeDir?: string } = {}) {
  const homeDir = options.homeDir ?? homedir();
  await rm(launcherAppPath(homeDir), { recursive: true, force: true });
  await removeLegacyStartupMonitor(homeDir);
  return { removed: true };
}

export async function ensureCdpLauncher(port = CDP_PORT) {
  const app = launcherAppPath();
  try {
    await access(path.join(app, 'Contents', 'MacOS', 'launch-genpet-cdp'));
    return { installed: true, launcherApp: app, alreadyPresent: true, port };
  } catch {
    const result = await installCdpLauncher({ port });
    return { installed: true, alreadyPresent: false, ...result };
  }
}

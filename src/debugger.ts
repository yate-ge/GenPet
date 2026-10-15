import { spawn } from 'node:child_process';
import path from 'node:path';
/** `debugger`: start (or reuse) the optional local record viewer for this package's data. */
import { dataRoot, packageHost, pluginRoot } from './config.js';
import { Store } from './store.js';
export async function launchDebugger(
  port = Number(process.env.GENPET_PORT || (packageHost() === 'cloud' ? 47832 : 47831)),
) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid debugger port');
  const url = `http://127.0.0.1:${port}`,
    root = new Store(undefined, packageHost()).root;
  const health = () =>
    fetch(url + '/api/health', { signal: AbortSignal.timeout(500) }).then(
      response => response,
      () => null,
    );
  async function inspect() {
    const response = await health();
    if (!response) return false;
    const value = await response.json().catch(() => null);
    if (value?.service !== 'genpet-debugger' || value.root !== root)
      throw new Error('Debugger port belongs to another service or data directory');
    if (value.pluginRoot === pluginRoot()) return true;
    // A debugger left running by an earlier plugin version serves files that an upgrade may have removed.
    const { token } = await (await fetch(url + '/api/state')).json();
    await fetch(url + '/api/action', {
      method: 'POST',
      headers: { 'X-GenPet-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!(await health())) return false;
    }
    throw new Error('An earlier debugger is still running on this port');
  }
  if (await inspect()) return { url, reused: true };
  const child = spawn(process.execPath, [path.join(import.meta.dirname, 'debugger-server.js')], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, GENPET_PORT: String(port), GENPET_DATA_DIR: path.resolve(dataRoot()) },
  });
  let failure: Error | undefined;
  child.once('error', error => {
    failure = error;
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    if (failure) throw failure;
    await new Promise(resolve => setTimeout(resolve, 100));
    if (await inspect()) return { url, reused: false };
    if (child.exitCode !== null) throw new Error('Debugger failed to start');
  }
  throw new Error('Debugger startup timed out');
}

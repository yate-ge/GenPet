import { refreshViaIpc, type IpcRefreshEvidence } from './native-ipc.js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

export type RefreshStrategy = 'ipc-query-invalidate' | 'none';
export interface RefreshOutcome {
  automaticRefresh: boolean;
  ipc?: IpcRefreshEvidence;
  refreshRequested?: boolean;
  displayStatus: 'unconfirmed';
  strategy: RefreshStrategy;
  expectedSpriteSha256: string;
  notice: string;
  errors?: string[];
}
export interface RefreshOptions {
  expectedSpritePath: string;
  /** Override for isolated tests; null disables IPC. */
  ipcSocketPath?: string | null;
  timeoutMs?: number;
}

/** Request a refresh through the existing desktop IPC socket only. */
export async function refreshNativePet(options: RefreshOptions): Promise<RefreshOutcome> {
  const expectedSpriteSha256 = createHash('sha256')
    .update(await readFile(options.expectedSpritePath))
    .digest('hex');
  const errors: string[] = [];
  const useIpc =
    options.ipcSocketPath !== null &&
    (typeof options.ipcSocketPath === 'string' || isLiveNativeDestination(path.dirname(options.expectedSpritePath)));
  if (useIpc) {
    try {
      const ipc = await refreshViaIpc(options.ipcSocketPath ?? undefined, options.timeoutMs ?? 2000);
      return {
        automaticRefresh: true,
        refreshRequested: true,
        displayStatus: 'unconfirmed',
        strategy: 'ipc-query-invalidate',
        ipc,
        expectedSpriteSha256,
        notice:
          'Automatic refresh requested through the existing desktop IPC channel. Router relay confirmed; the displayed sprite hash was not measured.',
      };
    } catch (error) {
      errors.push(`ipc: ${(error as Error).message}`);
    }
  }
  return {
    automaticRefresh: false,
    refreshRequested: false,
    displayStatus: 'unconfirmed',
    strategy: 'none',
    expectedSpriteSha256,
    notice: useIpc
      ? 'Files committed to the same GenPet entry. IPC refresh failed; retry when the desktop is running and ready. Visible update remains unconfirmed.'
      : 'Files committed to the same GenPet entry. IPC refresh was skipped for this destination. Visible update remains unconfirmed.',
    errors: errors.length ? errors : undefined,
  };
}

export function isLiveNativeDestination(destination: string) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === '1') return false;
  const belongs = (home: string) => {
    const relative = path.relative(path.resolve(home, 'pets'), path.resolve(destination));
    return !!relative && !relative.includes(path.sep) && /^genpet-[a-zA-Z0-9_-]+$/.test(relative);
  };
  if (!process.env.CODEX_HOME && belongs(path.join(homedir(), '.codex'))) return true;
  const configured = process.env.CODEX_HOME;
  if (!configured) return false;
  const resolved = path.resolve(configured);
  // Test sandboxes point CODEX_HOME at a temp directory; never drive host UI from those.
  const temp = path.resolve(tmpdir());
  const relativeToTemp = path.relative(temp, resolved);
  if (
    configured.startsWith('/var/folders/') ||
    configured.includes('/tmp/') ||
    relativeToTemp === '' ||
    (relativeToTemp !== '..' && !relativeToTemp.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeToTemp))
  )
    return false;
  return belongs(resolved);
}

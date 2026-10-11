/** Keep test artifacts for the Drive evidence bundle; no real CODEX_HOME is modified. */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function hostTestDirectory(name: string) {
  const parent = path.resolve('output/implementation-20261011/hosts/test-data');
  await mkdir(parent, { recursive: true });
  return mkdtemp(path.join(parent, `${name}-`));
}

export const noSelection = async () => ({ available: false as const, reason: 'Isolated test has no live selection' });
export const noMigration = async () => ({ available: true, mappings: {}, pending: [] });

export async function withHostHome(run: (home: string) => Promise<void>) {
  const home = await hostTestDirectory('codex-home');
  const previousHome = process.env.CODEX_HOME;
  const previousSkip = process.env.GENPET_SKIP_NATIVE_REFRESH;
  process.env.CODEX_HOME = home;
  process.env.GENPET_SKIP_NATIVE_REFRESH = '1';
  await writeFile(path.join(home, '.codex-global-state.json'), JSON.stringify({ 'electron-persisted-atom-state': {} }));
  try {
    await run(home);
  } finally {
    if (previousHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousHome;
    if (previousSkip === undefined) delete process.env.GENPET_SKIP_NATIVE_REFRESH;
    else process.env.GENPET_SKIP_NATIVE_REFRESH = previousSkip;
  }
}

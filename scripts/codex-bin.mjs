/**
 * Find a working Codex CLI for install and release checks. A broken or too old `codex` fails with the reason
 * instead of `spawn ENOENT`; an explicit CODEX_BIN is never replaced by another binary.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Subcommands the install flow needs; a Codex without them cannot be used for the check. */
const REQUIRED = [
  ['plugin', 'marketplace', 'add', '--help'],
  ['plugin', 'add', '--help'],
];
/** Where desktop apps bundle their own CLI (macOS). Tried only when `codex` on PATH is unusable. */
export const BUNDLED = [
  '/Applications/Codex.app/Contents/Resources/codex-cli/bin/codex',
  '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
];

function probe(bin) {
  const run = args =>
    execFileSync(bin, args, { encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let version;
  try {
    version = run(['--version']);
  } catch (error) {
    const detail = String(error.stderr || '')
      .trim()
      .split('\n')[0];
    return { ok: false, reason: error.code === 'ENOENT' ? 'not found' : detail || error.message };
  }
  for (const args of REQUIRED) {
    try {
      run(args);
    } catch {
      return { ok: false, version, reason: `this version has no \`codex ${args.slice(0, -1).join(' ')}\`` };
    }
  }
  return { ok: true, version };
}

/** @returns {{ bin: string, version: string, source: string, note?: string }} */
export function findCodex(env = process.env, bundled = BUNDLED) {
  const tried = [];
  const attempt = (source, bin) => {
    const result = probe(bin);
    if (result.ok) return { bin, version: result.version, source };
    tried.push(`  - ${source} (${bin}): ${result.reason}${result.version ? ` [${result.version}]` : ''}`);
    return null;
  };
  if (env.CODEX_BIN) {
    const found = attempt('CODEX_BIN', env.CODEX_BIN);
    if (found) return found;
    throw new Error(`CODEX_BIN is not usable:\n${tried.join('\n')}\nFix it or unset it to search for another Codex.`);
  }
  const first = attempt('PATH', 'codex');
  if (first) return first;
  for (const bin of bundled.filter(existsSync)) {
    const found = attempt('app bundle', bin);
    if (found) return { ...found, note: `\`codex\` on PATH is unusable, so the CLI bundled with the app is used.` };
  }
  throw new Error(
    `No usable Codex CLI found:\n${tried.join('\n')}\nReinstall (npm i -g @openai/codex) or point CODEX_BIN at a working codex.`,
  );
}

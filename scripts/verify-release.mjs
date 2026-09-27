/** Verify the plugin people install from GitHub without modifying the real Codex Pet. */
import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'plugins', 'genpet');
const codex = process.env.CODEX_BIN || 'codex';
function run(label, command, args, cwd = root, env = process.env) {
  const started = Date.now();
  try {
    // Windows exposes npm as a .cmd shim, which execFileSync cannot spawn directly.
    const executable = process.platform === 'win32' && command === 'npm' ? process.execPath : command;
    const arguments_ = executable !== command ? [process.env.npm_execpath, ...args] : args;
    const output = execFileSync(executable, arguments_, { cwd, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    console.log(`${label}: passed (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return output;
  } catch (error) {
    console.error(`${label}: failed`);
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
}
const exists = file => access(file).then(() => true, () => false);

run('Source checks', 'npm', ['run', 'verify:fast']);
run('Build committed plugin', 'npm', ['run', 'build:plugin']);
run('Release version', 'npm', ['run', 'verify:version']);

for (const relative of ['README.md', 'dist/debugger-server.js', 'debugger-web/index.html', 'skills/genpet-debugger/SKILL.md', 'dist/cli.js', 'dist/webp_dec.wasm', 'skills/genpet/SKILL.md', 'vendor/hatch-pet/SKILL.md', 'scripts/audit_atlas_growth.py']) {
  assert.ok(await exists(path.join(plugin, relative)), `Missing from plugin: ${relative}`);
}
for (const relative of ['.mcp.json', 'dist/mcp.js', 'assets', 'src', 'tests', 'node_modules', 'scripts/package.ts', 'docs/RESEARCH.md']) {
  assert.equal(await exists(path.join(plugin, relative)), false, `Developer-only path leaked into plugin: ${relative}`);
}

const temporary = await mkdtemp(path.join(tmpdir(), 'genpet-release-check-'));
try {
  // The repository root is the marketplace; a local path exercises the same layout as `owner/repo`.
  const isolatedEnv = { ...process.env, CODEX_HOME: path.join(temporary, 'codex-home') };
  await mkdir(isolatedEnv.CODEX_HOME, { recursive: true });
  run('Register repository marketplace', codex, ['plugin', 'marketplace', 'add', root, '--json'], root, isolatedEnv);
  run('Install plugin', codex, ['plugin', 'add', 'genpet@genpet', '--json'], root, isolatedEnv);
  const cache = path.join(isolatedEnv.CODEX_HOME, 'plugins', 'cache', 'genpet', 'genpet');
  const [version] = await readdir(cache);
  const installed = path.join(cache, version);
  const { version: expected } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const installedVersion = JSON.parse(await readFile(path.join(installed, '.codex-plugin/plugin.json'), 'utf8')).version;
  assert.equal(installedVersion, expected);
  run('Installed package integrity', process.execPath, [path.join(root, 'scripts', 'verify-install.mjs'), installed, plugin]);
  // The installed copy lives outside the repository, so no dependency can resolve from its node_modules.
  run('Installed CLI smoke', process.execPath, [path.join(root, 'scripts', 'smoke-installed.mjs'), installed, root]);
  run('Installed optional debugger', process.execPath, [path.join(root, 'scripts', 'smoke-debugger.mjs'), installed]);
  console.log(`Plugin ${version} verified in an isolated Codex home. The installed user Pet was not changed.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

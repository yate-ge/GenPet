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
    const output = execFileSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
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
run('Compile smoke helpers', 'npm', ['run', 'build']);
run('Build committed plugin', 'npm', ['run', 'build:plugin']);

for (const relative of ['.mcp.json', 'README.md', 'dist/mcp.js', 'dist/cli.js', 'dist/webp_dec.wasm', 'skills/genpet/SKILL.md', 'vendor/hatch-pet/SKILL.md', 'scripts/audit_atlas_growth.py']) {
  assert.ok(await exists(path.join(plugin, relative)), `Missing from plugin: ${relative}`);
}
for (const relative of ['assets', 'src', 'tests', 'node_modules', 'scripts/package.ts', 'docs/RESEARCH.md']) {
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
  assert.equal(await exists(path.join(installed, 'node_modules')), false, 'Installed plugin must not depend on node_modules');
  const { version: expected } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.ok(version.startsWith(expected), `Installed ${version}, expected ${expected}`);
  // The installed copy lives outside the repository, so no dependency can resolve from its node_modules.
  run('Isolated plugin lifecycle', process.execPath, [path.join(root, 'scripts', 'smoke-installed.mjs'), installed, root]);
  console.log(`Plugin ${version} verified in an isolated Codex home. The installed user Pet was not changed.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

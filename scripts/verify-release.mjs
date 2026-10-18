/** Verify the plugin people install from GitHub without modifying the real Codex Pet. */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { access, mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { findCodex } from './codex-bin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'plugins', 'genpet');
const evidenceRoot = path.resolve(process.env.GENPET_TEST_EVIDENCE_DIR || path.join(root, 'output/release-tests'));
await mkdir(evidenceRoot, { recursive: true });
const checkLogs = await mkdtemp(path.join(evidenceRoot, 'checks-'));
function run(label, command, args, cwd = root, env = process.env) {
  const started = Date.now();
  // Windows exposes npm as a .cmd shim, which cannot be spawned directly.
  const executable = process.platform === 'win32' && command === 'npm' ? process.execPath : command;
  const arguments_ = executable !== command ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, arguments_, {
    cwd,
    env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  writeFileSync(
    path.join(checkLogs, label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json'),
    JSON.stringify(
      {
        label,
        command: executable,
        args: arguments_,
        cwd,
        startedAt: started,
        endedAt: Date.now(),
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        ...(result.error ? { error: result.error.message } : {}),
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
  if (result.error || result.status !== 0) {
    console.error(`${label}: failed`);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed; full output retained in ${checkLogs}`, { cause: result.error });
  }
  console.log(`${label}: passed (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return result.stdout;
}
const exists = file =>
  access(file).then(
    () => true,
    () => false,
  );

run('Source checks', 'npm', ['run', 'verify:fast']);
run('Build committed plugin', 'npm', ['run', 'build:plugin']);
run('Release version', 'npm', ['run', 'verify:version']);

for (const relative of [
  'README.md',
  'dist/debugger-server.js',
  'debugger-web/index.html',
  'skills/genpet-debugger/SKILL.md',
  'dist/cli.js',
  'dist/webp_dec.wasm',
  'skills/genpet-story/SKILL.md',
  'skills/genpet/rules.md',
  'skills/genpet/host/units.json',
  'skills/genpet/flows/stories.md',
  'vendor/hatch-pet/SKILL.md',
]) {
  assert.ok(await exists(path.join(plugin, relative)), `Missing from plugin: ${relative}`);
}
for (const relative of [
  '.mcp.json',
  'dist/mcp.js',
  'assets/examples',
  'assets/pets',
  'src',
  'prompts',
  'references',
  'tests',
  'node_modules',
  'scripts/package.ts',
  'docs/RESEARCH.md',
]) {
  assert.equal(await exists(path.join(plugin, relative)), false, `Developer-only path leaked into plugin: ${relative}`);
}

const found = findCodex();
const codex = found.bin;
console.log(`Codex CLI: ${found.version} (${found.source}: ${codex})`);
if (found.note) console.warn(`Note: ${found.note}`);
const temporary = await mkdtemp(path.join(evidenceRoot, 'release-'));
try {
  // The repository root is the marketplace; a local path exercises the same layout as `owner/repo`.
  const isolatedEnv = { ...process.env, CODEX_HOME: path.join(temporary, 'codex-home') };
  await mkdir(isolatedEnv.CODEX_HOME, { recursive: true });
  run('Register repository marketplace', codex, ['plugin', 'marketplace', 'add', root, '--json'], root, isolatedEnv);
  const marketplaceCommit = run('Marketplace source commit', 'git', ['rev-parse', 'HEAD']).trim();
  for (const name of ['genpet']) {
    const sourcePlugin = path.join(root, 'plugins', name);
    run(`Install ${name}`, codex, ['plugin', 'add', `${name}@genpet`, '--json'], root, isolatedEnv);
    const cache = path.join(isolatedEnv.CODEX_HOME, 'plugins', 'cache', 'genpet', name);
    const [version] = await readdir(cache);
    const installed = path.join(cache, version);
    const { version: expected } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    const installedVersion = JSON.parse(
      await readFile(path.join(installed, '.codex-plugin/plugin.json'), 'utf8'),
    ).version;
    assert.equal(installedVersion, expected);
    const integrity = run(`${name} package integrity`, process.execPath, [
      path.join(root, 'scripts', 'verify-install.mjs'),
      installed,
      sourcePlugin,
    ]);
    console.log(integrity.trim());
    // The installed copy lives outside the repository, so no dependency can resolve from its node_modules.
    run('Installed CLI smoke', process.execPath, [path.join(root, 'scripts', 'smoke-installed.mjs'), installed, root]);
    run('Installed optional debugger', process.execPath, [path.join(root, 'scripts', 'smoke-debugger.mjs'), installed]);
    console.log(
      `${name}: source commit ${marketplaceCommit}, version ${version}, installed path ${installed} (isolated).`,
    );
  }
} finally {
  console.log(`Release fixtures retained: ${temporary}`);
}

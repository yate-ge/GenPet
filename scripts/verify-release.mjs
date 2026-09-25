/** Verify the archive people will install without modifying the real Codex Pet. */
import { execFileSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
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

run('Source checks', 'npm', ['run', 'verify:fast']);
run('Fresh release archives', 'npm', ['run', 'package:plugin']);

const temporary = await mkdtemp(path.join(tmpdir(), 'genpet-release-check-'));
try {
  run('Unpack release ZIP', 'unzip', ['-q', path.join(root, 'output', `genpet-${version}.zip`), '-d', temporary]);
  const unpacked = path.join(temporary, 'genpet');
  for (const relative of ['.agents/plugins/marketplace.json', 'genpet/.mcp.json', 'genpet/README.md', 'genpet/skills/genpet/SKILL.md', 'genpet/vendor/hatch-pet/SKILL.md', 'genpet/scripts/audit_atlas_growth.py']) {
    await access(path.join(temporary, relative));
  }
  for (const relative of ['genpet/assets', 'genpet/src', 'genpet/tests', 'genpet/scripts/package.ts', 'genpet/docs/RESEARCH.md']) {
    assert.equal(await access(path.join(temporary, relative)).then(() => true, () => false), false, `Developer-only path leaked into release: ${relative}`);
  }
  run('Install archive dependencies', 'npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], unpacked);
  const isolatedEnv = { ...process.env, CODEX_HOME: path.join(temporary, 'codex-home') };
  await mkdir(isolatedEnv.CODEX_HOME, { recursive: true });
  run('Register archive marketplace', 'codex', ['plugin', 'marketplace', 'add', temporary, '--json'], root, isolatedEnv);
  run('Install archive plugin', 'codex', ['plugin', 'add', 'genpet@genpet-local', '--json'], root, isolatedEnv);
  run('Isolated plugin lifecycle', process.execPath, [path.join(root, 'scripts', 'smoke-installed.mjs'), unpacked, root]);
  console.log('Release archive verified in an isolated Codex home. The installed user Pet was not changed.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

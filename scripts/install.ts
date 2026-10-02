/** Explicit local developer installation. Never changes Pet data or creates schedules. */
import { readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const name = process.argv[2] || 'genpet';
if (!['genpet', 'genpet-dots'].includes(name)) throw new Error('Choose genpet or genpet-dots');
const root = await realpath(path.resolve(import.meta.dirname, '..'));
const catalog = JSON.parse(await readFile(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
const marketplace = catalog.name;
const codex = process.env.CODEX_BIN || 'codex';
const run = (args: string[]) => execFileSync(codex, args, { encoding: 'utf8' });
const list = () => JSON.parse(run(['plugin', 'marketplace', 'list', '--json'])).marketplaces;
const previous = list().find((entry: { name: string }) => entry.name === marketplace);
if (previous && await realpath(previous.root) !== root) {
  throw new Error(`Marketplace ${marketplace} already uses ${previous.root}. This command installs the local checkout; use docs/NEW_VERSION_VALIDATION.zh-CN.md or explicitly configure the intended source first.`);
}
run(['plugin', 'marketplace', 'add', root, '--json']);
run(['plugin', 'marketplace', 'upgrade', marketplace, '--json']);
const refreshed = list().find((entry: { name: string }) => entry.name === marketplace);
if (!refreshed || await realpath(refreshed.root) !== root) throw new Error('Refreshed marketplace does not match this checkout');
const source = path.join(refreshed.root, 'plugins', name);
const version = JSON.parse(await readFile(path.join(source, '.codex-plugin/plugin.json'), 'utf8')).version;
run(['plugin', 'add', `${name}@${marketplace}`, '--json']);
const installed = path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'plugins/cache', marketplace, name, version);
const verification = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/verify-install.mjs'), installed, source], { encoding: 'utf8' }));
const marketplaceCommit = execFileSync('git', ['-C', refreshed.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const hasLocalChanges = !!execFileSync('git', ['-C', refreshed.root, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
console.log(JSON.stringify({ ...verification, marketplace, marketplaceCommit, hasLocalChanges, note: 'New chats load updated skills. This installation did not modify a Pet or create a schedule.' }, null, 2));

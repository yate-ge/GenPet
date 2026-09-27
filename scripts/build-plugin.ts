/**
 * Rebuilds generated runtime files in the canonical plugin at plugins/genpet/.
 * The repository root is a Codex marketplace (.agents/plugins/marketplace.json), so
 * `codex plugin marketplace add yate-ge/GenPet` installs this directory directly.
 * Hand-authored plugin files live there directly; only dist/ and package.json are generated.
 */
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';

const source = path.resolve(import.meta.dirname, '..');
const target = path.join(source, 'plugins', 'genpet');
const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(target, '.codex-plugin', 'plugin.json'), 'utf8'));
if (manifest.version !== pkg.version) throw new Error(`.codex-plugin/plugin.json version ${manifest.version} differs from package.json ${pkg.version}`);

const requiredStaticFiles = [
  'README.md', 'config/policy.json', 'debugger-web/index.html',
  'skills/genpet/SKILL.md', 'vendor/hatch-pet/SKILL.md',
  'docs/DEBUG_COMMANDS.zh-CN.md', 'scripts/verify-install.mjs',
];
for (const relative of requiredStaticFiles) await access(path.join(target, relative));
// Static plugin content is canonical in plugins/genpet. Only generated output is cleaned.
await rm(path.join(target, 'dist'), { recursive: true, force: true });
await mkdir(target, { recursive: true });

await build({
  entryPoints: { cli: 'src/cli.ts', 'debugger-server': 'src/debugger-server.ts' },
  absWorkingDir: source,
  outdir: path.join(target, 'dist'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'eof',
  logLevel: 'warning',
  // Bundled CommonJS dependencies still call require() for Node built-ins.
  banner: { js: "import { createRequire as __genpetCreateRequire } from 'node:module'; const require = __genpetCreateRequire(import.meta.url);" },
});
const wasm = createRequire(import.meta.url).resolve('@jsquash/webp/codec/dec/webp_dec.wasm');
await cp(wasm, path.join(target, 'dist', 'webp_dec.wasm'));

const runtimePackage = {
  bin: { genpet: 'dist/cli.js' }, name: pkg.name, version: pkg.version, private: true, type: 'module', license: pkg.license,
  description: pkg.description, engines: pkg.engines,
  scripts: { 'pet:status': 'node dist/cli.js status', 'pet:adopt': 'node dist/cli.js adopt', 'pet:install': 'node dist/cli.js install-native' },
};
await writeFile(path.join(target, 'package.json'), JSON.stringify(runtimePackage, null, 2) + '\n');
console.log(`Built ${path.relative(source, target)} (v${pkg.version})`);

// Reject obsolete desktop debugging integration in every published text file.
async function verifyRefreshTransport(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await verifyRefreshTransport(file);
    else if (/\.(?:js|json|md|ts|py|yaml|yml)$/.test(entry.name)) {
      const text = await readFile(file, 'utf8');
      if (/\bcdp\b|remote-debugging|DevToolsActivePort|webSocketDebuggerUrl|Runtime\.evaluate/i.test(text)) {
        throw new Error(`Obsolete refresh integration in published file: ${path.relative(target, file)}`);
      }
    }
  }
}
await verifyRefreshTransport(target);

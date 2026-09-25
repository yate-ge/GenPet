/**
 * Builds the committed, installable plugin in plugins/genpet/.
 * The repository root is a Codex marketplace (.agents/plugins/marketplace.json), so
 * `codex plugin marketplace add yate-ge/GenPet` installs this directory directly.
 * Everything is bundled into dist/, so the installed plugin needs no npm install.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import { copyRuntimeFiles } from './runtime-layout.js';

const source = path.resolve(import.meta.dirname, '..');
const target = path.join(source, 'plugins', 'genpet');
const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(source, '.codex-plugin', 'plugin.json'), 'utf8'));
if (manifest.version !== pkg.version) throw new Error(`.codex-plugin/plugin.json version ${manifest.version} differs from package.json ${pkg.version}`);

// A clean directory prevents removed files from lingering in the committed plugin.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await copyRuntimeFiles(source, target);

await build({
  entryPoints: { mcp: 'src/mcp.ts', cli: 'src/cli.ts' },
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
  name: pkg.name, version: pkg.version, private: true, type: 'module', license: pkg.license,
  description: pkg.description, engines: pkg.engines,
  scripts: { start: 'node dist/mcp.js', 'pet:status': 'node dist/cli.js status', 'pet:adopt': 'node dist/cli.js adopt', 'pet:install': 'node dist/cli.js install-native' },
};
await writeFile(path.join(target, 'package.json'), JSON.stringify(runtimePackage, null, 2) + '\n');
console.log(`Built ${path.relative(source, target)} (v${pkg.version})`);

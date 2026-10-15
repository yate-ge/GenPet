/**
 * Build the desktop plugin package in place.
 * plugins/genpet is the only copy of the skills, debugger page, manifest, host config and README; edit it directly.
 * Generated: dist/ (bundled runtime) and package.json.
 */
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';

const source = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));

for (const name of ['genpet']) {
  const target = path.join(source, 'plugins', name);
  const manifest = JSON.parse(await readFile(path.join(target, '.codex-plugin/plugin.json'), 'utf8'));
  if (manifest.version !== pkg.version) throw new Error(`Version mismatch: ${name}`);
  for (const required of ['README.md', 'config/host.json', 'scripts/verify-install.mjs'])
    await access(path.join(target, required));

  await rm(path.join(target, 'dist'), { recursive: true, force: true });
  await mkdir(path.join(target, 'dist'), { recursive: true });
  await build({
    entryPoints: { cli: 'src/cli.ts', 'debugger-server': 'src/debugger/server.ts' },
    absWorkingDir: source,
    outdir: path.join(target, 'dist'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    legalComments: 'eof',
    logLevel: 'warning',
    banner: {
      js: "import { createRequire as __genpetCreateRequire } from 'node:module'; const require = __genpetCreateRequire(import.meta.url);",
    },
  });
  await cp(
    createRequire(import.meta.url).resolve('@jsquash/webp/codec/dec/webp_dec.wasm'),
    path.join(target, 'dist/webp_dec.wasm'),
  );
  const generated = {
    name,
    version: pkg.version,
    private: true,
    type: 'module',
    license: pkg.license,
    description: pkg.description,
    engines: pkg.engines,
    bin: { [name]: 'dist/cli.js' },
    scripts: { 'pet:status': 'node dist/cli.js status' },
  };
  await writeFile(path.join(target, 'package.json'), JSON.stringify(generated, null, 2) + '\n');
  console.log(`Built ${name} v${pkg.version}`);
}

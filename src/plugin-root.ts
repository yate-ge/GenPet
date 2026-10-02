import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve the canonical plugin package in source, compiled-dev, and installed layouts. */
export function pluginRoot(): string {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(moduleDirectory, '..'), path.resolve(moduleDirectory, '..', 'plugins', 'genpet')];
  return (
    candidates.find(candidate => existsSync(path.join(candidate, '.codex-plugin', 'plugin.json'))) ?? candidates[0]
  );
}

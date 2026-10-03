/** Where things live: the plugin package, its host, data, Codex home and prompt files. */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Host } from './model.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The plugin package in source, compiled-dev and installed layouts. */
export function pluginRoot(): string {
  const candidates = [path.resolve(here, '..'), path.resolve(here, '..', 'plugins', 'genpet')];
  return candidates.find(dir => existsSync(path.join(dir, '.codex-plugin', 'plugin.json'))) ?? candidates[0];
}

/** Each package declares its host in config/host.json. */
export function packageHost(): Host {
  const file = path.join(pluginRoot(), 'config', 'host.json');
  const host = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).host : 'desktop';
  if (!['desktop', 'dots'].includes(host)) throw new Error('Invalid package host');
  return host;
}

export const dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), '.genpet');
export const codexHome = () => process.env.CODEX_HOME || path.join(homedir(), '.codex');

/** Source runs read the editable framework/; installed bundles read their own copy. */
function readPromptFile(fileName: string) {
  const candidates = [
    path.resolve(here, '..', 'framework', 'prompts', fileName),
    path.join(pluginRoot(), 'prompts', fileName),
  ];
  const file = candidates.find(existsSync);
  if (!file) throw new Error(`Missing prompt file: ${fileName}`);
  return readFileSync(file, 'utf8');
}

export function readPrompt(name: string) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Invalid prompt module');
  return readPromptFile(`${name}.md`);
}

export interface UnitDefinition {
  /** The role that owns the unit (documentation; see framework/references/generation-units.md). */
  designer?: string;
  inputs: string[];
  result: Record<string, 'string' | 'array' | 'object' | 'nullable-string' | 'nullable-object'>;
  choices?: Record<string, string[]>;
}

export function readUnits(): Record<string, UnitDefinition> {
  return JSON.parse(readPromptFile('units.json')).units;
}

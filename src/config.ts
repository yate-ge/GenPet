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
  if (!['desktop', 'cloud'].includes(host)) throw new Error('Invalid package host');
  return host;
}

export const dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), '.genpet');
export const codexHome = () => process.env.CODEX_HOME || path.join(homedir(), '.codex');

/** The genpet skill holds rules, units and flows; source runs and installs read the same plugin directory. */
function readSkillFile(relative: string) {
  const file = path.join(pluginRoot(), 'skills', 'genpet', relative);
  if (!existsSync(file)) throw new Error(`Missing skill file: ${relative}`);
  return readFileSync(file, 'utf8');
}

export interface UnitDefinition {
  /** Unit prompt inside the genpet skill, next to the role that owns it. */
  file: string;
  /** The role that owns the unit (documentation; see host/units.md). */
  designer?: string;
  inputs: string[];
  result: Record<string, 'string' | 'array' | 'object' | 'nullable-string' | 'nullable-object'>;
  choices?: Record<string, string[]>;
}

export function readUnits(): Record<string, UnitDefinition> {
  return JSON.parse(readSkillFile('host/units.json')).units;
}

/** `meta` is the product rules; every other module is a unit named in units.json. */
export function readPrompt(name: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) throw new Error('Invalid prompt module');
  if (name === 'meta') return readSkillFile('rules.md');
  const unit = readUnits()[name];
  if (!unit) throw new Error(`Unknown prompt module: ${name}`);
  return readSkillFile(unit.file);
}

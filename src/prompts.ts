import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pluginRoot } from './plugin-root.js';
import type { Host } from './core.js';
export function packageHost(): Host {
  const file = path.join(pluginRoot(),'config','host.json');
  const host = existsSync(file) ? JSON.parse(readFileSync(file,'utf8')).host : 'desktop';
  if (!['desktop','dots'].includes(host)) throw new Error('Invalid package host');
  return host;
}
function readPromptFile(fileName: string) {
  // Source development reads the editable framework; installed bundles read their own copy.
  const candidates=[path.resolve(import.meta.dirname,'..','framework','prompts',fileName),path.join(pluginRoot(),'prompts',fileName)];
  const file=candidates.find(existsSync); if(!file)throw new Error(`Missing prompt file: ${fileName}`);
  return readFileSync(file,'utf8');
}
export function readPrompt(name: string) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Invalid prompt module');
  return readPromptFile(`${name}.md`);
}
export interface UnitDefinition {
  inputs: string[];
  result: Record<string, 'string' | 'array' | 'object' | 'nullable-string' | 'nullable-object'>;
  choices?: Record<string,string[]>;
}
export function readUnits(): Record<string, UnitDefinition> {
  return JSON.parse(readPromptFile('units.json')).units;
}

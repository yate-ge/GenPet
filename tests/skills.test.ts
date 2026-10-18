import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pluginRoot, readPrompt, readUnits } from '../src/config.js';

const plugin = pluginRoot();
const skills = path.join(plugin, 'skills');

async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (/\.(md|json|ya?ml)$/.test(entry.name)) yield file;
  }
}

test('every unit and the principles can be served as a prompt', () => {
  assert.ok(readPrompt('meta').length > 0);
  for (const name of Object.keys(readUnits())) assert.ok(readPrompt(name).length > 0, name);
});

test('relative links in the skills resolve', async () => {
  const broken: string[] = [];
  for await (const file of files(skills)) {
    if (!file.endsWith('.md')) continue;
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/\]\(([^)<>#\s]+)(?:#[^)]*)?\)/g)) {
      const target = match[1];
      if (/^[a-z]+:/i.test(target)) continue;
      if (!existsSync(path.resolve(path.dirname(file), target)))
        broken.push(`${path.relative(skills, file)} -> ${target}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('the skills and vendored docs carry no development or test material', async () => {
  const found: string[] = [];
  const pattern = /tests\/|output\/|CASES|Notion|Google Drive/;
  for (const dir of [skills, path.join(plugin, 'vendor', 'hatch-pet')]) {
    for await (const file of files(dir)) {
      if (pattern.test(await readFile(file, 'utf8'))) found.push(path.relative(plugin, file));
    }
  }
  assert.deepEqual(found, []);
});

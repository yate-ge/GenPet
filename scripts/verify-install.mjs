/** Compare an installed plugin with the refreshed marketplace package. No Pet state is read or written. */
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [installed, expected] = process.argv.slice(2);
if (!installed || !expected) throw new Error('Usage: node verify-install.mjs INSTALLED_PLUGIN EXPECTED_MARKETPLACE_PLUGIN');
async function inventory(root, relative = '') {
  const result = {};
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(result, await inventory(root, name));
    else if (entry.isFile()) result[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
    else throw new Error(`Unexpected non-regular package entry: ${name}`);
  }
  return result;
}
const versions = [];
for (const root of [expected, installed]) {
  for (const file of ['package.json', '.codex-plugin/plugin.json']) {
    versions.push(JSON.parse(await readFile(path.join(root, file), 'utf8')).version);
  }
}
if (!versions[0] || versions.some(v => v !== versions[0])) throw new Error('Installed/source manifest versions differ');
const [actual, wanted] = await Promise.all([inventory(installed), inventory(expected)]);
const mismatches = [...new Set([...Object.keys(actual), ...Object.keys(wanted)])].filter(f => actual[f] !== wanted[f]);
if (mismatches.length) throw new Error(`Installed package differs from marketplace: ${mismatches.join(', ')}`);
console.log(JSON.stringify({ok:true, version:versions[0], installed:path.resolve(installed), expected:path.resolve(expected), verifiedFiles:Object.keys(wanted).length}));

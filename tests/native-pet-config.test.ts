import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'smol-toml';
import { saveNativePetSelection } from '../src/native-pet-config.js';

async function fixture(run: (home: string, config: string) => Promise<void>) {
  const home = await mkdtemp(path.join(tmpdir(), 'genpet-config-test-'));
  try {
    await mkdir(path.join(home, 'pets', 'test-pet'), { recursive: true });
    await writeFile(path.join(home, 'pets', 'test-pet', 'pet.json'), '{}');
    await run(home, path.join(home, 'config.toml'));
  } finally { await rm(home, { recursive: true, force: true }); }
}

test('saving a startup pet preserves comments, CRLF, large integers and other tables', async () => {
  await fixture(async (home, config) => {
    const original = '# settings\r\nlarge = 9223372036854775807\r\n[desktop] # desktop comment\r\n  selected-avatar-id = "old"  # keep this\r\npet-size = 112\r\n[other]\r\ntext = "unchanged"\r\n';
    await writeFile(config, original);
    const result = await saveNativePetSelection('custom:test-pet', home);
    assert.equal(await readFile(config, 'utf8'), original.replace('"old"', '"custom:test-pet"'));
    assert.equal(await readFile(result.backupPath!, 'utf8'), original);
    assert.equal(result.restartRequired, true);
    assert.equal(result.immediate, false);
  });
});

test('adds a missing key, missing table, or new config without losing data', async () => {
  for (const original of ['[desktop]\nsize = 112\n[other]\nkeep = true\n', 'model = "example"\n', undefined]) {
    await fixture(async (home, config) => {
      if (original !== undefined) await writeFile(config, original);
      const result = await saveNativePetSelection('custom:test-pet', home);
      const actual = parse(await readFile(config, 'utf8'), { integersAsBigInt: true });
      const expected = parse(original ?? '', { integersAsBigInt: true });
      expected.desktop ??= Object.create(null);
      (expected.desktop as Record<string, unknown>)['selected-avatar-id'] = 'custom:test-pet';
      assert.deepEqual(actual, expected);
      assert.equal(Boolean(result.backupPath), original !== undefined);
    });
  }
});

test('a saved value is a no-op without a backup or file timestamp change', async () => {
  await fixture(async (home, config) => {
    const original = '[desktop]\nselected-avatar-id = "custom:test-pet" # already selected\n';
    await writeFile(config, original);
    const previous = await stat(config);
    const result = await saveNativePetSelection('custom:test-pet', home);
    assert.equal(result.backupPath, undefined);
    assert.equal((await stat(config)).mtimeMs, previous.mtimeMs);
    assert.equal(await readFile(config, 'utf8'), original);
    assert.deepEqual((await readdir(home)).sort(), ['config.toml', 'pets']);
  });
});

test('unknown pet IDs and invalid TOML are rejected without altering config', async () => {
  await fixture(async (home, config) => {
    const valid = '[desktop]\nselected-avatar-id = "old"\n';
    await writeFile(config, valid);
    await assert.rejects(saveNativePetSelection('custom:unknown', home), /Unknown native pet ID/);
    assert.equal(await readFile(config, 'utf8'), valid);
    const invalid = '[desktop\nselected-avatar-id = "old"\n';
    await writeFile(config, invalid);
    await assert.rejects(saveNativePetSelection('custom:test-pet', home));
    assert.equal(await readFile(config, 'utf8'), invalid);
    assert.deepEqual((await readdir(home)).sort(), ['config.toml', 'pets']);
  });
});

test('unsupported layouts and misleading multiline strings cannot modify unrelated data', async () => {
  for (const original of [
    'desktop = { selected-avatar-id = "old", keep = 1 }\n',
    'desktop.selected-avatar-id = "old"\n',
    'note = """\n[desktop]\nselected-avatar-id = "old"\n"""\n',
    '[desktop]\nselected-avatar-id = """old\nvalue"""\n',
  ]) {
    await fixture(async (home, config) => {
      await writeFile(config, original);
      await assert.rejects(saveNativePetSelection('custom:test-pet', home), /Cannot safely edit/);
      assert.equal(await readFile(config, 'utf8'), original);
      assert.deepEqual((await readdir(home)).sort(), ['config.toml', 'pets']);
    });
  }
});

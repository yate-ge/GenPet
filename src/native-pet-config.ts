import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse, type TomlTable } from 'smol-toml';
import { getNativePetCatalog } from './native-pets.js';

export interface SavedNativePetSelection {
  selectedPetId: string;
  restartRequired: true;
  immediate: false;
  backupPath?: string;
}

const field = 'selected-avatar-id';
const unsupported = 'Cannot safely edit desktop.selected-avatar-id in this TOML layout; config.toml was not changed.';

async function readOptional(file: string): Promise<Buffer | undefined> {
  try { return await readFile(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function patchSelection(text: string, before: TomlTable, petId: string): string {
  const desktop = before.desktop;
  if (desktop !== undefined && (desktop === null || typeof desktop !== 'object' || Object.getPrototypeOf(desktop) !== null)) {
    throw new Error(unsupported);
  }
  const table = desktop as TomlTable | undefined;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const value = JSON.stringify(petId);
  const headers = [...text.matchAll(/^[\t ]*\[[\t ]*desktop[\t ]*\][\t ]*(?:#[^\r\n]*)?(?:\r?\n|$)/gm)];
  let updated: string;
  if (headers.length === 0) {
    if (table !== undefined) throw new Error(unsupported);
    updated = `${text}${text && !text.endsWith('\n') ? eol : ''}${text ? eol : ''}[desktop]${eol}${field} = ${value}${eol}`;
  } else {
    if (headers.length !== 1 || table === undefined) throw new Error(unsupported);
    const header = headers[0];
    const start = header.index! + header[0].length;
    const rest = text.slice(start);
    const nextHeader = /^[\t ]*\[/m.exec(rest);
    const end = start + (nextHeader?.index ?? rest.length);
    if (Object.hasOwn(table, field)) {
      const entries = [...text.slice(start, end).matchAll(/^([\t ]*(?:selected-avatar-id|"selected-avatar-id"|'selected-avatar-id')[\t ]*=[\t ]*)("(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*')([\t ]*(?:#[^\r\n]*)?)(\r?\n|$)/gm)];
      if (entries.length !== 1) throw new Error(unsupported);
      const entry = entries[0];
      const offset = start + entry.index!;
      updated = text.slice(0, offset) + entry[1] + value + entry[3] + entry[4] + text.slice(offset + entry[0].length);
    } else {
      updated = text.slice(0, start) + (header[0].endsWith('\n') ? '' : eol) + `${field} = ${value}${eol}` + text.slice(start);
    }
  }
  // A regex can encounter header-like text inside multiline TOML strings. Reject
  // any patch whose parsed meaning changes anything other than this one field.
  const after = parse(updated, { integersAsBigInt: true });
  const expectedDesktop: TomlTable = table ?? Object.create(null);
  expectedDesktop[field] = petId;
  before.desktop = expectedDesktop;
  if (!isDeepStrictEqual(before, after)) throw new Error(unsupported);
  return updated;
}

/** Save a startup preference. This does not switch the running Codex window. */
export async function saveNativePetSelection(petId: string, home?: string): Promise<SavedNativePetSelection> {
  const codexHome = path.resolve(home ?? process.env.CODEX_HOME ?? path.join(homedir(), '.codex'));
  const catalog = await getNativePetCatalog(codexHome);
  if (!catalog.pets.some(pet => pet.id === petId)) throw new Error(`Unknown native pet ID: ${petId}`);
  const file = path.join(codexHome, 'config.toml');
  const original = await readOptional(file);
  let mode = 0o600;
  if (original !== undefined) {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Refusing to replace a non-regular config.toml.');
    mode = info.mode & 0o777;
  }
  const text = original?.toString('utf8') ?? '';
  if (original && !Buffer.from(text, 'utf8').equals(original)) throw new Error('config.toml is not valid UTF-8; it was not changed.');
  const before = parse(text, { integersAsBigInt: true });
  const result: SavedNativePetSelection = { selectedPetId: petId, restartRequired: true, immediate: false };
  if ((before.desktop as TomlTable | undefined)?.[field] === petId) return result;
  const updated = patchSelection(text, before, petId);
  await mkdir(codexHome, { recursive: true });
  const temporary = path.join(codexHome, `.config.toml.genpet-${randomUUID()}.tmp`);
  const assertUnchanged = async () => {
    const current = await readOptional(file);
    if (original === undefined ? current !== undefined : current === undefined || !original.equals(current)) {
      throw new Error('config.toml changed while saving the pet preference; retry after the other edit finishes.');
    }
  };
  try {
    await writeFile(temporary, updated, { mode, flag: 'wx' });
    await assertUnchanged();
    if (original !== undefined) {
      result.backupPath = `${file}.genpet-backup-${randomUUID()}`;
      await writeFile(result.backupPath, original, { mode, flag: 'wx' });
    }
    await assertUnchanged();
    await rename(temporary, file);
    return result;
  } finally {
    await rm(temporary, { force: true });
  }
}

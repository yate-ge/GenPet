/** Preserve every test fixture before cleanup, including failure data. */
import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export async function retainFixture(file: string, options?: { recursive?: boolean; force?: boolean }) {
  const source = path.resolve(file);
  const info = await stat(source).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && options?.force) return null;
    throw error;
  });
  if (!info) return;
  const root = path.resolve(
    process.env.GENPET_TEST_EVIDENCE_DIR || path.join('output', 'implementation-20261011'),
    'retained-fixtures',
  );
  if (source === root || source.startsWith(root + path.sep))
    throw new Error('Retained test evidence must not be removed');
  const destination = path.join(root, `${path.basename(source)}-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  await cp(source, destination, { recursive: true });
  await writeFile(
    destination + '.source.json',
    JSON.stringify({ originalPath: source, retainedAt: new Date().toISOString() }),
  );
  await rm(source, options);
}

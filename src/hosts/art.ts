/** Both environments use the same cloud Pet atlas. These are structural checks, not visual review. */
import { stat } from 'node:fs/promises';
import { decodeRgba, readImageInfo } from '../image.js';
import { checkAtlas } from './desktop/atlas.js';

export async function validateArt(file: string) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error('Artwork must be a regular file below 64 MiB');
  const meta = await readImageInfo(file);
  if (!meta.hasAlpha) throw new Error('Pet images must have an alpha channel');
  if (meta.width * meta.height > 16_000_000) throw new Error('Image exceeds size limit');
  checkAtlas(await decodeRgba(file));
  return meta;
}

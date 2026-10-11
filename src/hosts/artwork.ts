/** Compare actual host readback with accepted pixels; PNG/WebP transport encoding may differ. */
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { decodeRgba } from '../image.js';

export async function artworkFingerprint(file: string) {
  if (!path.isAbsolute(file)) throw new Error('Artwork readback must be an absolute local file');
  const info = await stat(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024)
    throw new Error('Artwork readback must be a regular file below 64 MiB');
  const image = await decodeRgba(file);
  const pixels = new Uint8Array(image.data);
  for (let at = 0; at < pixels.length; at += 4)
    if (pixels[at + 3] === 0) pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
  return {
    fileSha256: createHash('sha256')
      .update(await readFile(file))
      .digest('hex'),
    artworkSha256: createHash('sha256')
      .update(JSON.stringify([image.width, image.height]))
      .update(pixels)
      .digest('hex'),
    width: image.width,
    height: image.height,
  };
}

export async function verifyStoredArtwork(acceptedFile: string, readbackFile: string) {
  const [accepted, stored] = await Promise.all([artworkFingerprint(acceptedFile), artworkFingerprint(readbackFile)]);
  return {
    storedArtworkVerified: accepted.artworkSha256 === stored.artworkSha256,
    acceptedArtworkSha256: accepted.artworkSha256,
    storedArtworkSha256: stored.artworkSha256,
    acceptedFileSha256: accepted.fileSha256,
    storedFileSha256: stored.fileSha256,
  };
}

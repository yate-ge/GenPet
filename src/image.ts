/** Portable PNG/WebP reading without native modules, so the plugin runs from a Git checkout. */
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import decodeWebp, { init as initWebp } from '@jsquash/webp/decode.js';

export type ImageInfo = { format: 'png' | 'webp'; width: number; height: number; hasAlpha: boolean };

export function imageInfo(buf: Buffer): ImageInfo {
  if (buf.length >= 33 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('ascii', 12, 16) === 'IHDR') {
    const colorType = buf[25];
    let hasAlpha = colorType === 4 || colorType === 6;
    for (let at = 8; !hasAlpha && at + 8 <= buf.length;) {
      const type = buf.toString('ascii', at + 4, at + 8);
      if (type === 'tRNS') hasAlpha = true;
      if (type === 'IDAT' || type === 'IEND') break;
      at += 12 + buf.readUInt32BE(at);
    }
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), hasAlpha };
  }
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { format: 'webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), hasAlpha: (buf[20] & 0x10) !== 0 };
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { format: 'webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff), hasAlpha: ((bits >>> 28) & 1) === 1 };
    }
    if (chunk === 'VP8 ') return { format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, hasAlpha: false };
  }
  throw new Error('Use a PNG or WebP image');
}

export async function readImageInfo(file: string) {
  return imageInfo(await readFile(file));
}

let webpReady: Promise<void> | undefined;
function webpWasm() {
  // The bundled plugin ships the codec beside dist/*.js; source runs resolve it from node_modules.
  const bundled = fileURLToPath(new URL('./webp_dec.wasm', import.meta.url));
  return existsSync(bundled) ? bundled : createRequire(import.meta.url).resolve('@jsquash/webp/codec/dec/webp_dec.wasm');
}

/** Decode to straight RGBA, 4 bytes per pixel. */
export async function decodeRgba(file: string): Promise<ImageInfo & { data: Uint8Array }> {
  const buf = await readFile(file);
  const info = imageInfo(buf);
  if (info.format === 'png') return { ...info, data: PNG.sync.read(buf).data };
  (globalThis as any).ImageData ??= class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} };
  webpReady ??= WebAssembly.compile(readFileSync(webpWasm())).then(module => (initWebp as (module: WebAssembly.Module) => Promise<void>)(module));
  await webpReady;
  const decoded = await decodeWebp(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  return { ...info, data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength) };
}

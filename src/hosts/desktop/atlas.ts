/** The desktop Pet's v2 sprite atlas: an 8 × 11 grid of 192 × 208 cells. */
import type { ImageInfo } from '../../image.js';

export const ATLAS = { width: 1536, height: 2288, columns: 8, rows: 11, cellWidth: 192, cellHeight: 208 };

/** Format handed to art generation with each desktop art request. */
export const ATLAS_CONTRACT = {
  columns: ATLAS.columns,
  cellWidth: ATLAS.cellWidth,
  cellHeight: ATLAS.cellHeight,
  rows: ATLAS.rows,
  spriteVersionNumber: 2,
};

/** Animation rows the desktop app plays; rows 9–10 are the eight-cell direction poses. */
export const actions = [
  { name: 'idle', row: 0, count: 6, durations: [280, 110, 110, 140, 140, 320] },
  { name: 'running-right', row: 1, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: 'running-left', row: 2, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: 'waving', row: 3, count: 4, durations: [140, 140, 140, 280] },
  { name: 'jumping', row: 4, count: 5, durations: [140, 140, 140, 140, 280] },
  { name: 'failed', row: 5, count: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { name: 'waiting', row: 6, count: 6, durations: [150, 150, 150, 150, 150, 260] },
  { name: 'running', row: 7, count: 6, durations: [120, 120, 120, 120, 120, 220] },
  { name: 'review', row: 8, count: 6, durations: [150, 150, 150, 150, 150, 280] },
];

/** Every used cell has visible pixels and every unused cell is transparent. r0c6 is the neutral reference cell. */
export function checkAtlas(image: ImageInfo & { data: Uint8Array }) {
  if (image.width !== ATLAS.width || image.height !== ATLAS.height) throw new Error('Atlas must be 1536 × 2288 (v2)');
  const { cellWidth: w, cellHeight: h } = ATLAS;
  for (let row = 0; row < ATLAS.rows; row++)
    for (let col = 0; col < ATLAS.columns; col++) {
      const used = col < (row < actions.length ? actions[row].count : ATLAS.columns) || (row === 0 && col === 6);
      let visible = 0;
      for (let y = row * h; y < (row + 1) * h; y++)
        for (let x = col * w; x < (col + 1) * w; x++) if (image.data[(y * image.width + x) * 4 + 3] > 0) visible++;
      if (used && visible < 30) throw new Error(`Empty animation cell ${row},${col}`);
      if (!used && visible > 0) throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
}

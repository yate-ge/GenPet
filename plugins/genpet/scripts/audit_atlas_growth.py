"""Compare two native V2 idle cells without resizing either pet or editing art."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


CELL_WIDTH = 192
CELL_HEIGHT = 208
ATLAS_SIZE = (1536, 2288)


def inspect(path: Path) -> tuple[Image.Image, dict]:
    with Image.open(path) as source:
        if source.size != ATLAS_SIZE:
            raise ValueError(f"Expected a V2 1536x2288 atlas: {path}")
        cell = source.convert("RGBA").crop((0, 0, CELL_WIDTH, CELL_HEIGHT))
    alpha = cell.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"Idle cell is empty: {path}")
    top, bottom = bounds[1], bounds[3]
    start = top + round((bottom - top) * 0.34)
    stop = top + round((bottom - top) * 0.64)
    widths = []
    for y in range(start, stop):
        row = alpha.crop((0, y, CELL_WIDTH, y + 1)).getbbox()
        if row:
            widths.append((row[2] - row[0], y))
    if not widths:
        raise ValueError(f"Could not locate a neck/shoulder transition: {path}")
    neck = min(widths)[1]
    head_height = neck - top
    body_height = bottom - neck
    data = {
        "file": str(path),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "visibleBounds": bounds,
        "visibleHeightPx": bottom - top,
        "neckRow": neck,
        "headHeightPx": head_height,
        "bodyBelowNeckPx": body_height,
        "bodyToHead": round(body_height / head_height, 3),
    }
    return cell, data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", type=Path, required=True)
    parser.add_argument("--after", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="PNG contact sheet; adjacent JSON is written too")
    args = parser.parse_args()
    before, first = inspect(args.before)
    after, second = inspect(args.after)
    board = Image.new("RGB", (2 * CELL_WIDTH + 24, CELL_HEIGHT + 36), "white")
    draw = ImageDraw.Draw(board)
    for index, (label, cell) in enumerate((("before", before), ("after", after))):
        x = 6 + index * (CELL_WIDTH + 12)
        board.paste(cell, (x, 4), cell)
        draw.text((x, CELL_HEIGHT + 7), label, fill="black")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    board.save(args.output)
    report = {
        "method": "Raw official 192x208 idle cells, alpha > 8, no resizing; neck is narrowest occupied row in central 34-64% of visible height. Supplementary geometry only: visual identity, prop parity and motion still require review.",
        "before": first,
        "after": second,
        "change": {
            "visibleHeightPx": second["visibleHeightPx"] - first["visibleHeightPx"],
            "bodyToHead": round(second["bodyToHead"] - first["bodyToHead"], 3),
        },
    }
    args.output.with_suffix(".json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

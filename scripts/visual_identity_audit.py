"""Make a native-cell comparison and measure visible geometry, never edit source art."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def prepare(source: Path) -> tuple[Image.Image, dict]:
    im = Image.open(source).convert("RGBA")
    alpha = im.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f"No visible portrait: {source}")
    # All candidates use the official 192x208 cell at equal full-body height.
    cropped = im.crop(bbox)
    scale = min(176 / cropped.width, 192 / cropped.height)
    size = (round(cropped.width * scale), round(cropped.height * scale))
    native = cropped.resize(size, Image.Resampling.NEAREST)
    cell = Image.new("RGBA", (192, 208), (0, 0, 0, 0))
    cell.alpha_composite(native, ((192 - size[0]) // 2, 208 - 8 - size[1]))
    mask = cell.getchannel("A").point(lambda v: 255 if v > 8 else 0)
    bounds = mask.getbbox()
    assert bounds
    # Find the narrowest neck/shoulder transition in the central vertical band.
    widths = [mask.crop((0, y, 192, y + 1)).getbbox() for y in range(bounds[1], bounds[3])]
    start = round(len(widths) * 0.34)
    stop = round(len(widths) * 0.64)
    cut = bounds[1] + min(range(start, stop), key=lambda j: (widths[j][2] - widths[j][0]) if widths[j] else 0)
    head = cut - bounds[1]
    body = bounds[3] - cut
    return cell, {"source": str(source), "sourceSize": im.size, "visibleSourceBounds": bbox,
                  "nativeBounds": bounds, "neckRow": cut,
                  "headHeightPx": head, "bodyBelowNeckPx": body,
                  "bodyToHead": round(body / head, 3) if head else None}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--case", action="append", nargs=2, metavar=("LABEL", "IMAGE"), required=True)
    args = parser.parse_args()
    labels, cells, metrics = [], [], []
    for label, file in args.case:
        cell, metric = prepare(Path(file))
        labels.append(label)
        cells.append(cell)
        metrics.append({"label": label, **metric})
    gutter, label_height = 12, 28
    width = gutter + len(cells) * (192 + gutter)
    board = Image.new("RGB", (width, 208 + label_height + 2 * gutter), "white")
    draw = ImageDraw.Draw(board)
    for index, (label, cell) in enumerate(zip(labels, cells)):
        x = gutter + index * (192 + gutter)
        board.paste(cell, (x, gutter), cell)
        draw.text((x + 4, gutter + 208 + 4), label, fill="black")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    board.save(args.output)
    report = {"method": "Alpha > 8 crop, nearest-neighbor fit into 192x208 with 8px margins; neck row is the narrowest central row. Contact image is QA only, not generated artwork.",
              "metrics": metrics}
    args.output.with_suffix(".json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

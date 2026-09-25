"""Compare generated portraits at the native cell size without using color.

This measures rendered silhouette differences, not human recognition or a
generator-wide collision rate. Supply portraits with the same stage and prop.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from itertools import combinations
from pathlib import Path

from visual_identity_audit import prepare


def visible_mask(cell):
    return bytes(255 if alpha > 8 else 0 for alpha in cell.getchannel("A").tobytes())


def compare(first: bytes, second: bytes) -> dict:
    shared = sum(a > 0 and b > 0 for a, b in zip(first, second))
    union = sum(a > 0 or b > 0 for a, b in zip(first, second))
    return {
        "silhouetteIoU": round(shared / union, 4) if union else None,
        "sharedPixels": shared,
        "unionPixels": union,
        "differentPixels": union - shared,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--case", action="append", nargs=2, metavar=("LABEL", "IMAGE"), required=True)
    parser.add_argument("--condition", required=True, help="Document the shared stage and prop.")
    args = parser.parse_args()
    if len(args.case) < 2 or len({label for label, _ in args.case}) != len(args.case):
        parser.error("Provide at least two portraits with unique labels.")
    portraits = []
    for label, image in args.case:
        source = Path(image)
        cell, geometry = prepare(source)
        portraits.append({"label": label, "source": str(source),
                          "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                          "geometry": geometry, "mask": visible_mask(cell)})
    pairs = [{"first": first["label"], "second": second["label"],
              **compare(first["mask"], second["mask"])}
             for first, second in combinations(portraits, 2)]
    report = {
        "method": "Alpha>8 crop, nearest-neighbor fit into an official 192x208 cell with 8px margins, then pairwise color-independent alpha-mask overlap. IoU=1 means identical silhouettes; lower values mean more rendered shape difference. Generated portraits are not edited.",
        "condition": args.condition,
        "portraits": [{key: value for key, value in portrait.items() if key != "mask"}
                      for portrait in portraits],
        "pairs": pairs,
        "limitations": "Small selected sample; differences can reflect image-generation variance, pose, or accessory shape. This is not a human recognition study or a population estimate.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"condition": args.condition, "pairs": pairs, "report": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()

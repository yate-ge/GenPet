#!/usr/bin/env python3
"""Remove only near-zero alpha noise before Codex hatch-pet source-edge QA.

Some built-in imagegen PNGs contain alpha=1 pixels across otherwise empty
background. The official cardinal extractor counts any nonzero alpha as an
edge pixel, producing false clipping failures. This narrow adaptation never
changes pixels whose original alpha exceeds 1. It does not draw, resize,
reposition, repaint, or repair character artwork. Original input is retained.
Pillow is supplied by the Codex workspace dependency runtime.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        raise SystemExit("Input and output must differ; preserve the source.")
    with Image.open(args.source) as opened:
        original = opened.convert("RGBA")
    before = list(original.get_flattened_data())
    after = [(0, 0, 0, 0) if pixel[3] <= 1 else pixel for pixel in before]
    changed = [old for old, new in zip(before, after) if old != new]
    assert all(pixel[3] <= 1 for pixel in changed)
    assert all(old == new for old, new in zip(before, after) if old[3] > 1)
    result = Image.new("RGBA", original.size)
    result.putdata(after)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output)
    report = {
        "ok": True,
        "algorithm": "zero RGBA only where original alpha <= 1/255",
        "source": args.source.name,
        "output": args.output.name,
        "source_sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
        "output_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "size": list(original.size),
        "changed_pixels": len(changed),
        "changed_original_alpha_0": sum(p[3] == 0 for p in changed),
        "changed_original_alpha_1": sum(p[3] == 1 for p in changed),
        "max_changed_original_alpha": max((p[3] for p in changed), default=0),
        "all_original_alpha_above_1_unchanged": True,
        "geometry_unchanged": True,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

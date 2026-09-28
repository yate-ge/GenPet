#!/usr/bin/env python3
"""Extract generated horizontal row strips into 192x208 sprite frames."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

from PIL import Image
from prepare_strip import clean_strip, slot_crops, usable_frames
from despill_chroma_edges import decontaminate_image, edge_band, chroma_similarity, chroma_saturation

CELL_WIDTH = 192
CELL_HEIGHT = 208
ROW_FRAME_COUNTS = {
    "idle": 6,
    "running-right": 8,
    "running-left": 8,
    "waving": 4,
    "jumping": 5,
    "failed": 8,
    "waiting": 6,
    "running": 6,
    "review": 6,
}


def parse_states(raw: str) -> list[str]:
    if raw.strip().lower() == "all":
        return list(ROW_FRAME_COUNTS)
    states = [item.strip() for item in raw.split(",") if item.strip()]
    unknown = sorted(set(states) - set(ROW_FRAME_COUNTS))
    if unknown:
        raise SystemExit(f"unknown state(s): {', '.join(unknown)}")
    return states


def parse_hex_color(value: str) -> tuple[int, int, int]:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise SystemExit(f"invalid chroma key color: {value}; expected #RRGGBB")
    return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))


def load_chroma_key(decoded_dir: Path, override: str | None) -> tuple[int, int, int]:
    if override:
        return parse_hex_color(override)
    request_path = decoded_dir.parent / "pet_request.json"
    if request_path.is_file():
        request = json.loads(request_path.read_text(encoding="utf-8"))
        chroma_key = request.get("chroma_key")
        if isinstance(chroma_key, dict) and isinstance(chroma_key.get("hex"), str):
            return parse_hex_color(chroma_key["hex"])
    return parse_hex_color("#00FF00")


def color_distance(
    red: int,
    green: int,
    blue: int,
    key: tuple[int, int, int],
) -> float:
    return math.sqrt((red - key[0]) ** 2 + (green - key[1]) ** 2 + (blue - key[2]) ** 2)


def remove_chroma_background(
    image: Image.Image,
    chroma_key: tuple[int, int, int],
    threshold: float,
) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if color_distance(red, green, blue, chroma_key) <= threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def fit_to_cell(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    target = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
    if bbox is None:
        return target

    sprite = image.crop(bbox)
    max_width = CELL_WIDTH - 10
    max_height = CELL_HEIGHT - 10
    scale = min(max_width / sprite.width, max_height / sprite.height, 1.0)
    if scale != 1.0:
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.LANCZOS,
        )
    left = (CELL_WIDTH - sprite.width) // 2
    top = (CELL_HEIGHT - sprite.height) // 2
    target.alpha_composite(sprite, (left, top))
    return target


def fit_viewport_to_cell(image: Image.Image) -> Image.Image:
    target = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
    if image.getbbox() is None:
        return target

    viewport = image.copy()
    max_width = CELL_WIDTH - 10
    max_height = CELL_HEIGHT - 10
    scale = min(max_width / viewport.width, max_height / viewport.height, 1.0)
    if scale != 1.0:
        viewport = viewport.resize(
            (max(1, round(viewport.width * scale)), max(1, round(viewport.height * scale))),
            Image.Resampling.LANCZOS,
        )
    left = (CELL_WIDTH - viewport.width) // 2
    top = (CELL_HEIGHT - viewport.height) // 2
    target.alpha_composite(viewport, (left, top))
    return target


def connected_components(image: Image.Image) -> list[dict[str, object]]:
    alpha = image.getchannel("A")
    width, height = image.size
    data = alpha.tobytes()
    visited = bytearray(width * height)
    components: list[dict[str, object]] = []

    for start, alpha_value in enumerate(data):
        if alpha_value <= 16 or visited[start]:
            continue

        stack = [start]
        visited[start] = 1
        pixels: list[int] = []
        min_x = width
        min_y = height
        max_x = 0
        max_y = 0

        while stack:
            current = stack.pop()
            pixels.append(current)
            x = current % width
            y = current // width
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

            if x > 0:
                neighbor = current - 1
                if not visited[neighbor] and data[neighbor] > 16:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if x + 1 < width:
                neighbor = current + 1
                if not visited[neighbor] and data[neighbor] > 16:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if y > 0:
                neighbor = current - width
                if not visited[neighbor] and data[neighbor] > 16:
                    visited[neighbor] = 1
                    stack.append(neighbor)
            if y + 1 < height:
                neighbor = current + width
                if not visited[neighbor] and data[neighbor] > 16:
                    visited[neighbor] = 1
                    stack.append(neighbor)

        components.append(
            {
                "pixels": pixels,
                "area": len(pixels),
                "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                "center_x": (min_x + max_x + 1) / 2,
            }
        )

    return components


def component_group_image(
    source: Image.Image,
    components: list[dict[str, object]],
    padding: int = 4,
) -> Image.Image:
    width, height = source.size
    min_x = max(0, min(component["bbox"][0] for component in components) - padding)
    min_y = max(0, min(component["bbox"][1] for component in components) - padding)
    max_x = min(width, max(component["bbox"][2] for component in components) + padding)
    max_y = min(height, max(component["bbox"][3] for component in components) + padding)

    output = Image.new("RGBA", (max_x - min_x, max_y - min_y), (0, 0, 0, 0))
    source_pixels = source.load()
    output_pixels = output.load()
    for component in components:
        for pixel_index in component["pixels"]:
            x = pixel_index % width
            y = pixel_index // width
            output_pixels[x - min_x, y - min_y] = source_pixels[x, y]
    return output


def component_frame_groups(
    strip: Image.Image,
    frame_count: int,
) -> list[list[dict[str, object]]] | None:
    components = connected_components(strip)
    if not components:
        return None

    largest_area = max(component["area"] for component in components)
    seed_threshold = max(120, largest_area * 0.20)
    seeds = [component for component in components if component["area"] >= seed_threshold]
    if len(seeds) < frame_count:
        seeds = sorted(components, key=lambda component: component["area"], reverse=True)[
            :frame_count
        ]
    if len(seeds) < frame_count:
        return None

    seeds = sorted(
        sorted(seeds, key=lambda component: component["area"], reverse=True)[:frame_count],
        key=lambda component: component["center_x"],
    )
    seed_ids = {id(seed) for seed in seeds}
    groups: list[list[dict[str, object]]] = [[seed] for seed in seeds]
    noise_threshold = max(12, largest_area * 0.002)

    for component in components:
        if id(component) in seed_ids or component["area"] < noise_threshold:
            continue
        nearest_index = min(
            range(len(seeds)),
            key=lambda index: abs(seeds[index]["center_x"] - component["center_x"]),
        )
        groups[nearest_index].append(component)

    return groups


def register_frames(images, origins=None):
    """One affine transform for the entire row; preserve temporal x/y offsets."""
    origins = origins or [(0, 0)] * len(images)
    boxes = [(bbox[0] + x, bbox[1] + y, bbox[2] + x, bbox[3] + y)
             for image, (x, y) in zip(images, origins) if (bbox := image.getbbox())]
    if not boxes:
        return [Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT)) for _ in images]
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    width, height = right - left, bottom - top
    scale = min((CELL_WIDTH - 10) / width, (CELL_HEIGHT - 10) / height, 1.0)
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    frames = []
    for image, (x, y) in zip(images, origins):
        viewport = Image.new("RGBA", (width, height))
        viewport.alpha_composite(image, (x - left, y - top))
        if viewport.size != size:
            viewport = viewport.resize(size, Image.Resampling.LANCZOS)
        target = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT))
        target.alpha_composite(viewport, ((CELL_WIDTH - size[0]) // 2, (CELL_HEIGHT - size[1]) // 2))
        frames.append(target)
    return frames


def extract_component_frames(strip: Image.Image, frame_count: int) -> list[Image.Image] | None:
    groups = component_frame_groups(strip, frame_count)
    if groups is None:
        return None
    images = [component_group_image(strip, group, padding=0) for group in groups]
    origins = [(component_bounds(group)[0] - round(i * strip.width / frame_count), component_bounds(group)[1])
               for i, group in enumerate(groups)]
    return register_frames(images, origins)


def component_bounds(components: list[dict[str, object]]) -> tuple[int, int, int, int]:
    return (
        min(component["bbox"][0] for component in components),
        min(component["bbox"][1] for component in components),
        max(component["bbox"][2] for component in components),
        max(component["bbox"][3] for component in components),
    )


def extract_slot_frames(strip: Image.Image, frame_count: int) -> list[Image.Image]:
    return register_frames(slot_crops(strip, frame_count))


def extract_stable_slot_frames(strip: Image.Image, frame_count: int) -> list[Image.Image]:
    frames = extract_component_frames(strip, frame_count)
    return frames if frames is not None else extract_slot_frames(strip, frame_count)


def extract_state(
    strip_path: Path,
    state: str,
    output_root: Path,
    chroma_key: tuple[int, int, int],
    threshold: float,
    method: str,
) -> dict[str, object]:
    frame_count = 8 if state in ("look-row-9", "look-row-10") else ROW_FRAME_COUNTS[state]
    with Image.open(strip_path) as opened:
        strip, cleanup = clean_strip(opened, frame_count)

    state_dir = output_root / state
    state_dir.mkdir(parents=True, exist_ok=True)

    frames = None
    used_method = method
    if method == "auto":
        crops = slot_crops(strip, frame_count)
        frames = register_frames(crops)
        # Prefer the declared grid. Uneven layouts fall back deterministically to
        # components only when a slot is empty or a cut intersects visible artwork.
        cuts = [round(i * strip.width / frame_count) for i in range(1, frame_count)]
        split = any(strip.getchannel("A").crop((x, 0, x + 1, strip.height)).getbbox() for x in cuts)
        used_method = "slots"
        if not usable_frames(frames) or split:
            alternate = extract_component_frames(strip, frame_count)
            if alternate is not None and usable_frames(alternate):
                frames, used_method = alternate, "components"
    if method == "components":
        frames = extract_component_frames(strip, frame_count)
        if frames is None and method == "components":
            raise SystemExit(f"could not find {frame_count} sprite components in {strip_path}")
        if frames is not None:
            used_method = "components"

    if frames is None:
        if method == "stable-slots":
            frames = extract_stable_slot_frames(strip, frame_count)
            used_method = "stable-slots"
        else:
            frames = extract_slot_frames(strip, frame_count)
            used_method = "slots"

    if not usable_frames(frames):
        raise ValueError(f"Missing visible frames after grid/component extraction: {strip_path}")
    # Despill at native resolution with this source's detected background, not a
    # single key applied to the whole atlas. Already transparent inputs are untouched.
    cleanup["despill"] = []
    if cleanup["background_rgb"] is not None:
        for index, frame in enumerate(frames):
            key = tuple(cleanup["background_rgb"])
            # Strong matte pixels are background coverage, not opaque character
            # edges. Merely recoloring them leaves a dark, ragged halo behind.
            boundary = edge_band(frame.getchannel("A"), 3)
            pixels = list(frame.getdata())
            removed = 0
            for i, ((r, g, b, a), edge) in enumerate(zip(pixels, boundary)):
                if edge and chroma_saturation((r, g, b)) >= 0.45 and chroma_similarity((r, g, b), key) >= 0.9:
                    pixels[i] = (0, 0, 0, 0)
                    removed += 1
            frame.putdata(pixels)
            frames[index], report = decontaminate_image(frame, chroma_key=key, edge_radius=3)
            report["removed_matte_pixels"] = removed
            cleanup["despill"].append(report)
    if not usable_frames(frames):
        raise ValueError(f"Missing visible frames after edge cleanup: {strip_path}")
    outputs = []
    for index, frame in enumerate(frames):
        output = state_dir / f"{index:02d}.png"
        frame.save(output)
        outputs.append(str(output))
    return {"state": state, "frames": outputs, "method": used_method, "registration": "shared-row-transform", "cleanup": cleanup}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decoded-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--states", default="all")
    parser.add_argument("--chroma-key", help="Override chroma key as #RRGGBB.")
    parser.add_argument("--key-threshold", type=float, default=96.0)
    parser.add_argument(
        "--method",
        choices=("auto", "components", "slots", "stable-slots"),
        default="auto",
        help="Use connected sprite components when possible, raw equal slots, or row-stable slot viewports.",
    )
    args = parser.parse_args()

    decoded_dir = Path(args.decoded_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    chroma_key = load_chroma_key(decoded_dir, args.chroma_key)
    states = parse_states(args.states)
    manifest = []
    for state in states:
        strip_path = decoded_dir / f"{state}.png"
        if not strip_path.is_file():
            raise SystemExit(f"missing generated strip for {state}: {strip_path}")
        manifest.append(
            extract_state(
                strip_path,
                state,
                output_dir,
                chroma_key,
                args.key_threshold,
                args.method,
            )
        )

    (output_dir / "frames-manifest.json").write_text(
        json.dumps(
            {
                "ok": True,
                "chroma_key": {
                    "hex": f"#{chroma_key[0]:02X}{chroma_key[1]:02X}{chroma_key[2]:02X}",
                    "rgb": list(chroma_key),
                    "threshold": args.key_threshold,
                },
                "rows": manifest,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"ok": True, "frames_root": str(output_dir), "states": states}, indent=2))


if __name__ == "__main__":
    main()

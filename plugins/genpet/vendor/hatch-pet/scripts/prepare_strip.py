"""Deterministic solid-background and grid cleanup; never changes the saved source."""
from collections import Counter

from PIL import Image, ImageChops, ImageDraw


def pixel_data(image):
    return image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()


def detect_background(image):
    sample = image.copy()
    sample.thumbnail((256, 128), Image.Resampling.NEAREST)
    colors = [pixel[:3] for pixel in pixel_data(sample) if pixel[3] > 16]
    if not colors:
        return None
    bins = Counter(tuple(channel // 8 for channel in color) for color in colors)
    bucket, _ = bins.most_common(1)[0]
    members = [color for color in colors if tuple(channel // 8 for channel in color) == bucket]
    return tuple(round(sum(color[i] for color in members) / len(members)) for i in range(3))


def thin_groups(indices, maximum):
    groups = []
    for value in indices:
        if not groups or value != groups[-1][-1] + 1:
            groups.append([])
        groups[-1].append(value)
    return [value for group in groups if len(group) <= maximum for value in group]


def clean_strip(image, count):
    rgba = image.convert("RGBA")
    width, height = rgba.size
    # Existing transparency is authoritative, including colors matching a suggested key.
    transparent = rgba.getchannel("A").histogram()[0]
    key = None if transparent > width * height * 0.01 else detect_background(rgba)
    pixels = list(pixel_data(rgba))
    near = [alpha <= 16 or (key is not None and sum((rgb - bg) ** 2 for rgb, bg in zip((r, g, b), key)) <= 40 ** 2)
            for r, g, b, alpha in pixels]
    foreground = [not value for value in near]
    # A divider crosses the empty space between poses. Character outlines do not span
    # most of the entire strip. Vertical candidates must also sit near slot boundaries.
    horizontal = thin_groups([y for y in range(height)
                              if max(map(len, bytes(foreground[y * width:(y + 1) * width]).split(b"\x00"))) >= width * 0.85],
                             max(3, round(height * 0.015)))
    vertical = []
    slot = width / count
    for x in range(width):
        if min(x % slot, slot - x % slot) > slot * 0.12:
            continue
        if sum(foreground[y * width + x] for y in range(height)) >= height * 0.42:
            vertical.append(x)
    vertical = thin_groups(vertical, max(3, round(slot * 0.04)))
    boundaries = {round(x / slot) for x in vertical}
    if len(boundaries) < min(3, count) and not horizontal:
        vertical = []  # an isolated long character outline is not evidence of a grid
    # Erase only identified thin lines, never all dark pixels or whole cell borders.
    for y in horizontal:
        for x in range(width):
            near[y * width + x] = True
            pixels[y * width + x] = (0, 0, 0, 0)
    for x in vertical:
        for y in range(height):
            near[y * width + x] = True
            pixels[y * width + x] = (0, 0, 0, 0)
    rgba.putdata(pixels)
    if key is not None:
        # Remove only background connected to outside. This preserves enclosed white
        # eyes/belly details even when the generated background happens to be white.
        candidate = Image.new("L", (width, height))
        candidate.putdata([255 if value else 0 for value in near])
        padded = Image.new("L", (width + 2, height + 2), 255)
        padded.paste(candidate, (1, 1))
        ImageDraw.floodfill(padded, (0, 0), 128, thresh=0)
        keep = padded.crop((1, 1, width + 1, height + 1)).point(lambda v: 0 if v == 128 else 255)
        rgba.putalpha(ImageChops.multiply(rgba.getchannel("A"), keep))
    # Normalize invisible RGB once, before resampling/packing.
    rgba.putdata([(r, g, b, a) if a > 16 else (0, 0, 0, 0) for r, g, b, a in pixel_data(rgba)])
    return rgba, {"background_rgb": key, "removed_horizontal_lines": horizontal,
                  "removed_vertical_lines": vertical}


def slot_crops(strip, count):
    return [strip.crop((round(i * strip.width / count), 0,
                        round((i + 1) * strip.width / count), strip.height)) for i in range(count)]


def usable_frames(frames):
    return all(sum(frame.getchannel("A").histogram()[17:]) >= 50 for frame in frames)

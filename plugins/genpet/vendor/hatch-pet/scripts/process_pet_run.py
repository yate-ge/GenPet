#!/usr/bin/env python3
"""Resume deterministic processing of saved AI artwork; never generate or install a Pet."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from compose_atlas import ROW_SPECS, clear_transparent_rgb
from extract_strip_frames import extract_state, parse_hex_color
from render_animation_previews import ROW_DURATIONS, save_preview
from prepare_pet_run import CANONICAL_BASE_PATH

SCRIPTS = Path(__file__).resolve().parent
EGG_STATE_SOURCES = {
    "idle": "egg-calm", "running-right": "egg-calm", "running-left": "egg-calm",
    "waving": "egg-stir", "jumping": "egg-stir", "failed": "egg-settle",
    "waiting": "egg-calm", "running": "egg-stir", "review": "egg-calm",
}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".pending")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reconcile(run, manifest):
    """Complete means a source is saved and decodable, NOT visually approved."""
    blockers = []
    for job in manifest["jobs"]:
        source = (run / job["output_path"]).resolve()
        if not source.is_relative_to(run):
            raise ValueError(f"Source escapes run directory: {source}")
        if not source.is_file():
            job["status"] = "pending"
            for key in ("source_sha256", "source_path", "completed_at"):
                job.pop(key, None)
            continue
        try:
            with Image.open(source) as opened:
                opened.load()
            sha = digest(source)
            if job.get("source_sha256") != sha or not job.get("completed_at"):
                job["completed_at"] = datetime.now(timezone.utc).isoformat()
            job.update(status="complete", source_path=str(source), source_sha256=sha,
                       completion_basis="saved-decodable-source; visual review remains required")
        except (OSError, ValueError) as error:
            job["status"] = "invalid"
            blockers.append({"job": job["id"], "error": str(error),
                             "action": "Recover or inspect the existing source before considering generation."})
    write_json(run / "imagegen-jobs.json", manifest)
    return blockers


def ready_jobs(run, jobs):
    complete = {job["id"] for job in jobs if job["status"] == "complete"}
    # Prefer the long direction chain as slots free up, without adding workers.
    priority = ["base", "idle", "look-cardinals", "look-row-9", "look-row-10"]
    ready = [job["id"] for job in jobs if job["status"] == "pending"
             and set(job["depends_on"]).issubset(complete)
             and all((run / ref["path"]).is_file() for ref in job["input_images"])]
    return sorted(ready, key=lambda name: priority.index(name) if name in priority else len(priority))


class Processor:
    def __init__(self, run):
        self.run = run
        self.cache_path = run / "qa/processing-cache.json"
        self.cache = read_json(self.cache_path) if self.cache_path.exists() else {}
        # Includes imported helpers so code changes invalidate cached processing.
        self.code = {p.name: digest(p) for p in sorted(SCRIPTS.glob("*.py"))}
        self.executed = []
        self.reused = []
        self.blockers = []

    def step(self, name, inputs, outputs, action, settings=None):
        signature = {"inputs": {str(p): digest(p) for p in inputs},
                     "code": self.code, "settings": settings}
        previous = self.cache.get(name, {})
        if (previous.get("signature") == signature and all(p.is_file() for p in outputs)
                and previous.get("outputs") == {str(p): digest(p) for p in outputs}):
            self.reused.append(name)
            return True
        started = time.monotonic()
        try:
            action()
            self.cache[name] = {"signature": signature,
                                "outputs": {str(p): digest(p) for p in outputs}}
            self.executed.append({"step": name, "seconds": round(time.monotonic() - started, 3)})
            write_json(self.cache_path, self.cache)
            return True
        except (OSError, ValueError, RuntimeError, SystemExit) as error:
            self.cache.pop(name, None)
            write_json(self.cache_path, self.cache)
            self.blockers.append({"step": name, "error": str(error),
                                  "action": "Inspect source/extraction and logs; do not automatically regenerate."})
            return False

    def command(self, name, *args):
        result = subprocess.run([sys.executable, str(SCRIPTS / name), *map(str, args)],
                                capture_output=True, text=True, encoding="utf-8", errors="replace")
        log = self.run / "qa/logs" / (Path(name).stem + ".log")
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise RuntimeError(f"{name} failed ({result.returncode}); see {log}")


def idle_reference(frames, output):
    sheet = Image.new("RGBA", (192 * len(frames), 208))
    for index, path in enumerate(frames):
        with Image.open(path) as frame:
            sheet.alpha_composite(frame.convert("RGBA"), (192 * index, 0))
    sheet.save(output)


def final_previews(atlas, directory):
    with Image.open(atlas) as opened:
        image = opened.convert("RGBA")
    for state, row, count in ROW_SPECS:
        frames = [image.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208))
                  for col in range(count)]
        save_preview(frames, ROW_DURATIONS[state], directory / f"{state}.gif")
    looks = [image.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208))
             for row in (9, 10) for col in range(8)]
    save_preview(looks, [150] * 16, directory / "look.gif")


def finish_atlas(processor, extended, key):
    run = processor.run
    atlas, clean = run / "final/spritesheet.webp", run / "final/spritesheet.png"
    cleanup, validation = run / "qa/chroma-cleanup.json", run / "qa/final-validation.json"
    if not processor.step("cleanup", [extended], [clean, atlas, cleanup],
                          lambda: processor.command("despill_chroma_edges.py", extended, "--output", clean,
                          "--webp-output", atlas, "--json-out", cleanup, "--chroma-key", key), key):
        return False
    complete = processor.step("validate-v2", [atlas], [validation],
                              lambda: processor.command("validate_atlas.py", atlas,
                              "--require-v2", "--chroma-key", key, "--json-out", validation), key)
    processor.step("final-contact", [atlas], [run / "qa/final-contact-sheet.png"],
                   lambda: processor.command("make_contact_sheet.py", atlas,
                   "--scale", 1, "--output", run / "qa/final-contact-sheet.png"))
    previews = [run / "qa/previews" / f"{state}.gif" for state in [*ROW_DURATIONS, "look"]]
    processor.step("final-previews", [atlas], previews,
                   lambda: final_previews(atlas, run / "qa/previews"))
    def portrait():
        with Image.open(atlas) as image:
            image.crop((0, 0, 192, 208)).save(run / "final/portrait.png")
    processor.step("portrait", [atlas], [run / "final/portrait.png"], portrait)
    return complete


def compose_egg(rows, output, provenance):
    atlas = Image.new("RGBA", (1536, 2288))
    mapping = []
    for state, row, count in ROW_SPECS:
        source = EGG_STATE_SOURCES[state]
        # Select existing AI frames in temporal order. No tweening, rotation or new poses.
        indices = [index * 8 // count for index in range(count)]
        for column, index in enumerate(indices):
            with Image.open(rows[source][index]) as image:
                atlas.alpha_composite(image.convert("RGBA"), (192 * column, 208 * row))
        mapping.append({"state": state, "source": source, "source_frame_indices": indices})
    with Image.open(rows["egg-calm"][0]) as image:
        neutral = image.convert("RGBA")
    atlas.alpha_composite(neutral, (6 * 192, 0))
    for row in (9, 10):
        for column in range(8):
            atlas.alpha_composite(neutral, (192 * column, 208 * row))
    clear_transparent_rgb(atlas).save(output)
    write_json(provenance, {"profile": "genpet-egg-three", "rows": mapping,
                           "look_slots": "All sixteen reuse egg-calm frame 0; an unhatched egg has no directional gaze.",
                           "method": "Three AI-generated eight-frame loops, deterministic frame selection and slot reuse; no synthesized motion."})


def process_egg(processor, jobs, available, key):
    run, rows = processor.run, {}
    for state in dict.fromkeys(EGG_STATE_SOURCES.values()):
        if state not in available:
            continue
        root = run / "qa/egg-frames" / state
        frames = [root / "running-right" / f"{index:02d}.png" for index in range(8)]
        report = root / "extraction.json"
        source = run / jobs[state]["output_path"]
        def extract(source=source, root=root, frames=frames, report=report):
            # Reuse the eight-slot extractor only; these are shell loops, not running.
            result = extract_state(source, "running-right", root, parse_hex_color(key), 96, "auto")
            for frame in frames:
                with Image.open(frame) as image:
                    histogram = image.getchannel("A").histogram()
                if sum(histogram[1:]) < 50:
                    raise ValueError(f"Empty extracted egg frame: {frame}")
            write_json(report, result)
        if processor.step(f"extract-{state}", [source], [*frames, report], extract, key):
            rows[state] = frames
    if len(rows) != 3 or not set(jobs).issubset(available) or processor.blockers:
        return False
    extended, provenance = run / "qa/extended-raw.png", run / "qa/egg-frame-mapping.json"
    if not processor.step("egg-atlas", [p for frames in rows.values() for p in frames],
                          [extended, provenance], lambda: compose_egg(rows, extended, provenance)):
        return False
    return finish_atlas(processor, extended, key)


def process(run):
    run = Path(run).resolve()
    manifest = read_json(run / "imagegen-jobs.json")
    request = read_json(run / "pet_request.json")
    processor = Processor(run)
    processor.blockers.extend(reconcile(run, manifest))
    jobs = {job["id"]: job for job in manifest["jobs"]}
    available = {name for name, job in jobs.items() if job["status"] == "complete"}
    key = request["chroma_key"]["hex"]
    for directory in ("qa", "frames", "final", "references"):
        (run / directory).mkdir(exist_ok=True)
    canonical = run / CANONICAL_BASE_PATH
    if "base" in available and (manifest.get("workflow_profile") in ("genpet-early-look", "genpet-egg-three")
                                or not canonical.exists()):
        base = run / jobs["base"]["output_path"]
        processor.step("canonical-reference", [base], [canonical], lambda: shutil.copyfile(base, canonical))
    rows = {}
    is_egg = manifest.get("workflow_profile") == "genpet-egg-three"
    for state, _row, count in ([] if is_egg else ROW_SPECS):
        if state not in available:
            continue
        source = run / jobs[state]["output_path"]
        frames = [run / "frames" / state / f"{index:02d}.png" for index in range(count)]
        report = run / "qa" / f"extraction-{state}.json"

        def extract(source=source, state=state, report=report):
            result = extract_state(source, state, run / "frames", parse_hex_color(key), 96, "auto")
            write_json(report, result)

        if processor.step(f"extract-{state}", [source], [*frames, report], extract, key):
            rows[state] = frames
    if "idle" in rows:
        processor.step("idle-reference", rows["idle"], [run / "qa/idle-reference.png"],
                       lambda: idle_reference(rows["idle"], run / "qa/idle-reference.png"))

    if "look-cardinals" in available:
        anchors = [run / "decoded/look-anchors" / f"{label}.png" for label in ("000", "090", "180", "270")]
        report = run / "qa/cardinal-anchors.json"
        if processor.step("extract-cardinals", [run / jobs["look-cardinals"]["output_path"]],
                          [*anchors, report], lambda: processor.command("extract_cardinal_anchors.py",
                          "--strip", run / jobs["look-cardinals"]["output_path"],
                          "--output-dir", run / "decoded/look-anchors", "--json-out", report,
                          "--chroma-key", key), key):
            processor.step("cardinal-reference", anchors, [run / "decoded/look-anchors-approved.png"],
                           lambda: processor.command("compose_cardinal_anchor_strip.py",
                           "--anchors-dir", run / "decoded/look-anchors",
                           "--output", run / "decoded/look-anchors-approved.png"))

    atlas = run / "final/spritesheet.webp"
    complete = process_egg(processor, jobs, available, key) if is_egg else False
    if len(rows) == len(ROW_SPECS) and not processor.blockers:
        standard = run / "qa/standard-atlas.png"
        standard_ok = processor.step("standard-atlas", [p for frames in rows.values() for p in frames],
                                     [standard], lambda: processor.command("compose_atlas.py",
                                     "--frames-root", run / "frames", "--output", standard))
        if standard_ok:
            processor.step("standard-contact", [standard], [run / "qa/contact-sheet.png"],
                           lambda: processor.command("make_contact_sheet.py", standard,
                           "--output", run / "qa/contact-sheet.png"))
        if standard_ok and set(jobs).issubset(available):
            extended = run / "qa/extended-raw.png"
            if processor.step("extended-atlas", [standard, run / "decoded/look-row-9.png",
                              run / "decoded/look-row-10.png"], [extended],
                              lambda: processor.command("assemble_extended_atlas.py", "--base-atlas", standard,
                              "--look-row-9", run / "decoded/look-row-9.png", "--look-row-10", run / "decoded/look-row-10.png",
                              "--neutral-cell", rows["idle"][0], "--chroma-key", key, "--output", extended), key):
                complete = finish_atlas(processor, extended, key)
    result = {"ok": not processor.blockers, "run_dir": str(run),
              "source_complete": sorted(available),
              "ready_jobs": ready_jobs(run, manifest["jobs"]) if not processor.blockers else [],
              "pending_jobs": [name for name in jobs if name not in available],
              "executed": processor.executed, "reused": processor.reused,
              "blockers": processor.blockers,
              "atlas": str(atlas) if complete and not processor.blockers else None,
              "portrait": str(run / "final/portrait.png") if complete and not processor.blockers else None,
              "visual_review_required": True,
              "note": "Source completion is not visual acceptance. Review the final sheet and loops, then accept the current request through GenPet."}
    write_json(run / "qa/processing-result.json", result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", required=True)
    args = parser.parse_args()
    result = process(args.run_dir)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()

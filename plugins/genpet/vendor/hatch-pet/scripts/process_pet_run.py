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
import uuid
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

from compose_atlas import ROW_SPECS, clear_transparent_rgb
from extract_strip_frames import extract_state, parse_hex_color
from render_animation_previews import ROW_DURATIONS, save_preview
from prepare_pet_run import CANONICAL_BASE_PATH
from prepare_strip import clean_strip, slot_crops
from extract_strip_frames import register_frames, fit_registered_frames

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
    if path.is_file():
        history = path.parent / ".history" / f"{path.stem}-{digest(path)}{path.suffix}"
        if not history.exists():
            history.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, history)
    temporary = path.with_name(path.name + ".pending")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record_review(run, job_id, verdict, note):
    """Record a human/agent visual decision; this helper does not judge pixels."""
    run = Path(run).resolve()
    manifest = read_json(run / "imagegen-jobs.json")
    if manifest.get("schema_version", 1) >= 2 and job_id not in ("base", "final"):
        raise ValueError("New GenPet runs review only the base and the final assembled atlas")
    job = next((job for job in manifest["jobs"] if job["id"] == job_id), None)
    source = (run / (job["output_path"] if job else "final/spritesheet.webp")).resolve()
    if job is None and job_id != "final":
        raise ValueError("Unknown image job")
    if not source.is_relative_to(run) or not note.strip() or verdict not in ("pass", "fail"):
        raise ValueError("A valid source, verdict and concrete review note are required")
    with Image.open(source) as opened:
        opened.load()
    path = run / "qa/source-reviews.json"
    records = read_json(path) if path.exists() else {}
    entry = {"sha256": digest(source), "verdict": verdict, "note": note,
             "reviewed_at": datetime.now(timezone.utc).isoformat()}
    if job_id == "final":
        validation = read_json(run / "qa/final-validation.json")
        if not validation.get("ok"):
            raise ValueError("Final visual review requires a structurally valid exact atlas")
        entry["sources"] = source_fingerprint(run, manifest)
    records.setdefault(job_id, []).append(entry)
    write_json(path, records)
    archive_source(run, source, job_id)
    if job_id == "base" and verdict == "pass" and job.get("failure_summary", {}).get("base_blocked"):
        # A later actual accepted image can unblock the same pending run; historical failures remain.
        job["failure_summary"]["base_blocked"] = False
        job["failure_summary"]["recovered_by_review"] = entry["reviewed_at"]
        job["status"] = "complete"
        write_json(run / "imagegen-jobs.json", manifest)
    if job_id == "base" and verdict == "fail":
        record_failure(run, job_id, "base-visual-review", note)
    return {"job_id": job_id, **entry}


def archive_source(run, source, label):
    if source.is_file():
        archive = run / "qa/source-history" / f"{label}-{digest(source)}{source.suffix}"
        if not archive.exists():
            archive.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, archive)


def source_fingerprint(run, manifest):
    return {job["id"]: digest(run / job["output_path"]) if (run / job["output_path"]).is_file() else None
            for job in manifest["jobs"]}


def record_failure(run, job_id, error, note, attempt_id=None, frame_indices=None):
    """Keep actual failed attempts; repeated observation of one source does not spend another retry."""
    run = Path(run).resolve()
    manifest = read_json(run / "imagegen-jobs.json")
    job = next(job for job in manifest["jobs"] if job["id"] == job_id)
    if not error.strip() or not note.strip():
        raise ValueError("Failure requires the actual error and a concrete observation")
    source = (run / job["output_path"]).resolve()
    if not source.is_relative_to(run):
        raise ValueError("Job output escapes run directory")
    source_sha = digest(source) if source.is_file() else None
    attempt = attempt_id or source_sha
    if not attempt:
        raise ValueError("A failed generation with no image requires its actual attempt/tool-call ID")
    history = job.setdefault("failures", [])
    repeated = next((entry for entry in history if entry["attempt"] == attempt and entry["error"] == error), None)
    if not repeated:
        count = job.get("frames") or dict((state, frames) for state, _row, frames in ROW_SPECS).get(job_id, 8)
        if frame_indices is not None and (not frame_indices or any(type(index) is not int or index < 0 or index >= count for index in frame_indices)):
            raise ValueError("Failed frame indices must name actual cells in this job")
        history.append({"attempt": attempt, "source_sha256": source_sha, "error": error.strip(), "note": note.strip(),
                        "at": datetime.now(timezone.utc).isoformat(), "frame_indices": frame_indices})
    attempts = len({entry["attempt"] for entry in history})
    summary = {"failed_attempts": attempts, "max_redraws": 2, "redraws_remaining": max(0, 3 - attempts),
               "change_approach": sum(entry["error"] == error for entry in history) >= 2,
               "bounded_fallback": attempts >= 3 and job_id != "base", "base_blocked": attempts >= 3 and job_id == "base"}
    job["failure_summary"] = summary
    job["status"] = "blocked" if summary["base_blocked"] else "fallback" if summary["bounded_fallback"] else "retry-needed"
    write_json(run / "imagegen-jobs.json", manifest)
    archive_source(run, source, job_id)
    return {"job_id": job_id, **summary, "duplicate_observation": repeated is not None}


def reconcile(run, manifest):
    """New runs require a visual pass bound to the exact decodable source."""
    blockers = []
    review_path = run / "qa/source-reviews.json"
    reviews = read_json(review_path) if review_path.exists() else {}
    base_job = next(job for job in manifest["jobs"] if job["id"] == "base")
    base_source = run / base_job["output_path"]
    base_sha = digest(base_source) if base_source.is_file() else None
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
            archive_source(run, source, job["id"])
            with Image.open(source) as opened:
                opened.load()
            sha = digest(source)
            if manifest.get("schema_version", 1) >= 2 and job["id"] != "base":
                if job.get("source_sha256") == sha and job.get("generated_from_base") and job["generated_from_base"] != base_sha:
                    job["status"] = "stale-base"
                    continue
                job["generated_from_base"] = base_sha
            if manifest.get("source_review_required") or ("base" in manifest.get("review_policy", []) and job["id"] == "base"):
                history = reviews.get(job["id"], [])
                review = history[-1] if history else {}
                if review.get("sha256") != sha or review.get("verdict") != "pass":
                    job.update(status="awaiting-review", source_sha256=sha)
                    job.pop("completion_basis", None)
                    job.pop("completed_at", None)
                    continue
            if job.get("source_sha256") != sha or not job.get("completed_at"):
                job["completed_at"] = datetime.now(timezone.utc).isoformat()
            job.update(status="complete", source_path=str(source), source_sha256=sha,
                       completion_basis="visual-pass-and-decodable-source" if job["id"] == "base" and manifest.get("review_policy") or manifest.get("source_review_required") else "saved-decodable-source")
        except (OSError, ValueError) as error:
            job["status"] = "invalid"
            if manifest.get("schema_version", 1) >= 2:
                # A corrupted generated file is an actual failed source, not a reason to retry forever.
                write_json(run / "imagegen-jobs.json", manifest)
                record_failure(run, job["id"], str(error), "Saved generated source could not be decoded")
                updated = read_json(run / "imagegen-jobs.json")
                job.update(next(item for item in updated["jobs"] if item["id"] == job["id"]))
            blockers.append({"job": job["id"], "error": str(error),
                             "action": "Recover or inspect the existing source before considering generation."})
    write_json(run / "imagegen-jobs.json", manifest)
    return blockers


def ready_jobs(run, jobs):
    complete = {job["id"] for job in jobs if job["status"] == "complete"}
    ready = [job["id"] for job in jobs if job["status"] in ("pending", "stale-base")
             and set(job["depends_on"]).issubset(complete)
             and all((run / ref["path"]).is_file() for ref in job["input_images"])]
    return ready


class Processor:
    def __init__(self, run, previews=False):
        self.run = run
        self.previews = previews
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
            for output in outputs:
                archive_source(self.run, output, f"processed-{name}-{output.stem}")
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
        log = self.run / "qa/logs" / (Path(name).stem + f"-{time.time_ns()}.log")
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
    idle = image.crop((0, 0, 192, 208))
    jump = [image.crop((col * 192, 4 * 208, (col + 1) * 192, 5 * 208)) for col in range(5)]
    save_preview([idle, *jump, idle], [600, *ROW_DURATIONS["jumping"], 600], directory / "idle-jump.gif")
    save_preview([idle, *looks, idle], [600, *([150] * 16), 600], directory / "idle-look.gif")


def finish_atlas(processor, extended, key):
    run = processor.run
    atlas, clean = run / "final/spritesheet.webp", run / "final/spritesheet.png"
    validation = run / "qa/final-validation.json"
    def pack():
        with Image.open(extended) as opened:
            image = clear_transparent_rgb(opened.convert("RGBA"))
        image.save(clean)
        image.save(atlas, lossless=True, exact=True)
    # Each source has already had its actual background removed. A single global
    # key here would damage legitimate colors from rows with a different background.
    if not processor.step("pack", [extended], [clean, atlas], pack):
        return False
    complete = processor.step("validate-v2", [atlas], [validation],
                              lambda: processor.command("validate_atlas.py", atlas,
                              "--require-v2", "--structural-only", "--json-out", validation))
    if processor.previews:
        processor.step("final-contact", [atlas], [run / "qa/final-contact-sheet.png"],
                   lambda: processor.command("make_contact_sheet.py", atlas,
                   "--scale", 1, "--output", run / "qa/final-contact-sheet.png"))
        previews = [run / "qa/previews" / f"{state}.gif" for state in [*ROW_DURATIONS, "look", "idle-jump", "idle-look"]]
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


def process_legacy(run, previews=False):
    run = Path(run).resolve()
    manifest = read_json(run / "imagegen-jobs.json")
    request = read_json(run / "pet_request.json")
    processor = Processor(run, previews)
    processor.blockers.extend(reconcile(run, manifest))
    jobs = {job["id"]: job for job in manifest["jobs"]}
    available = {name for name, job in jobs.items() if job["status"] == "complete"}
    key = request["chroma_key"]["hex"]
    for directory in ("qa", "frames", "final", "references"):
        (run / directory).mkdir(exist_ok=True)
    canonical = run / CANONICAL_BASE_PATH
    if "base" in available and (manifest.get("workflow_profile") in ("genpet-parallel", "genpet-early-look", "genpet-egg-three")
                                or not canonical.exists()):
        base = run / jobs["base"]["output_path"]
        processor.step("canonical-reference", [base], [canonical], lambda: shutil.copyfile(base, canonical))
    rows = {}
    is_egg = manifest.get("workflow_profile") == "genpet-egg-three"
    is_parallel = manifest.get("workflow_profile") == "genpet-parallel"
    # New runs only publish the base on the critical path; extract once all sources
    # exist. Legacy manifests keep their incremental reference dependencies.
    sources_ready = set(jobs).issubset(available)
    extract_now = sources_ready or not (is_egg or is_parallel)
    specs = [*ROW_SPECS, ("look-row-9", 9, 8), ("look-row-10", 10, 8)] if is_parallel else ROW_SPECS
    for state, _row, count in ([] if is_egg or not extract_now else specs):
        if state not in available:
            continue
        source = run / jobs[state]["output_path"]
        frames = [run / "frames" / state / f"{index:02d}.png" for index in range(count)]
        report = run / "qa" / f"extraction-{state}.json"
        idle = rows.get("idle", [None])[0] if state == "jumping" else None
        if state == "jumping" and idle is None:
            continue

        def extract(source=source, state=state, report=report, idle=idle):
            reference = None
            if idle is not None:
                with Image.open(idle) as image:
                    reference = image.convert("RGBA")
            result = extract_state(source, state, run / "frames", parse_hex_color(key), 96, "auto", reference)
            write_json(report, result)

        inputs = [source, idle] if idle is not None else [source]
        if processor.step(f"extract-{state}", inputs, [*frames, report], extract, key):
            rows[state] = frames
    if "idle" in rows and not is_parallel:
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
    complete = process_egg(processor, jobs, available, key) if is_egg and sources_ready else False
    if is_parallel and len(rows) == 11 and not processor.blockers:
        extended = run / "qa/extended-raw.png"
        def compose():
            image = Image.new("RGBA", (1536, 2288))
            for state, row, count in specs:
                for col, path in enumerate(rows[state]):
                    with Image.open(path) as frame:
                        image.alpha_composite(frame.convert("RGBA"), (192 * col, 208 * row))
            with Image.open(rows["idle"][0]) as neutral:
                image.alpha_composite(neutral.convert("RGBA"), (192 * 6, 0))
            clear_transparent_rgb(image).save(extended)
        if processor.step("parallel-atlas", [p for frames in rows.values() for p in frames], [extended], compose):
            complete = finish_atlas(processor, extended, key)
    if not is_parallel and len(rows) == len(ROW_SPECS) and not processor.blockers:
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
              "review_jobs": [name for name, job in jobs.items() if job["status"] == "awaiting-review"],
              "executed": processor.executed, "reused": processor.reused,
              "blockers": processor.blockers,
              "atlas": str(atlas) if complete and not processor.blockers else None,
              "portrait": str(run / "final/portrait.png") if complete and not processor.blockers else None,
              "visual_review_required": any(job["status"] == "awaiting-review" for job in jobs.values()),
              "note": "Accept only after atlas/portrait paths are returned and the current request ID is rechecked. Source reviews do not verify processed pixels: inspect idle-jump and idle-look previews for size, direction and continuity before installation."}
    write_json(run / "qa/processing-result.json", result)
    return result


def mirrored_look_frames(upper, lower):
    """Viewer-clockwise 16 directions; flip individual frames, never the strip or temporal order."""
    right = [*upper, *lower]
    if len(right) != 9:
        raise ValueError("Mirrored look production requires nine right-side directions including up and down")
    return [*right, *[ImageOps.mirror(right[index]) for index in range(7, 0, -1)]]


def fallback_row(processor, job, base_frame, count, key):
    run = processor.run
    root = run / "frames" / job["id"]
    frames = [root / f"{index:02d}.png" for index in range(count)]
    source = run / job["output_path"]
    failed = job["failures"][-1]
    indices = failed.get("frame_indices") or list(range(count))
    report = run / "qa" / f"fallback-{job['id']}.json"
    def fill():
        root.mkdir(parents=True, exist_ok=True)
        if len(indices) != count:
            if not source.is_file():
                raise ValueError("Partial fallback requires an existing source for the unaffected cells")
            try:
                result = extract_state(source, "running-right" if job["id"].startswith("egg-") else job["id"],
                                       run / "qa/fallback-source" / job["id"], parse_hex_color(key), 96, "auto")
                candidates = [Image.open(file).convert("RGBA") for file in result["frames"]]
            except (OSError, ValueError, SystemExit):
                with Image.open(source) as opened:
                    cleaned, _report = clean_strip(opened, count)
                candidates = register_frames(slot_crops(cleaned, count))
            for index, image in enumerate(candidates):
                if index not in indices and image.getbbox() is None:
                    raise ValueError("An unaffected fallback cell is empty; identify all failed cells or use whole-row baseline fill")
                image.save(frames[index])
        with Image.open(base_frame) as opened:
            baseline = opened.convert("RGBA")
        for index in indices:
            baseline.save(frames[index])
        write_json(report, {"job": job["id"], "method": "accepted-base-frame-fill", "frame_indices": indices,
                            "source_base_sha256": digest(base_frame), "failure": failed,
                            "limitation": "These cells show the accepted baseline pose; the requested motion/gaze is incomplete."})
    if processor.step(f"fallback-{job['id']}", [base_frame, *([source] if source.is_file() else [])], [*frames, report], fill, indices):
        return frames, read_json(report)
    return None, None


def process_optimized(run, previews=False):
    started = time.monotonic()
    run = Path(run).resolve()
    manifest = read_json(run / "imagegen-jobs.json")
    request = read_json(run / "pet_request.json")
    processor = Processor(run, True)
    processor.blockers.extend(reconcile(run, manifest))
    jobs = {job["id"]: job for job in manifest["jobs"]}
    reviews_file = run / "qa/source-reviews.json"
    reviews = read_json(reviews_file) if reviews_file.exists() else {}
    key = request["chroma_key"]["hex"]
    for directory in ("qa", "frames", "final", "references"):
        (run / directory).mkdir(exist_ok=True)
    available = {name for name, job in jobs.items() if job["status"] == "complete"}
    review_jobs, limitations, rows = [], [], {}
    base = jobs["base"]
    if base["status"] == "awaiting-review":
        review_jobs.append("base")
    base_frame = run / "qa/base-frame.png"
    if "base" in available:
        source = run / base["output_path"]
        canonical = run / CANONICAL_BASE_PATH
        processor.step("canonical-reference", [source], [canonical], lambda: shutil.copyfile(source, canonical))
        def normalize_base():
            result = extract_state(source, "base", run / "qa/base-normalized", parse_hex_color(key), 96, "auto")
            shutil.copyfile(result["frames"][0], base_frame)
        if not processor.step("normalize-base", [source], [base_frame], normalize_base, key):
            record_failure(run, "base", processor.blockers[-1]["error"], "The accepted base cannot be normalized into a usable complete frame")
    manifest = read_json(run / "imagegen-jobs.json")
    jobs = {job["id"]: job for job in manifest["jobs"]}
    base_blocked = jobs["base"].get("failure_summary", {}).get("base_blocked", False)
    for name, job in jobs.items():
        failure = job.get("failures", [])[-1] if job.get("failures") else None
        current_sha = digest(run / job["output_path"]) if (run / job["output_path"]).is_file() else None
        shared_fit_reprocess = name == "jumping" and failure and failure["error"].startswith("Jump does not fit at idle size (")
        if failure and failure.get("source_sha256") == current_sha and not failure.get("resolved_by_processing") and not shared_fit_reprocess:
            latest_base_review = reviews.get("base", [])[-1] if reviews.get("base") else {}
            recovered = name == "base" and latest_base_review.get("verdict") == "pass" and latest_base_review.get("sha256") == current_sha and latest_base_review.get("reviewed_at", "") > failure["at"]
            if not recovered:
                job["status"] = "fallback" if job.get("failure_summary", {}).get("bounded_fallback") else "retry-needed"
                available.discard(name)
        if job.get("failure_summary", {}).get("bounded_fallback"):
            job["status"] = "fallback"
    write_json(run / "imagegen-jobs.json", manifest)
    processor.blockers = [blocker for blocker in processor.blockers
                          if not jobs.get(blocker.get("job"), {}).get("failure_summary", {}).get("bounded_fallback")]
    if jobs["base"].get("status") != "awaiting-review":
        review_jobs = [name for name in review_jobs if name != "base"]
    required = set(jobs) - {"base"}
    sources_ready = "base" in available and base_frame.is_file() and all(jobs[name]["status"] in ("complete", "fallback") for name in required)
    if sources_ready:
        egg = manifest["workflow_profile"] == "genpet-egg-three"
        specs = [(name, 8) for name in EGG_STATE_SOURCES.values()]
        specs = list(dict.fromkeys(specs)) if egg else [(state, count) for state, _row, count in ROW_SPECS]
        if not egg:
            specs += [(name, len(job.get("directions", [])) or 8) for name, job in jobs.items() if name.startswith("look-")]
        for state, count in specs:
            job = jobs[state]
            if job["status"] == "fallback":
                frames, limitation = fallback_row(processor, job, base_frame, count, key)
                if frames:
                    rows[state] = frames
                    limitations.append(limitation)
                continue
            source = run / job["output_path"]
            frames = [run / "frames" / state / f"{index:02d}.png" for index in range(count)]
            report = run / "qa" / f"extraction-{state}.json"
            idle = rows.get("idle", [base_frame])[0] if state == "jumping" else None
            def extract(source=source, state=state, report=report, idle=idle):
                reference = None
                if idle:
                    with Image.open(idle) as opened:
                        reference = opened.convert("RGBA")
                extract_name = "running-right" if egg else state
                result = extract_state(source, extract_name, run / "qa/egg-frames" / state if egg else run / "frames", parse_hex_color(key), 96, "auto", reference, state == "jumping" and not egg)
                if egg:
                    for index, generated in enumerate(result["frames"]):
                        frames[index].parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(generated, frames[index])
                write_json(report, result)
            if processor.step(f"extract-{state}", [source, *([idle] if idle else [])], [*frames, report], extract, key):
                rows[state] = frames
            else:
                failure = record_failure(run, state, processor.blockers[-1]["error"], "Actual saved source failed deterministic extraction")
                available.discard(state)
                if failure["bounded_fallback"]:
                    job = next(item for item in read_json(run / "imagegen-jobs.json")["jobs"] if item["id"] == state)
                    processor.blockers.pop()
                    frames, limitation = fallback_row(processor, job, base_frame, count, key)
                    if frames:
                        rows[state] = frames
                        limitations.append(limitation)
        if len(rows) == len(specs) and not processor.blockers:
            if not egg:
                original_rows = rows
                fitted_rows = {state: [run / "qa/shared-fit" / state / file.name for file in files] for state, files in rows.items()}
                fitted_base = run / "qa/shared-fit/base.png"
                fit_report = run / "qa/shared-fit.json"
                sources = [base_frame, *[file for files in rows.values() for file in files]]
                outputs = [fitted_base, *[file for files in fitted_rows.values() for file in files], fit_report]
                def shared_fit():
                    jump = read_json(run / "qa/extraction-jumping.json")
                    paths, offsets = [base_frame], [(0, 0)]
                    for state, files in original_rows.items():
                        paths.extend(files)
                        offsets.extend([tuple(jump.get("registration_offset", (0, 0))) if state == "jumping" else (0, 0)] * len(files))
                    images = [Image.open(file).convert("RGBA") for file in paths]
                    fitted, report = fit_registered_frames(images, offsets)
                    for image, file in zip(fitted, outputs[:-1]):
                        file.parent.mkdir(parents=True, exist_ok=True)
                        image.save(file)
                    report["jump_registration_offset"] = jump.get("registration_offset", (0, 0))
                    write_json(fit_report, report)
                if processor.step("shared-atlas-fit", [*sources, run / "qa/extraction-jumping.json"], outputs, shared_fit):
                    rows, base_frame = fitted_rows, fitted_base
                    for failure in jobs["jumping"].get("failures", []):
                        if failure["error"].startswith("Jump does not fit at idle size ("):
                            failure["resolved_by_processing"] = {"method": "shared-atlas-affine", "report": str(fit_report), "code_sha256": digest(SCRIPTS / "extract_strip_frames.py")}
                    write_json(run / "imagegen-jobs.json", manifest)
            extended = run / "qa/extended-raw.png"
            if egg:
                composed = processor.step("egg-atlas", [file for group in rows.values() for file in group], [extended, run / "qa/egg-frame-mapping.json"],
                                          lambda: compose_egg(rows, extended, run / "qa/egg-frame-mapping.json"))
            else:
                def compose():
                    image = Image.new("RGBA", (1536, 2288))
                    for state, row, count in ROW_SPECS:
                        for col, file in enumerate(rows[state]):
                            with Image.open(file) as frame:
                                image.alpha_composite(frame.convert("RGBA"), (192 * col, 208 * row))
                    with Image.open(base_frame) as baseline:
                        image.alpha_composite(baseline.convert("RGBA"), (192 * 6, 0))
                    direction_sources = [*rows["look-right-upper"], *rows["look-right-lower"]] if manifest.get("mirror_look") else [*rows["look-row-9"], *rows["look-row-10"]]
                    directions = []
                    for file in direction_sources:
                        with Image.open(file) as frame:
                            directions.append(frame.convert("RGBA"))
                    if manifest.get("mirror_look"):
                        directions = mirrored_look_frames(directions[:5], directions[5:])
                    for index, frame in enumerate(directions):
                        image.alpha_composite(frame, ((index % 8) * 192, (9 + index // 8) * 208))
                    clear_transparent_rgb(image).save(extended)
                    write_json(run / "qa/look-frame-mapping.json", {"mirror_look": manifest.get("mirror_look"), "mirror_reason": manifest.get("mirror_reason"),
                              "directions": [index * 22.5 for index in range(16)], "right_source_indices": list(range(9)) + list(range(7, 0, -1)) if manifest.get("mirror_look") else list(range(16))})
                composed = processor.step("parallel-atlas", [base_frame, *[file for group in rows.values() for file in group]], [extended, run / "qa/look-frame-mapping.json"], compose)
            if composed:
                finish_atlas(processor, extended, key)
    atlas = run / "final/spritesheet.webp"
    validation = run / "qa/final-validation.json"
    candidate = sources_ready and len(rows) == len(specs) and not processor.blockers and atlas.is_file() and validation.is_file() and read_json(validation).get("ok")
    final_review = reviews.get("final", [])[-1] if reviews.get("final") else {}
    accepted = bool(candidate and final_review.get("verdict") == "pass" and final_review.get("sha256") == digest(atlas)
                    and final_review.get("sources") == source_fingerprint(run, manifest))
    if candidate and not accepted:
        review_jobs.append("final")
    manifest = read_json(run / "imagegen-jobs.json")
    # Ordinary sources need structural processing, not individual visual review.
    ready = [] if base_blocked or processor.blockers and "base" not in available else ready_jobs(run, manifest["jobs"])
    if "base" in available and not base_blocked:
        ready += [job["id"] for job in manifest["jobs"] if job.get("status") == "retry-needed" and job["id"] != "base"]
    if jobs["base"].get("status") == "retry-needed" and not base_blocked:
        ready = ["base"]
    result = {"ok": not processor.blockers and not base_blocked, "run_dir": str(run), "source_complete": sorted(available),
              "ready_jobs": list(dict.fromkeys(ready)), "pending_jobs": [name for name in jobs if name not in available],
              "review_jobs": review_jobs, "executed": processor.executed, "reused": processor.reused, "blockers": processor.blockers,
              "candidate_atlas": str(atlas) if candidate else None, "atlas": str(atlas) if accepted else None,
              "portrait": str(run / "final/portrait.png") if accepted else None, "visual_review_required": bool(review_jobs),
              "limitations": limitations, "base_blocked": base_blocked,
              "processing_seconds": round(time.monotonic() - started, 3),
              "preview_files": [str(path) for path in sorted((run / "qa/previews").glob("*.gif"))] if candidate else [],
              "contact_sheet": str(run / "qa/final-contact-sheet.png") if candidate else None,
              "retry_guidance": {job["id"]: job["failure_summary"] for job in manifest["jobs"] if job.get("failure_summary")},
              "note": "Only base and final require visual review. Saved pass records and structural validity alone do not prove semantic correctness. Preserve actual review evidence. A blocked base leaves the Pet operation pending; no old-stage art is substituted."}
    write_json(run / "qa/processing-result.json", result)
    return result


def process(run, previews=False):
    manifest = read_json(Path(run).resolve() / "imagegen-jobs.json")
    return process_optimized(run, previews) if manifest.get("schema_version", 1) >= 2 else process_legacy(run, previews)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--previews", action="store_true", help="Optional diagnostic previews; not an acceptance gate.")
    parser.add_argument("--record-review", metavar="JOB_ID")
    parser.add_argument("--verdict", choices=("pass", "fail"))
    parser.add_argument("--note")
    parser.add_argument("--record-failure", metavar="JOB_ID")
    parser.add_argument("--error")
    parser.add_argument("--attempt-id")
    parser.add_argument("--frame-indices", help="Comma-separated failed zero-based cells; omitted means whole row")
    args = parser.parse_args()
    if args.record_failure:
        if not args.error or not args.note:
            parser.error("--record-failure requires --error and --note")
        indices = [int(value) for value in args.frame_indices.split(",")] if args.frame_indices else None
        print(json.dumps(record_failure(args.run_dir, args.record_failure, args.error, args.note, args.attempt_id, indices), indent=2))
        return
    if args.record_review:
        if not args.verdict or not args.note:
            parser.error("--record-review requires --verdict and --note")
        print(json.dumps(record_review(args.run_dir, args.record_review, args.verdict, args.note), indent=2))
        return
    result = process(args.run_dir, previews=args.previews)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()

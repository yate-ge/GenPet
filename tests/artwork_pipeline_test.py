"""Run with a Python runtime containing Pillow; all artwork stays in temporary directories."""
import json
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vendor/hatch-pet/scripts"))
from prepare_pet_run import make_jobs, make_egg_jobs
from process_pet_run import Processor, process, read_json, ready_jobs, reconcile, write_json, compose_egg
from compose_atlas import ROW_SPECS


class ArtworkPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="genpet-artwork-test-")
        self.run = Path(self.temporary.name).resolve()
        for directory in ("decoded", "qa", "references"):
            (self.run / directory).mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def manifest(self, early=True):
        manifest = {"jobs": make_jobs(self.run, [], early)}
        write_json(self.run / "imagegen-jobs.json", manifest)
        write_json(self.run / "pet_request.json", {"chroma_key": {"hex": "#FF00FF"}})
        return manifest

    def save_image(self, name):
        output = self.run / name
        output.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGBA", (192, 208), (200, 200, 200, 255)).save(output)

    def test_resume_recovers_last_row_and_rejects_corrupt_sources(self):
        manifest = self.manifest()
        self.save_image("decoded/look-row-10.png")
        self.assertEqual(reconcile(self.run, manifest), [])
        last = manifest["jobs"][-1]
        self.assertEqual(last["status"], "complete")
        self.assertTrue(last["source_sha256"])
        (self.run / "decoded/look-row-10.png").write_bytes(b"not an image")
        self.assertEqual(len(reconcile(self.run, manifest)), 1)
        self.assertEqual(last["status"], "invalid")
        (self.run / "decoded/look-row-10.png").unlink()
        reconcile(self.run, manifest)
        self.assertEqual(last["status"], "pending")
        self.assertNotIn("source_sha256", last)

    def test_early_directions_require_idle_reference_but_not_other_rows(self):
        manifest = self.manifest()
        for name in ("decoded/base.png", "decoded/idle.png", "references/layout-guides/look-cardinals.png"):
            self.save_image(name)
        # Use the actual generated layout path, avoiding dependence on guide directory naming.
        cardinal = next(j for j in manifest["jobs"] if j["id"] == "look-cardinals")
        for ref in cardinal["input_images"]:
            if ref["path"] != "qa/idle-reference.png":
                self.save_image(ref["path"])
        reconcile(self.run, manifest)
        self.assertNotIn("look-cardinals", ready_jobs(self.run, manifest["jobs"]))
        self.save_image("qa/idle-reference.png")
        self.assertEqual(ready_jobs(self.run, manifest["jobs"])[0], "look-cardinals")
        self.assertNotIn("look-row-10", ready_jobs(self.run, manifest["jobs"]))
        legacy = next(j for j in make_jobs(self.run, []) if j["id"] == "look-cardinals")
        self.assertIn("review", legacy["depends_on"])

    def test_cache_reprocesses_missing_or_changed_outputs_and_inputs(self):
        source, output = self.run / "input", self.run / "output"
        source.write_text("one")
        calls = []
        def action():
            calls.append(True)
            output.write_text(source.read_text())
        def step():
            return Processor(self.run).step("copy", [source], [output], action)
        self.assertTrue(step())
        self.assertTrue(step())
        self.assertEqual(len(calls), 1)
        output.write_text("damaged")
        self.assertTrue(step())
        source.write_text("two")
        self.assertTrue(step())
        output.unlink()
        self.assertTrue(step())
        self.assertEqual(len(calls), 4)
        self.assertEqual(output.read_text(), "two")

    def test_prepare_stage_profiles_and_prompts(self):
        for flag, profile in (("--egg", "genpet-egg-three"), ("--early-look", "genpet-early-look")):
            directory = self.run / profile
            result = subprocess.run([sys.executable, str(ROOT / "vendor/hatch-pet/scripts/prepare_pet_run.py"),
                                     flag, "--output-dir", str(directory), "--pet-name", "Fixture",
                                     "--pet-notes", "An intact ivory shell with faint sage marks.", "--style-preset", "pixel"],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = read_json(directory / "imagegen-jobs.json")
            self.assertEqual(manifest["workflow_profile"], profile)
            if flag == "--egg":
                self.assertEqual([j["id"] for j in manifest["jobs"]], ["base", "egg-calm", "egg-stir", "egg-settle"])
                self.assertFalse((directory / "prompts/look-cardinals.md").exists())
                for job in manifest["jobs"][1:]:
                    prompt = (directory / job["prompt_file"]).read_text()
                    self.assertIn("NOT been born", prompt)
                    self.assertIn("exactly eight", prompt)
                Image.new("RGBA", (192, 208), (200, 200, 200, 255)).save(directory / "decoded/base.png")
                partial = process(directory)
                self.assertEqual(partial["ready_jobs"], ["egg-calm", "egg-stir", "egg-settle"])
                self.assertIsNone(partial["atlas"])
            else:
                self.assertEqual(len(manifest["jobs"]), 13)
                prompt = (directory / "prompts/look-cardinals.md").read_text()
                self.assertIn("idle reference sheet", prompt)
                self.assertNotIn("standard contact sheet", prompt)

    def test_egg_atlas_uses_exact_ai_frames_without_gaze_or_synthesized_motion(self):
        rows = {}
        for state, color in (("egg-calm", 50), ("egg-stir", 110), ("egg-settle", 170)):
            rows[state] = []
            for index in range(8):
                file = self.run / "decoded" / f"{state}-{index}.png"
                image = Image.new("RGBA", (192, 208))
                image.paste((color, index * 20, 50, 255), (80, 80, 110, 130))
                image.save(file)
                rows[state].append(file)
        output, provenance = self.run / "atlas.png", self.run / "mapping.json"
        compose_egg(rows, output, provenance)
        with Image.open(output) as atlas:
            neutral = atlas.crop((0, 0, 192, 208)).tobytes()
            for row in (9, 10):
                for col in range(8):
                    self.assertEqual(atlas.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208)).tobytes(), neutral)
            for mapping in read_json(provenance)["rows"]:
                row = next(row for state, row, _count in ROW_SPECS if state == mapping["state"])
                for col, index in enumerate(mapping["source_frame_indices"]):
                    with Image.open(rows[mapping["source"]][index]) as source:
                        self.assertEqual(atlas.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208)).tobytes(), source.tobytes())

    def test_egg_pipeline_retains_all_native_slots_and_resumes_without_processing(self):
        manifest = self.manifest()
        manifest.update(workflow_profile="genpet-egg-three", jobs=make_egg_jobs(self.run, []))
        write_json(self.run / "imagegen-jobs.json", manifest)
        with Image.open(ROOT / "assets/pets/mystery-egg/spritesheet.webp") as atlas:
            atlas.crop((0, 0, 192, 208)).save(self.run / "decoded/base.png")
            for state in ("egg-calm", "egg-stir", "egg-settle"):
                atlas.crop((0, 208, 1536, 416)).save(self.run / "decoded" / f"{state}.png")
        result = process(self.run)
        self.assertTrue(result["ok"], result["blockers"])
        self.assertTrue(result["atlas"])
        self.assertTrue(result["portrait"])
        validation = read_json(self.run / "qa/final-validation.json")
        self.assertEqual((validation["width"], validation["height"]), (1536, 2288))
        self.assertEqual(validation["errors"], [])
        self.assertEqual(len(result["source_complete"]), 4)
        self.assertEqual(process(self.run)["executed"], [])

    def test_complete_atlas_resume_and_structural_failure(self):
        self.manifest()
        # Existing checked-in artwork is only a processing fixture, never installed.
        with Image.open(ROOT / "assets/pets/mystery-egg/spritesheet.webp") as opened:
            atlas = opened.convert("RGBA")
        atlas.crop((0, 0, 192, 208)).save(self.run / "decoded/base.png")
        for state, row, count in [*ROW_SPECS, ("look-row-9", 9, 8), ("look-row-10", 10, 8)]:
            atlas.crop((0, row * 208, count * 192, (row + 1) * 208)).save(self.run / "decoded" / f"{state}.png")
        cardinals = Image.new("RGBA", (192 * 4, 208))
        for index, (row, col) in enumerate(((9, 0), (9, 4), (10, 0), (10, 4))):
            cardinals.alpha_composite(atlas.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208)), (index * 192, 0))
        cardinals.save(self.run / "decoded/look-cardinals.png")
        result = process(self.run)
        self.assertTrue(result["ok"], result["blockers"])
        self.assertTrue(result["atlas"])
        self.assertTrue(result["visual_review_required"])
        validation = read_json(self.run / "qa/final-validation.json")
        self.assertTrue(validation["ok"])
        self.assertEqual(validation["sprite_version_number"], 2)
        self.assertEqual(len(list((self.run / "qa/previews").glob("*.gif"))), 10)
        repeated = process(self.run)
        self.assertEqual(repeated["executed"], [])
        self.assertEqual(repeated["atlas"], result["atlas"])
        # A valid image container with missing visible frames must not pass.
        Image.new("RGBA", (192 * 6, 208)).save(self.run / "decoded/review.png")
        broken = process(self.run)
        self.assertFalse(broken["ok"])
        self.assertIsNone(broken["atlas"])
        self.assertEqual(broken["ready_jobs"], [])


if __name__ == "__main__":
    unittest.main()

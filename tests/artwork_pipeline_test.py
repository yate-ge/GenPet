"""Run with a Python runtime containing Pillow; all artwork stays in temporary directories."""
import json
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "plugins/genpet/vendor/hatch-pet/scripts"
sys.path.insert(0, str(PIPELINE))
from prepare_pet_run import make_jobs, make_egg_jobs
from process_pet_run import process, read_json, write_json, compose_egg
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

    def test_prepare_stage_profiles_and_prompts(self):
        for flag, profile in (("--egg", "genpet-egg-three"), ("--early-look", "genpet-early-look")):
            directory = self.run / profile
            result = subprocess.run([sys.executable, str(PIPELINE / "prepare_pet_run.py"),
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

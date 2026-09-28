"""Run with a Python runtime containing Pillow; all artwork stays in temporary directories."""
import json
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "plugins/genpet/vendor/hatch-pet/scripts"
sys.path.insert(0, str(PIPELINE))
from prepare_pet_run import make_jobs, make_egg_jobs, make_parallel_jobs, create_layout_guides
from process_pet_run import process, read_json, write_json, compose_egg, record_review
from compose_atlas import ROW_SPECS
from prepare_strip import clean_strip
from extract_strip_frames import extract_state, register_frames, extract_component_frames


class ArtworkPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="genpet-artwork-test-")
        self.run = Path(self.temporary.name).resolve()
        for directory in ("decoded", "qa", "references"):
            (self.run / directory).mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def manifest(self, early=True):
        create_layout_guides(self.run)
        manifest = {"workflow_profile": "genpet-parallel", "jobs": make_parallel_jobs(self.run, [])}
        write_json(self.run / "imagegen-jobs.json", manifest)
        write_json(self.run / "pet_request.json", {"chroma_key": {"hex": "#FF00FF"}})
        return manifest


    def test_all_eleven_jobs_ready_after_base_without_row_processing(self):
        manifest = self.manifest()
        Image.new("RGBA", (192, 208), (200, 200, 200, 255)).save(self.run / "decoded/base.png")
        result = process(self.run)
        self.assertEqual(set(result["ready_jobs"]), {job["id"] for job in manifest["jobs"][1:]})
        self.assertEqual(len(result["ready_jobs"]), 11)
        self.assertEqual([step["step"] for step in result["executed"]], ["canonical-reference"])
        for job in manifest["jobs"][1:]:
            self.assertEqual(job["depends_on"], ["base"])
            self.assertEqual(len(job["input_images"]), 2)
        Image.new("RGBA", (800, 200)).save(self.run / "decoded/idle.png")
        result = process(self.run)
        self.assertEqual(result["executed"], [])  # no inspection/extraction between generation calls

    def test_review_gate_is_per_source_and_invalidates_replaced_pixels(self):
        manifest = self.manifest()
        manifest["source_review_required"] = True
        write_json(self.run / "imagegen-jobs.json", manifest)
        Image.new("RGBA", (192, 208), "gold").save(self.run / "decoded/base.png")
        pending = process(self.run)
        self.assertEqual(pending["review_jobs"], ["base"])
        self.assertEqual(pending["ready_jobs"], [])
        self.assertFalse((self.run / "references/canonical-base.png").exists())
        record_review(self.run, "base", "pass", "Complete stage-appropriate reference")
        self.assertEqual(len(process(self.run)["ready_jobs"]), 11)
        Image.new("RGBA", (1152, 208), "gold").save(self.run / "decoded/idle.png")
        record_review(self.run, "idle", "fail", "Repeated static copies, no breathing")
        failed = process(self.run)
        self.assertEqual(failed["review_jobs"], ["idle"])
        self.assertEqual(len(failed["ready_jobs"]), 10)
        self.assertIsNone(failed["atlas"])
        Image.new("RGBA", (1152, 208), "orange").save(self.run / "decoded/idle.png")
        record_review(self.run, "idle", "pass", "Test fixture simulates reviewer approval")
        self.assertIn("idle", process(self.run)["source_complete"])
        Image.new("RGBA", (1152, 208), "red").save(self.run / "decoded/idle.png")
        replaced = process(self.run)
        self.assertNotIn("idle", replaced["source_complete"])
        self.assertEqual(replaced["review_jobs"], ["idle"])
        self.assertTrue(replaced["visual_review_required"])
        self.assertEqual(replaced["executed"], [])

    def test_solid_backgrounds_dividers_and_enclosed_details(self):
        for background in ((255,255,255), (27,180,210), (150,55,185)):
            image = Image.new("RGBA", (800, 220), (*background, 255))
            draw = ImageDraw.Draw(image)
            for i in range(8):
                draw.rectangle((i*100+30, 55, i*100+70, 165), fill=(210,120,70), outline="black", width=3)
                draw.ellipse((i*100+40, 75, i*100+50, 85), fill="white", outline="black", width=2)
            # A thin grid across the strip with generous outer margins.
            draw.line((0,25,799,25), fill="black", width=2)
            draw.line((0,195,799,195), fill="black", width=2)
            for x in range(0,800,100):
                draw.line((x,25,x,195), fill="black", width=2)
            cleaned, report = clean_strip(image, 8)
            self.assertEqual(tuple(report["background_rgb"]), background)
            self.assertEqual(cleaned.getpixel((10,10))[3], 0)
            self.assertEqual(cleaned.getpixel((100,100))[3], 0)
            self.assertEqual(cleaned.getpixel((30,100)), (0,0,0,255))
            self.assertEqual(cleaned.getpixel((45,80)), (255,255,255,255))
            source=self.run/'decoded/failed.png'; image.save(source)
            before=source.read_bytes()
            report=extract_state(source, 'failed', self.run/'frames', (255,0,255),96,'auto')
            self.assertEqual(report['method'],'slots')
            self.assertEqual(source.read_bytes(),before)
            self.assertEqual(len(report['frames']),8)

    def test_single_long_outline_near_slot_boundary_is_not_a_divider(self):
        image=Image.new('RGBA',(800,200))
        draw=ImageDraw.Draw(image)
        draw.rectangle((2,40,50,160),fill=(200,150,60,255),outline='black',width=3)
        clean,report=clean_strip(image,8)
        self.assertEqual(clean.tobytes(),image.tobytes())
        self.assertEqual(report['removed_vertical_lines'],[])

    def test_transparent_source_keeps_legitimate_key_colors(self):
        image=Image.new('RGBA',(800,200))
        draw=ImageDraw.Draw(image)
        for i in range(8):
            draw.rectangle((i*100+30,40,i*100+70,160),fill=(255,0,255,255),outline='black',width=3)
        clean, report=clean_strip(image,8)
        self.assertIsNone(report['background_rgb'])
        self.assertEqual(clean.tobytes(),image.tobytes())

    def test_registration_preserves_motion_scale_and_loop_endpoints(self):
        images=[]
        for x,y in [(35,130),(40,95),(45,60),(40,95),(35,130)]:
            im=Image.new('RGBA',(150,220))
            ImageDraw.Draw(im).rectangle((x,y,x+49,y+59),fill=(220,170,90,255))
            images.append(im)
        frames=register_frames(images)
        boxes=[im.getbbox() for im in frames]
        self.assertEqual(len({(b[2]-b[0],b[3]-b[1]) for b in boxes}),1)
        self.assertEqual(boxes[0][1]-boxes[2][1],70)
        self.assertEqual(boxes[2][0]-boxes[0][0],10)
        self.assertEqual(frames[0].tobytes(),frames[-1].tobytes())
        strip=Image.new('RGBA',(750,220))
        for i,im in enumerate(images): strip.alpha_composite(im,(150*i,0))
        components=extract_component_frames(strip,5)
        self.assertEqual([im.getbbox() for im in components],boxes)

    def test_each_source_key_cleans_colored_edges_without_erasing_black_outline(self):
        for bg in [(250,0,250),(20,160,250)]:
            im=Image.new('RGBA',(600,210),(*bg,255));draw=ImageDraw.Draw(im)
            for i in range(6):
                # Opaque blended background rim outside an intact black outline.
                rim=tuple(round(c*.6) for c in bg)
                draw.rectangle((100*i+28,48,100*i+72,152),fill=(*rim,255))
                draw.rectangle((100*i+30,50,100*i+70,150),fill=(220,190,100),outline='black',width=3)
            source=self.run/'decoded/idle.png';im.save(source)
            report=extract_state(source,'idle',self.run/'frames',(255,0,255),96,'auto')
            with Image.open(report['frames'][0]) as frame:
                colors=list(frame.convert('RGBA').getdata())
                self.assertTrue(any((r,g,b,a)==(0,0,0,255) for r,g,b,a in colors))
                self.assertFalse(any(a>32 and b>r+50 and b>g+30 for r,g,b,a in colors))
                self.assertFalse(any(a>32 and r>g+60 and b>g+60 for r,g,b,a in colors))

    def test_prepare_stage_profiles(self):
        for flag, profile in (("--egg", "genpet-egg-three"), ("--parallel", "genpet-parallel")):
            directory = self.run / profile
            result = subprocess.run([sys.executable, str(PIPELINE / "prepare_pet_run.py"),
                                     flag, "--output-dir", str(directory), "--pet-name", "Fixture",
                                     "--pet-notes", "An intact ivory shell with faint sage marks.", "--style-preset", "pixel"],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = read_json(directory / "imagegen-jobs.json")
            self.assertEqual(manifest["workflow_profile"], profile)
            self.assertTrue(manifest["source_review_required"])
            if flag == "--egg":
                self.assertEqual([j["id"] for j in manifest["jobs"]], ["base", "egg-calm", "egg-stir", "egg-settle"])
                Image.new("RGBA", (192, 208), (200, 200, 200, 255)).save(directory / "decoded/base.png")
                self.assertEqual(process(directory)["review_jobs"], ["base"])
                reviewed = subprocess.run([sys.executable, str(PIPELINE / "process_pet_run.py"),
                                           "--run-dir", str(directory), "--record-review", "base",
                                           "--verdict", "pass", "--note", "Fixture review for CLI test"],
                                          capture_output=True, text=True)
                self.assertEqual(reviewed.returncode, 0, reviewed.stderr)
                self.assertEqual(json.loads(reviewed.stdout)["verdict"], "pass")
                partial = process(directory)
                self.assertEqual(partial["ready_jobs"], ["egg-calm", "egg-stir", "egg-settle"])
                self.assertIsNone(partial["atlas"])
            else:
                self.assertEqual(len(manifest["jobs"]), 12)

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
        manifest.update(workflow_profile="genpet-egg-three", jobs=make_egg_jobs(self.run, []), source_review_required=True)
        write_json(self.run / "imagegen-jobs.json", manifest)
        with Image.open(ROOT / "assets/pets/mystery-egg/spritesheet.webp") as atlas:
            atlas.crop((0, 0, 192, 208)).save(self.run / "decoded/base.png")
            for state in ("egg-calm", "egg-stir", "egg-settle"):
                atlas.crop((0, 208, 1536, 416)).save(self.run / "decoded" / f"{state}.png")
        self.assertIsNone(process(self.run)["atlas"])
        for job in manifest["jobs"]:
            record_review(self.run, job["id"], "pass", "Fixture approval for processing test only")
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
        self.assertFalse(result["visual_review_required"])
        validation = read_json(self.run / "qa/final-validation.json")
        self.assertTrue(validation["ok"])
        self.assertEqual(validation["sprite_version_number"], 2)
        self.assertEqual(len(list((self.run / "qa/previews").glob("*.gif"))), 0)
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

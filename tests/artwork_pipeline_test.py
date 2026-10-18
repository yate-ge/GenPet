"""Engineering fixtures only; retain every run for the user's Drive evidence bundle."""
import json
import os
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
from process_pet_run import process, read_json, write_json, compose_egg, record_review, record_failure, mirrored_look_frames
from compose_atlas import ROW_SPECS
from prepare_strip import clean_strip
from extract_strip_frames import extract_state, register_frames, extract_component_frames, fit_registered_frames


class ArtworkPipelineTests(unittest.TestCase):
    def setUp(self):
        parent = Path(os.environ.get("GENPET_TEST_EVIDENCE_DIR",
                                     ROOT / "output/tests/pipeline/test-data")) / "artwork-pipeline"
        parent.mkdir(parents=True, exist_ok=True)
        self.run = Path(tempfile.mkdtemp(prefix="artwork-", dir=parent)).resolve()
        for directory in ("decoded", "qa", "references"):
            (self.run / directory).mkdir()

    def tearDown(self):
        pass  # Preserve source images, failures, previews, raw units and reports.

    def test_shared_fit_keeps_complete_overflow_pose_and_relative_jump_lift(self):
        idle = Image.new('RGBA', (192,208))
        ImageDraw.Draw(idle).rectangle((12,10,179,199),fill=(200,170,90,255))
        jump = Image.new('RGBA', (220,240))
        ImageDraw.Draw(jump).rectangle((26,2,193,191),fill=(200,170,90,255))
        fitted, report = fit_registered_frames([idle,jump],[(0,0),(14,14)])
        self.assertTrue(report['required'])
        a,b=[frame.getbbox() for frame in fitted]
        for index,frame in enumerate(fitted):
            frame.save(self.run/f'shared-overflow-{index}.png')
            self.assertEqual(frame.size,(192,208))
            box=frame.getbbox()
            self.assertTrue(0 < box[0] < box[2] < 192 and 0 < box[1] < box[3] < 208)
        self.assertLessEqual(abs((a[3]-b[3])-22*report['scale']),1)
        self.assertLessEqual(abs((a[2]-a[0])-(b[2]-b[0])),1)
        self.assertLessEqual(abs((a[3]-a[1])-(b[3]-b[1])),1)
        write_json(self.run/'shared-overflow-report.json',report)

    def test_shared_fit_does_not_change_already_complete_native_pixels(self):
        images=[]
        for color in [(200,170,90,255),(90,170,200,255)]:
            image=Image.new('RGBA',(192,208))
            ImageDraw.Draw(image).rectangle((20,30,170,190),fill=color)
            images.append(image)
        fitted,report=fit_registered_frames(images)
        self.assertFalse(report['required'])
        self.assertEqual(report['scale'],1)
        self.assertEqual(report['translation'],[0,0])
        for old,new in zip(images,fitted):self.assertEqual(old.tobytes(),new.tobytes())
        write_json(self.run/'shared-nochange-report.json',report)

    def test_shared_fit_applies_identical_affine_to_neutral_gaze_and_action(self):
        images=[]
        boxes=[(40,80,79,139),(50,60,129,179),(50,0,129,119)]
        colors=[(200,90,90,255),(90,200,90,255),(90,90,200,255)]
        for box,color in zip(boxes,colors):
            image=Image.new('RGBA',(192,240))
            ImageDraw.Draw(image).rectangle(box,fill=color);images.append(image)
        fitted,report=fit_registered_frames(images,[(0,0),(0,0),(0,30)])
        self.assertTrue(report['required'])
        for index,(original,transformed) in enumerate(zip(boxes,fitted)):
            actual=transformed.getbbox()
            self.assertLessEqual(abs((actual[2]-actual[0])-(original[2]-original[0]+1)*report['scale']),1)
            self.assertLessEqual(abs((actual[3]-actual[1])-(original[3]-original[1]+1)*report['scale']),1)
            transformed.save(self.run/f'shared-affine-{index}.png')
        write_json(self.run/'shared-affine-report.json',report)

    def manifest(self, early=True):
        create_layout_guides(self.run)
        manifest = {"schema_version": 2, "workflow_profile": "genpet-parallel", "review_policy": ["base", "final"],
                    "mirror_look": True, "jobs": make_parallel_jobs(self.run, [])}
        write_json(self.run / "imagegen-jobs.json", manifest)
        write_json(self.run / "pet_request.json", {"chroma_key": {"hex": "#FF00FF"}})
        return manifest

    def base(self, directory=None, color=(200,170,90,255)):
        image = Image.new("RGBA", (192,208))
        ImageDraw.Draw(image).rectangle((56,70,135,189), fill=color)
        image.save((directory or self.run) / "decoded/base.png")

    def filled_sources(self):
        self.base()
        with Image.open(ROOT / "tests/fixtures/mystery-egg.webp") as opened:
            atlas = opened.convert("RGBA")
        for state, row, count in ROW_SPECS:
            atlas.crop((0,row*208,count*192,(row+1)*208)).save(self.run / "decoded" / f"{state}.png")
        atlas.crop((0,9*208,5*192,10*208)).save(self.run / "decoded/look-right-upper.png")
        lower = Image.new("RGBA", (4*192,208))
        for index, (row,col) in enumerate(((9,5),(9,6),(9,7),(10,0))):
            lower.alpha_composite(atlas.crop((col*192,row*208,(col+1)*192,(row+1)*208)),(index*192,0))
        lower.save(self.run / "decoded/look-right-lower.png")
        for state,lifts in (("idle",[0]*6),("jumping",[0,8,16,8,0])):
            strip = Image.new("RGBA",(192*len(lifts),208))
            for index,lift in enumerate(lifts):
                ImageDraw.Draw(strip).rectangle((192*index+56,70-lift,192*index+135,189-lift),fill=(200,170,90,255))
            strip.save(self.run / "decoded" / f"{state}.png")


    def test_all_eleven_jobs_ready_after_base_without_row_processing(self):
        manifest = self.manifest()
        self.base()
        record_review(self.run, "base", "pass", "Synthetic fixture decision; not product acceptance evidence")
        result = process(self.run)
        self.assertEqual(set(result["ready_jobs"]), {job["id"] for job in manifest["jobs"][1:]})
        self.assertEqual(len(result["ready_jobs"]), 11)
        self.assertEqual([step["step"] for step in result["executed"]], ["canonical-reference", "normalize-base"])
        for job in manifest["jobs"][1:]:
            self.assertEqual(job["depends_on"], ["base"])
            self.assertEqual(len(job["input_images"]), 2)
        Image.new("RGBA", (800, 200)).save(self.run / "decoded/idle.png")
        result = process(self.run)
        self.assertEqual(result["executed"], [])  # no inspection/extraction between generation calls

    def test_review_gate_is_base_and_final_only_and_invalidates_replaced_pixels(self):
        manifest = self.manifest()
        self.filled_sources()
        pending = process(self.run)
        self.assertEqual(pending["review_jobs"], ["base"])
        self.assertEqual(pending["ready_jobs"], [])
        self.assertFalse((self.run / "references/canonical-base.png").exists())
        record_review(self.run, "base", "pass", "Complete stage-appropriate reference")
        candidate = process(self.run)
        self.assertEqual(candidate["review_jobs"], ["final"])
        self.assertTrue(candidate["candidate_atlas"])
        self.assertIsNone(candidate["atlas"])
        with self.assertRaisesRegex(ValueError, "only the base and the final"):
            record_review(self.run,"idle","pass","A per-source review is no longer a gate")
        record_review(self.run,"final","pass","Synthetic fixture review; not evidence that the generated Pet is semantically correct")
        self.assertTrue(process(self.run)["atlas"])
        with Image.open(self.run / "decoded/idle.png") as image:
            image.putpixel((60,80),(20,40,60,255)); image.save(self.run / "decoded/idle.png")
        replaced = process(self.run)
        self.assertIn("idle", replaced["source_complete"])
        self.assertEqual(replaced["review_jobs"], ["final"])
        self.assertIsNone(replaced["atlas"])
        self.assertTrue(replaced["visual_review_required"])
        self.base(color=(10,20,30,255))
        changed_base = process(self.run)
        self.assertEqual(changed_base["review_jobs"],["base"])
        self.assertIsNone(changed_base["atlas"])
        record_review(self.run,"base","pass","Changed synthetic fixture base; all old rows now need its new reference")
        stale = process(self.run)
        self.assertEqual(len(stale["ready_jobs"]),11)
        self.assertIsNone(stale["candidate_atlas"])

    def test_direction_mirroring_is_framewise_and_preserves_clockwise_order(self):
        poses = []
        for index in range(9):
            image = Image.new("RGBA",(192,208))
            image.putpixel((10,20),(index*20,30,40,255))
            poses.append(image)
        result = mirrored_look_frames(poses[:5],poses[5:])
        self.assertEqual(len(result),16)
        for index in range(9):
            self.assertEqual(result[index].tobytes(),poses[index].tobytes())
        for index,source_index in enumerate(range(7,0,-1),start=9):
            self.assertEqual(result[index].getpixel((181,20)),(source_index*20,30,40,255))
            self.assertEqual(result[index].getpixel((10,20))[3],0)
        with self.assertRaisesRegex(ValueError,"nine right-side"):
            mirrored_look_frames(poses[:4],poses[5:])

    def test_asymmetric_design_opts_out_of_reflection_without_serial_dependencies(self):
        directory = self.run / "asymmetric"
        reason = "The named left-side ribbon and one-sided leaf organ would change identity when reflected."
        result = subprocess.run([sys.executable,str(PIPELINE / "prepare_pet_run.py"),"--parallel","--stage","juvenile",
                                 "--output-dir",str(directory),"--pet-name","Asymmetric fixture","--pet-notes",reason,
                                 "--style-preset","pixel","--no-mirror-look",reason],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        manifest = read_json(directory / "imagegen-jobs.json")
        self.assertFalse(manifest["mirror_look"])
        self.assertEqual(manifest["mirror_reason"],reason)
        self.assertEqual([job["id"] for job in manifest["jobs"][-2:]],["look-row-9","look-row-10"])
        for job in manifest["jobs"][1:]:
            self.assertEqual(job["depends_on"],["base"])
        base_prompt = (directory / "prompts/base-pet.md").read_text()
        self.assertIn("at least eyes",base_prompt)
        self.assertIn("cute, approachable",base_prompt)

    def test_repeated_error_changes_approach_and_three_failed_attempts_fill_only_named_cells(self):
        self.manifest()
        self.filled_sources()
        record_review(self.run,"base","pass","Synthetic reference, not actual generated-art evidence")
        process(self.run)
        source = self.run / "decoded/review.png"
        with Image.open(source) as opened:
            image = opened.convert("RGBA")
        image.paste((0,0,0,0),(2*192,0,3*192,208))
        image.save(source)
        first = record_failure(self.run,"review","missing-cell","Synthetic row has an empty third cell","actual-synthetic-call-1",[2])
        self.assertFalse(first["change_approach"])
        duplicate = record_failure(self.run,"review","missing-cell","Same observation","actual-synthetic-call-1",[2])
        self.assertTrue(duplicate["duplicate_observation"])
        self.assertEqual(duplicate["failed_attempts"],1)
        second = record_failure(self.run,"review","missing-cell","Synthetic second actual attempt still misses cell 2","actual-synthetic-call-2",[2])
        self.assertTrue(second["change_approach"])
        third = record_failure(self.run,"review","missing-cell","Synthetic third actual attempt also failed","actual-synthetic-call-3",[2])
        self.assertTrue(third["bounded_fallback"])
        self.assertEqual(third["redraws_remaining"],0)
        result = process(self.run)
        self.assertTrue(result["candidate_atlas"],result["blockers"])
        self.assertIsNone(result["atlas"])
        self.assertEqual(result["limitations"][0]["frame_indices"],[2])
        with Image.open(self.run / "frames/review/02.png") as fallback, Image.open(self.run / "qa/base-frame.png") as base:
            self.assertEqual(fallback.tobytes(),base.tobytes())
        self.assertEqual(result["review_jobs"],["final"])
        self.assertNotIn("review",result["ready_jobs"])
        self.assertTrue(list((self.run / "qa/source-history").glob("review-*")))

    def test_failed_generation_without_source_reaches_whole_row_fallback_but_base_failure_never_does(self):
        self.manifest()
        self.base()
        record_review(self.run,"base","pass","Synthetic reference only")
        for attempt in range(3):
            record_failure(self.run,"waiting","service-failure","Synthetic tool failure with no output",f"waiting-call-{attempt}")
        after = read_json(self.run / "imagegen-jobs.json")
        self.assertEqual(next(job for job in after["jobs"] if job["id"]=="waiting")["status"],"fallback")
        for attempt in range(3):
            record_failure(self.run,"base","unusable-base","Synthetic base regeneration failed",f"base-call-{attempt}")
        result = process(self.run)
        self.assertTrue(result["base_blocked"])
        self.assertFalse(result["ok"])
        self.assertIsNone(result["atlas"])
        self.assertIsNone(result["candidate_atlas"])
        self.assertEqual(result["ready_jobs"],[])
        self.assertEqual(result["limitations"],[])
        self.base(color=(30,50,80,255))
        record_review(self.run,"base","pass","A later synthetic test base was actually reviewed; old failures remain recorded")
        recovered = process(self.run)
        self.assertFalse(recovered["base_blocked"])
        self.assertTrue(recovered["ready_jobs"])
        self.assertEqual(len(next(job for job in read_json(self.run / "imagegen-jobs.json")["jobs"] if job["id"]=="base")["failures"]),3)

    def test_final_gate_cannot_be_recorded_before_assembly(self):
        self.manifest()
        with self.assertRaises(FileNotFoundError):
            record_review(self.run,"final","pass","No assembled image exists to inspect")

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
            source=self.run/'decoded'/f'failed-{background[0]}-{background[1]}-{background[2]}.png'; image.save(source)
            before=source.read_bytes()
            report=extract_state(source, 'failed', self.run/f'frames-{background}', (255,0,255),96,'auto')
            self.assertEqual(report['method'],'slots')
            self.assertEqual(source.read_bytes(),before)
            self.assertEqual(len(report['frames']),8)

    def test_isolated_background_residue_does_not_shrink_slot_row(self):
        # Desktop e2e 2026-10-12: one leftover pixel in a slot corner stretched that
        # slot's bounds and the shared row transform shrank and lifted every pose.
        def strip(residue):
            image=Image.new('RGB',(8*270,720),(246,5,246));draw=ImageDraw.Draw(image)
            for i in range(8):
                draw.ellipse((i*270+20,245,i*270+250,530),fill=(90,170,110),outline='black',width=4)
                draw.ellipse((i*270+150,330,i*270+170,350),fill='white')  # enclosed eye detail stays
            if residue: image.putpixel((0,719),(30,30,30))
            return image
        frames={}
        for residue in (False,True):
            source=self.run/'decoded'/f'running-right-residue-{residue}.png';strip(residue).save(source)
            report=extract_state(source,'running-right',self.run/f'frames-residue-{residue}',(255,0,255),96,'auto')
            self.assertEqual(report['method'],'slots')
            frames[residue]=[Path(f).read_bytes() for f in report['frames']]
        self.assertEqual(frames[True],frames[False])
        with Image.open(self.run/'frames-residue-True/running-right/00.png') as first:
            box=first.getbbox()
            self.assertGreater(box[3]-box[1],150)

    def test_single_long_outline_near_slot_boundary_is_not_a_divider(self):
        image=Image.new('RGBA',(800,200))
        draw=ImageDraw.Draw(image)
        draw.rectangle((2,40,50,160),fill=(200,150,60,255),outline='black',width=3)
        clean,report=clean_strip(image,8)
        self.assertEqual(clean.tobytes(),image.tobytes())
        self.assertEqual(report['removed_vertical_lines'],[])

    def test_rgba_repeated_near_boundary_body_columns_remain_intact(self):
        image=Image.new('RGBA',(6*128,240))
        draw=ImageDraw.Draw(image)
        for index in range(6):
            x=index*128
            draw.ellipse((x+24,20,x+108,218),fill=(210,150,80,255),outline='black',width=3)
            draw.rectangle((x+4,30,x+6,215),fill=(120,65,35,255))
            draw.rectangle((x+4,145,x+50,150),fill=(210,150,80,255))
        source=self.run/'decoded/rgba-repeated-body.png';image.save(source)
        cleaned,report=clean_strip(image,6)
        self.assertEqual(cleaned.tobytes(),image.tobytes())
        self.assertEqual(report['removed_vertical_lines'],[])
        self.assertEqual(cleaned.getpixel((4,100)),(120,65,35,255))
        cleaned.save(self.run/'rgba-repeated-body-cleaned.png')
        write_json(self.run/'rgba-repeated-body-report.json',report)

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
            source=self.run/'decoded'/f'idle-{bg[0]}-{bg[1]}.png';im.save(source)
            report=extract_state(source,'idle',self.run/f'frames-{bg}',(255,0,255),96,'auto')
            with Image.open(report['frames'][0]) as frame:
                colors=list(frame.convert('RGBA').getdata())
                self.assertTrue(any((r,g,b,a)==(0,0,0,255) for r,g,b,a in colors))
                self.assertFalse(any(a>32 and b>r+50 and b>g+30 for r,g,b,a in colors))
                self.assertFalse(any(a>32 and r>g+60 and b>g+60 for r,g,b,a in colors))

    def test_jump_uses_idle_size_and_baseline_without_erasing_height_motion(self):
        reference = Image.new("RGBA", (192, 208))
        ImageDraw.Draw(reference).rectangle((56, 70, 135, 189), fill=(200, 170, 90, 255))
        original = reference.tobytes()
        images = []
        for lift in (0, 10, 25, 10, 0):
            frame = Image.new("RGBA", (240, 440))
            ImageDraw.Draw(frame).rectangle((40, 140 - lift * 2, 199, 379 - lift * 2),
                                             fill=(200, 170, 90, 255))
            images.append(frame)
        frames = register_frames(images, jump_reference=reference)
        boxes = [im.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox() for im in frames]
        self.assertEqual(reference.tobytes(), original)
        self.assertEqual(boxes[0], reference.getbbox())
        self.assertEqual(boxes[-1], reference.getbbox())
        self.assertEqual({(b[2]-b[0], b[3]-b[1]) for b in boxes}, {(80, 120)})
        self.assertEqual(boxes[0][1] - boxes[2][1], 25)

    def test_oversized_jump_is_rejected_instead_of_shrunk_or_clipped(self):
        reference = Image.new("RGBA", (192, 208))
        ImageDraw.Draw(reference).rectangle((56, 10, 135, 199), fill="white")
        images = []
        for lift in (0, 15, 30, 15, 0):
            frame = Image.new("RGBA", (192, 260))
            ImageDraw.Draw(frame).rectangle((56, 50-lift, 135, 239-lift), fill="white")
            images.append(frame)
        with self.assertRaisesRegex(ValueError, "Regenerate only jumping"):
            register_frames(images, jump_reference=reference)

    def test_jump_overflow_feedback_matches_the_failed_edges(self):
        reference = Image.new("RGBA", (192, 208))
        ImageDraw.Draw(reference).rectangle((56, 10, 135, 199), fill="white")
        for dx, dy, expected in [(80, 0, "right=24px"), (-80, 0, "left=24px"),
                                 (0, -30, "top=20px"), (0, 30, "bottom=22px"),
                                 (80, -30, "right=24px, top=20px")]:
            with self.subTest(dx=dx, dy=dy):
                images = []
                for x, y in [(0, 0), (dx, dy), (dx, dy), (dx, dy), (0, 0)]:
                    frame = Image.new("RGBA", (500, 500))
                    ImageDraw.Draw(frame).rectangle((150+x, 150+y, 229+x, 339+y), fill="white")
                    images.append(frame)
                with self.assertRaises(ValueError) as raised:
                    register_frames(images, jump_reference=reference)
                message = str(raised.exception)
                self.assertIn(expected, message)
                self.assertEqual("align poses horizontally" in message, dx != 0)
                self.assertEqual("reduce upward excursion" in message, dy < 0)
                self.assertEqual("landing feet" in message, dy > 0)

    def test_jump_accepts_a_complete_pose_inside_true_canvas_edges(self):
        reference=Image.new("RGBA",(192,208))
        ImageDraw.Draw(reference).rectangle((1,28,173,200),fill="white")
        images=[]
        for lift in (0,3,6,3,0):
            image=Image.new("RGBA",(192,220))
            ImageDraw.Draw(image).rectangle((1,28-lift,173,200-lift),fill="white")
            images.append(image)
        frames=register_frames(images,jump_reference=reference)
        self.assertEqual(frames[0].getbbox(),reference.getbbox())
        self.assertEqual(frames[2].getbbox()[1],reference.getbbox()[1]-6)

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
            self.assertFalse(manifest["source_review_required"])
            self.assertEqual(manifest["review_policy"],["base","final"])
            if flag == "--egg":
                self.assertEqual([j["id"] for j in manifest["jobs"]], ["base", "egg-calm", "egg-stir", "egg-settle"])
                self.assertFalse((directory / "prompts/look-cardinals.md").exists())
                self.base(directory)
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
                self.assertIn('running',{job['id'] for job in manifest['jobs']})

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
        manifest.update(workflow_profile="genpet-egg-three", jobs=make_egg_jobs(self.run, []), source_review_required=False)
        write_json(self.run / "imagegen-jobs.json", manifest)
        with Image.open(ROOT / "tests/fixtures/mystery-egg.webp") as atlas:
            atlas.crop((0, 0, 192, 208)).save(self.run / "decoded/base.png")
            for state in ("egg-calm", "egg-stir", "egg-settle"):
                atlas.crop((0, 208, 1536, 416)).save(self.run / "decoded" / f"{state}.png")
        self.assertIsNone(process(self.run)["atlas"])
        record_review(self.run, "base", "pass", "Fixture approval for processing test only")
        candidate = process(self.run)
        self.assertTrue(candidate["candidate_atlas"],candidate["blockers"])
        self.assertIsNone(candidate["atlas"])
        record_review(self.run,"final","pass","Synthetic assembled-fixture decision, not product visual evidence")
        result = process(self.run)
        self.assertTrue(result["ok"], result["blockers"])
        self.assertTrue(result["atlas"])
        self.assertTrue(result["portrait"])
        validation = read_json(self.run / "qa/final-validation.json")
        self.assertEqual((validation["width"], validation["height"]), (1536, 2288))
        self.assertEqual(validation["errors"], [])
        self.assertEqual(len(result["source_complete"]), 4)
        self.assertEqual(process(self.run)["executed"], [])
        # Legal reuse is not permission to package blank required shell frames.
        Image.new("RGBA", (8 * 192, 208)).save(self.run / "decoded/egg-stir.png")
        broken = process(self.run)
        self.assertFalse(broken["ok"])
        self.assertIsNone(broken["atlas"])
        self.assertTrue(broken["blockers"])

    def test_complete_atlas_resume_and_structural_failure(self):
        self.manifest()
        # Existing checked-in artwork is only a processing fixture, never installed.
        with Image.open(ROOT / "tests/fixtures/mystery-egg.webp") as opened:
            atlas = opened.convert("RGBA")
        atlas.crop((0, 0, 192, 208)).save(self.run / "decoded/base.png")
        for state, row, count in ROW_SPECS:
            atlas.crop((0, row * 208, count * 192, (row + 1) * 208)).save(self.run / "decoded" / f"{state}.png")
        # This test covers packaging/cache, with a jump that fits at idle scale.
        # The old egg fixture has unrelated silhouette widths in these two rows.
        for state, lifts in (("idle", [0] * 6), ("jumping", [0, 8, 16, 8, 0])):
            strip = Image.new("RGBA", (192 * len(lifts), 208))
            draw = ImageDraw.Draw(strip)
            for i, lift in enumerate(lifts):
                draw.rectangle((192*i+56, 70-lift, 192*i+135, 189-lift), fill=(200,170,90,255))
            strip.save(self.run / "decoded" / f"{state}.png")
        atlas.crop((0,9*208,5*192,10*208)).save(self.run / "decoded/look-right-upper.png")
        lower = Image.new("RGBA",(4*192,208))
        for index,(row,col) in enumerate(((9,5),(9,6),(9,7),(10,0))):
            lower.alpha_composite(atlas.crop((col*192,row*208,(col+1)*192,(row+1)*208)),(index*192,0))
        lower.save(self.run / "decoded/look-right-lower.png")
        record_review(self.run,"base","pass","Synthetic fixture source for deterministic processing only")
        candidate = process(self.run, previews=True)
        self.assertTrue(candidate["candidate_atlas"],candidate["blockers"])
        record_review(self.run,"final","pass","Synthetic final review, not actual generated-art acceptance evidence")
        result = process(self.run, previews=True)
        self.assertTrue(result["ok"], result["blockers"])
        self.assertTrue(result["atlas"])
        self.assertFalse(result["visual_review_required"])
        validation = read_json(self.run / "qa/final-validation.json")
        self.assertTrue(validation["ok"])
        self.assertEqual(validation["sprite_version_number"], 2)
        for name in ("idle-jump", "idle-look"):
            with Image.open(self.run / "qa/previews" / f"{name}.gif") as preview:
                self.assertEqual(preview.size, (192, 208))
                self.assertGreater(preview.n_frames, 1)
        repeated = process(self.run, previews=True)
        self.assertEqual(repeated["executed"], [])
        self.assertEqual(repeated["atlas"], result["atlas"])
        # A changed idle reference must invalidate jump extraction, not other rows.
        source = self.run / "decoded/idle.png"
        with Image.open(source) as strip:
            draw = ImageDraw.Draw(strip)
            for i in range(6):
                draw.rectangle((192*i+54, 70, 192*i+137, 189), fill=(200,170,90,255))
            strip.save(source)
        changed = process(self.run, previews=True)
        self.assertTrue(changed["ok"], changed["blockers"])
        steps = {step["step"] for step in changed["executed"]}
        self.assertIn("extract-jumping", steps)
        self.assertNotIn("extract-waving", steps)
        # A valid image container with missing visible frames must not pass.
        Image.new("RGBA", (192 * 6, 208)).save(self.run / "decoded/review.png")
        broken = process(self.run)
        self.assertFalse(broken["ok"])
        self.assertIsNone(broken["atlas"])
        self.assertEqual(broken["ready_jobs"], ["review"])


if __name__ == "__main__":
    unittest.main()

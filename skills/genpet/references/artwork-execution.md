# GenPet artwork execution

Use this compact path for GenPet. It replaces the bundled hatch-pet scheduling and manual shell recipe; the artwork acceptance policy still governs review and retries. Read the bundled helper source or detailed hatch-pet sections only to diagnose a concrete failure. Motion is AI-generated in both stages; eggs reuse three loops, while creatures keep full state and direction generation.

## Prepare once

Load imagegen and obtain Python from `load_workspace_dependencies`. Use one run directory per current request ID. From the plugin root:

```text
PYTHON vendor/hatch-pet/scripts/prepare_pet_run.py STAGE_FLAG --output-dir RUN --pet-name GenPet --pet-id genpet-companion --pet-notes REQUEST_PROMPT --style-preset pixel
```

Use `--egg` for `phase=incubating`, `--early-look` for `phase=revealed`. Pass each current `referenceFiles` entry as `--reference ABSOLUTE_PATH`. Use actual arguments, not the literal placeholders above. Do not use `--force` on resume: preserve sources, prompts and references. Existing runs can resume with their original manifest and dependencies; the new profiles apply to newly prepared runs.

## Generate and process incrementally

The parent runs this command at startup/resume and whenever a worker returns saved sources:

```text
PYTHON vendor/hatch-pet/scripts/process_pet_run.py --run-dir RUN
```

It reconciles saved, decodable source files with `imagegen-jobs.json`, including the last look row. `complete` here means source availability, **not visual approval**. It extracts available rows, creates the idle reference and cardinal reference, and returns `ready_jobs` in priority order. Corrupt sources produce a diagnostic, not permission to regenerate. Never regenerate a job just because an old manifest says pending when its saved source is valid.

For an egg, inspect the canonical shell once, then generate `egg-calm`, `egg-stir` and `egg-settle` in parallel when workers are available. No cardinals, direction rows, look mechanics or separate native character actions are generated. The helper maps the three AI loops to all required native slots and writes `qa/egg-frame-mapping.json`. It creates no new motion pixels. Review the three extracted loops and neutral pose through the final atlas previews; do not review identical reuse separately nine times.

For a creature, schedule the canonical base first, then prioritize idle. Once the base and extracted idle reference are usable, run the cardinal → row 9 → row 10 chain alongside remaining standard rows. Give this long chain priority as a worker slot frees up; use a small fixed worker pool and dispatch the next ready job instead of waiting for a whole assigned batch. Do not create extra workers solely for this optimization. Keep row 10 grounded in row 9. Look jobs use `qa/idle-reference.png` for scale and baseline and no longer wait for all nine standard rows or their contact sheet.

Workers receive only the current request, canonical references, assigned job prompt and layout, and acceptance rules. They save sources at each job's `output_path`, report completed paths promptly, and leave all manifest writes and processing to the parent. The parent alone runs the processor; never run two processor instances on the same directory. Keep source generation counts, derivations and retries in the run notes. A ready job with more than five references follows the shared skill's reference-priority rule, retaining the idle reference in place of the standard contact sheet.

For creatures, inspect the canonical base and idle reference for usable identity/scale before dispatching grounded direction jobs. For `qa/look-mechanics.md`, record a short description of the realized aiming mechanism. Review cardinal references for usability, not exact angles. Intermediate checker failures require diagnosis under the acceptance policy, not a new artistic gate.

## Finish and resume

Once all sources exist, the same command assembles the complete V2 atlas (using the egg mapping where applicable), removes chroma spill once from a preserved raw atlas, runs V2 validation, and renders a final contact sheet and ten native-slot loops at native frame size. Results and logs live under `qa/`; `qa/processing-result.json` reports atlas and transparent portrait paths only after successful processing. A missing atlas path is not a finished Pet.

Input/tool hashes and output hashes control reuse. Missing or changed outputs rerun their affected processing steps. Changing a source does not automatically redraw downstream AI sources: inspect continuity and regenerate only for a concrete blocker within the shared budget. The helper does not call imagegen, accept art, install a Pet, change lifecycle state or create schedules.

Review `qa/final-contact-sheet.png` and `qa/previews/` once. Keep the raw validation report truthful; if a diagnostic is only a harmless visual warning, follow the acceptance policy and record the reason rather than forcing the helper to report success. Do not rerun the same failed checker without a relevant fix. Use the returned `final/portrait.png` for portrait acceptance, not a chroma-backed base image. Record generation/provenance (including egg frame reuse) and accepted warnings, recheck the current request, accept portrait and atlas, then install and configure the existing growth schedule normally.

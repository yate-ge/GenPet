# GenPet image pipeline

Upstream: OpenAI's curated Hatch Pet skill copied on 2026-09-24, commit `5e99b5b`, Apache-2.0. This vendored copy has GenPet changes; use this document and `framework/references/desktop.md` for current runs. The upstream workflow text, QA references and the unused direction-QA, blind-review, running-left derivation and frame-inspection scripts were removed.

Generation uses Codex's built-in imagegen tool. Python and Pillow perform deterministic extraction, shared registration, background removal, framewise mirroring, assembly and previews. They never invent a Pet, create a cloud Pet or update selection. No API key is needed. `src/pipeline.ts` locates the shipped helpers and probes the actual Python/Pillow runtime; the Agent may pass the Python path returned by host workspace dependencies.

## Prepare and dispatch

```text
prepare_pet_run.py --parallel --stage hatchling --pet-name NAME --pet-notes ACTUAL_DESIGN --style-preset pixel --request-id ACTUAL_REQUEST_ID --output-dir ABSOLUTE_NEW_RUN
prepare_pet_run.py --egg --stage egg --pet-name NAME --pet-notes ACTUAL_SHELL_DESIGN --style-preset pixel --request-id ACTUAL_REQUEST_ID --output-dir ABSOLUTE_NEW_RUN
```

Pass the art-request `.id` as pipeline-prepare's `requestId`.

Preserve the run. Copy each real generated output to its manifest `output_path` and keep its original path and hash. Base art is one literal conventional egg or a cute cartoon pixel living companion with eyes. A hatchling visibly looks undeveloped. Detailed attributes remain the actual Pet design; no shared body or organ menu is imposed.

For a hatched Pet the new schema-2 manifest contains twelve jobs:

- `base`, reviewed first.
- Nine ordinary jobs: `idle`, `running-right`, `running-left`, `waving`, `jumping`, `failed`, `waiting`, `running`, `review`.
- `look-right-upper`: 000, 022.5, 045, 067.5, 090.
- `look-right-lower`: 112.5, 135, 157.5, 180.

All eleven jobs after `base` depend only on its accepted image and can run concurrently. Each attaches the canonical identity reference and its actual spacing guide. No cardinal-image job or sequential look dependency is required.

Processing mirrors the individual right-side poses to 202.5 through 337.5. It never flips the whole strip or reverses animation order. If this specific design's one-sided markings, structures or held objects would change identity, pass `--no-mirror-look "CONCRETE DESIGN REASON"`. The two independent look jobs then become `look-row-9` and `look-row-10`, eight frames each. This decision belongs to the Agent and the actual design.

Eggs use `base` plus `egg-calm`, `egg-stir` and `egg-settle`. Native actions reuse these actual shell frames. The sixteen look cells reuse a quiet shell pose; no creature gaze, crack, face or synthesized movement is drawn.

## Process, review and bound failures

```text
process_pet_run.py --run-dir ABSOLUTE_RUN --record-review base --verdict pass --note ACTUAL_VISUAL_OBSERVATION
process_pet_run.py --run-dir ABSOLUTE_RUN --previews
process_pet_run.py --run-dir ABSOLUTE_RUN --record-review final --verdict pass --note ACTUAL_VISUAL_OBSERVATION
```

Only base and final assembled artwork are visual review gates. Ordinary source rows are decoded and processed, with no separate visual review per source.

Production skill rules are a reference, not GenPet's exhaustive artistic acceptance checklist. Apply GenPet's product goals and this individual's stage/body/story. Native slot names do not mandate literal actions: eggs cannot walk or see, so calm/stir/settle reuse and neutral look cells are valid, not failed gait/jump/gaze. Other bodies may use equivalent expression without invented abilities. Judge meaningful feedback where applicable; minor angle, background-marking, material or tasteful effect differences do not automatically require redraws. Self-authored request/mustShow details are not all hard gates. Reject real boundary, identity/stage, key-story or usability defects with the applicable requirement, visible evidence and impact. Keep actual host format, transparency, complete frames, stable registration and stored-art verification; neither a pass claim nor schema validity proves visual quality. Inspect the final contact sheet and motion previews at actual Pet size. A recorded pass and valid JSON do not prove cute appearance, identity, developmental stage or motion semantics; retain the actual image review evidence.

`candidate_atlas` is a structurally valid image awaiting final visual review. `atlas` and `portrait` are returned only after a recorded final pass matches the exact encoded atlas and source fingerprints. Replacing the base invalidates old row references; replacing any source invalidates final acceptance. Final GIFs include ordinary animations, the sixteen looks, idle-to-jump and idle-to-look transitions.

For an actual failed source or generation attempt:

```text
process_pet_run.py --run-dir ABSOLUTE_RUN --record-failure JOB_ID --error ACTUAL_ROOT_ERROR --note ACTUAL_OBSERVATION --attempt-id ACTUAL_TOOL_CALL_ID
```

Use the actual call/attempt ID when no source was produced or repeated attempts returned identical pixels. Duplicate observation of the same attempt does not spend another retry. After the same error on two attempts, returned guidance says to change the approach. Each row allows two redraws after its initial attempt. At three failed attempts it stops requesting generation and fills the failed cells with the accepted normalized baseline. Optional `--frame-indices 2,3` preserves unaffected cells when their actual source is usable. The fallback report records every filled cell and the incomplete motion/gaze; the complete atlas still needs final review.

A failed or unusable base never receives an invented placeholder or old-stage substitute. The operation stays pending and `base_blocked` reports its actual limit. A later actually reviewed acceptable base can resume the same run while preserving the failures.

## Format, evidence and timing

The output remains transparent v2: 1536×2288, 8×11 cells of 192×208. Ordinary frame counts are 6,8,8,4,5,8,6,6,6; last two rows hold sixteen clockwise directions. r0c6 stores the accepted neutral pose; every other unused cell is transparent. A live read-only Pets preflight on 2026-10-11 accepted an existing v2 sheet with a nonempty r0c6. Revalidate the exact new output with the host's `validate_pet_spritesheet` tool before upload.

Every observed source revision, replaced processing output, report, negative candidate and command log is retained. Metadata histories live in `.history`; source and processing revisions live under `qa/source-history`.

`processing_seconds` and step timings measure deterministic work. Row extraction runs in parallel worker processes (the hatched jump after idle), falling back to one by one when worker processes are unavailable.

GenPet changed `prepare_pet_run.py`, `process_pet_run.py` (including parallel row extraction), `extract_strip_frames.py` and `validate_atlas.py`, and added `prepare_strip.py`. Run the full `tests/artwork_pipeline_test.py` suite with a Python runtime containing Pillow after changes, then validate a real generated atlas.

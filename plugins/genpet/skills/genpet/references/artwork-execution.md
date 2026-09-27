# GenPet artwork execution

This is the normal GenPet path and overrides the bundled hatch-pet review, cardinal-chain and retry recipes. Do not load the full hatch-pet guide for normal generation.

## Plan once, then generate

Load imagegen and obtain Python through `load_workspace_dependencies`. Read the current request once, resolve stage and identity, and prepare all prompts/output paths in one run directory named for the request ID:

```text
PYTHON vendor/hatch-pet/scripts/prepare_pet_run.py STAGE_FLAG --output-dir RUN --pet-name GenPet --pet-id genpet-companion --pet-notes REQUEST_PROMPT --style-preset pixel
```

Use `--egg` for incubating pets and `--parallel` for revealed creatures. Pass current `referenceFiles` with `--reference ABSOLUTE_PATH`. Resolve actual arguments from the request. Do not use `--force` on resume.

Generate the base first. Save it immediately to its manifest output path, then run:

```text
PYTHON vendor/hatch-pet/scripts/process_pet_run.py --run-dir RUN
```

This publishes the canonical base and returns all ready jobs. For creatures, all nine state rows (including both movement sides) and both eight-pose look rows depend only on base. There is no cardinal image, idle dependency, row-9-to-row-10 dependency or movement mirroring decision. For eggs, all three shell loops depend only on base. The egg is unborn; it has no separate actions or directional gaze.

Dispatch every ready job up to the available worker concurrency. Refill each free slot immediately; do not wait for a batch summary. Workers get only their prepared prompt, input paths and output path. Read each prompt once, call imagegen, save the result, and report the path immediately. Do not inspect generated images, review identity or motion, rewrite prompts, request extra references or generate intermediate explanations. Tool-required viewing of existing edit references is allowed; do not add review of new outputs. The parent tracks completed jobs in memory during generation; no per-row processing or re-planning is needed.

Each job uses a contrasting uniform solid background of any suitable color. Exact hex values are not requirements. No separator lines, boxes, grids, gradients, texture or shadows. These are prompt guidance, not reasons for visual inspection or regeneration.

## Process once and install

After all files are saved, run the same processor once. It reconciles decodable sources, detects each source background, removes supported divider lines, tries grid extraction with a component fallback, assembles the atlas and validates structural compatibility. Raw sources remain unchanged. It records extraction and timing reports automatically. Final contact sheets and animation previews are optional diagnostics (`--previews`), never part of the normal path.

Only a returned atlas and portrait mean processing is complete; `ok` with pending sources does not. Check the current request ID, accept the returned portrait and atlas with honest AI-generation/processing provenance, then install to the same native Pet and configure its existing growth schedule as appropriate. No final image review or aesthetic approval step.

On resume, the processor discovers saved sources and reuses unchanged outputs by hashes. Generate only missing jobs. Legacy manifests retain their existing dependencies; do not recreate their already generated artwork. The parent alone runs the processor and writes the manifest. A corrupt or structurally unusable result stops installation, preserves the previous Pet and returns its machine diagnostic. Do not enter a manual image-review, repair-script or regeneration loop.

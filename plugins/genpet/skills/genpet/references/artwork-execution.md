# GenPet artwork execution

This is the normal GenPet path. It replaces bundled hatch-pet batch QA, cardinal dependencies and repeated final review with independent source checks and bounded retries.

## Plan once, then generate

Load imagegen and obtain Python through `load_workspace_dependencies`. Read the current request once, resolve stage and identity, and prepare all prompts/output paths in one run directory named for the request ID:

```text
PYTHON vendor/hatch-pet/scripts/prepare_pet_run.py STAGE_FLAG --output-dir RUN --pet-name GenPet --pet-id genpet-companion --pet-notes REQUEST_PROMPT --style-preset pixel
```

Use `--egg` for incubating pets and `--parallel` for revealed creatures. Pass current `referenceFiles` with `--reference ABSOLUTE_PATH`. Resolve actual arguments from the request. Do not use `--force` on resume.

Generate base first, save it to its manifest output path and visually check the base requirements in [coverage and acceptance](artwork-workflow.md). Record the decision using the command below. Only after base passes, run:

```text
PYTHON vendor/hatch-pet/scripts/process_pet_run.py --run-dir RUN
```

This publishes the canonical base and returns all ready jobs. All nine state rows and both eight-pose look rows depend only on base. No cardinal image, idle dependency, row-9-to-row-10 dependency or movement mirroring decision. For eggs, all three shell loops depend only on base.

## Independent generation, review and retry

Dispatch ready jobs up to available worker concurrency. Refill free slots immediately, before reviewing returned sources; never wait for a batch summary. Workers receive the request/job ID, prepared prompt, references and output path. They call imagegen, save the image and immediately return its path. The parent reviews each returned source while other workers keep generating. If delegated review is useful and capacity permits, queue it as an independent task; never pause all generators for a review batch. With one available worker, retain the same per-job decisions without claiming parallel execution.

Open each returned source and assess only the concrete requirements in artwork-workflow.md against its prepared prompt and canonical base. Record a brief observation, not just 'looks good'. A pass releases that source immediately; it does not wait for siblings. Record each decision without running extraction or atlas assembly:

```text
PYTHON vendor/hatch-pet/scripts/process_pet_run.py --run-dir RUN --record-review JOB_ID --verdict pass|fail --note "Observed motion phases and action compliance, or the specific defect"
```

Only the parent writes review records and runs processing; serialize those short writes while generation continues. The helper binds the verdict to the saved file's hash. It does not perform visual judgment. Never record pass without viewing that exact source. Retain failed originals outside the manifest output path, such as `attempts/JOB_ID-1.png`, before replacing them.

On failure, queue only that job again using the same canonical base, prepared prompt and a concise correction of the observed defect. Do not redesign the pet, re-plan all jobs or regenerate approved siblings. Limit each job to the initial generation plus two retries; use persisted review history and saved attempts to preserve the limit on resume. A tool failure also consumes an attempt and must be recorded in the run notes. If the limit is exhausted, keep completed sources and the existing Pet, finish collecting in-flight results, and report the unresolved job. Never install a partial or failed set. One blocked row does not stop independent jobs from completing.

## Process once and install

After all sources pass, run the processor once with `--previews`. It reconciles source hashes and review receipts, detects each source background, removes supported divider lines, tries grid extraction with component fallback, applies a shared transform within each animation row, removes edge spill, assembles the atlas and validates structural compatibility. Raw sources remain unchanged. Check `qa/previews/idle-jump.gif` and `qa/previews/idle-look.gif` for action-size consistency, readable cardinal directions and continuity at the two look-row boundaries before installation. This focused check does not add a batch aesthetic review or new generation dependencies.

Only returned atlas and portrait paths mean processing is complete; `ok` with pending sources does not. Check current request ID, accept the returned portrait and atlas with honest source-review, AI-generation and processing provenance, then install to the same native Pet and configure its existing growth schedule as appropriate.

Jump extraction uses the processed idle frame as its size/baseline reference, matching the first compact grounded pose's width and preserving the row's motion offsets. This requires visually matching grounded silhouettes; width alone cannot verify anatomy. If the processor reports `Jump does not fit at idle size`, use its edge/pixel diagnostic: left/right overflow requires horizontal alignment and matching grounded width; top overflow requires less upward excursion; bottom overflow requires correcting landing-baseline drift. Retry only jumping within the existing retry budget, review the replacement source, then resume processing. Do not change idle size or silently crop the jump.

On resume, reuse approved sources whose hashes still match. Review saved unreviewed sources before generating anything again; do not treat a missing review as a failed image. A replacement invalidates its old review. Older manifests without `source_review_required` retain legacy behavior: before accepting an unfinished legacy run under this workflow, the parent sets that field to true, reviews saved sources and records their decisions. Preserve existing dependency graphs. A corrupt or structurally unusable result stops installation and returns its machine diagnostic; avoid ad hoc repair loops.

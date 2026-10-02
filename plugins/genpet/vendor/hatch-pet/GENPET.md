# GenPet changes to the vendored Hatch Pet pipeline

Upstream: OpenAI's curated `hatch-pet` skill, copied from the ChatGPT desktop app on 2026-09-24 (repository commit `5e99b5b`). Apache-2.0, see `LICENSE.txt`. Upstream has changed since then; this copy is not kept in sync.

GenPet uses only the desktop atlas path: `prepare_pet_run.py` to write generation jobs, then `process_pet_run.py` to turn reviewed source images into a validated v2 atlas. See `framework/references/desktop.md` for the commands. The other upstream scripts and references are kept unmodified for that pipeline and for comparison.

## Added by GenPet

| File | Purpose |
| --- | --- |
| `scripts/process_pet_run.py` | Resumable, deterministic processing of saved artwork: records source reviews, extracts rows, composes and validates the atlas, renders previews. Never generates or installs a Pet. |
| `scripts/prepare_strip.py` | Solid-background and grid cleanup of a generated row strip before extraction. |

## Modified upstream files

| File | Change |
| --- | --- |
| `scripts/prepare_pet_run.py` | Adds `--parallel` (base image, then all eleven rows independently), `--egg` (static egg jobs) and `--early-look`. `--pet-notes` carries GenPet's appearance request, which already includes the product rules, so the upstream face/style wording was removed from the base prompt. |
| `scripts/extract_strip_frames.py` | Registers each row with one shared transform, keeping temporal offsets, and anchors jumps to the idle silhouette. Reports which edge overflows and what to regenerate instead of shrinking the pet. |
| `scripts/validate_atlas.py` | Adds `--structural-only` to check geometry, alpha and slot use without assuming one chroma background. |

When updating from upstream, apply upstream changes to the unmodified files directly, and re-apply the three modifications above by hand. Then run `python3 -m unittest tests/artwork_pipeline_test.py` and generate a real atlas before releasing.

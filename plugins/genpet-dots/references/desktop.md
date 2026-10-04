# Ordinary Codex Pet

The runtime writes one native entry bound to this pet ID. Existing migrated pets retain their actual native binding. The entry's displayName is the pet's short unique ID (`genpet-xxxxxx`); the user's chosen name is only for conversation. Never use a fixed global name for all pets or create entries for evolution stages/stories. `publish` writes validated artwork and requests cache invalidation through the existing desktop IPC channel; it never selects a different Pet or restarts Codex. It records live active state when the app-tools channel is available and distinguishes refresh delivery from visual confirmation.

Native contract: transparent v2 atlas, 1536×2288, 8×11 cells of 192×208. Native state row counts are 6,8,8,4,5,8,6,6,6; rows 9 and 10 contain eight directional poses each. Keep unused cells transparent, except r0c6 used as the neutral reference. Structural checks do not prove the story's visual meaning or animation quality.

Use built-in imagegen, then the bundled deterministic helpers. Obtain Python through workspace dependencies. Prepare a run using absolute paths and actual request values:

```text
PYTHON vendor/hatch-pet/scripts/prepare_pet_run.py --parallel --output-dir RUN --pet-name NAME --pet-id PET_ID --pet-notes VISUAL_PROMPT --style-preset pixel --reference EXISTING_REFERENCE
```

`VISUAL_PROMPT` is the appearance unit's request for this visual; it already carries the meta rules, so the helper adds only sprite and layout requirements. Use `--egg` instead of `--parallel` for an egg. Base first; inspect it against this individual's genes using `prompts/image-review.md`, then record source review with `process_pet_run.py --run-dir RUN --record-review base --verdict pass --note OBSERVATION`. Run the processor to obtain ready jobs, generate and inspect each source, record reviews, then process with `--previews`. Read the actual job manifest and helper help for IDs and paths. Do not overwrite an existing run on resume. No delegation is required.

These slot names do not impose eyes, hands, feet or a humanoid body. Express greeting, focus, movement and directional attention through whatever this individual's design provides. Generated sequences should be continuous, preserve identity and remain readable at native size. For eggs, generated shell motion is reused across renderer slots; this does not imply a hatched creature.

Accept returned base portrait and atlas using the current request ID and actual provenance. Generate separate story pictures/artifacts when appropriate. The transparent Pet sprite does not constrain the story's scene or format.

On a missing/failed refresh retain the pending story and accepted assets. Resume the same bound target. A first installation does not silently change the user's selection. During user validation, choosing the Pet initially is separate from testing subsequent immediate updates.

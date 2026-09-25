---
name: genpet
description: Adopt, grow, personalize, generate artwork for, and install GenPet as a native Codex Pet. Use for GenPet adoption, daily growth, five-hour context changes, native sprite replacement, or GenPet diagnostics.
---

# GenPet

GenPet runs in the native Codex Pet surface. A separate external development debugger is not bundled or exposed as a plugin tool. Do not substitute a website or a separate floating application for the native Pet.

## Read and adopt

1. Call `genpet_status`. It catches up growth and reads local Codex activity if ingestion is enabled. It returns labels only. Do not ask the user to fill out a questionnaire.
2. During incubation, `hatchIdentity` must remain null. The shell is the only designed object; never pre-generate a creature and derive its egg. At hatching the engine resolves a bounded birth identity from the incubation window and seed.
3. If there is no pet and adoption was requested, call `genpet_adopt`. It creates a unique egg and starts a real five-hour hatch clock. Never overwrite or silently reset an existing pet.
4. Explain the pet's current stage, next change, and actual image status. Do not equate a design request with generated artwork.
5. If automatic growth was requested, complete the initial native install and then configure the single Codex native scheduled task described below. The plugin's default adoption prompt explicitly requests automatic growth.

If MCP is not loaded, use the bundled CLI from the plugin root: `node dist/cli.js status`, `adopt`, or `art-request`. Resolve the root relative to this skill (`../..`), not through a hard-coded developer path.

## Generate or update artwork

1. Call `genpet_art_request`. If ready or paused, do not generate needlessly. Preserve the request ID.
2. Load the installed **imagegen** skill. Use its built-in image generation tool; do not silently switch to an API-key workflow.
3. Read the bundled [hatch-pet pipeline](../../vendor/hatch-pet/SKILL.md). Use its state-specific generation, deterministic extraction, atlas assembly and visual QA. The primary agent owns design decisions and direct visual review; do not spawn workers or blind-review agents unless the user explicitly requests delegation. Record this adaptation honestly rather than claiming independent review. It is Apache-2.0 licensed and bundled for portability. Obtain the bundled Python runtime with `load_workspace_dependencies` before its helper scripts.
4. Use the request prompt, seed, stage, and canonical references. The shared family is **native Codex-style pixel art**, with stepped dark outlines, sparse pixel facial features and a limited palette. The silhouette may be organic and round; the material must not be plush, fuzzy, felt, photographic or 3D clay. Do not copy built-in characters or ship extracted built-in artwork.
5. Egg-first is mandatory. The egg is a plain ivory/gray ovate shell with only faint abstract color/texture clues: no eyes, face, mouth, ears, limbs, leaf pattern or recognizable future creature. Only restrained shell wobbles, tilts and tiny hops; no blinking. Never reference a creature when generating the egg. At the first hatch, reference only the egg for subtle color/texture continuity and the newly resolved birth identity. Create the first creature then; afterward lock that approved identity. Growth changes proportions and modest accessories, and short context changes affect props.
6. Attach the appropriate reference and required layout guide: egg reference for incubation/first hatching, revealed character reference for later growth. Never substitute the independent Moss example for a newly hatched identity. Never synthesize missing animation rows through code or relabel one action as another. A scene stays out of the transparent native sprite.
   The desktop image tool accepts at most five reference images. When a prepared look-row job lists more, omit the initial style example first: retain the canonical character, layout guide, approved cardinal poses, standard contact sheet, and (for row 10) approved row 9. Record that adaptation in the run notes; never omit the layout or required continuity reference.
7. If source-edge validation reports only alpha=1/255 background noise, use the narrow [alpha-noise adapter](../../scripts/normalize_alpha_noise.py), preserve the source and JSON report, then rerun the unchanged official checks. The adapter may not alter any pixel with alpha greater than 1; it is not permission to repair poses or relax clipping thresholds.
8. Review the final sheet and loops. For a growth update, compare the same pose and prop against the canonical birth reference at the actual 192×208 cell size. Uniform enlargement can disappear during official fitting; require the requested torso/head and limb proportion changes to remain perceptible. If it merely looks thinner, has no meaningful maturity change, or changes face/marks to create a difference, reject it. Numeric age or a new file hash alone is not evidence of visual growth. Once deterministic and visual checks pass, call `genpet_accept_art` for the portrait and atlas, recording the imagegen method and QA evidence. A stale request is rejected; re-read it and assess whether a new generation is needed.
   For a repeatable side-by-side check of the actual V2 idle cells, use `scripts/audit_atlas_growth.py --before <approved-earlier-atlas> --after <candidate-atlas> --output <review.png>` with the bundled Python runtime. Its geometric report supports direct visual review; compare matching props when available and never treat a ratio alone as identity or growth acceptance.
9. Call `genpet_install_native`. It exports the approved current-design atlas (exact request ID, including growth and props) to the same custom Pet identity. Preserve the previous valid atlas until the new file is ready. Never patch Codex's app bundle or built-in assets.

Automatic refresh of the same visible native Pet is a required acceptance gate. `genpet_install_native` commits files and then runs the host refresh adapter. With a live Codex remote-debugging channel it invalidates the host `custom-avatars` query cache, which is the same data update the Pets Refresh control performs, and confirms the displayed sprite hash matches the new file (`automaticRefresh: true`, `displayStatus: 'confirmed'`). It does not click Settings or any other control. Without that channel it returns `automaticRefresh: false` and `displayStatus: 'unconfirmed'`. Do not report visible growth complete unless display is confirmed. Do not inject into or patch the app, create a replacement overlay, restart an established user session merely to disguise a missing refresh, or create another Pet. Do not set `GENPET_SKIP_NATIVE_REFRESH`. Launch Codex with `--remote-debugging-port=9222` (or 9341) when automatic refresh must run.

`genpet_install_cdp_launcher` installs only an optional manual launcher under `~/Applications`. It must not install a LaunchAgent, polling monitor or other recurring background process. `genpet_remove_cdp_launcher` removes that launcher.

## Periodic growth

Use **Codex native scheduled tasks** as the only recurring growth trigger. The plugin has no internal timer, background monitor, LaunchAgent, cron job or web dependency. The state engine evaluates five-hour hatch/context and 24-hour growth boundaries on demand, anchored to the adoption timestamp, with offline catch-up. New artwork requires a Codex skill run; the Node MCP process cannot invoke imagegen by itself.

When the user requests ongoing automatic growth, inspect existing GenPet automations and create or update one native thread heartbeat through the Codex automation tool. Default to one hourly due-check so five-hour context and daily growth are coalesced into one current design. Do not create separate jobs that independently redraw the same pet, and do not silently create a scheduled task merely because the plugin was installed. Keep the actual cadence explicit: an hourly poll and generation latency are not a promise of visible change at the exact hatch second.

On each scheduled run: call status → read the current art request → if paused, stop; if ready, install only when the nativeExport design differs or refreshRequired is true → otherwise use built-in imagegen → run official validation and direct visual review → accept the generated art → install to the same native Pet identity. Stay quiet when unchanged; report generated artwork as awaiting host display confirmation, or a failure. Never describe it as completed automatic visual growth without native display evidence.

Allow at most two repair attempts for any one generated row per run. If it still fails, retain the previous approved native pet and report the failed row rather than repeating indefinitely. Do not generate more than one current design per run, replay every missed historical day, or create per-frame native notifications. Keep the last approved art on generation failure. Never punish absence or describe activity labels as a diagnosis of the user's personality.

## User control and tests

`genpet_configure` controls ingestion, outfit freeze, auto-art and name. `genpet_clear_context` removes derived labels, preserving source conversations and chronological growth. Explain what was cleared. Use isolated test data for developer tests. Explicit user debug commands are available as [genpet-reset](../genpet-reset/SKILL.md), [genpet-grow](../genpet-grow/SKILL.md), and [genpet-state](../genpet-state/SKILL.md). Reset is the only explicit action that starts a new adoption; grow records a separate logical-time offset and never rewrites the real adoption date. Scheduled maintenance must never call debug tools. If debug.stateOverride is set, preserve it until the user requests state auto.

## One persistent native companion

All real updates replace artwork under `genpet-companion`. Never create another native entry for a demo, growth stage, context state or test. Keep its native identity stable. Preserve the adoption clock except when the user explicitly invokes reset. Do not ask the user to select a separate demo pet. The removed `genpet_demo_native` tool and `demo-native` command must not be used.

Developer simulations may use `--demo` for isolated adoption, advance, art requests and acceptance. Native installation from demo state is blocked. Tests may export files to temporary directories that are outside the real Codex Pets directory. Packaged example atlases are offline fixtures, not substitutes for this user's pet. File export tests are not proof of a visible native UI update.

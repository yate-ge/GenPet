---
name: genpet
description: Adopt, grow, personalize, generate artwork for, and install GenPet as a native Codex Pet. Use for GenPet adoption, daily growth, five-hour context changes, native sprite replacement, or GenPet diagnostics.
---

# GenPet

GenPet runs in the native Codex Pet surface. The optional bundled web debugger starts only on explicit /genpet-debugger requests. Opening it reads persisted state without changing the pet. Do not substitute a website or a separate floating application for the native Pet.

Resolve the installed plugin root from this skill directory (`../..`) and run all state operations through `node dist/cli.js <command>`. Commands return JSON on stdout. Do not use a hard-coded developer path.

## Read and adopt

1. Run `node dist/cli.js status`. It catches up growth and reads local Codex activity if ingestion is enabled. It returns labels only. Do not ask the user to fill out a questionnaire.
2. During incubation, `hatchIdentity` must remain null. The shell is the only designed object; never pre-generate a creature and derive its egg. At hatching the engine resolves a bounded birth identity from the incubation window and seed.
3. If there is no pet and adoption was requested, run `node dist/cli.js adopt`. It creates a unique egg and starts a real five-hour hatch clock. Never overwrite or silently reset an existing pet.
4. Explain the pet's current stage, next change, and actual image status. Do not equate a design request with generated artwork.
5. If automatic growth was requested, complete the initial native install and then configure the single Codex native scheduled task described below. The plugin's default adoption prompt explicitly requests automatic growth.

## Generate or update artwork

1. Run `node dist/cli.js art-request`. If ready or paused, do not generate needlessly. Preserve the request ID.
2. Load the installed **imagegen** skill. Use its built-in image generation tool; do not silently switch to an API-key workflow.
3. Read [artwork coverage and acceptance](references/artwork-workflow.md) and follow [artwork execution](references/artwork-execution.md). Prepare eggs with `--egg`, creatures with `--parallel`. Plan once, generate base, then dispatch all remaining jobs independently from base within available concurrency; refill slots immediately. Use generation workers when available. The parent owns deterministic processing, acceptance and installation. Obtain Python with `load_workspace_dependencies`. Do not load the full bundled hatch-pet guide for normal generation; its batch QA and serial dependencies are replaced by focused per-source review here.
4. Use the request prompt, seed, stage, and canonical references. The shared family is **native Codex-style pixel art**, with stepped dark outlines, sparse pixel facial features and a limited palette. The silhouette may be organic and round; the material must not be plush, fuzzy, felt, photographic or 3D clay. Do not copy built-in characters or ship extracted built-in artwork.
5. Egg-first is mandatory. The egg is a plain ivory/gray ovate shell with only faint abstract color/texture clues: no eyes, face, mouth, ears, limbs, leaf pattern or recognizable future creature. It is not born yet: generate only calm wobble, stronger stirring and disturbed-then-settling shell motion; no jumping, cracking, blinking, working or directional gaze. Never reference a creature when generating the egg. At the first hatch, reference only the egg for subtle color/texture continuity and the newly resolved birth identity. Create the first creature then; afterward lock that approved identity. Growth changes proportions and modest accessories, and short context changes affect props.
6. Attach current identity references to base generation, then canonical base and the prepared layout guide to each independent row. Generate both movement sides; no mirroring decision. The desktop image tool accepts at most five references; retain current identity references first for base. Downstream jobs need only base and layout. Do not copy the guide's lines or borders. Use any uniform solid background distinct from the pet's colors; exact hex values are unnecessary.
7. Visually check base before releasing dependent jobs. Review each returned row immediately for consecutive animation frames and its basic action requirements; refill generation slots first so siblings keep running. Record each verdict with the source-review helper. Retry only failed jobs, at most twice, with concrete defect feedback. After all sources pass, process once with `--previews` for background detection, divider cleanup, extraction, packing and structural validation. Check the final idle-to-jump and idle-to-look previews for body-size consistency, cardinal directions and gaze continuity as described in artwork-workflow. No batch aesthetic review or new generation dependencies.
8. Once the helper returns valid atlas and portrait paths, recheck the request ID and run `node dist/cli.js accept-art <request-id> <absolute-file> portrait|atlas <provenance>` for each. Record AI generation, per-source visual review, structural validation and deterministic reuse honestly. A stale request requires re-reading and checking relevance, not automatically regenerating pixels.
9. Run `node dist/cli.js install-native`. It exports the approved current-design atlas (exact request ID, including growth and props) to the same custom Pet identity. Preserve the previous valid atlas until the new file is ready. Never patch Codex's app bundle or built-in assets.

`install-native` always commits the approved atlas and requests automatic refresh, including first initialization and ready-art resume. It first connects to the existing desktop IPC socket and broadcasts `query-cache-invalidate` for `custom-avatars`. This works after ordinary desktop startup without debug flags, a launcher, restart, Settings clicks or a background monitor. IPC relay success returns `automaticRefresh: true`, `refreshRequested: true`, `strategy: 'ipc-query-invalidate'`, and `displayStatus: 'unconfirmed'`: automatic refresh was requested, but the displayed sprite hash was not measured. This route passed user-observed visual testing on 2026-09-27. Report “automatic refresh requested”; do not repeatedly reinstall merely because the IPC result lacks a display hash. If IPC fails, report the error and retain retry eligibility. Never equate file writes or IPC delivery with per-run visual proof. Do not inject into or patch the app, create a replacement overlay, restart the session, create another Pet, or set `GENPET_SKIP_NATIVE_REFRESH`. First-time users may still need to select GenPet once; refreshing the catalog does not select or show a pet.

After the first successful egg installation, tell the user: “蛋已经准备好了。打开 Codex 的 Pets，选择 GenPet，就能看到你的蛋。只需选择一次，之后它会在同一个 Pet 中成长。” Do not give this success message before the egg is installed. If another Pet remains selected on later runs, remind the user to select GenPet.


## Periodic growth

Use **Codex native scheduled tasks** as the only recurring growth trigger. The plugin has no internal timer, background monitor, LaunchAgent, cron job or web dependency. The state engine evaluates five-hour hatch/context and 24-hour growth boundaries on demand, anchored to the adoption timestamp, with offline catch-up. New artwork requires a Codex skill run; the Node CLI cannot invoke imagegen by itself.

When the user requests ongoing automatic growth, inspect existing GenPet automations and create or update one native thread heartbeat through the Codex automation tool. Default to one hourly due-check so five-hour context and daily growth are coalesced into one current design. Do not create separate jobs that independently redraw the same pet, and do not silently create a scheduled task merely because the plugin was installed. Keep the actual cadence explicit: an hourly poll and generation latency are not a promise of visible change at the exact hatch second.

On each scheduled run: run `status` → run `art-request` → if paused, stop; if ready, install only when the nativeExport design differs or refreshRequired is true → otherwise delegate built-in imagegen using the artwork workflow → run deterministic structural validation → accept the generated art → install to the same native Pet identity. Stay quiet when unchanged; report new artwork and whether automatic refresh was requested, or a failure. Never describe it as completed automatic visual growth without native display evidence.

On tool or structural failure, retain the previous valid native Pet and report the concrete error. Source visual failures use the bounded per-job retry policy; do not restart the whole run or add repeated final reviews. Do not generate more than one current design per run, replay every missed historical day, or create per-frame native notifications. Keep the last approved art on generation failure. Never punish absence or describe activity labels as a diagnosis of the user's personality.

## User control and tests

`node dist/cli.js configure key=value...` controls ingestion, outfit freeze, auto-art and name. `node dist/cli.js clear-context` removes derived labels, preserving source conversations and chronological growth. Explain what was cleared. Use isolated test data for developer tests. `/genpet-start` ([genpet-start](../genpet-start/SKILL.md)) is the user-facing start/resume command: it adopts only when no pet exists and otherwise completes artwork, native install and the schedule. Explicit user debug commands are available as [genpet-reset](../genpet-reset/SKILL.md), [genpet-grow](../genpet-grow/SKILL.md), and [genpet-state](../genpet-state/SKILL.md). Reset is the only action that replaces an existing pet with a new adoption; grow records a separate logical-time offset and never rewrites the real adoption date. Scheduled maintenance must never call debug commands. If debug.stateOverride is set, preserve it until the user requests state auto.

## One persistent native companion

All real updates replace artwork under `genpet-companion`. Never create another native entry for a demo, growth stage, context state or test. Keep its native identity stable. Preserve the adoption clock except when the user explicitly invokes reset. Do not ask the user to select a separate demo pet. The removed `demo-native` command must not be used.

Developer simulations may use `--demo` for isolated adoption, advance, art requests and acceptance. Native installation from demo state is blocked. Tests may export files to temporary directories that are outside the real Codex Pets directory. Packaged example atlases are offline fixtures, not substitutes for this user's pet. File export tests are not proof of a visible native UI update.

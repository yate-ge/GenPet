# GenPet artwork coverage and acceptance

Follow the [execution path](artwork-execution.md): base, then independent generation and per-source review, with retries only for failed jobs. Do not restore bundled batch QA, blind review, cardinal references or serial direction-row dependencies.

## Focused visual acceptance

Review each source once on arrival. Pass when its required animation and basic identity/action constraints hold. Do not reject for taste, minor drawing differences, an exact background hex value, or thin divider lines supported by cleanup. No final aesthetic approval stage.

- **Base:** one complete, unclipped pet matching the current request and stage, usable as the shared reference; an egg is an intact unborn shell with no face, limbs, cracks or revealed creature.
- **Every animation row:** exact requested number of separated complete frames; the same character, anatomy, markings and props throughout; consecutive time samples of ONE action, not a pose/expression collection or identical copies. Adjacent changes follow a plausible trajectory and the last-to-first transition is natural. No teleporting limbs, switched hands, unrelated posture/task changes, new props or scale popping. Stable camera/orientation and ground baseline; jumping intentionally changes height. Inspect the actual phases across the whole strip, not just the first frame.
- **idle:** calm visible breathing/blink/micro-motion, no large gestures or task changes.
- **running-left/right:** the requested facing stays consistent, with alternating limb/gait phases; no static repeated stride or reversed facing.
- **waving:** the same limb waves through one continuous cycle, with torso and other limb stable.
- **jumping:** crouch, ascent, apex, descent, landing; real height change with stable body size.
- **failed:** one disappointed head-dip and recovery, not a sequence of standing/sitting/lying/back-facing poses.
- **waiting:** one expectant lean/blink/recovery with a stable asking pose; no unrelated wave, shrug or question symbols.
- **running (task):** one focused thinking motion, not foot-running or alternating laptop/paper/magnifier scenes.
- **review:** one attentive tilt/squint/recovery, not celebration or unrelated gestures. Express limb-based instructions using the base pet's existing anatomy.
- **Egg loops:** eight continuous shell-motion frames each: calm wobble, stronger stirring, disturbed tilt then settling. The pet remains unborn throughout; no limbs, face, cracking, jumping or creature actions.
- **Look rows:** eight ordered gaze samples each, not temporal action strips or a body turntable. Row 9 covers 0–157.5 degrees; row 10 covers 180–337.5 clockwise (0 up, 90 viewer-right, 180 down, 270 viewer-left). Torso stays front-facing and planted; eyes/head aim in the required directions with coherent neighboring steps. Do not require a sibling row or cardinal sheet before reviewing either row.

The three egg loops are deterministically mapped to all native state slots; sixteen look slots reuse a neutral calm frame. These renderer slot names do not imply the egg performs creature actions. Record reuse honestly; do not synthesize missing motion in code.

Backgrounds may use any contrasting uniform solid color. Thin supported divider lines are a processing concern; reject clipped/missing/overlapping subjects or major background/scenery that prevents reliable extraction. Minor style differences alone are not retry reasons. Failure feedback names the specific frame transition or unmet action requirement; never use a general 'improve quality' retry.

## Structural boundary

The deterministic floor remains a decodable PNG/WebP atlas, 1536×2288 pixels, 8×11 cells of 192×208, occupied required slots, transparent unused slots, usable alpha and matching version-2 manifest/path. Source review is a visual judgment; these structural checks cannot prove temporal continuity.

A failed structural check stops installation and preserves the previous valid Pet. Request freshness, stable native identity and unchanged adoption state remain mandatory. Never install a stale request or reset the pet to recover artwork.

## Worker handoff

Generation workers use built-in imagegen from the prepared job, save the source and return `request_id`, `job_id`, `file`, and any tool error immediately. They do not wait for siblings, accept/install art, alter lifecycle state, create schedules, spawn more workers or write manifests/review receipts. The parent starts the next ready job immediately and reviews the returned source, or delegates that focused review if capacity permits. Return concise decisions and defect notes; do not echo base64 or lengthy reports.

If a worker cannot access imagegen, report it so the parent can continue directly without repeating saved jobs or silently switching to an API workflow. Keep generation, review and targeted retries flowing independently within the actual available concurrency.

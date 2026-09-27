# GenPet artwork coverage and acceptance

Follow the compact [execution path](artwork-execution.md). Plan once, generate base, then independently generate all remaining jobs from base. Do not inspect generated images or apply aesthetic gates at any stage. This overrides bundled hatch-pet visual QA, blind review, cardinal references, look-mechanics reports and retry requirements. Existing input references may still be viewed where required by the image tool.

## Coverage

**Incubating egg:** the pet is unborn. Generate one canonical shell and three AI eight-frame loops: calm wobble, stronger stirring, disturbed-then-settling. The processor maps calm to idle/waiting/review/movement, stirring to waving/jumping/task-running slots, and settling to failed. These are renderer slot names, not egg behaviors. All sixteen look slots reuse a neutral calm frame. Record the deterministic frame selection honestly; no code-generated motion.

**Revealed creature:** generate nine independent state rows and two independent eight-pose look rows. Both movement sides are generated independently. Look angles run clockwise: row 9 covers 0–157.5 degrees, row 10 covers 180–337.5 degrees. Both rows reference base only; no separate cardinal image or cross-row dependency. Preserve the 16 native slots and ordering.

Prompts guide identity, action, style and direction. Accept the generated interpretation without visual evaluation, comparison against birth art, or redrawing to improve it. Do not claim a visible growth or quality improvement that was not observed.

## Structural boundary

The deterministic floor is a decodable supported PNG/WebP atlas, 1536×2288 pixels, 8×11 cells of 192×208, occupied required slots, transparent unused slots, usable alpha and a matching version-2 manifest/path. Keep the neutral utility cell and truthful egg reuse provenance. Background color is detected separately per source; no exact color is required. Divider lines and spacing differences are handled by the processor's bounded cleanup/extraction fallbacks.

A failed structural check stops installation with a diagnostic and preserves the previous valid pet. Do not automatically regenerate, repeatedly retry a checker or write ad hoc repairs during generation. Request freshness, stable native identity and unchanged adoption state remain mandatory. Never install a stale request or reset the pet to recover artwork.

## Worker handoff

Use available generation workers with minimal context; the parent owns processing, acceptance and installation. Workers call built-in imagegen from the prepared job, save the source and return `request_id`, `job_id`, `file`, and any tool error immediately. They do not view their output, wait for sibling jobs, accept art, install, alter lifecycle state, create schedules or spawn more workers. Preserve tool-required image output; do not echo base64, source images, prompts or review reports into the parent chat.

If a worker cannot access imagegen, report it so the parent can continue directly without repeating saved jobs or silently switching to an API workflow. Dispatch the next ready job as soon as a slot is available. The normal parent workflow is start, dispatch/refill, final processing, request check and installation.

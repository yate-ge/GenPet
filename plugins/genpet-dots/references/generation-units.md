# Structured generation units

Prompts define observable inputs, intermediate results and review points; creative content stays open. Store concise results and source references, rather than full private conversations or a detailed reasoning transcript.

Product rules (grounded design, literal eggs, living creatures, continuity and the review order) live only in [`prompts/meta.md`](../prompts/meta.md). `unit-request` always prepends it to the selected unit. This file covers unit contracts, orchestration and testing.

| Unit | Fixed input for an isolated test | Observable result | Example failure to locate |
| --- | --- | --- | --- |
| context | Provided available context | Facts with source IDs; unknowns | Invented user facts |
| encounter | A saved context result | Encounter, place, connection, evidence IDs | Generic encounter without meaningful connection |
| genes | The same context and encounter | Design basis, self-contained creature genes and literal egg-shell appearance | A source name attached to an arbitrary body; no story-based reason for the source |
| personality | The same context, encounter and genes | Stable temperament, relationship style, state expression and basis | A label that never changes actions; inferred user personality |
| story | Saved context, pet including personality, and relevant history | New experience, visible connection, personality action, state and visual intent | Connection exists only in internal notes; all temperaments behave identically |
| evolution | The saved story, context and current pet including personality | Stage, state, sourced basis, special change and personality effect | A state changes without a user event; elapsed time treated as evolution evidence |
| appearance | Genes, story, change, saved art, host requirements | Reuse/new/unchanged appearance and actual visual requests | Source copied as realistic mature anatomy instead of a cartoon hatchling Avatar |
| image-review | One visual request and an actual image | Boundary, design, cartoon Avatar and phase observations; accept/repair | Source recognizable but young phase or small-size character design missing |
| output | Story, actual completion, available media | Story text and actual media references | Unfinished evolution claimed complete |

Initialization: context → encounter → genes → personality → appearance → saved plan → actual visual creation → image-review → host update → completion → output.

New story: context → saved personality (or a one-time legacy backfill) → story → evolution → appearance → saved plan → actual visual creation/reuse → image-review → host update if needed → completion → output → user naming invitation if due. When reusing a previously reviewed file, refer to its actual acceptance record; do not invent a new image inspection. Unchanged appearances require no host update.

Modules are read separately. Initialization is an orchestration prompt, not another creative unit. An Agent may complete several units in one turn, but keeps their results separate. A unit test fixes upstream results and runs only its selected unit; it does not perform the complete lifecycle.

## Small result envelope

Every unit writes an internal JSON result:

```json
{
  "inputRefs": ["fixture:case-01", "step-of-an-upstream-unit"],
  "result": {"designBasis": "Familiar source, adoption-story link and physical interpretation", "genes": "A self-contained individual design carrying this basis forward", "eggAppearance": "The initialization appearance"}
}
```

`units.json` specifies required input names, result fields and basic types. Additional result fields are allowed. Lists and descriptions carry open content; identity is still stored as natural language. Input references identify saved steps, facts, artifacts or the unit fixture. They do not mean copying all raw user data.

Normal runtime: allocate/resume the operation, save each unit envelope to an absolute file, then `record-step OPERATION_ID UNIT RESULT_FILE`. The returned step ID can be used by later units. Results are append-only and identical retries deduplicate; a revised result adds a new step, keeping the earlier observation. Completed stories keep these internal steps. `status` exposes them for inspection; `story-output` emits only story/media data. Output-unit results may be recorded against the completed story ID.

The saved StoryPlan remains the authoritative update plan. Step recording does not change genes, stage, appearance or completion. Once that plan exists, resume its exact content; visual repair changes the visual request/review, not the pet identity. Refer to previous completed steps rather than rerunning all units.

## Isolated unit test

1. Create a fictional fixture `{"inputs": { ... }, "inputRefs": ["fixture:CASE_ID"]}` with the selected unit's required inputs. Hand-write only raw context and rule probes. Creative upstream inputs are an Agent's actual saved results, frozen for the test; fixtures do not prescribe sources, species, faces or organs.
2. `unit-request UNIT ABSOLUTE_FIXTURE_FILE` returns the precise meta/module prompt, input and prompt hash. Give that request to a test Agent and save its result envelope. Snapshot the returned request; no API key or generation runner is built into the plugin.
3. `verify-unit UNIT ABSOLUTE_RESULT_FILE` checks the result contract without reading/writing a Pet. Test code or an independent reviewer then compares the semantic result with the fixture's expectations.
4. Save the fixture, exact request, output, evaluation criteria and actual observations. For image-review supply a real image and record its visible properties. A missing file is a failed review, not an accepted placeholder.

Contract validity does not prove meaningful user connection, visual diversity or image correctness. These need evidence in the generated content or actual image, and user judgment where appropriate. A model's own pass statement is not independent test evidence. Do not assert one exact story or gene string as the expected result.

Personalization is tested with several different contexts, each run by the Agent from context onward; results should follow their own data. Repeat runs of one encounter may also be compared, judging each design against the genes checkpoints before any image generation, then whether real images express it. Use the existing independent Pet records for a continuity test. Do not require animation generation or end-to-end runs for these units.

An appearance-plan test checks the proposed visual request. An image-generation test must also use the actual image tool to produce the requested static base image, retain its request, references and returned file, and inspect that real image. Testing the base image does not require generating its attached animation set. An image-review test on an existing file verifies inspection behavior, not new image generation.

Image tests send what the runtime would send: the appearance unit's request, wrapped by the host's actual helper (for desktop, the `base-pet.md` written by `prepare_pet_run.py`). Review each image at its actual display size as well as full size. The Agent that generated an image does not accept it; use an independent reviewer and, for product direction, the user. Keep records brief: request, references, returned file, review observations and user verdict. Hashes or pixel statistics belong only to an engineering defect being investigated.

When input or result fields change, developers edit the unit's `.md` and `units.json` contract together. Product-rule changes do not require a new schema. The runtime only assembles requests, validates basic result structure and stores steps; it does not decide creative content, context scope or evolution triggers.

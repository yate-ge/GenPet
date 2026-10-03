# Architecture

GenPet has three layers. Most changes touch only one of them.

| Layer | Where | Decides |
| --- | --- | --- |
| Product rules | `framework/prompts/meta.md` | What a pet, story, egg and Avatar must be. The single rule source. |
| Generation | `framework/prompts/*.md`, `units.json` | One prompt per independently testable unit. Content stays open; the Agent decides it at runtime. |
| Engineering | `src/` | Identity, persistence, retries, artwork files and host updates. No creative judgment. |

Generation units are grouped under four designer roles (details in `framework/references/generation-units.md`): **GeneDesigner** (who the pet is; adoption only), **PetDesigner** (the Avatar at each stage), **StoryDesigner** (stories, evolution, the carrier a story hands the user) and **HomeDesigner** (the pet's home and its view). Roles are prompt-level ownership; the engine does not know them.

Skills (`framework/skills/`) tell the Agent which CLI commands to call and which prompts to read. References (`framework/references/`) document the workflow and host contracts for the Agent.

## One story, end to end

```
skill ─▶ begin-story ─▶ unit prompts (Agent) ─▶ record-step ─▶ plan-story
                                                                   │
      finish-story ◀─ publish / host-result ◀─ accept-art ◀─ art-request (Agent draws, reviews)
           │
           └▶ story-output (Agent presents the story)
```

- `begin-story` allocates the pet once and opens the single pending story for a trigger ID. Retrying the same trigger returns the same story.
- `plan-story` saves the Agent's plan once. Artwork retries keep it.
- `accept-art` copies reviewed files into the pet's assets under the plan's request ID.
- The host update targets the pet's bound surface. Desktop runs `publish`; Dots runs `host-request`, uses its own tools, then reports `host-result`.
- `finish-story` commits stage, state, history and trigger together. Until then, nothing visible changes.

## Source map

| File | Responsibility |
| --- | --- |
| `cli.ts` | Command table. Shared commands plus the package host's commands; help is generated. |
| `model.ts` | Persisted types (`Pet`, `Story`, `Pending`, `StoryPlan`, `ArtRecord`, `HostResult`) and small validators. |
| `store.ts` | `state.json` per host: side-effect-free `peek`, locked `transaction`, atomic writes. |
| `config.ts` | Plugin root, package host, data root, Codex home, prompt and unit files. |
| `lifecycle.ts` | `begin`, `plan`, `finish`, `cancel`, `reset` and `story-output`. |
| `growth.ts` | Pace ceilings: which stage advance or special-form change the next story must carry. |
| `appearance.ts` | Request ID of the current plan; which saved artwork a plan's appearance refers to. |
| `art.ts` | `art-request` (what to draw) and `accept-art` (structural checks, copy into assets). |
| `generation.ts` | `unit-request`, `verify-unit` (data contract only) and `record-step`. |
| `naming.ts` | One naming invitation after the hatch; saves only the user's own answer. |
| `schedule.ts` | Daily trigger slots and the saved schedule reference. |
| `migration.ts` | Finds and explicitly imports legacy v1 desktop records. |
| `image.ts` | PNG/WebP reading without native modules. |
| `debugger.ts`, `debugger-server.ts` | Optional local read-only record viewer. |
| `hosts/index.ts` | `HostAdapter` interface and registry. |
| `hosts/result.ts` | Validates and records what a host did (`host-result`). |
| `hosts/dots.ts` | Dots: bind the Avatar, hand off `host-request`. |
| `hosts/desktop/` | Desktop Pet: `atlas` format checks, `publish` to one entry per pet, `refresh` through the IPC router, `switch` the visible Pet, shared `frames` codec. |

Dependencies point one way: `cli` → feature modules → `appearance`/`lifecycle` → `store` → `model`. Host adapters use the shared modules; shared modules reach host specifics only through `hostFor(host)`.

## Extending

- **Change a product rule**: edit `meta.md`. Only touch a unit prompt if its checkpoint depends on that rule.
- **Add or change a generation unit**: edit its prompt and its entry in `units.json` together. `unit-request` and `verify-unit` pick it up; nothing in `src/` changes.
- **Add a host**: write an adapter with its appearance kind, identity reference kinds, art contract and its own commands. Register it in `hosts/index.ts`, add `config/host.json` and a plugin directory, and add the package name to `scripts/build-plugin.ts`.
- **Add a command**: add an entry to the command table in `cli.ts`, or to the host adapter's `commands` if only one host needs it. Keep the logic in the feature module.
- **Change a skill**: edit `framework/skills/` for shared skills. Host-only skills live in `plugins/<package>/skills/`.

## Packages

`npm run build:plugin` copies `framework/{prompts,references,debugger-web,skills}` into both plugin packages and bundles `src/` into each `dist/`. Those copies are generated; edit the sources. Per package, keep only the manifest, `config/host.json`, README, host-only skills and `scripts/verify-install.mjs`. The desktop package also vendors the `hatch-pet` sprite pipeline under `vendor/`.

## Checks

`npm run verify:fast` runs type-checking, formatting and unit tests. `npm run verify:release` additionally builds, installs both packages into a temporary Codex home and runs the installed CLI and debugger. Contract checks prove engineering behavior only. Whether a story or image is right is judged separately with the Codex-run suite in `tests/agent/README.zh-CN.md`.

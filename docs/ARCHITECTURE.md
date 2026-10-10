# Architecture

[中文](ARCHITECTURE.zh-CN.md)

This is the target architecture, agreed on 2026-10-10, including the link between the desktop and Dots agreed the same day. On 2026-10-11 the diagrams and text were brought in line with what the development plan has settled since. Most of it is how GenPet 0.9.4 already works; the parts that are not built yet are marked **planned** in the diagrams and listed under [Implementation status](#implementation-status). Development follows this document, so edit the status table when a planned part is built.

## Principles

1. **The Agent decides, the runtime records.** Creative content and decisions live in the prompt layer. `src/` handles identity, saved records, retries and putting a new appearance on the Pet Avatar.
2. **The host is a layer.** User information, image generation, scheduling and the Pet Avatar are things the host provides. Each one is either called by the runtime, or used by the Agent with the host's own tools and reported back. Both paths follow the same steps.
3. **A new appearance is checked in four separate ways.** Files written, saved image matches, refresh requested, display confirmed. Each is saved and judged on its own.
4. **Each rule is written once.** A rule lives in one file; other files link to it.
5. **Imports go one way.** Upper parts import lower ones: commands → story flow and everyday features → host adapters → core.

## Layers

![Three layers: host, prompt layer, runtime. The Agent in the host reads the prompt layer and runs the runtime's commands; the runtime's host adapters reach the Pet Avatar through the host interface.](assets/architecture/layers.svg)

| Layer | Where | Decides |
| --- | --- | --- |
| Host | Codex desktop (main environment by default), Dots (can become the main environment) | Provides the Agent and what it uses: user information, image generation, scheduling, the Pet Avatar. |
| Prompt layer | `framework/` | What a pet, story, egg and Avatar must be, and how one story is made. Content stays open; the Agent decides it at runtime. |
| Runtime | `src/` | Identity, saved records, retries, artwork files and putting a new appearance on the Pet Avatar. |

Inside the host, the Agent is the center. The user's commands and talk reach it through chat, and the scheduler triggers it for the 5-hour check while the computer is on. The Agent reads user information, draws with image generation, and puts new appearances on the Pet Avatar, which is what the user sees. The runtime reaches the Pet Avatar too, through the host interface.

The three layers exist once in each of two environments, the desktop and Dots, and one of them is the main environment; see [Two environments](#two-environments).

The three layers are connected through the Agent. The Agent reads the prompt layer to know what to do, and runs the runtime's commands to save and check each step. The runtime's host adapters reach the Pet Avatar through the host interface.

The **Pet Avatar** is the host's own entry that shows the pet: the Pet in Codex, which is the local entry under `CODEX_HOME/pets/` and the cloud Pet it maps to. The cloud Pet has a cloud ID and Codex syncs it; selecting the same cloud ID in Dots shows the same Pet. The host also owns its list, selection and refresh. GenPet keeps the pet's record and artwork files under `~/.genpet/`.

## Prompt layer

Logically the prompt layer is skills: one main skill, a few sub skills, and a set of references. The Agent in the host reads and runs all of them.

The **main skill** handles the basics:

- Entries: `/genpet` takes any request and the Agent picks what to do from what the user said. Each function also has its own command: start, chat, story, grow, stop, reset and the debugger; the choices are in [the development plan, "命令入口"](DEVELOPMENT_PLAN.zh-CN.md#命令入口).
- Telling talk, a story and diagnosis apart; see [Three kinds of request](#three-kinds-of-request).
- The main workflow: read status and user information → decide → draw and check → appearance → finish → tell the user.

It calls a sub skill only when one kind of thing has to be decided.

| Sub skill | Decides | Called |
| --- | --- | --- |
| GeneDesigner | Who the pet is, its soul: the adoption journey (the user chooses, up to 5 rounds), genes and personality (with its speaking habits). | Adoption only |
| StoryDesigner | What happens and how it is told: the story, growth, the story item (one thing in the story worth seeing, drawn as one image), and replies in chat; it updates the pet's memory when a story finishes. | Every story and chat |
| PetDesigner | What the pet looks like: the egg, each stage, new looks, a special form. | Every new appearance |
| HomeDesigner | The pet's home: layout, moving, the home view. | When the home changes |
| ImageReviewer | Whether an image that was actually drawn passes. | Before an image is accepted |

The four Designers decide; ImageReviewer checks the result. It looks at the actual generated file (full size and at the size the host shows it), against the product rules and what the Designer wrote the image must show, and the answer is accept or repair.

Sub skills are roles the same Agent plays in turn. They are called in two orders:

- **Adoption**: GeneDesigner → PetDesigner → ImageReviewer.
- **A later story**: StoryDesigner → PetDesigner (only for a new appearance) → HomeDesigner (only when the home changes) → ImageReviewer (before acceptance).

**References** are the knowledge the main skill and the sub skills share: product rules, the record format, the story check schedule, naming, and what each host can do and its formats. Whichever skill needs one refers to it, and each rule is written there once.

**Today.** 0.9.4 already has all three parts, with the files organized this way: the entries are 7 thin skills that share one workflow document, and the sub skills are 12 unit prompts under `framework/prompts/`. Each unit decides one thing and can be tested on its own with `unit-request` and `verify-unit`.

| Sub skill | Units today |
| --- | --- |
| GeneDesigner | `encounter`, `genes`, `personality` (speaking habits are planned, written in the personality) |
| StoryDesigner | `context`, `story`, `evolution`, `carrier`, `chat`, `output` (memory is planned) |
| PetDesigner | `appearance` |
| HomeDesigner | `home` |
| ImageReviewer | `image-review` |

`context` serves both: at adoption it gives GeneDesigner the user's traits, and afterwards it gives StoryDesigner the user's activity.

Whether the files are also reorganized as a main skill and sub skills is left to the development phase. For where each file is, see [Where each rule is written](#where-each-rule-is-written).

## One story, end to end

![Eight steps: the Agent in the host follows the main skill's workflow and uses what the host provides, and each step is marked with the main skill or the sub skill responsible for it; on the right, the runtime's commands save every step.](assets/architecture/story-flow.svg)

In the diagram, the blue label at the top left of a step is the skill responsible for it, and the grey label at the top right is when the step runs: step 5 only when the story has images, step 6 only for a new appearance.

1. `begin-story` creates the pet once and opens the one unfinished story for a trigger ID. Retrying the same trigger returns the same story. **Planned:** with several pets, the pet is found first from the Pet selected in the host.
2. **Planned.** Before the `context` unit, the Agent reads the user information this host really lets it read, and notes where each piece came from. See [User information](#user-information).
3. Following the main workflow, the Agent calls the sub skills it needs and saves each result with `record-step`. **Planned:** for a story or a gene design the Agent first lists a few candidates and a random tool gives the seed that picks one; at adoption this step is the journey in several rounds, and each round's scene and the user's choice are saved.
4. `plan-story` checks and saves the plan once. Artwork retries keep it.
5. A state that was drawn before is reused. For a new image the Agent draws, ImageReviewer checks the actual file, and `accept-art` copies it into the pet's assets under the plan's request ID.
6. The new appearance goes through the [host interface](#host-interface) onto the pet's own Pet Avatar, found by ID.
7. `finish-story` saves stage, state, history and trigger together; once the record has its blocks, that is memory, state and history. The pet's record changes at this step.
8. `story-output` returns the finished story and its saved media for StoryDesigner to tell the user. A check that only changed the state may have no message, and each image appears in the chat once.

Most ordinary checks are a new look: the pet's appearance changes, and a look drawn before is reused. A text-only story skips steps 5 and 6 and can run at most twice in a row. "Every check has pet content" uses this same flow; the story types are in [the development plan, "故事类型"](DEVELOPMENT_PLAN.zh-CN.md#故事类型).

## Host interface

![In the runtime, the story flow calls the host adapters. They implement the four functions of the host interface. Each step of the desktop adapter is done by the runtime or left to the Agent; the Dots adapter is used when Dots is the main environment, targets the same cloud Pet, and its steps are still to test. Runtime steps reach the Pet Avatar in the host directly; the Agent does the other steps with the host's own tools and reports with host-result. Below, the four appearance checks; finish-story requires the second.](assets/architecture/host-interface.svg)

Every host difference between the two environments sits behind one interface, implemented by the runtime's host adapters. The story flow calls only this interface.

| Function | Purpose |
| --- | --- |
| `validateArt` | Check that an image is in this host's format. |
| `findAvatar` | Find the actual Pet Avatar for this pet, including a cloud ID that the host mapped a local entry to. |
| `setAppearance` | Put the new appearance on the Pet Avatar: do the steps the runtime can do, and return the steps left for the Agent. |
| `diagnose` | Read-only check of the record, the Avatar ID, the host's Pet list, the local-to-cloud mapping, the selection, the refresh channel and the scheduled task. The initialization check and diagnosis both use it. |

**The same steps in both environments, on the same cloud Pet.** `set-appearance` (working name) runs `setAppearance`. The remaining steps come back as a list for the Agent, who does it with the host's own tools and reports with `host-result`. On the desktop the runtime writes the local entry and requests the IPC refresh itself; which of the remaining steps the runtime can do is decided by [host tests](#host-tests). When Dots is the main environment it uses the same atlas format and sets the image for the same cloud ID; how each step is done is tested when Dots is adapted.

**Which Avatar gets the new appearance.** The record keeps the pet's local Avatar ID and the cloud ID last found for it. The host owns the mapping, so `findAvatar` asks the host again every time. A local `custom:` entry and the `pet_` ID it migrated to are the same Pet: the new image goes to the cloud ID, the refresh covers the cloud Pet resources, and the Pet counts as active when the host's selection matches either ID.

**Four checks, and when a story can finish.** Each appearance change saves four results separately:

1. Files written: the write or upload itself succeeded.
2. Saved image matches: the image read back from the host is the same as the accepted image.
3. Refresh requested: the request was delivered.
4. Display confirmed: only when the host can show what is on screen; otherwise it stays unknown.

A story with a new appearance can finish once check 2 passes. If the host cannot be reached at all, the story may finish with a clear note, and the files show when the host next loads them. If the host is reachable but its saved image is different, the story stays unfinished and the next check retries. All four checks go through the host's own interfaces: host APIs, app-tools, IPC and the plugin runtime.

## Two environments

![Codex desktop and Dots each have the same host, skills and runtime. Codex desktop is the main environment by default; its Agent runs GenPet and puts each new appearance on the cloud Pet. Codex syncs the cloud Pet, so the Pet on the desktop and the Dots look are the same Pet. The main environment hands a pet brief to the Dots Agent, which keeps its own functions and replies in the pet's speaking style. The main environment can be switched to Dots, and the record moves with it.](assets/architecture/environments.svg)

The host, skills and runtime exist once in Codex desktop and once in Dots. There is one main environment at a time, and stories and new appearances are made there; it is Codex desktop by default. Three links connect the two environments:

| Link | What it does | Status |
| --- | --- | --- |
| 1. One pet through its cloud ID | The main environment puts the new appearance on the cloud Pet and Codex syncs it to both sides. In Dots the user selects the Pet with the same cloud ID. Each pet has its own cloud ID. | Sync tested by the user; setting the cloud Pet's image is planned |
| 2. Dots becomes this pet | Dots takes the pet's look and replies in its speaking style, and its own functions stay as they are. After every finished story the code takes a pet brief out of the pet's record: its name, soul, memory and state; see [Records](#records). | Planned; how the brief reaches Dots (first try: the Pet entry's `description`) and how the style stays in effect are to test |
| 3. Switch the main environment | The user can switch the main environment to Dots. The old environment stops its scheduled checks, the record moves, and the new environment continues the stories. | Planned; setting the appearance for the same cloud ID from Dots is to test |

The speaking style comes from two parts of the record: the pet's sounds and basic speaking habits are written in the personality in its soul, and how close and in what tone it talks to the user comes from its memory. It is used in three places: when the user talks to the pet, in what the pet says in stories, and in Dots' replies.

Dots keeps working as before. While the pet is an egg, Dots speaks as it always did and only its look changes; for a hatchling, one short sound is added at the start or end of a reply; a juvenile or adult speaks from its personality and how it and the user get along now. The speaking style applies only to what Dots says to the user; the code, documents and messages Dots produces for the user stay as they are.

Development has two phases: the desktop and link 1 first, then the Dots adaptation with links 2 and 3. The questions to test for each and the approaches to try are in [the development plan, "Dots 联动"](DEVELOPMENT_PLAN.zh-CN.md#dots-联动).

## User information

Reading user information is something the Agent does before writing.

- A host reference lists what each host has been tested to let the Agent read, and the limits.
- The workflow puts the reading step before the `context` unit, for adoption and for every later story.
- The `context` unit's existing `inputRefs` record where each piece came from. "Could not read" and "nothing new" are saved as different results.

The Agent chooses which information matters and how far back to look.

## Three kinds of request

**Planned.** `/genpet` and plain-language requests lead to one of three things. The Agent picks from what the user actually asked:

| Request | When | How the reply reads |
| --- | --- | --- |
| Conversation | The user talks to the pet with `/genpet-chat`. Runs the `chat` unit and may save a chat note. | In the pet's voice |
| Story | A scheduled, proactive or explicit trigger. Runs the full flow above. | In the pet's voice |
| Diagnosis | "Load my pet", "it isn't showing", "I can't find it". Runs `diagnose`, fixes what it actually found, then checks again. It works on the host side only; the pet itself stays as it is. | Plain and direct |

## Runtime modules

The runtime has five parts, matching the runtime layer in the diagram:

- **Commands**: every command the Agent runs enters here and returns one JSON result.
- **Everyday features**: story check periods, naming, chat notes and the status summary. Planned: recent content (the type of each recent check and what is still in progress) and the random tool (a seed that picks one of the Agent's candidates).
- **Story flow**: begin → unit results → plan → images → appearance → finish. There is one unfinished story at a time and every step is safe to retry. The code enforces three rules: a fixed identity, stages only move forward, and growth deadlines. A fourth is planned: at most two text-only stories in a row.
- **Host adapters**: one for each environment, the desktop and Dots. They check the image format, find the Avatar, set the appearance and diagnose. This is the only part of the runtime that touches a host.
- **Core**: the saved data format, locking and atomic writes. The other parts read and write records through it.

The files behind each part:

| Group | Files | What it does |
| --- | --- | --- |
| Command table | `cli.ts` | Shared commands plus the package host's commands; help is generated. |
| Story | `lifecycle.ts` | `begin`, `plan`, `finish`, `cancel`, `reset` and `story-output`. |
| | `growth.ts` | Growth deadlines: which stage advance or special-form change the next story must include. |
| | `art.ts` | `art-request` (what to draw) and `accept-art` (format checks, copy into assets). |
| | `generation.ts` | `unit-request`, `verify-unit` (field checks only) and `record-step`. |
| Everyday features | `schedule.ts` | Check periods, the saved schedule reference, time since the last story. |
| | `naming.ts` | One naming invitation after the hatch; saves only the user's own answer. |
| | `chat.ts` | Brief notes of what the user told the pet. |
| | `status.ts` | The short summary the Agent reads by default. |
| Host adapters | `hosts/index.ts` | The host interface and the list of adapters. |
| | `hosts/result.ts` | Checks and saves what a host did (`host-result`). |
| | `hosts/desktop/` | Desktop Pet: `atlas` format, `publish` to one entry per pet, `refresh` through the IPC router, `switch` the visible Pet (the user's test on 2026-10-11 found switching does not work; to be retested), shared `frames` codec. |
| | `hosts/dots.ts` | Today's Dots adapter, written for Dots' own Avatar: save the Avatar ID, leave the appearance change to the Dots Agent. Removed in the first phase; rebuilt for the same cloud Pet when Dots is adapted. |
| Core | `model.ts` | Saved data types and small validators. |
| | `store.ts` | Read without side effects (`peek`), locked `transaction`, atomic writes. |
| | `appearance.ts` | The current plan's request ID and the artwork a plan refers to. Becomes the `pending` module, see below. |
| Support | `config.ts`, `image.ts`, `migration.ts` | Paths and prompt files; pure-JS PNG/WebP reading; explicit import of v1 desktop records. |
| Debugger | `debugger.ts`, `debugger-server.ts` | Optional local read-only record viewer. |

**Import rule.** `cli` → Story and Everyday features → Host adapters → Core; imports follow this direction only. Files stay in the flat layout; the groups describe the import rule.

**Planned.** Today two import cycles break this rule: `lifecycle → appearance → hosts → dots → lifecycle`, and `hosts → desktop/publish → art → hosts`. `art.ts` also imports the desktop atlas check directly, and `debugger-server.ts` imports the desktop switch. The fix is small: the functions that only read the unfinished story (`pendingFor`, the request ID, the planned appearance) move into one Core module that takes the host's image format as an argument, and the format check and the Pet list go behind `validateArt` and `diagnose`.

## Records

```
~/.genpet/<host>/
  state.json            pet, unfinished story, stories, artwork list, chat notes, schedule
  stories/<story>.json  that story's unit results (planned; inside state.json today)
  pets/<pet>/assets/    accepted artwork
  backups/              full record before a reset or a legacy import
```

The record is saved in the main environment; `GENPET_DATA_DIR` moves the base directory; the per-host folders stay the same. When the main environment is switched, the record moves with it (planned). Every change runs inside one locked transaction and is written atomically. Unit results move out of `state.json` because they are the part that keeps growing, and the whole file is rewritten on every command. Existing records stay readable. The fields are described in `framework/references/storage.md`.

**Planned.** In `state.json`, `pet` is how the pet is now and the story list is its history. `pet` changes only in `finish-story` and when it is named. It has an identity and three blocks:

```
pet
  id, name, naming, adoptedAt, revision, Avatar ID   identity, managed by code
  soul    { genes, personality, acquisition }        who it is
  memory  { text, updatedAt, storyId }               what it remembers
  state   { stage, description, home, special }      how it is now
```

| Block | Holds | Written by, and when |
| --- | --- | --- |
| soul | Genes, personality (with its sounds and speaking habits), how it was adopted | GeneDesigner, once at adoption; it stays the same afterwards |
| memory | One short text: the important things that happened between the pet and the user, and how they get along now | StoryDesigner, when a story finishes; rewritten only after a real interaction worth remembering |
| state | Stage, the description of its current state, home, special form | StoryDesigner and HomeDesigner, every time a story finishes |

The memory is about the pet and the user together, a summary of the stories and chat notes; what is known about the user personally comes first from the host's own user memory. Today these fields sit flat in `pet` and there is no memory; moving to three blocks raises the record version to 3, and existing records stay readable. The block and field names are working names, to be settled during development.

**Planned: several pets.** A user can have several GenPets, one directory each, with its own record, artwork, Pet entry and cloud ID. One pet is active at a time, the one whose Pet the user has selected in the host; scheduled stories and slash commands find the pet by that ID. Initialization first makes a read-only check of what already exists and confirms with the user, and what an older version left behind does not affect a new pet. The requirements are in [the development plan](DEVELOPMENT_PLAN.zh-CN.md#初始化检查领养新宠物和多只宠物).

## Where each rule is written

| Kind of rule | Written in |
| --- | --- |
| What a pet, egg, story and Avatar must be; how often stories come; how the user appears in them | `framework/prompts/meta.md` |
| One unit's inputs, result and review points | That unit's prompt and its entry in `units.json` |
| The order of steps and which command to run | `framework/references/workflow.md` |
| What a host can do and its formats | `framework/references/desktop.md`, `dots.md` |
| What the user sees | `framework/prompts/output.md` |
| When a command applies and whether it needs the user's confirmation | The skill, which otherwise only links to the files above |
| Rules the code enforces: one identity, one unfinished story, stages only forward, growth deadlines, the pet's own Avatar, at most two text-only stories in a row (planned) | `src/` |

**Planned.** Some rules are written in several files today, for example when a check may end without a story. Each moves to its one file and the others link to it.

## Implementation status

| Part | 0.9.4 | To reach the target |
| --- | --- | --- |
| Story lifecycle, one unfinished story, safe retries, growth deadlines | Built | None |
| Generation units, `record-step`, single-unit tests | Built | None |
| Prompt layer organized as main skill, sub skills and references | The content exists: 7 thin skills share one workflow document, 12 units are grouped by role, the image check is named `image-review` | Decide in the development phase whether to reorganize the files this way; rename `image-review` to ImageReviewer |
| Desktop: local entry, IPC refresh, selection read and switch | Built; the user's test found that switching to a given Pet ID does not work | Becomes the runtime's part of `setAppearance`; the design relies only on setting the appearance for the same ID, and switching is retested during development |
| Today's Dots-only code: the `genpet-dots` package, `hosts/dots.ts`, `bind-avatar`, `host-request`, the `avatar` format | Written for Dots' own Avatar; the test on Dots on 2026-10-03 did not work | Remove in the first phase; the scope is in [the development plan](DEVELOPMENT_PLAN.zh-CN.md#现有的-dots-代码和文档) |
| Host interface | Adapter has `appearanceKind`, `artContract`, `commands` | Add `validateArt`, `findAvatar`, `setAppearance`, `diagnose` |
| The same steps in both environments | Desktop `publish`, Dots `host-request`, two paths | One `set-appearance` returning the steps done and the steps left |
| Sync through the cloud ID: put the new appearance on the cloud Pet | Not handled; only the local entry is written and only `custom-avatars` is refreshed. Codex syncing the cloud Pet and selecting the same ID in Dots were tested by the user | Read the mapping, send the new image to the cloud ID, refresh cloud Pet resources |
| Saved-image check before finishing | Not recorded; a story finishes on `active: false` or a requested refresh | Save the read-back result; `finish-story` requires it |
| Pet record in three blocks: soul, memory, state | Fields sit flat in `pet`; there is no memory, and the personality text covers how the pet treats the user | Split `pet` into three blocks, add the memory, raise the record version to 3, keep existing records readable |
| Several pets, initialization check | One pet per environment; initialization does not check existing Pet entries, cloud Pets or the scheduled task | One directory per pet, one active pet decided by the Pet selected in the host; initialization checks first and confirms with the user; cleanup is transparent |
| The pet's speaking style | Not saved; how the pet talks comes from the stage rules and the personality each time | Add its sounds and speaking habits to the personality; closeness and tone come from the memory; use both in chat and stories |
| Dots becomes this pet | Not started | The pet brief taken from the record, how it reaches Dots, and the speaking style staying in effect in Dots; tested when Dots is adapted |
| Switch the main environment | Not started | The record moves, one environment writes stories at a time, the Dots adapter; tested when Dots is adapted |
| Reading user information | The `context` unit receives whatever it is given; no reading step | Host reference of readable sources, workflow step, sources saved in `inputRefs` |
| Adoption journey | The encounter is one generated passage | A journey in several rounds, up to 5; each round's scene and the user's choice are saved, and the user can continue after leaving |
| Random tool and recent content | None | A tool gives a seed and the pet's source type and picks one of the Agent's candidates; the code hands the Agent a summary of recent content; at most two text-only stories in a row |
| New looks | Never triggered | The body stays the same; what it wears, holds and how it poses changes. The whole set is redrawn, and drawn looks are saved under the pet and reused; see "换装" in the development plan |
| Three kinds of request | `/genpet` leads to conversation only | `/genpet` takes any request and conversation moves to `/genpet-chat`; add diagnosis, built on `diagnose` |
| One-way imports | Two import cycles, two direct host imports | Move the unfinished-story functions into Core |
| Unit results saved per story | Inside `state.json` | One file per story |
| Each rule written once | Some rules repeated across files | Move each to its one file |

### Host tests

These three facts decide whether a step is done by the runtime or by the Agent.

1. Can the plugin runtime, a Node process, replace a cloud Pet's artwork itself, or can only the Agent call the Pets API?
2. Can the local-to-cloud mapping be read through a host interface, or only from the client's own storage?
3. Can the runtime read back a cloud Pet's saved artwork to compare it with the accepted image?

The six further things to test when Dots is adapted are listed in [the development plan](DEVELOPMENT_PLAN.zh-CN.md#开发要解决的问题).

### Open decision

How the release is delivered. The marketplace clones this repository in full under a 30-second limit, and the history is far larger than the current files. The options are rewriting the history or publishing from a branch that holds only `plugins/` and the marketplace file.

## Extending

- **Change a product rule**: edit `meta.md`. Only touch a unit prompt if its review points depend on that rule.
- **Add or change a generation unit**: edit its prompt and its entry in `units.json` together. `unit-request` and `verify-unit` pick it up.
- **Add a host**: write an adapter that implements the host interface and adds its own commands. Register it in `hosts/index.ts`, add `config/host.json` and a plugin directory, add the package name to `scripts/build-plugin.ts`, and write its reference with what you tested the host can do.
- **Add a command**: add an entry to the command table in `cli.ts`, or to the host adapter's `commands` if only one host needs it. Keep the logic in the feature module.
- **Change a skill**: edit `framework/skills/` for shared skills. Host-only skills live in `plugins/<package>/skills/`.

## Packages

`npm run build:plugin` copies `framework/{prompts,references,debugger-web,skills}` into both plugin packages and bundles `src/` into each `dist/`. After the first phase removes the `genpet-dots` package, only `genpet` remains; how GenPet is installed in Dots is decided when Dots is adapted. Those copies are generated; edit the sources. Per package, keep only the manifest, `config/host.json`, README, host-only skills and `scripts/verify-install.mjs`. The desktop package also includes the `hatch-pet` sprite pipeline under `vendor/`.

## Checks

`npm run verify:fast` runs type-checking, formatting and unit tests. `npm run verify:release` additionally builds, installs both packages into a temporary Codex home and runs the installed CLI and debugger. These checks cover the code. Whether a story or image is right is judged with the Codex-run suite in `tests/agent/README.zh-CN.md`.

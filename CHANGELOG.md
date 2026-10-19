# Changelog

Notable changes to the GenPet plugin. Versions follow [semantic versioning](https://semver.org/); every published plugin change gets a new version, as described in [CONTRIBUTING.md, "Releasing"](CONTRIBUTING.md#releasing).

## Unreleased

- The Pet keeps a list of everything it gave the user, brought back or left at home: which story it came from, its image, and where it is now (with the user, at home, carried, gone). Stories write item changes in the plan; `status` shows the full list and every look of the Pet, and the record page has an item tab.
- Story images are now `scene` (the Pet in a place, or the place alone; `home` marks the home), `prop` (a thing the story is about) and `atlas` (the Pet's look). They replace `story` and `artifact`, which was never counted as an image. Existing records read the old names as `scene` and `prop`, and a scene from a story that changed the home reads as the home. `accept-art` takes `portrait|atlas|scene|home|prop`.

- Every story has one image: a scene of the Pet doing something, a change of form (everyday look, growth or transformation), or an item it brings or gives. A story without an image cannot complete; the old rule allowing up to two text-only stories in a row is gone.
- The design document is rewritten around the idea (a virtual pet that grows with the user), the story principles and the three kinds of image; the engineering principles and the framework moved to the implementation document.

## 0.10.16 — 2026-10-18

- Commands reduced to three. `/genpet` handles everything from what the user asks: start or resume, status, naming, pausing or resuming the scheduled checks, replacing the Pet or adding another, switching the desktop Pet and diagnosis. `/genpet-chat` is unchanged. `/genpet-debug` replaces `/genpet-story`, `/genpet-grow` and `/genpet-debugger`: open the record page, request a story, or force a growth step or transformation. `/genpet-start`, `/genpet-stop`, `/genpet-reset` and `/genpet-switch` are removed; existing Pets, records and schedules are unchanged.
- The skill prompts are reorganized: one short `principles.md` is served with every unit, each unit prompt carries its own rules, and the procedures are in four task files. The old reference-only relationship notes became part of the personality unit.
- Stories keep company with a similar thing in the Pet's own world, shown mostly by its look. The narration says only what it did, and the user's own thing is named only in what it says.
- Release checks: the plugin directory is checked against a list of shipped entries, and a unit test checks that every unit prompt loads and every link in the skills resolves.

## 0.10.15 — 2026-10-18

- Frame extraction no longer treats background specks as missing pose anchors when sprite components are joined.
- Jump registration rejects abnormally large intermediate images before allocating them, while preserving ordinary overflow and shared-atlas fitting.

## 0.10.14 — 2026-10-17

- The output step returns the final message as it is sent; images already shown in earlier stories are not shown again.
- Memory is short third-person text that may cite image IDs. It records what is worth keeping: items given, things left at home, the user's words, milestones and firsts.
- Stories look up old artwork only when they need it.

## 0.10.13 — 2026-10-16

- The Agent decides each story directly from the observed situation instead of drawing from seeded candidates.
- Words the user leaves in `/genpet-chat` get a response in the next story.

## 0.10.12 — 2026-10-15

- Stories start from the user's current situation, read from recent sessions; only one observation sentence is saved.
- Everything the Pet does or gives happens in its own world. No progress messages while a check runs. The scheduled chat is named GenPet.
- Adults can transform (幻化) for at most two days. Everyday looks (日常) include the Pet's momentary condition. Each animation slot is designed for the current look.

## 0.10.5 – 0.10.11 — 2026-10-15

- The debugger lists this machine's Pets, marks GenPets, can switch the host selection and was redesigned as a two-pane console.
- The plugin has an icon. The user connection is expressed in the Pet's reaction.

## 0.10.1 – 0.10.4 — 2026-10-13 to 2026-10-15

- Fixes to slot frame extraction, art review handoff and hatch row extraction; subcommand help.

## 0.10.0 — 2026-10-11

- Records version 3 with `soul`, `memory` and `state`, one directory per Pet and one active Pet; older records stay readable.
- Adoption journey of up to five choices, with a data notice and consent first.
- Growth by accumulated experiences with one-week fallbacks; the egg hatches within five hours.
- One `genpet` package. Dots uses the same cloud Pet instead of a separate package.

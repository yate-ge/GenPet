# Changelog

Notable changes to the GenPet plugin. Versions follow [semantic versioning](https://semver.org/); every published plugin change gets a new version, as described in [CONTRIBUTING.md, "Releasing"](CONTRIBUTING.md#releasing).

## Unreleased

- The repository documents are the README, CONTRIBUTING and `docs/DESIGN.md`. The design document merges the architecture and research pages and adds the design idea and principles; agent install steps moved into the README and the release process into CONTRIBUTING. AGENTS.md now points development agents to the design document.

## 0.10.15 — 2026-10-18

- Frame extraction no longer treats background specks as missing pose anchors when sprite components are joined.
- Jump registration rejects abnormally large intermediate images before allocating them, while preserving ordinary overflow and shared-atlas fitting.

- The repository keeps only user and contributor documentation. Development plans, content examples, research notes and run records moved out of `docs/`.
- Test cases moved to `tests/agent/CASES.zh-CN.md`. Test output goes under the ignored `output/` directory.
- Added this changelog, a security policy and `docs/RELEASING.md`.
- The plugin README describes the plugin for users instead of its development status.

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
- Test procedures and test-derived examples were moved out of runtime prompts.

## 0.10.1 – 0.10.4 — 2026-10-13 to 2026-10-15

- Fixes to slot frame extraction, art review handoff and hatch row extraction; subcommand help.

## 0.10.0 — 2026-10-11

- Records version 3 with `soul`, `memory` and `state`, one directory per Pet and one active Pet; older records stay readable.
- Adoption journey of up to five choices, with a data notice and consent first.
- Growth by accumulated experiences with one-week fallbacks; the egg hatches within five hours.
- One `genpet` package. Dots uses the same cloud Pet instead of a separate package.

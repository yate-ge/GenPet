# GenPet

A lightweight, story-driven pixel Pet framework inspired by GenFaceUI meta-design. Version 0.6.0 is the local development revision.

Two independent packages: **GenPet Dots** (`plugins/genpet-dots`, primary) and ordinary **GenPet** (`plugins/genpet`). Each keeps its own identity, genes, stories, assets and Avatar binding in its own host environment.

`/genpet-start` adopts or resumes; `/genpet-story` forms a new story before choosing state and appearance. `/genpet-name` saves the user's chosen name; a completed hatch invites naming once without blocking stories. Explicit `/genpet-grow` and `/genpet-reset` remain available. Ordinary Pet also provides `/genpet-switch` and an opt-in `/genpet-debugger`.

Each Pet starts as a literal egg whose design is grounded in its adoption story, then hatches into a living creature that evolves with meaningful changes in your recent life and work. A saved personality shapes its actions, user relationships and state expression. Stories include its own life and concrete responses to the user; state changes need a user cause. Agent selects context, judges changes and decides artwork reuse. Chat presents pet stories, actual visuals and the naming interaction. Product rules are defined in [`framework/prompts/meta.md`](framework/prompts/meta.md); see the [0.6.0 implementation boundaries](docs/COMPANION_0_6.zh-CN.md).

Developers edit `framework/` (prompts, references, skills) and `src/`; the [architecture](docs/ARCHITECTURE.md) maps the layers and modules. Plugin directories keep only manifests and host-only skills. `npm run build:plugin` copies shared modules and builds self-contained runtimes; do not edit generated files. See [contributing](CONTRIBUTING.md), [product design](docs/PRODUCT_DESIGN.zh-CN.md), [local validation](docs/NEW_VERSION_VALIDATION.zh-CN.md) and the [docs index](docs/README.md).

Generation is split into [independently testable units](framework/references/generation-units.md). Each unit has fixed input names, observable results and review points. `unit-request` assembles a test request, `verify-unit` checks its data contract, and `record-step` keeps internal generation artifacts without advancing a Pet. Semantic and visual correctness are evaluated separately.

Published marketplace installation:

```sh
codex plugin marketplace add yate-ge/GenPet
codex plugin marketplace upgrade genpet
codex plugin add genpet-dots@genpet
# In the ordinary desktop environment instead:
codex plugin add genpet@genpet
```

Refresh an existing marketplace even if the plugin is uninstalled. Verify installed versions and hashes against its refreshed source with `scripts/verify-install.mjs`. A new chat loads updated skills. Installation never adopts, resets or generates a Pet. An unpublished local revision is not available through the remote marketplace; use the local validation instructions for this revision.

Node.js 22+ is required. Run `npm ci`, `npm run verify:fast` and `npm run build:plugin`. Before publication fetch the release base and run `npm run verify:release`; it checks both packages in an isolated Codex home. Product generation and actual host display are separate from engineering checks.

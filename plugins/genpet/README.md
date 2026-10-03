# GenPet

Version 0.8.0. Lightweight story-driven pixel Pet framework.

Each Pet starts as a literal egg designed from its adoption story and hatches into a living creature. Product rules are in [prompts/meta.md](prompts/meta.md).

Use `/genpet-start` to initialize or resume; it then sets up daily story triggers, and scheduled runs drive new stories and evolution. `/genpet-name` saves the user's chosen name. A completed hatch invites naming once. Each Pet's saved personality shapes its stories and states; user connections appear in the text. `/genpet-story`, `/genpet-grow` and `/genpet-reset` are explicit testing shortcuts, not the core loop. Conversation replies are pet stories and actual visuals, with naming interaction allowed.

This package runs in the **desktop** environment. It has its own pet records and Avatar binding. See [workflow](references/workflow.md), [storage](references/storage.md), [desktop integration](references/desktop.md) and [scheduling](references/scheduling.md). `prompts/`, `references/` and the shared skills are build copies; developers edit the repository's `framework/` sources. Installing alone does not create a pet or a task.

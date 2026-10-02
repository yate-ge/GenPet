# GenPet

Version 0.5.0. Lightweight story-driven pixel Pet framework.

Each Pet starts as a literal egg designed from its adoption story and hatches into a living creature. Product rules are in [prompts/meta.md](prompts/meta.md).

Use `/genpet-start` to initialize or resume, `/genpet-story` for a new story. `/genpet-grow` and `/genpet-reset` remain explicit debugging operations. Every conversation reply is pet story text with actual visuals.

This package runs in the **desktop** environment. It has its own pet records and Avatar binding. See [workflow](references/workflow.md), [storage](references/storage.md), [desktop integration](references/desktop.md) and [scheduling](references/scheduling.md). `prompts/` and `references/` are build copies; developers edit the repository's `framework/` sources. Installing alone does not create a pet or a task.

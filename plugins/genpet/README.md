# GenPet

Lightweight story-driven pixel Pet framework. Development package; full acceptance is still in progress. The installed version is in `.codex-plugin/plugin.json`.

Each Pet starts as a literal egg designed from its adoption story and hatches into a living creature. Product rules are in [prompts/meta.md](prompts/meta.md).

Use `/genpet` for status, naming, diagnosis and actions, `/genpet-start` to adopt or resume, and `/genpet-chat` to talk. Adoption begins with a data notice and consent, then a journey of up to five choices. Scheduled checks run every five hours while the host is available; `/genpet-stop` pauses them. A completed hatch invites naming once. `/genpet-story`, `/genpet-grow` and `/genpet-reset` request a story, forced growth or a confirmed replacement.

The shared runtime supports desktop and cloud main environments. v3 records have soul, memory and state, one directory per Pet and one active Pet. Accepted artwork and the brief target the same cloud Pet ID; stored-image verification, refresh and actual display are separate results. Cross-end persistence and Dots setup require actual host checks. See [workflow](references/workflow.md), [storage](references/storage.md), [desktop integration](references/desktop.md), [Dots](references/dots.md) and [scheduling](references/scheduling.md). `prompts/`, `references/` and shared skills are build copies of `framework/`. Installing alone creates no Pet or task.

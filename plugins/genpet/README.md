# GenPet

A story-driven pixel Pet for Codex. The installed version is in `.codex-plugin/plugin.json`; changes are listed in the repository's [CHANGELOG](https://github.com/yate-ge/GenPet/blob/main/CHANGELOG.md).

Each Pet starts as a literal egg designed from its adoption story and hatches into a cute living companion. Product rules are in [skills/genpet/rules.md](skills/genpet/rules.md).

Use `/genpet` for status, naming, diagnosis and actions, `/genpet-start` to adopt or resume, and `/genpet-chat` to talk. Adoption begins with a data notice and consent, then a journey of up to five choices. Scheduled checks run every five hours while the host is available; `/genpet-stop` pauses them. A completed hatch invites naming once. `/genpet-story`, `/genpet-grow` and `/genpet-reset` request a story, forced growth or a confirmed replacement.

The shared runtime supports desktop and cloud main environments. v3 records have soul, memory and state, one directory per Pet and one active Pet. Accepted artwork and the brief target the same cloud Pet ID; stored-image verification, refresh and actual display are separate results. Cross-end persistence and Dots setup require actual host checks. See [flows](skills/genpet/flows/README.md), [storage](skills/genpet/host/storage.md), [desktop integration](skills/genpet/host/desktop.md), [Dots](skills/genpet/host/dots.md) and [scheduling](skills/genpet/flows/scheduling.md). Installing alone creates no Pet or task.

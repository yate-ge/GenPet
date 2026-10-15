---
name: genpet
description: Manage the user's GenPet through /genpet or explicit GenPet requests, including adoption, status, naming, story actions, diagnostics and scheduled checks. Pet conversation uses /genpet-chat.
---

# genpet

Resolve this installed plugin's root from this skill directory (two levels up). Use its `node ROOT/dist/cli.js`, read-only `status` and `diagnose`; load [product rules](rules.md) and [output](output.md). A developer or installation request changes plugin work, never the user's Pet or schedule.

Route by the user's actual intent:

| Request | Work |
| --- | --- |
| Start, resume, adopt | Environment intake below, then [GeneDesigner](designers/GeneDesigner/README.md), [adoption flow](flows/adoption.md) and [scheduling](flows/scheduling.md) |
| Current state or recent content | Read status/story-output; explain the actual Pet, without opening a new story |
| Name or rename; hatch naming reply | [Naming](flows/naming.md), exact question Pet ID |
| New story or forced growth | [StoryDesigner](designers/StoryDesigner/README.md), shared workflow; grow request is a reason, not a user-life fact |
| Talk to the Pet | Use /genpet-chat and its chat workflow; this is the sole conversation entry |
| Missing, not displayed, load, list or switch | [Desktop diagnosis](host/desktop.md); inspect first and state the four actual results |
| Stop scheduled checks | Stop the actual referenced task, then schedule-stop |
| Dots setup or change main environment | [Dots](host/dots.md), test actual host capabilities first |
| Inspect raw records | Read-only debugger command; keep record unchanged |

## Environment intake

Before adoption/import/replacement, use read-only `inspect-records` for both current record roots and historical locations, including old `dots/state.json` beside an existing v3 Pet. Also inspect host Pet entries/cloud mappings, selected Pet, GenPet tasks and the actual installed manifest version through host interfaces. `list-pets` and `diagnose` inspect the current host; unknown items stay unknown. Identify the selected GenPet by ID (`resolve-active HOST_AVATAR_ID`), including mapped custom:/pet_ aliases; otherwise preserve selection and use the last active record. Stories retain their starting Pet ID.

If a current Pet exists, start resumes it. If old/current/orphan data needs a decision, briefly report what exists and let the user choose continue, clean and restart, or add another; a truly new environment does not need this extra choice. Legacy records are imported only after the user's choice, using import-record/migrate-legacy with the real existing identity. Reads do not create a companion.

A request for another/new Pet needs its concrete meaning confirmed: replacement backs up old records and lets a new identity reuse the same host entry/cloud ID (`new-pet --replace`/reset); addition creates a separate record and cloud ID (`new-pet`). Use the already confirmed choice on retry. Cleaning backs up records; cloud Pet entries remain unless the user names ones to delete, and tasks stop/reuse according to their choice. Report what remains and where.

Before the first adoption, give a brief direct notice describing actual readable Codex memories, the times and titles of recent sessions (and the user's own words when needed) used to notice what the user is doing, and Pet-related records, their use for design/stories, sensitive data filtering, and actual host data handling. Only after clear consent read [user context](context/README.md) and begin a journey. If declined, stop and say adoption has not begun; no extra rejection mechanism. Existing consent persists.

Keep the notice consistent with the actual host. On desktop, explain briefly that GenPet uses readable Codex memories, a light look at recent sessions, and the user's journey/chat choices to design the Pet and its stories, saving only a short note rather than session text; necessary summaries, Pet records and generated art are saved on this computer, and its artwork and brief are synced to the cloud Pet. Sensitive and private details are filtered out. When the main environment is cloud, describe its actual storage location instead of promising local-only storage. Do not claim that nothing is collected or uploaded.

## Load only the work needed

- [GeneDesigner](designers/GeneDesigner/README.md): journey, genes, personality, initial memory and one-time legacy fill.
- [StoryDesigner](designers/StoryDesigner/README.md): context, seeded story, state/memory/growth, story item, chat and output.
- [PetDesigner](designers/PetDesigner/README.md): accepted art reuse and full new Avatar sets.
- [HomeDesigner](designers/HomeDesigner/README.md): a livable home and its real image.
- [ImageReviewer](designers/ImageReviewer/README.md): actual visual observations and bounded repair.

These five are internal subskill documents, so they do not add slash-menu entries. Unit inputs and result files are in [generation-units](host/units.md); persistence in [storage](host/storage.md). Use code for identity, persistence and reliable same-ID updates; creative choices belong to Agent.

User confirmations are direct and concrete. Once clearly authorized, continue without asking again. Runtime and images stay internal; story outputs follow output.md. Use host APIs/app-tools/IPC, never Computer Use for Pet selection, visibility, appearance or verification. An uploaded image, a refresh request and actual display are distinct facts.

---
name: genpet-start
description: Start or resume this environment’s GenPet with /genpet-start. Initializes an egg only when no pet exists and completes the current story, Avatar and schedule.
---

# genpet-start

Before doing anything, ask the user one short confirmation, in the pet's world and following `prompts/output.md`, about bringing the pet into their life (a new egg if none exists, otherwise carrying on), and continue only after a clear yes. Follow [the shared workflow](../../references/workflow.md). Read status first, migrate an existing legacy record where reported, and resume pending work. If a completed pet exists, keep it and present its latest relevant story; generate a new story only if requested or due. With no pet, use a stable trigger ID. Follow `prompts/initialization.md`; complete the egg's real visuals and host update, then set up the 5-hourly [story checks](../../references/scheduling.md). Conversation follows `prompts/output.md`.

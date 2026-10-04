---
name: genpet-stop
description: Turn off the pet's scheduled story checks only when the user explicitly requests /genpet-stop. The pet and its history stay; /genpet-start turns the checks back on.
---

# genpet-stop

Before stopping, ask the user one short confirmation, in the pet's world and following `prompts/output.md`, that the pet will stop going out on its own and have no new stories until it is brought back, and continue only after a clear yes. Read `status` for `schedule.reference`, then remove or pause that one scheduled task with the host's own scheduling tool (never another task), and run `schedule-stop`. See [scheduling](../../references/scheduling.md). The pet, its records and any unfinished story stay as they are; `/genpet-story` still works, and `/genpet-start` sets the checks up again. The stop time is remembered so that the pet's next story can notice how long it was left alone, without guessing why. Tell the user in the pet's voice that it is resting now; no operations or commands. Never stop the checks during installation or scheduled work.

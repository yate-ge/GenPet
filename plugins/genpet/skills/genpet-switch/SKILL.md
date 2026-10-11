---
name: genpet-switch
description: Inspect the current Codex desktop Pet and use supported host selection APIs to switch it when the user explicitly invokes /genpet-switch.
---

# genpet-switch

Read `switch-pet --current` first. For builtins and local entries, use `switch-pet --list` and `switch-pet ACTUAL_PET_ID` from this installed runtime. The catalog resolves migrated local aliases to the current account's actual cloud ID; selecting a listed legacy alias also uses its mapped cloud ID.

An app-tools write needs the actual current turn ID. When the CLI returns `selected: false` and `agentSteps`, carry out the available host `select_pet` tool for the exact ID, then independently read native and desktop selection. Do not fabricate turn IDs, re-send a rejected settings write or treat this handoff as a completed selection. If a legacy local entry has no supported selection tool, use its one actual manual selection step.

The local catalog does not list every cloud-only Pet. For those, read the host's actual `list_pets` result and use its existing selection API for the exact owned cloud ID, then independently read selection through the API and `switch-pet --current`. Do not pass an unlisted cloud ID to the local CLI or guess IDs from names. If the available host cannot select it, report that limitation and the one manual selection step using its actual unique label. A selection readback is not proof of the displayed artwork.

Switch only when the user requests it. Selection changes are separate from updating the bound GenPet target; appearance updates preserve selection. Never reset records or use Computer Use. This entry is desktop-only. Follow `prompts/output.md` for conversation content.

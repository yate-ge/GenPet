---
name: genpet-reset
description: Create a new egg and identity only when the user explicitly requests /genpet-reset or a new pet, preserving a backup and the existing host surface.
---

# genpet-reset

An explicit reset request authorizes a new identity. Read status; finish pending work or resolve it with the user's actual instruction. Call `reset OPERATION_ID` with a stable ID and follow [the initialization workflow](../../references/workflow.md) for its returned pending operation. The previous record is backed up; the bound host surface is transferred to the new identity. Retry the same operation instead of resetting again. Conversation follows `prompts/output.md`. Never reset during installation, scheduled work or artwork recovery.

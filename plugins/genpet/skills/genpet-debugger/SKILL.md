---
name: genpet-debugger
description: Open the optional local GenPet record debugger only on /genpet-debugger requests. Opening it reads records without changing any pet.
---

# genpet-debugger

Run `node ROOT/dist/cli.js debugger` from this installed plugin root and open the returned URL. It is a developer console for the GenPet records this machine hosts: identity, soul, memory and state, story history, home changes, every saved atlas with an action preview, pending work, schedule and raw records. A secondary panel lists every Pet the host knows; cloud Pet names are not cached locally, so when the host `list_pets` tool is available, save all its pages unchanged to an absolute JSON file and pass `--host-pets FILE`. Its only host actions show a saved atlas on the bound desktop Pet, restore the current image, or request a refresh; Pet records never change and a migrated cloud Pet needs the authenticated upload steps the page lists, run only when the user asks. It does not switch the host Pet selection; use /genpet-switch. The displayed image stays unconfirmed. Stop it through its Stop button when requested. Follow `prompts/output.md` for conversation content.

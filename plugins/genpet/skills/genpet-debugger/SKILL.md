---
name: genpet-debugger
description: Open the optional local GenPet record debugger only on /genpet-debugger requests. Opening it reads records without changing any pet.
---

# genpet-debugger

Run `node ROOT/dist/cli.js debugger` from this installed plugin root and open the returned URL. It lists every Pet this machine knows and marks GenPets and those whose full GenPet record lives here. Cloud Pet names are not cached locally, so when the host `list_pets` tool is available, read all its pages, save them unchanged to an absolute JSON file and pass `--host-pets FILE`; otherwise unnamed cloud Pets stay marked unknown. The debugger reads persisted stories and assets; it never adopts, grows or starts schedules. Its actions change only the host, never Pet records: switch the host Pet selection through this Codex session's app-tools connection and read it back; preview each saved atlas's actions in the page; show a saved atlas on the bound desktop Pet, restore the current image, or request a host refresh. A migrated cloud Pet needs the authenticated upload steps the page lists; run them only when the user asks. Showing or hiding the Pet window has no supported interface. The displayed image stays unconfirmed. Stop it through its Stop button when requested. Follow `prompts/output.md` for conversation content.

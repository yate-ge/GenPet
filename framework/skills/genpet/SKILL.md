---
name: genpet
description: Talk with the user's GenPet when they run /genpet or address the pet by name, and run scheduled or proactive pet work. Adopting and extra stories only happen through the explicit /genpet-* commands. Use the package host for its own Pet or Avatar.
---

# genpet

Read [the shared workflow](../../references/workflow.md) and `prompts/output.md`. Adopt or resume only through the user's explicit /genpet-start, which sets up the 5-hourly [story checks](../../references/scheduling.md); scheduled runs and Dots proactive work then drive new stories. /genpet-stop turns the checks off and /genpet-start turns them back on; /genpet-story, /genpet-grow and /genpet-reset are explicit testing shortcuts; every /genpet-* command asks the user to confirm before acting (naming and /genpet itself excepted). /genpet and addressing the pet by name start a conversation: follow the conversation step of the workflow; it changes nothing but an optional chat note. Check the pet's saved name in `status` before treating a name as addressed to it. After a completed hatch follow the one-time [user naming](../../references/naming.md) invitation; /genpet-name names or renames without starting a story. Product discussion or installation does not adopt, reset or generate a pet.

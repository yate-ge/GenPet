---
name: genpet-debugger
description: Open the optional local GenPet debugging page only when explicitly requested with /genpet-debugger or genpet debugger. Never start during normal pet maintenance.
---

# GenPet debugger

From this skill directory, go up two levels to the installed plugin root. Run `node dist/cli.js debugger` there. It returns JSON with `url` and `reused`; repeated calls reuse the existing service for this data directory. If the port is occupied, report the error or retry using another `GENPET_PORT`.

Open the returned URL in the Codex browser using `open_in_codex` (browser target); otherwise provide a clickable link. Do not merely report the launch command. The service binds only to 127.0.0.1 and starts only through this explicit command, never plugin startup, /genpet-start or scheduled maintenance.

Opening either mode reads persisted state without scanning, adopting, evolving, generating or installing. The real companion mode operates on the user's current pet only when a page action is clicked. The growth laboratory uses a separate debugger/demo.json store; click adoption to create its first demo egg. It cannot install sprites or refresh the real host. Demo artwork is initially absent; logical growth is still inspectable.

The page's Stop debugger button terminates the service. Closing the tab alone does not stop it. Do not reset, age or regenerate the real pet as part of opening or checking the debugger. IPC refresh success means a refresh was requested, not that the visible image was verified.

# Security policy

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's [private vulnerability reporting](https://github.com/yate-ge/GenPet/security/advisories/new) for this repository, with the affected version, steps to reproduce and what you observed.

Only the latest published version is supported. Fixes are released as a new version.

## What GenPet handles

GenPet runs inside Codex. It reads Codex's memories about the user and recent session titles and messages to design the Pet and write its stories. It saves only short observations and its own Pet records under the local data directory; it does not save raw session content, and it does not send user data to any service of its own. Image generation and Pet artwork uploads go through the host's own tools.

Problems worth reporting include a way for GenPet to save or show sensitive user content, to act on another Pet or task than its own, or to run commands outside its plugin runtime.

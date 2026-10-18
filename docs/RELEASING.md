# Releasing GenPet

GenPet is published through the Codex plugin marketplace in [`.agents/plugins/marketplace.json`](../.agents/plugins/marketplace.json). The marketplace clones this repository in full under a fixed 30-second timeout, so the repository stays small: no generated images, PDFs, logs or test output in git.

## Versions

- Every published plugin upgrade increments the semantic version, including changes only to skills, prompts, bundled documentation or scripts. Use a patch bump for compatible fixes and a minor or major bump for broader or breaking changes. Do not bump for each local edit; publish one version after the planned change is implemented and verified.
- Keep the version the same in `package.json`, both places in `package-lock.json` (root and `packages[""]`), `plugins/genpet/.codex-plugin/plugin.json` and the generated `plugins/genpet/package.json`.
- Rebuild the generated runtime with `npm run build:plugin` after source changes. Check that removed skills and prompts do not survive in the generated package.

## Compatibility with the published version

Updating must not lose user data or break working functions.

1. Review what the change removes or renames: record fields, stored files, CLI commands, skills, host bindings and schedules.
2. Load representative existing data, including records written by earlier versions, with the new build in an isolated `CODEX_HOME` and data directory.
3. Existing Pets, stories, artwork, bindings and schedules must still load and work. A format change needs a migration that preserves the original.
4. Report what was checked. Do not publish while a compatibility risk remains unresolved.

## Release gate

1. Fetch the release base: `origin/main`, or `GENPET_RELEASE_BASE` when it is set explicitly.
2. Run `npm run verify:release`. It builds the deliverable, compares its version against the release base and validates it in an isolated home.
3. Never pass a failed gate by only changing the comparison base.

## Install verification

- When installing from an existing marketplace, refresh it even if the plugin is currently uninstalled. `marketplace add` returning already-added does not mean the source is fresh.
- Verify the installed manifest version and file hashes against the refreshed marketplace source with `scripts/verify-install.mjs`. Report the marketplace commit, installed version and installed path. Directory names and installed or enabled status alone are not enough.
- Do not reset, adopt, age or regenerate a real Pet during installation verification; release tests use an isolated `CODEX_HOME`.
- New chats load updated skills and tools. An active chat may still follow the instructions it loaded earlier.

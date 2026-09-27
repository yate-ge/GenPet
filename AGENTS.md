# GenPet release rules

- Every published plugin upgrade must increment the semantic version, including changes only to skills, prompts, bundled documentation or scripts. Use a patch bump for compatible fixes; choose minor/major for broader or breaking changes. Do not bump merely for each local edit.
- Keep package.json, package-lock.json (root and packages[""]), plugins/genpet/.codex-plugin/plugin.json and the generated plugins/genpet/package.json consistent. Rebuild the generated runtime after changes.
- Before publishing, run npm run verify:release. The version gate compares the deliverable against origin/main (or GENPET_RELEASE_BASE when explicitly set); fetch the release base before release checks. Never bypass a failed gate by only changing the comparison base.
- When installing from an existing marketplace, refresh it even if the plugin is currently uninstalled. `marketplace add` returning already-added does not establish freshness.
- Verify installed manifest versions and file hashes against the refreshed marketplace source using scripts/verify-install.mjs. Report the marketplace commit, installed version and installed path. Directory names and installed/enabled status alone are insufficient.
- Do not reset, adopt, age or regenerate a user's Pet as part of installation verification. Use an isolated CODEX_HOME for release tests. New chats load updated skills and tools; do not promise an active chat has discarded its old instructions.

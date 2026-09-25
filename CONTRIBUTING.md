# Development and release workflow

GenPet keeps the complete reproducible project on the default `main` branch: runtime source, tests, generation tools, documentation, and publishable example fixtures. An installable plugin is a **build artifact**, not a second branch with files removed. Keep real user state, private conversations, rejected generations, local reports, and installed dependencies out of Git.

1. Create a short-lived branch such as `feat/growth-qa` from `main`. Work and test there; open a pull request back to `main` when a remote repository exists.
2. Run `npm ci` and `npm run verify:fast` while editing. Run `npm run verify:release` when changing the plugin contents, packaging, installation, or preparing a release. This checks the ZIP in a temporary Codex home and does not touch the real Pet.
3. Review the files to be committed, especially new images and evidence JSON. Keep only examples that can be publicly redistributed and whose provenance is documented.
4. Merge after checks pass. For a release, set the version, build the ZIP from the exact `main` commit, and tag that commit (for example `v0.1.0`). Attach `genpet-<version>.zip` to the release. GitHub's automatic source archive already captures the full repository at the tag; a separately generated source ZIP is optional.

The `output/` directory is ignored by Git. It holds local build results; it is not a source of truth. The release ZIP contains only `.agents/plugins/marketplace.json` and the minimal `genpet/` runtime. The native Pet, adoption clock, and generated artwork remain in the user's local data directories.

For urgent fixes to an already published version, branch from its tag or use a `release/x.y` maintenance branch only if multiple supported versions need parallel fixes. Routine development does not require a permanent `develop` branch.

# GenPet agent installation

Install or update the published GenPet plugin from its GitHub marketplace without changing the user's Pet state. There is one package, `genpet`; Dots uses the same plugin and cloud Pet.

1. Run `node --version`. GenPet requires Node.js 22 or newer. If it is missing or older, tell the user that Node.js 22+ is required to run GenPet, then ask them to install or upgrade it before continuing.
2. Find a working Codex CLI. If `codex` is not on the PATH, use the one bundled with the desktop app (on macOS, `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex` or the same path inside `Codex.app`).
3. Run `codex plugin list`. If GenPet already comes from another marketplace, report that source instead of installing a duplicate.
4. Add and refresh the repository marketplace, then install:

   ```sh
   codex plugin marketplace add yate-ge/GenPet
   codex plugin marketplace upgrade genpet
   codex plugin add genpet@genpet
   ```

   `marketplace add` reporting `already added` is not a refresh; still run `upgrade`. If the upgrade times out, retry it before installing; installing without a refresh keeps the old version.

5. Resolve the refreshed marketplace checkout and the actual installed directory, then run:

   ```sh
   node <marketplace>/plugins/genpet/scripts/verify-install.mjs \
     <installed-plugin> \
     <marketplace>/plugins/genpet
   ```

6. Report the marketplace commit, installed version, installed path, and verification result.

Use a new Codex task to load the updated skills. Installing does not adopt, change or select a Pet.

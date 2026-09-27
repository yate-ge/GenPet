# GenPet agent installation

Install or update GenPet from its GitHub marketplace without changing the user's Pet state.

1. Run `node --version`. GenPet requires Node.js 22 or newer. If it is missing or older, tell the user that Node.js 22+ is required to run GenPet, then ask them to install or upgrade it before continuing.
2. Run `codex plugin list`. If GenPet already comes from another marketplace, report that source instead of installing a duplicate.
3. Add and refresh the repository marketplace, then install the plugin if needed:

   ```sh
   codex plugin marketplace add yate-ge/GenPet
   codex plugin marketplace upgrade genpet
   codex plugin add genpet@genpet
   ```

   `marketplace add` reporting `already added` is not a refresh; still run `upgrade`.

4. Resolve the refreshed marketplace checkout and actual installed directory, then run:

   ```sh
   node <marketplace>/plugins/genpet/scripts/verify-install.mjs \
     <installed-plugin> \
     <marketplace>/plugins/genpet
   ```

5. Report the marketplace commit, installed version, installed path, and verification result.

Use a new Codex task to load the updated skills.

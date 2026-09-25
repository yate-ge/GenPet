# Third-party notices

- `vendor/hatch-pet/`: OpenAI's bundled Hatch Pet workflow and deterministic image utilities, copied from the locally installed ChatGPT desktop application on 2026-09-24. Licensed under Apache License 2.0; the complete license is in `vendor/hatch-pet/LICENSE.txt`. No built-in Codex pet artwork is distributed.
- The installed plugin's `dist/` bundles these npm packages (esbuild keeps any `@license` comments at the end of each file):
  - `@modelcontextprotocol/sdk` and its dependencies: MIT license. Used for the local plugin MCP server.
  - `zod`: MIT license.
  - `pngjs`: MIT license. Reads PNG artwork for validation.
  - `@jsquash/webp`: Apache-2.0. `dist/webp_dec.wasm` is its WebAssembly build of Google's libwebp decoder (BSD-3-Clause).
- The repository includes `assets/` examples and test fixtures generated specifically for GenPet with Codex imagegen. The installable plugin (`plugins/genpet/`) contains no sample character art or pre-made user Pet. Built-in images used only as local style references and rejected image iterations are excluded from the repository.

Open-source alternatives reviewed: [OpenPets](https://github.com/alterhq/openpets) is MIT-licensed but provides its own companion runtime. GenPet uses the native Codex custom-Pet contract instead, so it does not include OpenPets code.

The GenPet source is MIT-licensed. Codex and ChatGPT are trademarks of their owners. This is an independent experimental plugin, not an OpenAI product.

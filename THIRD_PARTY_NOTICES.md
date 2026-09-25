# Third-party notices

- `vendor/hatch-pet/`: OpenAI's bundled Hatch Pet workflow and deterministic image utilities, copied from the locally installed ChatGPT desktop application on 2026-09-24. Licensed under Apache License 2.0; the complete license is in `vendor/hatch-pet/LICENSE.txt`. No built-in Codex pet artwork is distributed.
- `@modelcontextprotocol/sdk`: MIT license, installed through npm. Used for the local plugin MCP server.
- `sharp`: Apache-2.0, installed through npm; its bundled native dependencies retain their own notices.
- `zod`: MIT license, installed through npm.
- The editable source archive includes `assets/` examples and test fixtures generated specifically for GenPet with Codex imagegen. The installable plugin archive contains no sample character art or pre-made user Pet. Built-in images used only as local style references and rejected image iterations are excluded from both archives.

Open-source alternatives reviewed: [OpenPets](https://github.com/alterhq/openpets) is MIT-licensed but provides its own companion runtime. GenPet uses the native Codex custom-Pet contract instead, so it does not include OpenPets code.

The GenPet source is MIT-licensed. Codex and ChatGPT are trademarks of their owners. This is an independent experimental plugin, not an OpenAI product.

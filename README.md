# GenPet

**Delivery status:** Automatic refresh of the same visible native Pet is implemented in `genpet_install_native` / `npm run export:pet`. After an atomic file commit the adapter drives the host refresh and confirms that the floating Pet's displayed sprite hash matches the new atlas. Display confirmation requires a live local debugging channel. GenPet does not run a background process to force that channel. See [native refresh findings](docs/NATIVE_REFRESH.zh-CN.md).

An image-generated **native Codex Pet** that starts as an unknown egg, resolves its identity only after five hours of incubation, and grows with your day-to-day activity.

GenPet uses Codex's own Pet window and animation states. It adds a local life-cycle engine, automatic context ingestion, an image-generation workflow, and native sprite installation. GenFaceUI is a theoretical reference for bounded personalization; this is a new prototype, not a replication or a validated longitudinal intervention.

## Status and scope

- Native-style pixel artwork, generated with Codex `imagegen` and assembled with the `hatch-pet` pipeline.
- Egg-first development: a plain shell with faint clues, no preselected creature; birth identity is resolved once from incubation evidence and a seed.
- Five-hour hatching and context windows, daily growth, offline catch-up, persistent post-hatch identity, reversible context records.
- Automatic local activity labels from recent Codex user messages; no questionnaires or API key required for the built-in generation workflow.
- Local MCP tools and a distributable Codex plugin.
- No website, HTTP server, browser page or separate floating-window runtime in this plugin.

**Native refresh behavior:** this Codex version has no verified public hot-reload API. GenPet invalidates the host custom-avatars query through a localhost-only debugging channel, then checks the floating Pet's actual sprite hash. It does not open Settings or simulate clicks. Image synthesis still requires a Codex run; the Node process cannot invoke the desktop imagegen tool autonomously.

## Develop

Requires Node.js 22+ and Codex Desktop with custom Pet support.

```sh
npm ci
npm run build
npm test
```

User state is stored outside the repository in `~/.genpet/`; `GENPET_DATA_DIR` overrides it for tests. `CODEX_HOME` controls the source Codex directory and native Pet destination.

## Repository and release layout

| Location | Purpose | In installable ZIP? |
|---|---|---|
| `src/`, `tests/`, `.github/` | Runtime source, tests and CI | No; compiled `dist/` is included |
| `scripts/` | Packaging, installation and verification tools | Only the two image QA helpers referenced by the skill |
| `assets/` | Generated examples and isolated test fixtures | No |
| `docs/` | Research, design, validation and user help | Only debug-command and native-refresh help |
| `skills/`, `vendor/hatch-pet/`, `config/` | Codex workflows, official atlas tools and policy defaults | Yes |
| `output/` | Ignored local builds, reports and release archives | No |

The installable `output/genpet-0.1.0.zip` contains `.agents/plugins/marketplace.json` and a minimal `genpet/` runtime. The editable `output/genpet-source-0.1.0.zip` contains the full source, tests, docs and example artwork. User life state and generated artwork live in `~/.genpet/`, never in either archive. See the [installed-plugin README](PLUGIN_README.md) for the portable install steps.

Keep the full project on `main` and develop on short-lived branches. Release a tested plugin ZIP from a version tag; do not maintain a reduced “release-only” branch. See [contributing and release workflow](CONTRIBUTING.md).

## Install the release ZIP

### Ask a Codex Agent to install this checkout

Open this repository as the Codex project, then send the following message to the Agent. This installs the **plugin**; adopting a new Pet or enabling scheduled growth is a separate request.

> 请把当前目录的 GenPet 项目安装到我本机的 Codex 插件中。先阅读 README.md 和 PLUGIN_README.md，确认 Node.js 22+、Codex CLI 可用，再运行 `npm ci` 和 `npm run verify:release`。检查是否已安装 GenPet：如果是本仓库已有的 personal marketplace 安装，使用 `npm run install:codex` 更新它；如果尚未安装，从 `output/genpet-<package.json 中的版本号>.zip` 解压到持久目录，在解压后的 `genpet/` 运行 `npm ci --omit=dev --ignore-scripts`，执行 `codex plugin marketplace add <解压目录的绝对路径>` 和 `codex plugin add genpet@genpet-local`。如果现有安装属于别的 marketplace，先核对它的来源并沿用原有安装路径，不要创建第二个 GenPet 插件。完成后检查插件是否启用，以及 GenPet 技能和 MCP 工具能否在新 Codex 会话中加载；无法在当前会话确认的项目请明确说明。请报告安装路径、版本和验证结果。保留 `~/.genpet/`、`~/.codex/pets/genpet-companion/` 与现有领养时间；不要调用 reset/grow/state 调试命令，不要重新领养或创建第二个原生 Pet，也不要为安装测试生成图像。

Codex may need a new task to load newly installed skills and MCP tools. The Agent should report that separately from successful file installation. [Official OpenAI plugin packaging guidance](https://developers.openai.com/plugins/build/plugins) documents local marketplaces and their path rules.

### Install manually

```sh
unzip genpet-0.1.0.zip -d /absolute/path/to/genpet-release
cd /absolute/path/to/genpet-release/genpet
npm ci --omit=dev --ignore-scripts
codex plugin marketplace add /absolute/path/to/genpet-release
codex plugin add genpet@genpet-local
```

Keep the extracted directory in place after installation; it is the local marketplace source. For development on this machine, `npm ci && npm run install:codex` builds and updates the existing personal-marketplace installation in `~/plugins/genpet`. This route assumes a GenPet entry is already registered in that marketplace. It preserves unrelated marketplace entries and never touches the current adoption state. It does not install a launcher, LaunchAgent, polling monitor or recurring background process. A manual CDP launcher remains an explicit optional diagnostic tool.

Start a new Codex task and say **“领养、安装并启用我的 GenPet 自动成长”**. The skill reads local activity, adopts an egg, generates its shell and animation atlas, validates it, and exports it to `~/.codex/pets/genpet-companion/`. Choose it once in the native Pets settings. Later updates use the same custom Pet identity.

The release contains compiled JavaScript; building is unnecessary. The ZIP installation commands are also repeated in its own `genpet/README.md`.

## Tools and commands

| MCP tool | Purpose |
|---|---|
| `genpet_status` | Catch up life cycle and read local activity labels |
| `genpet_adopt` | Create an egg without overwriting an existing pet |
| `genpet_art_request` | Read the current bounded image-generation request |
| `genpet_accept_art` | Accept a generated portrait or atlas after QA |
| `genpet_install_native` | Atomically export the approved current-design atlas |
| `genpet_install_cdp_launcher` | Enable stock-app startup with the local refresh channel |
| `genpet_remove_cdp_launcher` | Remove the startup helper and fallback launcher |
| `genpet_configure` | Toggle ingestion, outfit freeze, auto-art, rename |
| `genpet_clear_context` | Remove derived labels; preserve source chats |
| `genpet_debug_reset` | Back up the old life and start a new egg, on explicit request |
| `genpet_debug_grow` | Advance logical age while keeping the revealed identity |
| `genpet_debug_state` | Override props for testing, or resume automatic mapping |

The CLI provides equivalent diagnostic operations: `node dist/cli.js status`, `adopt`, `art-request`, `accept-art`, `install-native`. `accept-art` requires a request ID, absolute file path, artifact kind and provenance; it never fabricates generated artwork.

## Debug slash commands

The plugin includes `genpet-reset`, `genpet-grow`, and `genpet-state` skills. Find them in the `/` menu or invoke with `$genpet-reset`, `$genpet-grow`, `$genpet-state`. Reset creates a backed-up new life; grow accelerates the same identity; state changes props or restores automatic mapping. Every workflow generates/validates missing artwork and installs to the same native Pet. [Parameters and debug semantics](docs/DEBUG_COMMANDS.zh-CN.md).

Developer tests never reset the real companion. Debug age uses an explicit persistent time offset; native scheduled maintenance never calls debug mutation tools.

## Scheduling

Codex native scheduled tasks trigger growth checks and image generation. The plugin contains no recurring timer, background monitor, LaunchAgent, cron job or website. The MCP process responds to tool calls, and the life-cycle engine catches up from stored timestamps when called.

When automatic growth is requested, use one native Codex thread heartbeat to check hourly. The engine evaluates the five-hour hatch/context and 24-hour growth boundaries; simultaneous changes produce one current design. Ready or paused artwork requires no generation. Scheduler availability, generation time and native refresh can delay the visible update. Installing the plugin alone does not create an automation for another user.

## How growth works

The adoption timestamp anchors the five-hour hatch and context windows. An egg has only a shell signature and `hatchIdentity: null`. At the boundary, the engine resolves a bounded birth identity from the complete available incubation batch and seed. The first creature image is generated then, using only weak color/texture clues from the egg. Later context cannot reroll the revealed individual. After hatching, each complete 24 hours adds a growth day. The default juvenile threshold is day 7 and adult threshold day 21. Size is bounded; daily activity influences modest expression bias rather than growth eligibility. No streaks, work-volume competition, health decline or punishment for absence.

The last closed five-hour window chooses an activity motif: build/tool, research/book, create/brush, learn/exploration, rest/pillow. Stable identity and runtime task actions remain separate. New-adoption timing/defaults are editable in `config/policy.json` (or a file selected by `GENPET_POLICY_FILE`). Existing pets retain their saved policy. Activity mappings are in `src/core.ts`; generation prompts and contract are in `src/art.ts`.

## Privacy

Context is read locally from Codex JSONL user messages. System/developer messages and tool output are ignored. GenPet stores fixed activity labels, counts, timestamps and stable deduplication hashes, not conversation text or source paths. The extractor has explicit file/size bounds and reports incomplete coverage. It is keyword classification, not a claim to understand the user or infer their mental state. You can disable ingestion and clear derived records.

Image-generation prompts contain pet design parameters and activity motifs, not private chat text. Derived activity state is stored locally. Artwork prompts and reference images are processed through the Codex image-generation service; raw task text is not included in those prompts. Generated outputs are saved locally.

## External development debugger

A separate sibling project, `GenPet-Debugger`, can inspect state and accelerate an isolated demo clock. It is not required to use GenPet, is not exposed through plugin tools, and is excluded from both release archives. All product interaction happens through Codex and its native Pet.

## Testing and release

Use `npm run verify:fast` for source changes. Use `npm run verify:release` before delivery: it builds the ZIP, unpacks it into a temporary directory, installs production dependencies there, and runs the full isolated MCP lifecycle smoke. Neither command resets or installs the real Pet. [Project map and validation gates](docs/PROJECT_STATUS.zh-CN.md) explain when image generation and actual native display must be checked separately.

`npm test` covers temporal boundaries, offline catch-up, idempotence, context filtering and deduplication, rollback semantics, file transactions and MCP round trips. The hatch-pet pipeline separately produces deterministic image validation, contact sheets, animation previews and visual QA. Passing unit tests is not a substitute for selecting and observing the pet inside Codex.

`npm run package:plugin` creates the compiled plugin `output/genpet-0.1.0.zip` and editable source with tests `output/genpet-source-0.1.0.zip`. The plugin ZIP excludes example artwork and developer tools; both archives exclude user state, built-in style references, rejected iterations, generated debug sessions and private research files. The source and plugin are prepared for open-source distribution; no public repository or remote marketplace listing is created automatically.

See [customization defaults](docs/CUSTOMIZATION.zh-CN.md), [validation and remaining limits](docs/VALIDATION.zh-CN.md), [controlled personalization and growth checks](docs/PERSONALIZATION_GROWTH_VALIDATION.zh-CN.md), [the egg-first mechanism](docs/MECHANISM.zh-CN.md), [the Chinese design plan](docs/PLAN.zh-CN.md), [research boundaries](docs/RESEARCH.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

MIT for original source. Vendored Hatch Pet utilities are Apache-2.0. Generated assets have their generation provenance recorded separately.

GenPet maintains one native entry, `genpet-companion`, throughout incubation, hatching, growth and context updates. Developer demo data cannot be installed into native Pets.

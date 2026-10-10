# 架构

[English](ARCHITECTURE.md)

这是 2026-10-10 确认的目标架构。大部分内容就是 GenPet 0.9.4 现在的做法；还没做的部分在图里标了「待开发」，并列在[实现状态](#实现状态)里。后续开发按这份文档进行，做完一项就改状态表。

## 原则

1. **Agent 判断，运行时记录。** 创作内容和判断都在提示词层。`src/` 负责身份、保存记录、重试和把新形象换到 Pet Avatar 上，不做任何创作判断。
2. **宿主是架构的一层。** 用户资料、图像生成、定时任务和 Pet Avatar 都由宿主提供。每一项要么由运行时直接调用，要么由 Agent 用宿主自带的工具完成后回报，两种方式走同一套步骤。
3. **换形象要分四项检查。** 文件已写入、宿主存的图一致、已请求刷新、显示已确认。一项通过不代表另一项通过。
4. **一条规则只写一处。** 规则写在一个文件里，其他文件只链接过去。
5. **引用方向单一。** 核心不依赖任何宿主。

## 分层

![四层：宿主、提示词层、运行时、构建与发布。运行时的宿主适配通过宿主接口连到宿主的 Pet Avatar。](assets/architecture/layers.zh-CN.svg)

| 层 | 位置 | 负责什么 |
| --- | --- | --- |
| 宿主 | Codex 桌面端、Dots | 不决定宠物的任何内容。提供 Agent 和它用到的能力：用户资料、图像生成、定时任务、Pet Avatar。 |
| 提示词层 | `framework/` | 规定宠物、故事、蛋和 Avatar 必须是什么，以及一次故事怎么生成。具体内容保持开放，由 Agent 在运行时决定。 |
| 运行时 | `src/` | 身份、保存记录、重试、素材文件，以及把新形象换到 Pet Avatar 上。不做创作判断。 |
| 构建与发布 | `scripts/`、`plugins/` | 把源码变成两个可安装的插件包。 |

**Pet Avatar** 指宿主里显示这只宠物的那个条目：桌面端是 Codex 里的 Pet（`CODEX_HOME/pets/` 下的本地条目，或它迁移后对应的云端 Pet），Dots 里是 Avatar。它的列表、选中项和刷新都归宿主管。它不同于 `~/.genpet/` 下的宠物记录，也不同于 GenPet 为它保存的图片文件。

生成单元按四个设计者角色分组（详见 `framework/references/generation-units.md`）：**GeneDesigner**（这只宠物是谁，只在领养时用）、**PetDesigner**（各阶段的 Avatar）、**StoryDesigner**（故事、进化，以及故事送给用户的东西，比如明信片或照片）和 **HomeDesigner**（宠物的家和家的画面）。角色只用来组织提示词，运行时不认识它们。

## 一次故事的完整流程

![三条泳道里的八个步骤：Agent 执行每一步，使用宿主提供的能力，并通过运行时 CLI 保存每一步。](assets/architecture/story-flow.zh-CN.svg)

1. `begin-story` 只创建一次宠物，并为一个触发 ID 打开唯一的未完成故事。用同一个触发 ID 重试，返回的是同一个故事。
2. **待开发。** 在 `context` 单元之前，Agent 先读取这个宿主实际允许它读到的用户资料，并记下每条的出处。见[用户资料](#用户资料)。
3. Agent 逐个执行生成单元，每个结果用 `record-step` 保存。
4. `plan-story` 检查并保存计划，只保存一次。重试画图时计划不变。
5. Agent 画图，用 `image-review` 检查实际的图片文件，再用 `accept-art` 把它复制到这只宠物的素材目录，记在当前计划的请求 ID 下。
6. 新形象通过[宿主接口](#宿主接口)换到这只宠物自己的 Pet Avatar 上，按 ID 查找。
7. `finish-story` 把阶段、状态、历史和触发 ID 一起保存。在这之前，宠物记录不会改变。
8. `story-output` 返回完成的故事和已保存的图片，交给 `output` 单元展示。

故事不一定要换形象。没有图的短故事跳过第 5、6 步，所以「每次检查都有宠物内容」不需要新增运行时流程。

## 宿主接口

![共用的故事代码只调用一个宿主接口，接口有四个函数。桌面端和 Dots 两个适配器各自实现它，每一步由运行时或 Agent 完成。下方是换形象的四项检查，finish-story 要求第二项通过。](assets/architecture/host-interface.zh-CN.svg)

宿主之间的所有差别都放在一个接口后面。共用的故事代码不引用任何宿主模块。

| 函数 | 作用 |
| --- | --- |
| `validateArt` | 检查一张图是否符合这个宿主的格式。 |
| `findAvatar` | 找到这只宠物实际对应的 Pet Avatar，包括宿主把本地条目映射到的云端 ID。 |
| `setAppearance` | 把新形象换到 Pet Avatar 上：先做运行时能做的步骤，再返回留给 Agent 的步骤。 |
| `diagnose` | 只读检查：记录、Avatar ID、宿主的 Pet 列表、本地到云端的映射、选中项和刷新通道。 |

**两个宿主走同一套步骤。** `set-appearance`（暂定命令名）调用 `setAppearance`。运行时做不了的步骤会作为清单返回给 Agent，Agent 用宿主自带的工具做完，再用 `host-result` 回报。桌面端的本地条目写入和 IPC 刷新请求由运行时自己完成；Dots 的每一步都交给 Agent。桌面端其余步骤哪些能由运行时做，取决于[宿主测试](#宿主测试)，不由这份设计决定。

**换的是哪个 Avatar。** 记录里保存这只宠物的本地 Avatar ID，以及最近一次查到的云端 ID。映射归宿主管，所以 `findAvatar` 每次都重新向宿主查。本地的 `custom:` 条目和它迁移后的 `pet_` ID 是同一只 Pet：新图发到云端 ID，刷新的是云端 Pet 的资源，宿主选中的 ID 与两者任一个相同，就算这只 Pet 正在使用。

**四项检查，以及故事什么时候能完成。** 每次换形象分别保存四个结果：

1. 文件已写入：写入或上传本身成功。
2. 宿主存的图一致：从宿主回读的图与验收通过的图相同。
3. 已请求刷新：请求已送达。这一项不说明画面是否变了。
4. 显示已确认：只有宿主能提供实际画面时才确认，否则保持未知。

换了形象的故事，第 2 项通过后才能完成。宿主完全连不上时，故事可以带一条明确的说明完成，文件会在宿主下次加载时生效。宿主连得上但存的图不一致时，故事保持未完成，下次检查时重试。刷新请求已送达、选中项读回一致，都不算看到了新形象。这些都不使用 Computer Use。

## 用户资料

读取用户资料是 Agent 在写故事之前做的事，不是运行时的服务，也不新增单元。

- 一份宿主参考文档，列出每个宿主经过实测允许 Agent 读到的内容和限制。
- workflow 把读取步骤放在 `context` 单元之前，领养和之后的每次故事都要经过。
- `context` 单元已有的 `inputRefs` 用来记录每条资料的出处。「读不到」和「没有新内容」分开保存。

哪些资料有用、往回看多久，仍由 Agent 判断。不设固定的用户画像、来源清单或时间窗口。

## 三类请求

**待开发。** `/genpet` 和自然语言请求会进入下面三种处理之一，由 Agent 按用户实际问的内容来选：

| 请求 | 什么时候 | 回复的写法 |
| --- | --- | --- |
| 对话 | 用户和宠物说话。执行 `chat` 单元；除了可选的一条对话摘要，什么都不改。 | 宠物的口吻 |
| 故事 | 定时、主动事件或明确的命令触发。执行上面的完整流程。 | 宠物的口吻 |
| 诊断 | 「加载我的宠物」「它没显示」「找不到它」。执行 `diagnose`，按实际查到的问题修复，再检查一次。不领养、不重置、不推进成长、不重画。 | 直接说明 |

## 运行时模块

| 分组 | 文件 | 做什么 |
| --- | --- | --- |
| 命令表 | `cli.ts` | 共用命令加上当前宿主自己的命令；帮助信息自动生成。 |
| 故事 | `lifecycle.ts` | `begin`、`plan`、`finish`、`cancel`、`reset` 和 `story-output`。 |
| | `growth.ts` | 成长的最晚期限：下一次故事必须包含哪次阶段推进或特殊形态变化。 |
| | `art.ts` | `art-request`（要画什么）和 `accept-art`（检查格式，复制到素材目录）。 |
| | `generation.ts` | `unit-request`、`verify-unit`（只检查字段）和 `record-step`。 |
| 日常功能 | `schedule.ts` | 检查周期、已保存的定时任务引用、距上次故事的时间。 |
| | `naming.ts` | 孵化后邀请命名一次；只保存用户自己给的名字。 |
| | `chat.ts` | 用户对宠物说过的话的简短摘要。 |
| | `status.ts` | Agent 默认读取的简短摘要。 |
| 宿主适配 | `hosts/index.ts` | 宿主接口和适配器列表。 |
| | `hosts/result.ts` | 检查并保存宿主实际做了什么（`host-result`）。 |
| | `hosts/desktop/` | 桌面端 Pet：`atlas` 格式、每只宠物一个条目的 `publish`、通过 IPC 路由的 `refresh`、切换当前显示 Pet 的 `switch`、共用的 `frames` 编解码。 |
| | `hosts/dots.ts` | Dots：保存 Avatar ID，换形象交给 Dots 的 Agent。 |
| 核心 | `model.ts` | 保存的数据类型和几个小的校验函数。 |
| | `store.ts` | 无副作用的读取（`peek`）、加锁的 `transaction`、原子写入。 |
| | `appearance.ts` | 当前计划的请求 ID，以及计划指向的素材。之后改为 `pending` 模块，见下文。 |
| 支持 | `config.ts`、`image.ts`、`migration.ts` | 路径和提示词文件；不依赖原生模块的 PNG/WebP 读取；v1 桌面端记录的显式导入。 |
| 调试器 | `debugger.ts`、`debugger-server.ts` | 可选的本地只读记录查看器。 |

**引用规则。** `cli` → 故事和日常功能 → 宿主适配 → 核心。不允许向上引用，核心不引用任何宿主。文件保持平铺，分组只是引用规则，不挪目录。

**待开发。** 现在有两个循环引用违反这条规则：`lifecycle → appearance → hosts → dots → lifecycle`，以及 `hosts → desktop/publish → art → hosts`。另外 `art.ts` 直接引用了桌面端的图集检查，`debugger-server.ts` 直接引用了桌面端的切换。改动很小：只读取未完成故事的几个函数（`pendingFor`、请求 ID、计划中的形象）挪到核心里的一个模块，宿主的图片格式作为参数传入；格式检查和 Pet 列表改为通过 `validateArt` 和 `diagnose` 调用。

## 记录

```
~/.genpet/<host>/
  state.json            宠物、未完成的故事、故事列表、素材列表、对话摘要、定时任务
  stories/<story>.json  这个故事的单元结果（待开发；现在放在 state.json 里）
  pets/<pet>/assets/    验收通过的素材
  backups/              重置或导入旧记录之前的完整备份
```

每个宿主一份记录；`GENPET_DATA_DIR` 改的是根目录，不改各宿主的子目录。每次修改都在一个加锁的事务里完成，并以原子方式写入。单元结果要挪出 `state.json`，因为只有这部分会一直变大，而每条命令都会重写整个文件。已有记录保持可读。各字段的说明在 `framework/references/storage.md`。

## 每条规则写在哪里

| 规则 | 写在哪里 |
| --- | --- |
| 宠物、蛋、故事和 Avatar 必须是什么；故事多久来一次；用户怎样出现在故事里 | `framework/prompts/meta.md` |
| 一个单元的输入、结果和检查点 | 这个单元的提示词，以及它在 `units.json` 里的条目 |
| 步骤的顺序，以及该执行哪条命令 | `framework/references/workflow.md` |
| 宿主能做什么，以及它的格式 | `framework/references/desktop.md`、`dots.md` |
| 用户能看到什么 | `framework/prompts/output.md` |
| 一条命令什么时候适用，是否需要用户确认 | 对应的 skill，其余内容只链接到上面的文件 |
| 由代码保证的规则：一个身份、一个未完成的故事、阶段只能向前、成长的最晚期限、宠物自己的 Avatar | `src/` |

**待开发。** 现在有些规则写在好几个文件里，比如一次检查什么时候可以不产生故事。每条规则挪到它唯一的文件里，其他文件改为链接。

## 实现状态

| 部分 | 0.9.4 | 到达目标还要做什么 |
| --- | --- | --- |
| 故事流程、唯一的未完成故事、可安全重试、成长的最晚期限 | 已完成 | 无 |
| 生成单元、`record-step`、单个单元的测试 | 已完成 | 无 |
| 桌面端：本地条目、IPC 刷新、读取和切换选中项 | 已完成 | 成为 `setAppearance` 里由运行时做的部分 |
| Dots：保存 Avatar ID，换形象交给 Agent | 已完成，未在真实的 Dots 宿主上测试 | 在 Dots 上测试 |
| 宿主接口 | 适配器只有 `appearanceKind`、`artContract`、`commands` | 增加 `validateArt`、`findAvatar`、`setAppearance`、`diagnose` |
| 两个宿主走同一套步骤 | 桌面端 `publish`、Dots `host-request`，两条路径 | 统一成 `set-appearance`，返回已完成和剩下的步骤 |
| 已迁移到云端的桌面端 Pet | 未处理；只写本地条目，只刷新 `custom-avatars` | 读取映射，把新图发到云端 ID，刷新云端 Pet 的资源 |
| 完成前检查宿主存的图 | 未记录；`active: false` 或已请求刷新就能完成 | 保存回读结果；`finish-story` 以它为条件 |
| 读取用户资料 | `context` 单元给什么就用什么，没有读取步骤 | 宿主可读来源的参考文档、workflow 步骤、出处记入 `inputRefs` |
| 三类请求 | `/genpet` 只进入对话 | 增加诊断，基于 `diagnose` |
| 单向引用、核心不依赖宿主 | 两个循环引用，两处直接引用宿主 | 把读取未完成故事的函数挪进核心 |
| 单元结果按故事分别保存 | 放在 `state.json` 里 | 每个故事一个文件 |
| 一条规则只写一处 | 部分规则在多个文件里重复 | 每条挪到它唯一的文件 |

### 宿主测试

下面三件事决定一个步骤由运行时做还是由 Agent 做。不管结果怎样，结构都不变。

1. 插件运行时（一个 Node 进程）能否自己替换云端 Pet 的图，还是只有 Agent 能调用 Pets API？
2. 本地到云端的映射能否通过宿主接口读到，还是只能读客户端自己的存储？
3. 运行时能否回读云端 Pet 存的图，与验收通过的图比较？

### 待定事项

发布方式。marketplace 在 30 秒限制内完整克隆这个仓库，而仓库历史比当前文件大得多。可选做法是重写历史，或者从一个只包含 `plugins/` 和 marketplace 文件的分支发布。两种做法都不改变上面的结构。

## 扩展方式

- **改一条产品规则**：改 `meta.md`。只有当某个单元的检查点依赖这条规则时，才去改那个单元的提示词。
- **新增或修改生成单元**：同时改它的提示词和 `units.json` 里的条目。`unit-request` 和 `verify-unit` 会自动识别，`src/` 不用改。
- **新增宿主**：写一个实现宿主接口的适配器，并加上它自己的命令。在 `hosts/index.ts` 里登记，增加 `config/host.json` 和一个插件目录，把包名加到 `scripts/build-plugin.ts`，并把实测到的宿主能力写成它的参考文档。
- **新增命令**：在 `cli.ts` 的命令表里加一项；只有一个宿主需要时，加到那个适配器的 `commands` 里。逻辑留在功能模块里。
- **修改 skill**：共用的 skill 改 `framework/skills/`。只属于某个宿主的 skill 在 `plugins/<package>/skills/`。

## 插件包

`npm run build:plugin` 把 `framework/{prompts,references,debugger-web,skills}` 复制到两个插件包里，并把 `src/` 打包到各自的 `dist/`。这些副本是生成的，要改就改源文件。每个包里只手工维护 manifest、`config/host.json`、README、只属于该宿主的 skill 和 `scripts/verify-install.mjs`。桌面端的包另外带有 `vendor/` 下的 `hatch-pet` 精灵图处理脚本。

## 检查

`npm run verify:fast` 执行类型检查、格式检查和单元测试。`npm run verify:release` 另外会构建、把两个包安装到临时的 Codex home，并运行安装后的 CLI 和调试器。这些检查只能说明代码能正常工作。故事或图片对不对，要另外用 `tests/agent/README.zh-CN.md` 里由 Codex 执行的那套测试来判断。

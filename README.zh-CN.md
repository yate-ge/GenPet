# GenPet

[English](README.md) | 简体中文

GenPet 是一只由图像生成的 **Codex 原生 Pet**：它从一颗看不出种类的蛋开始，孵化五小时后才确定自己是谁，之后随你日常在 Codex 里的活动一天天长大。

GenPet 直接使用 Codex 自带的 Pet 窗口和动画状态，在此之上加入本地生命周期引擎、自动读取活动情境、图像生成流程和原生精灵图安装。GenFaceUI 是其“有边界的个性化”思路的理论参考；本项目是一个新原型，不是对它的复现，也不是经过验证的长期干预研究。

## 安装

需要：

- 支持自定义 Pet 和插件的 **Codex 桌面端**；
- **Node.js 22+**，并且 `node` 在 `PATH` 中（插件的 MCP 服务用 `node` 运行）；
- 可用的 **git**（Codex 用它从 GitHub 拉取插件）。

不需要 clone 仓库、不需要 `npm install`、也不需要构建：本仓库本身就是一个 Codex 插件市场，`plugins/genpet/` 是已经构建好的插件。

### 方式一：在 Codex 桌面端图形界面安装

1. 打开 Codex 桌面端，点左侧边栏的「插件」。
2. 点「添加插件市场」（在插件页面的「添加」或右上角「页面操作」菜单中）。
3. 「来源」填 `yate-ge/GenPet`，「Git 引用」留空（跟随 main），点「添加插件市场」。
4. 在插件列表中找到 GenPet，点安装，并确认它已启用。
5. 新建一个 Codex 任务（新任务才会加载插件的技能和工具），输入 **`/genpet-start`**。

### 方式二：让 Codex Agent 帮你装

在任意 Codex 任务中发送下面这段话：

> 请从 GitHub 仓库 yate-ge/GenPet 安装 GenPet Codex 插件，不需要 clone 仓库或运行 npm。先确认 `node --version` 为 22 或更高、`codex` CLI 可用。用 `codex plugin list` 检查是否已有 GenPet：已从 `genpet` marketplace 安装时，运行 `codex plugin marketplace upgrade genpet` 更新；来自其他 marketplace 时先告诉我它的来源，不要装第二个 GenPet；尚未安装时，运行 `codex plugin marketplace add yate-ge/GenPet` 和 `codex plugin add genpet@genpet`。完成后用 `codex plugin list` 确认 `genpet@genpet` 为 installed, enabled，并报告版本和安装路径。技能和 MCP 工具要在新的 Codex 任务中才会加载，当前任务无法确认时请直接说明。只安装插件：不要领养、重置或加龄宠物，不要生成图像，保留 `~/.genpet/` 和 `~/.codex/pets/genpet-companion/`。

装好后新建任务，输入 **`/genpet-start`**。

### 方式三：命令行

```sh
codex plugin marketplace add yate-ge/GenPet
codex plugin add genpet@genpet
```

macOS 上如果终端里找不到 `codex`，它在桌面端应用内：`/Applications/ChatGPT.app/Contents/Resources/codex`。如果 `git` 提示需要同意 Xcode 许可协议，在「终端」App 里运行 `sudo xcodebuild -license accept`，或安装 Command Line Tools。

### 更新、固定版本与卸载

```sh
codex plugin marketplace upgrade genpet   # 更新到最新 main，之后新建的任务使用新版本
codex plugin remove genpet@genpet         # 卸载插件；~/.genpet/ 里的宠物状态会保留
```

想固定在某个发布版本而不是跟随 main，添加市场时加 `--ref <标签>`（图形界面里填「Git 引用」）。

如果之前用别的方式（例如本地 personal 市场）装过 GenPet，请先卸载旧的那个再安装，避免出现两个 GenPet 插件。宠物数据保存在 `~/.genpet/`，卸载和重装插件都不会影响它。

## 开始使用

在新任务中输入 **`/genpet-start`**（也可以用 `$genpet-start`，或直接说"开始我的 GenPet"）。它可以重复运行，不会重置已有宠物：

- **还没有宠物：** 读取本地活动、领养一颗蛋、生成蛋壳形象和动画图集、校验后安装到 `~/.codex/pets/genpet-companion/`，并创建一个每小时检查的定时成长任务。在 Codex 的 Pets 设置里选中 GenPet 一次即可。
- **已经有宠物：** 不重新领养，只检查并补全缺失的图像、原生 Pet 和定时任务，然后报告现状。重装插件或换电脑后运行一次即可恢复。
- **`/genpet-start manual`：** 同上，但不创建定时任务。

之后的孵化和成长都更新同一个 Pet。其他常用说法：**查看我的 GenPet 状态**、**更新我的 GenPet 成长与形象**。想重新开始一只新宠物，用 `/genpet-reset`。

安装插件本身不会领养宠物，也不会创建定时任务、启动器、LaunchAgent、轮询监控或任何常驻后台进程。

## 架构

GenPet 分成三层：**Codex 里的 Agent 负责"画"，本地 MCP 服务负责"记"，Codex 原生 Pet 负责"显示"。** 插件本身没有任何常驻进程：只有在任务或定时任务调用工具时，MCP 服务才运行。

```mermaid
flowchart LR
  U["你的任务 / 斜杠命令<br>/genpet-start 等"] --> S
  H["Codex 定时任务<br>每小时心跳"] --> S
  subgraph CX["Codex 桌面端"]
    S["GenPet 技能<br>skills/"]
    IG["内置 imagegen"]
    HP["hatch-pet 管线<br>vendor/hatch-pet（Python）"]
    PW["原生 Pet 悬浮窗"]
  end
  S -- "按请求生成" --> IG --> HP
  HP -- "校验通过的图集" --> M
  S -- "调用 MCP 工具" --> M["GenPet MCP 服务<br>dist/mcp.js（Node）"]
  M --> ST[("~/.genpet/<br>state.json · art/ · backups/")]
  M -. "只读用户消息" .-> SE[("~/.codex/sessions")]
  M -- "原子写入" --> PET[("~/.codex/pets/<br>genpet-companion")]
  PET --> PW
  M -. "本机调试通道：刷新并确认" .-> PW
```

| 模块 | 源码 | 职责 |
|---|---|---|
| 技能 | `skills/genpet*/` | 告诉 Agent 何时读状态、何时生成图像、如何质检和安装；`/genpet-start` 负责开始或恢复，另外三个是调试命令 |
| MCP 服务 | `src/mcp.ts` | 把下面各模块暴露为 12 个 `genpet_*` 工具 |
| 生命周期引擎 | `src/core.ts` | 以领养时间为锚点计算孵化、五小时情境窗口、每日成长和离线补算；孵化时一次性确定出生身份 |
| 活动情境 | `src/context.ts` | 只读近期 Codex 用户消息，归类为 构建/研究/创作/学习/休息 标签，不保存原文 |
| 存储 | `src/store.ts` | `~/.genpet/state.json` 的事务读写、备份和幂等记录 |
| 图像与安装 | `src/art.ts`、`src/image.ts` | 为当前设计生成唯一的图像请求 ID；校验 PNG/WebP 图集；原子替换原生 Pet 的精灵图 |
| 原生刷新 | `src/native-refresh.ts`、`src/cdp-launcher.ts` | 通过仅限本机的调试端口让 Codex 重新读取 Pet，并核对悬浮窗实际显示的图像哈希 |
| 调试 | `src/debug.ts` | reset/grow/state 的实现，带备份和 operationId 幂等 |
| 生成管线 | `vendor/hatch-pet/` | 官方 Hatch Pet 工具：逐行生成动作、提取帧、组装 8×11 V2 图集并质检 |

**一次成长更新的流程：** 定时心跳触发 GenPet 技能 → `genpet_status` 让引擎补算时间，得出当前阶段和道具 → `genpet_art_request` 给出这个设计的请求（已有图像就是 `ready`，不重复生成）→ Agent 用 imagegen 和 hatch-pet 生成并质检 → `genpet_accept_art` 保存到 `~/.genpet/art/` → `genpet_install_native` 原子写入 `genpet-companion` 并尝试刷新悬浮窗。任何一步失败都保留上一张通过质检的图像。

**分发：** 仓库根目录的 `.agents/plugins/marketplace.json` 让整个仓库成为一个 Codex 插件市场。`npm run build:plugin` 用 esbuild 把 `src/` 和全部 npm 依赖打包进 `plugins/genpet/dist/`，图像解码使用 WebAssembly，没有原生模块。Codex 从 GitHub 拉取后直接运行，不需要 npm。

## 功能与范围

- 原生风格像素画，由 Codex `imagegen` 生成，经 `hatch-pet` 流程组装。
- 蛋优先：只有带微弱线索的普通蛋壳，没有预先选定的生物；出生身份在孵化时根据孵化期活动和随机种子一次性确定。
- 五小时孵化与情境窗口、每日成长、离线补算、孵化后身份不变、情境记录可撤回。
- 自动从近期 Codex 用户消息提取本地活动标签；内置生成流程不需要问卷，也不需要 API key。
- 本地 MCP 工具和可分发的 Codex 插件。
- 插件里没有网站、HTTP 服务、浏览器页面或独立的悬浮窗程序。

**原生刷新：** 当前 Codex 版本没有经过验证的公开热更新接口。GenPet 通过仅限本机的调试通道让宿主的自定义头像查询失效，然后检查悬浮 Pet 实际显示的精灵图哈希；它不会打开设置或模拟点击。确认显示需要本地调试通道处于开启状态，GenPet 不会为此运行后台进程。图像生成仍需要在 Codex 任务中进行，Node 进程无法自行调用桌面端的 imagegen。详见[原生刷新说明](docs/NATIVE_REFRESH.zh-CN.md)。

## 成长机制

领养时间是五小时孵化窗口和情境窗口的起点。蛋只有蛋壳特征，`hatchIdentity` 为空。到达孵化边界时，引擎根据完整的孵化期活动和随机种子确定一个有边界的出生身份，并生成第一张生物形象，只沿用蛋的微弱颜色和纹理线索。之后的活动不会重新抽取已经揭晓的个体。

孵化后每满 24 小时增加一个成长日，默认第 7 天进入幼年、第 21 天成年。体型变化有上限；日常活动只适度影响表情倾向，不决定能否成长。没有连续打卡、工作量比拼、健康下降或缺席惩罚。

最近一个已结束的五小时窗口决定活动道具：构建/工具、研究/书、创作/画笔、学习/探索、休息/枕头。稳定身份和运行时的任务动作相互独立。新领养的时间和默认值可在 `config/policy.json`（或 `GENPET_POLICY_FILE` 指定的文件）中修改，已有宠物保留自己保存的策略。更多细节见[蛋优先机制](docs/MECHANISM.zh-CN.md)和[自定义默认值](docs/CUSTOMIZATION.zh-CN.md)。

## 定时成长

成长检查和图像生成由 Codex 原生定时任务触发。插件内没有定时器、后台监控、LaunchAgent、cron 或网站；MCP 进程只响应工具调用，生命周期引擎在被调用时根据保存的时间戳补算。

开启自动成长时，使用一个 Codex 原生线程心跳每小时检查一次。引擎判断五小时孵化/情境边界和 24 小时成长边界，同时发生的变化只产生一个当前设计；已就绪或已暂停的图像不会重复生成。定时任务可用性、生成耗时和原生刷新都可能让可见更新有所延迟。

## 隐私

情境只在本地从 Codex 的 JSONL 用户消息中读取，忽略系统/开发者消息和工具输出。GenPet 只保存固定的活动标签、计数、时间戳和去重哈希，不保存对话原文或文件路径。提取器有明确的文件数量和大小上限，覆盖不完整时会报告。这只是关键词分类，并不声称理解你或推断你的心理状态。你可以关闭情境读取，也可以清除已提取的记录。

图像生成提示词只包含宠物设计参数和活动道具，不包含私人聊天内容。提示词和参考图由 Codex 图像生成服务处理；生成结果保存在本地。

## MCP 工具

| 工具 | 用途 |
|---|---|
| `genpet_status` | 补算生命周期并读取本地活动标签 |
| `genpet_adopt` | 领养一颗蛋，不会覆盖已有宠物 |
| `genpet_art_request` | 读取当前有边界的图像生成请求 |
| `genpet_accept_art` | 质检后接收生成的头像或图集 |
| `genpet_install_native` | 原子地导出已批准的当前设计图集 |
| `genpet_install_cdp_launcher` | 安装可选的手动调试启动器 |
| `genpet_remove_cdp_launcher` | 移除该启动器 |
| `genpet_configure` | 开关情境读取、冻结装扮、自动生图、改名 |
| `genpet_clear_context` | 清除已提取的标签，不删除原始对话 |
| `genpet_debug_reset` | 明确要求时备份旧生命并重新开始一颗蛋 |
| `genpet_debug_grow` | 推进逻辑年龄，保持已揭晓的身份 |
| `genpet_debug_state` | 测试用的道具覆盖，或恢复自动映射 |

命令行提供等价的诊断操作：`node dist/cli.js status`、`adopt`、`art-request`、`accept-art`、`install-native`。`accept-art` 需要请求 ID、绝对文件路径、类型和来源说明，绝不会伪造生成的图像。

## 调试斜杠命令

除了 `/genpet-start`，插件还包含 `genpet-reset`、`genpet-grow`、`genpet-state` 三个调试技能，可在 `/` 菜单中找到，或用 `$genpet-reset`、`$genpet-grow`、`$genpet-state` 调用。reset 备份后开始新的生命；grow 加速同一个身份的成长；state 修改道具或恢复自动映射。每个流程都会生成并校验缺失的图像，然后安装到同一个原生 Pet。参数见[调试命令说明](docs/DEBUG_COMMANDS.zh-CN.md)。定时维护任务从不调用这些调试命令。

## 开发

```sh
npm ci
npm run build
npm test
npm run build:plugin   # 修改了插件包含的内容后，重新生成 plugins/genpet/
```

用户状态保存在仓库之外的 `~/.genpet/`；测试时可用 `GENPET_DATA_DIR` 覆盖。`CODEX_HOME` 控制读取的 Codex 目录和原生 Pet 的安装位置。

| 位置 | 用途 | 是否进入 `plugins/genpet/` |
|---|---|---|
| `.agents/plugins/marketplace.json` | 让仓库成为名为 `genpet` 的 Codex 插件市场 | — |
| `plugins/genpet/` | 用户实际安装的插件，由 `npm run build:plugin` 生成并提交，不要手改 | — |
| `src/` | 运行时源码 | 连同所有 npm 依赖打包进 `dist/mcp.js` 和 `dist/cli.js` |
| `tests/`、`.github/` | 测试和 CI | 否 |
| `scripts/` | 构建、安装和验证工具 | 只有技能用到的两个图像质检脚本 |
| `assets/` | 生成的示例和隔离测试夹具 | 否 |
| `docs/` | 研究、设计、验证和帮助文档 | 只有调试命令和原生刷新两份帮助 |
| `skills/`、`vendor/hatch-pet/`、`config/` | Codex 工作流、官方图集工具和策略默认值 | 是 |
| `output/` | 被忽略的本地构建和报告 | 否 |

- `npm run verify:fast`：源码改动后的快速检查。
- `npm run verify:release`：交付前运行。它会重建 `plugins/genpet/`，通过仓库市场安装到临时 Codex 环境，确认安装副本不含 `node_modules`，并在副本上跑完整的 MCP 生命周期流程。CI 还会检查提交的 `plugins/genpet/` 是否与源码一致。两条命令都不会重置或安装真实的 Pet。

通过单元测试不能代替在 Codex 里实际选中并观察宠物。何时需要单独验证图像生成和原生显示，见[项目地图与验证工作流](docs/PROJECT_STATUS.zh-CN.md)；开发和发布流程见 [CONTRIBUTING](CONTRIBUTING.md)。

更多文档：[设计计划](docs/PLAN.zh-CN.md)、[验证记录与剩余限制](docs/VALIDATION.zh-CN.md)、[个性化与成长的受控检查](docs/PERSONALIZATION_GROWTH_VALIDATION.zh-CN.md)、[研究边界](docs/RESEARCH.md)、[第三方声明](THIRD_PARTY_NOTICES.md)。

## 许可

原创源码采用 MIT 许可；内置的 Hatch Pet 工具采用 Apache-2.0。生成素材的来源另行记录。GenPet 在孵化、成长和情境更新的全过程中只维护一个原生条目 `genpet-companion`；开发演示数据不能安装为原生 Pet。

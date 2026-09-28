# GenPet 调试命令

GenPet 提供下列调试和切换技能（开始或恢复宠物用的 `/genpet-start` 不在此列）。在 Codex 输入 `/` 搜索 `genpet-`，选择命令后补参数；也可用 `$genpet-reset`、`$genpet-grow`、`$genpet-state`、`$genpet-switch` 显式调用。插件技能的菜单显示可能带 `genpet:` 前缀，以菜单实际候选为准。[官方命令说明](https://learn.chatgpt.com/docs/reference/slash-commands)确认启用的技能会出现在斜杠菜单。

| 命令 | 示例 | 行为 |
|---|---|---|
| `/genpet-reset` | 无参数 | 备份当前存档，生成新 seed、新蛋，重新开始真实五小时孵化 |
| `/genpet-grow` | 无参数 / `hatch` | 无参数：蛋孵化，出生后增长一日；hatch 只到出生 |
| `/genpet-grow` | `7` / `juvenile` / `adult` | 再增长7日 / 到幼年阈值 / 到成年阈值 |
| `/genpet-state` | `build`、`research`、`create` | 工具、书、画笔 |
| `/genpet-state` | `learn`、`rest`、`none` | 星星、枕头、空手 |
| `/genpet-state` | `auto` | 清除测试覆盖，恢复活动映射（或用户原有冻结穿着设置） |
| `/genpet-switch` | 无参数 / `current` | 读取宿主当前选择，并列出可选宠物 |
| `/genpet-switch` | `list` | 列出内置和本地宠物，不切换 |
| `/genpet-switch` | `dewey` | 即时切换到 Dewey |
| `/genpet-switch` | `genpet` / `custom:genpet-companion` | 即时切回已安装的 GenPet |

state 无参数在画笔和空手之间切换。蛋期不添加道具。reset/grow/state 保持原生条目 `genpet-companion`，不会创建 Demo 或第二只原生 Pet。switch 切换 Codex 激活的宠物，与 state 更换 GenPet 道具不同；它调用下文的 `switch-pet` CLI，不生成形象或改变成长状态。

## 真实时间与调试时间

正常成长使用真实领养时间。grow 保存独立的 `debug.growthOffsetMs`，不改 `pet.adoptedAt`：调试年龄立即前进，之后按每天的真实经过时间继续增加；此偏移不会自动清零或倒退。reset 才重新开始生命周期。调试操作记录真实执行时间，reset/grow 保存可恢复的旧存档到数据目录的 `backups/`。备份和旧 artwork 文件保留在本机，reset 不删除源聊天。

加速后的上下文扫描仍读取真实最近五小时，导入的标签时间平移到逻辑年龄轴；因此这只加速宠物的后续状态不是未经干预的纵向研究样本。state 是持续的视觉覆盖，优先于冻结穿着，不插入虚构活动、不改变出生身份；用 auto 退出。

## reset/grow/state 的完整执行

技能通过插件内的 Node CLI 变更状态、取得当前设计，必要时用内置 imagegen 与官方 hatch-pet 管线生成、校验，再运行 `install-native`。已有同一个设计的验收素材会复用并重新安装。新设计的生成并非瞬时操作。

工具返回 pending 不代表画面已改变；paused 表示 autoArt 被关闭，命令不会擅自开启。只有安装返回 `displayStatus=confirmed` 才报告画面更新。生成失败时保留之前有效素材，继续同一个请求；不能再调用 reset/grow 来“重试生成”。没有原生显示确认就明确报告未确认。

首次成长需要已验收的当前蛋 portrait/atlas；后续成长需要已确认出生 portrait，防止跳过蛋直接设计成年体。成长只更新当前阶段，不重放跳过的每天素材。调试状态不同于 Codex 的 idle、running、waiting、review 动画，后者仍由宿主驱动。

底层 CLI 命令：`debug-reset`、`debug-grow`、`debug-state`。每次显式用户操作用新 UUID 作 operationId，重试复用该 ID；保留最近50次操作的幂等记录。讨论命令、开发测试、定时维护不构成执行重置/加龄授权。

从插件根目录运行：

```sh
node dist/cli.js debug-reset OPERATION_UUID
node dist/cli.js debug-grow next OPERATION_UUID
node dist/cli.js debug-grow juvenile OPERATION_UUID
node dist/cli.js debug-grow 7 OPERATION_UUID
node dist/cli.js debug-state research OPERATION_UUID
node dist/cli.js debug-state auto OPERATION_UUID
```

CLI 仅完成状态变更，仍需技能继续生成和安装。开发回归测试设置隔离的 `GENPET_DATA_DIR` 和 `CODEX_HOME`；不要拿真实宠物重置来验证工具。

## 即时切换 Pet 的测试命令

斜杠技能 `/genpet-switch` 会把 `list`、`current` 转为 CLI 的 `--list`、`--current`，把 `genpet` 转为 `custom:genpet-companion`。无参数或 `current` 会同时读取当前选择和可选列表；只查看列表用 `/genpet-switch list`。

从插件根目录运行；无需启动 debugger：

```sh
node dist/cli.js switch-pet --list
node dist/cli.js switch-pet --current
node dist/cli.js switch-pet dewey
node dist/cli.js switch-pet custom:genpet-companion
```

无参数等同 `--current`，只读取宿主当前选择。`--list` 只读取内置和本地清单，不要求宿主连接，也不包含云端列表。传入 ID 会立即切换并持久保存；最后一条用于切回已安装的 GenPet。切换后会再次读取宿主设置，成功返回 `immediate: true`、`restartRequired: false`、`hostStateConfirmed: true`；这不代表已验证悬浮窗像素。

在开发仓库根目录也可用 `npm run pet:switch -- dewey`，其他参数同理。该快捷命令使用仓库已生成的运行时；修改源码后先运行 `npm run build:plugin`。

读取当前选择和即时切换需要从本地 Codex 桌面聊天执行环境启动，继承 `CODEX_APP_TOOLS_PIPE_PATH` 与 `CODEX_THREAD_ID`。普通外部终端可能缺少连接上下文。通道不可用或写入未确认时命令以非零状态退出，不重启应用，也不回退修改磁盘配置。此命令不支持 `--demo`。Windows 已实测，macOS 有额外进程身份校验，仍待实测。

### 两条管道都是 IPC

IPC 是进程间通信的统称；管道或 Unix socket 是承载通信的操作系统机制。GenPet 使用的两条通道连接不同服务：

| 通道 | 协议与用途 |
|---|---|
| 客户端协调 IPC（Windows：`\\.\pipe\codex-ipc`） | 使用 initialize/request/broadcast；已验证 `query-cache-invalidate` 刷新图集缓存。之前的设置请求在此没有找到处理器。 |
| 会话 app-tools IPC（地址来自环境变量） | 使用 JSON-RPC `tools/call`；`read_settings` / `write_settings` 读写宿主当前选择，并通知窗口更新。 |

两者都使用带长度前缀的 JSON 帧，但服务和消息格式不同，不能互换调用。此前失败的是设置请求发到了没有相应处理器的协调服务，不是 IPC 本身不支持切换。

## 网页调试器的桌面宠物

网页中的「桌面宠物」列出可读取的内置宠物和本地自定义宠物，不包含云端宠物。「宿主当前选择」表示已通过 app-tools 通道读取 Codex 宿主设置；读不到实时设置时显示「配置中选择」，它仅来自保存的配置，不能确认运行中窗口正在显示哪只宠物。宿主设置的确认不等于截图或视觉确认。

宿主设置通道可用时，选择宠物并点击「立即切换」，通过该通道更新宿主当前选择，无需重启。通道中途失败会报错，不会自动降级为保存配置。画面请观察 Codex 悬浮宠物。

通道不可用时，按钮显示「保存选择（需重启）」。保存后需要完全退出并重新打开 Codex，不会即时改变画面。如需立即更换，请在 Codex 的 Pets 设置中切换。原生画面区域的 IPC 操作只刷新图集缓存，不切换选中的宠物。成长实验室隐藏桌面宠物操作，也不允许修改真实选择。

## 个性化与成长的验证边界

开发阶段曾用合成活动经过真实分类器，一次性交叉检查五类活动 × 五个 seed。固定活动换 seed 检查个体差异；固定 seed 换活动检查活动到配色/道具的映射；出生后保持身份，检查日龄、阶段、比例参数。该研究型统计不再作为常规发布测试维护。

这些测试验证映射代码和设计请求，不证明图片在人眼看来可区分，也不证明映射是用户认可的。图像层还需相同风格、相同动作格的多用户盲辨；当前真实角色的成长需使用其出生参考，在同道具、同姿势下比较出生/幼年/成年。无感切换和部分道具变化已有用户确认；这不能替代跨用户辨识与真实角色的成长视觉验收。

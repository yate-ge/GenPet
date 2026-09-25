# GenPet 调试命令

三个插件技能随 GenPet 一起安装，在 Codex 输入 `/` 搜索 `genpet-`，选择命令后补参数；也可用 `$genpet-reset`、`$genpet-grow`、`$genpet-state` 显式调用。插件技能的菜单显示可能带 `genpet:` 前缀，以菜单实际候选为准。[官方命令说明](https://learn.chatgpt.com/docs/reference/slash-commands)确认启用的技能会出现在斜杠菜单。

| 命令 | 示例 | 行为 |
|---|---|---|
| `/genpet-reset` | 无参数 | 备份当前存档，生成新 seed、新蛋，重新开始真实五小时孵化 |
| `/genpet-grow` | 无参数 / `hatch` | 无参数：蛋孵化，出生后增长一日；hatch 只到出生 |
| `/genpet-grow` | `7` / `juvenile` / `adult` | 再增长7日 / 到幼年阈值 / 到成年阈值 |
| `/genpet-state` | `build`、`research`、`create` | 工具、书、画笔 |
| `/genpet-state` | `learn`、`rest`、`none` | 星星、枕头、空手 |
| `/genpet-state` | `auto` | 清除测试覆盖，恢复活动映射（或用户原有冻结穿着设置） |

state 无参数在画笔和空手之间切换。蛋期不添加道具。所有操作保持原生条目 `genpet-companion`，不会创建 Demo 或第二只原生 Pet。

## 真实时间与调试时间

正常成长使用真实领养时间。grow 保存独立的 `debug.growthOffsetMs`，不改 `pet.adoptedAt`：调试年龄立即前进，之后按每天的真实经过时间继续增加；此偏移不会自动清零或倒退。reset 才重新开始生命周期。调试操作记录真实执行时间，reset/grow 保存可恢复的旧存档到数据目录的 `backups/`。备份和旧 artwork 文件保留在本机，reset 不删除源聊天。

加速后的上下文扫描仍读取真实最近五小时，导入的标签时间平移到逻辑年龄轴；因此这只加速宠物的后续状态不是未经干预的纵向研究样本。state 是持续的视觉覆盖，优先于冻结穿着，不插入虚构活动、不改变出生身份；用 auto 退出。

## 每条命令的完整执行

命令调用 MCP 变更状态，取得当前设计，必要时用内置 imagegen 与官方 hatch-pet 管线生成、校验，再调用 `genpet_install_native`。已有同一个设计的验收素材会复用并重新安装。新设计的生成并非瞬时操作。

工具返回 pending 不代表画面已改变；paused 表示 autoArt 被关闭，命令不会擅自开启。只有安装返回 `displayStatus=confirmed` 才报告画面更新。生成失败时保留之前有效素材，继续同一个请求；不能再调用 reset/grow 来“重试生成”。没有原生显示确认就明确报告未确认。

首次成长需要已验收的当前蛋 portrait/atlas；后续成长需要已确认出生 portrait，防止跳过蛋直接设计成年体。成长只更新当前阶段，不重放跳过的每天素材。调试状态不同于 Codex 的 idle、running、waiting、review 动画，后者仍由宿主驱动。

底层工具：`genpet_debug_reset`、`genpet_debug_grow`、`genpet_debug_state`。每次显式用户操作用新 UUID 作 operationId，重试复用该 ID；保留最近50次操作的幂等记录。讨论命令、开发测试、定时维护不构成执行重置/加龄授权。

CLI fallback（从插件根目录运行）：

```sh
node dist/cli.js debug-reset OPERATION_UUID
node dist/cli.js debug-grow next OPERATION_UUID
node dist/cli.js debug-grow juvenile OPERATION_UUID
node dist/cli.js debug-grow 7 OPERATION_UUID
node dist/cli.js debug-state research OPERATION_UUID
node dist/cli.js debug-state auto OPERATION_UUID
```

CLI 仅完成状态变更，仍需技能继续生成和安装。开发回归测试设置隔离的 `GENPET_DATA_DIR` 和 `CODEX_HOME`；不要拿真实宠物重置来验证工具。

## 个性化与成长的验证边界

`npm run verify:personalization` 用合成活动经过真实分类器，交叉检查五类活动 × 五个 seed。固定活动换 seed 检查个体差异；固定 seed 换活动检查活动到配色/道具的映射；出生后保持身份，检查日龄、阶段、比例参数。

这些测试验证映射代码和设计请求，不证明图片在人眼看来可区分，也不证明映射是用户认可的。图像层还需相同风格、相同动作格的多用户盲辨；当前真实角色的成长需使用其出生参考，在同道具、同姿势下比较出生/幼年/成年。无感切换和部分道具变化已有用户确认；这不能替代跨用户辨识与真实角色的成长视觉验收。

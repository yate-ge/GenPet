# GenPet Agent 验收

本套验证生成语义、真实图像和宿主表现，完整用例以 [测试用例](../../docs/TEST_CASES.zh-CN.md) 与 [开发计划](../../docs/DEVELOPMENT_PLAN.zh-CN.md) 为准。工程检查是 npm run verify:fast；字段有效、脚本通过或生成者自评都不能证明内容和桌面体验。

## 范围与证据

| 组 | 范围 | 主要证明方式 |
| --- | --- | --- |
| A1–A10 | 资料许可、读取、旅程、设计与领养总结 | 保存逐轮真实输入，独立语义观察 |
| T1–T13 | 各 context 下连续二十次故事计划 | 实际逐次结果，内容/类型/memory/成长轨迹 |
| S1–S23 | 单次规则与表达边界 | 独立用例，源事实核对和真实媒体展示 |
| V1–V4 | 不同 Pet、成长线、特殊形态、换装 | 真实图像、整套、计时、宿主云图回读与用户判断 |
| C1–C2 | 唯一 chat 入口和阶段语气 | 对话前后状态对照、实际回复 |
| E1–E5 | 主入口、改名、停止恢复、强行成长、只读调试 | 命令结果和记录前后对照 |
| G1–G3 | 先查故障、四项结果与未知 | 真实/合成宿主结果、没有 Pet 改动 |
| U1–U3 | 久别、旧记录补全、有限返工 | 记录对照、真实图像失败和恢复 |
| D1–D11 | 同 cloud ID、简介、Dots 持续风格与主环境 | 跨端实际回读、新会话、工作对照 |
| M1–M8 | 环境检查、确认、清理、增养替换、多 Pet | 每只目录/云 ID、选择路由和中断恢复 |

旧说明中的模块编号 M1–M8 已废弃；本文件 M 组指最新的初始化和多宠物用例。独立单元名见 framework/prompts/units.json，使用 story-item 和 ImageReviewer；旧历史别名由读取兼容。

## 基本做法

- 只手写合成原始资料、用户旅程回答与规则探针。创作上游由 Agent 本轮生成并保存，作为冻结的下游输入；不规定标准角色、身体或故事答案。
- 上游与单元分开，生成者只拿 unit-request 的 prompt；独立 reviewer 拿实际输入/输出和检查点，写具体观察，不拿预期结论。按用户授权可用子代理；看语义不能只验 JSON。
- 单元、二十次模拟和工程测试使用独立 GENPET_DATA_DIR/CODEX_HOME，不读真实用户记忆、不改用户 Pet、不建真实任务。
- 真实宿主接口测试单独分层。读取真实配置不意味着隔离文件能连到真实客户端；只能操作专属测试 Pet 的已核对唯一/cloud ID、专属任务。用户正在养的 Pet 和任务保持原样。没有实际宿主证据的条目保持未验证。
- 已授权的开发工作继续执行，不逐段重问许可。测试里模拟真正领养用户的确认，必须保留确认前后读取和写入的证据。
- 原生生图保存工具提供的原 PNG、路径、字节 SHA 和小型计时元数据；不把大 base64 返回嵌入可执行代码或 shell 参数。raw 不完整记 partial/unknown，不从 PNG 重建；被工具或审批拒绝的载荷不分段、换 API 或换存法重传。计时回执本身有开销，性能对照需注明记录方式。
- 每份输入、报告、候选、图片、原始单元结果、快照和日志全保留，直接上传用户 Google Drive。output/ 只是上传前暂存，上传失败继续保留；产物和报告都不入 git，仓库只有 docs/evidence/README.md 摘要与 Drive 链接。

## 准备与一个单元

先检查当前工作区与已有构建，按需 npm run build:plugin；不要让测试自动 git pull/reset 覆盖开发改动。在 PowerShell 中建立独立 run：

```powershell
$agentRun = Join-Path (Get-Location) 'output/agent-tests/20261011-run1'
New-Item -ItemType Directory -Path $agentRun -Force | Out-Null
$agentCli = (Resolve-Path 'plugins/genpet/dist/cli.js').Path
```

1. 写绝对输入文件 `{"inputRefs":["fixture:A6"],"inputs":{...}}`，必需键见 units.json。context 包含测试提供的实际资料与 read 结果；random、journey、recentContent 采用保存的真实工具结果。
2. `node $agentCli unit-request UNIT ABS_INPUT_JSON`，保存精确返回 request 与 promptHash。
3. 把返回 prompt 给生成 Agent，仅执行这个单元，保存原始结果文件。独立图像任务保存其所有中间图，不在主对话显示候选。
4. `node $agentCli verify-unit UNIT ABS_RESULT_JSON` 保存格式结果；再由独立 reviewer 检查语义，观察指向具体事实、选择、部位或文字。
5. 下游只引用已经保存的上游结果。基准图测试实际调用 imagegen 并实际看图；ImageReviewer 没有真实文件不能通过。

独立单元用固定输入，不需要完成整个生命周期。runtime record-step 保存简短结果供实际故事续接；精确请求、原始输出和独立评价属于测试 evidence。

## 逐组执行

A 组保存首次资料说明/答复、读取记录、每轮场景/选项/用户原话、旅程结束、种子候选/选择、具体来源与 designReason、性格和拟声词、蛋图与总结。验证最多五轮、自由回答、中断续接、资料稀少仍有真实选择依据、敏感资料不流入下游、总结不透露幼年身体。实际读取成功独立核对，文件存在不是证明。

T 组各连续二十次，用固定/逐次提供的合成 context 和真实保存的上篇结果继续。每次先候选再 seeded selection，再 story/evolution/appearance/home/story-item，写出预期可见变化与 output。模拟尚未画图必须标为计划，不能填写已上传/实际显示成功。保留每次是否重写 memory、经历数内部轨迹、成长/预兆、未完事项和类型变化。T8 的多样性是观察，不新增四次上限；最短两天不是成长规则。唯一类型硬上限是已有纯文字规则。

S 组使用独立规则探针：context 与文本原意、安全过滤、每次内容、弱交互、阶段/特殊形态、复用、用户可见文字、任务命名/补跑、许可、孵化命名、一次图片展示和成长图。不要把「每次有内容」变成强制状态修改。文本-only 有实际用户相关 contextRefs；物件为 null 并不表示 text-only，还可能有 Avatar/家。

V 组四条分别使用自己的测试 Pet，互不交叉。V1 至少六份不同用户资料并覆盖工具的三类来源，各只到幼年；V2 一条蛋→幼年→少年→成年；V3 成年特殊形态的进入、结束与再次复用；V4 至少三次不同换装并复现一次。每次真画完整套、检查小尺寸、计时与云图回读；静态基准只能证明基准。身体左右不对称的镜像需单独看，返工/补帧也看实际整套。用户对可爱、身份、阶段与设计联系的判断不可代填。

C/E/G/U 按完整用例逐项运行，使用 /genpet-chat 唯一对话入口、/genpet 命名与故障。对比 ID、cloud ID、soul/memory/state/art/history；故障不能重领养、推进年龄或重画。四项结果分别记录 unknown/actual，刷新或选择读回不是显示证明。

D/M 先读-only 能力探查与基础测试，再用专属测试 Pet 验证云图、简介同步、持久语气、唯一主环境和每只独立目录。handoff 在停旧任务后导出整个目录，目标核对后才启用新任务；中断恢复与反向移交使用同一个 ID。Dots 不使用已移除的独立包或 Avatar 格式。

## 额外缺口与恢复用例

同时验证实际资料读取、五小时任务、旧导入中断重试、来源种子重试、memory 不重复计数、云上传未发生时 pending、成长基准图失败、补帧观感及移交中断。多 Pet 分别覆盖：A 切走十天再回来（期限暂停），A 激活时关机十天（时间经过），故事中途改选 B（仍写原 A）。这些不是额外创作预设，是工程边界。

真实宿主的任务循环见 [SCHEDULED_LOOP](SCHEDULED_LOOP.zh-CN.md)。报告用 [REPORT_TEMPLATE](REPORT_TEMPLATE.zh-CN.md)，每项写通过/需修正/未验证与具体证据、Drive 路径；最终用户体验判断留给用户，缺证据不能标通过。

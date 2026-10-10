# GenPet 文档索引

运行时的产品规则只有一个来源：[framework/prompts/meta.md](../framework/prompts/meta.md)。各单元提示词在 [framework/prompts](../framework/prompts/)，运行约定与宿主接入说明在 [framework/references](../framework/references/)。

## 开发从这里读起

| 文档 | 内容 |
| --- | --- |
| [开发计划](DEVELOPMENT_PLAN.zh-CN.md) | 各模块的目标、设计原则、用例和开发顺序（2026-10-11 确认，尚未开始开发）。产品目标以这份为准 |
| [测试用例](TEST_CASES.zh-CN.md) | 全部 82 条测试用例：领养、连续检查的模拟、单次检查的规则、真实画图的形象用例、对话、命令、诊断、Dots、多只宠物 |
| [领养旅程案例](ADOPTION_CASES.zh-CN.md) | 五个手写的领养旅程和结果示例 |
| [领养之后的内容案例](DAILY_CASES.zh-CN.md) | 六个手写示例：每次检查用户在桌面上和对话里看到什么 |
| [代码架构](ARCHITECTURE.zh-CN.md)（[English](ARCHITECTURE.md)） | 目标架构：三层结构、一次故事的流程、宿主接口、两个环境、源码地图与实现状态 |

## 工程和测试记录

| 文档 | 内容 |
| --- | --- |
| [工程设计与待决问题](ENGINEERING.zh-CN.md) | 测试里发现的问题和当时的背景、宿主接入、持久记录与宠物编号。每个问题现在的解决方向见开发计划 |
| [生成测试记录摘要](evidence/README.md) | 各轮生成单元测试的结论与状态（原始数据、图片与完整报告不入库） |
| [桌面端自动刷新模块](DESKTOP-REFRESH.zh-CN.md) | 刷新通道、结果字段、降级策略与待测清单（待在真实 Codex 上测试） |
| [原生 Pet 兼容格式](NATIVE-CONTRACT.md) | 桌面原生 Pet 的 V2 图集格式与核对方式 |
| [0.5.0 本地开发版验证](NEW_VERSION_VALIDATION.zh-CN.md) | 0.5.0 那一轮的验证入口和工程检查。安装脚本引用这个路径，所以留在原位 |

## 安装和研究背景

| 文档 | 内容 |
| --- | --- |
| [Agent 安装](AGENT_INSTALL.md) | 从已发布的 marketplace 安装或更新 |
| [研究基础](RESEARCH.md) | GenFaceUI 理论背景 |

开发与发布规则见 [CONTRIBUTING](../CONTRIBUTING.md) 和 [AGENTS.md](../AGENTS.md)。

## 调研和宿主实验

- [长期陪伴的体验调研](research/companion-experience/REPORT.zh-CN.md)（2026-10-07）
- [一次成长的耗时调查](research/growth-latency-20261005.md)（2026-10-05）
- [原生 Pet 的显示和隐藏](research/native-pet-visibility.md)（2026-10-05）
- [普通启动下的原生宠物刷新：IPC 实验](research/NATIVE_IPC_RESEARCH.zh-CN.md)（2026-09-27）
- [运行中切换 Codex Pet](research/native-pet-live-switch.md)（2026-09-28）

宿主实验对应的宿主版本见各文件开头；宿主升级后需重新核对。

## 归档（不再维护）

- [plan-2026-10](archive/plan-2026-10/EARLY_DRAFTS.zh-CN.md)：开发计划 2026-10-08 到 2026-10-10 的早期草案，已被开发计划取代。
- [v0.6](archive/v0.6/COMPANION_0_6.zh-CN.md)：0.6.0 命名、用户联系与性格那一轮的实现记录。
- [v0.5](archive/v0.5/PRODUCT_DESIGN.zh-CN.md)：0.5.0 时期的产品设计，围绕 Dots 版本来写；文件开头列出了已经改变的内容。
- [design-drafts](archive/design-drafts/)：0.5.0 开发早期的提示词草案，已并入 `framework/prompts` 并冻结。
- [v0.4](archive/v0.4/)：0.5.0 重构前的机制、方案、项目状态、验证与演示。其中的 `roundling` 家族、固定天数成长以及 `adopt`、`advance` 等命令已移除。

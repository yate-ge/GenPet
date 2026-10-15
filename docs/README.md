# GenPet 文档索引

运行时的产品规则只有一个来源：[plugins/genpet/skills/genpet/rules.md](../plugins/genpet/skills/genpet/rules.md)。各角色和它负责的单元提示词在 [designers/](../plugins/genpet/skills/genpet/designers/)，流程在 [flows/](../plugins/genpet/skills/genpet/flows/)，宿主接入与存储在 [host/](../plugins/genpet/skills/genpet/host/)。

## 开发从这里读起

| 文档 | 内容 |
| --- | --- |
| [开发计划](DEVELOPMENT_PLAN.zh-CN.md) | 各模块的目标、设计原则、用例和开发顺序（2026-10-11 确认）；实现与补测结果见下方摘要。产品目标以这份为准 |
| [测试用例](TEST_CASES.zh-CN.md) | 全部 82 条测试用例：领养、连续检查的模拟、单次检查的规则、真实画图的形象用例、对话、命令、诊断、Dots、多只宠物 |
| [领养旅程案例](ADOPTION_CASES.zh-CN.md) | 五个手写的领养旅程和结果示例 |
| [领养之后的内容案例](DAILY_CASES.zh-CN.md) | 六个手写示例：每次检查用户在桌面上和对话里看到什么 |
| [代码架构](ARCHITECTURE.zh-CN.md)（[English](ARCHITECTURE.md)） | 目标架构：三层结构、一次故事的流程、宿主接口、两个环境、源码地图与实现状态 |

## 工程和测试记录

| 文档 | 内容 |
| --- | --- |
| [工程设计与待决问题](ENGINEERING.zh-CN.md) | 测试里发现的问题和当时的背景、宿主接入、持久记录与宠物编号。每个问题现在的解决方向见开发计划 |
| [开发与验收摘要](evidence/README.md) | 当前缺陷修复、故事/形象补测、20分钟结果和未验收宿主范围；原始数据、图片与完整报告放 Google Drive |

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

过时的文档移进 `archive/<版本>/`，`docs/` 只放当前有效的文档。

- [v0.10](archive/v0.10/RELEASE-0.10.2.zh-CN.md)：0.10.2 的版本记录。
- [v0.9](archive/v0.9/DESKTOP-REFRESH.zh-CN.md)：0.9.3 时期的桌面端自动刷新模块记录；当前做法见 `plugins/genpet/skills/genpet/host/desktop.md`。
- [plan-2026-10](archive/plan-2026-10/EARLY_DRAFTS.zh-CN.md)：开发计划 2026-10-08 到 2026-10-10 的早期草案，已被开发计划取代。
- [v0.6](archive/v0.6/COMPANION_0_6.zh-CN.md)：0.6.0 命名、用户联系与性格那一轮的实现记录。
- [v0.5](archive/v0.5/PRODUCT_DESIGN.zh-CN.md)：0.5.0 时期的产品设计，围绕 Dots 版本来写；文件开头列出了已经改变的内容。同目录还有 [0.5.0 本地开发版验证](archive/v0.5/NEW_VERSION_VALIDATION.zh-CN.md)。
- [design-drafts](archive/design-drafts/)：0.5.0 开发早期的提示词草案，已并入当时的 `framework/prompts`（现在在 `plugins/genpet/skills/genpet/`）并冻结。
- [v0.4](archive/v0.4/)：0.5.0 重构前的机制、方案、项目状态、验证与演示，以及 2026-09-24 按当时宿主核对的 [原生 Pet 兼容格式](archive/v0.4/NATIVE-CONTRACT.md)。其中的 `roundling` 家族、固定天数成长以及 `adopt`、`advance` 等命令已移除。

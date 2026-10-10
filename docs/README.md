# GenPet 文档索引

运行时的产品规则只有一个来源：[framework/prompts/meta.md](../framework/prompts/meta.md)。各单元提示词在 [framework/prompts](../framework/prompts/)，运行约定与宿主接入说明在 [framework/references](../framework/references/)。

## 当前文档

| 文档 | 内容 |
| --- | --- |
| [代码架构](ARCHITECTURE.zh-CN.md)（[English](ARCHITECTURE.md)） | 目标架构（2026-10-10 确认）：三层结构、一次故事的流程、宿主接口、源码地图与实现状态 |
| [产品设计](PRODUCT_DESIGN.zh-CN.md) | 产品目标、基因、进化、新故事与输出范围 |
| [0.6.0 命名、用户联系与性格](COMPANION_0_6.zh-CN.md) | 提示词主导的实现、必要代码与验证边界 |
| [开发计划](DEVELOPMENT_PLAN.zh-CN.md) | 各模块的目标、设计原则、用例和开发顺序（2026-10-11 确认，尚未开始开发） |
| [领养旅程案例和测试用例](ADOPTION_CASES.zh-CN.md) | 五个手写的领养旅程和结果示例，领养的测试用例 A1 到 A10 |
| [领养之后的内容案例和测试用例](DAILY_CASES.zh-CN.md) | 手写示例和测试用例：每次检查用户看到什么，连续 20 次检查的模拟，单次检查的规则，真实画图的形象用例，对话、命令和诊断的用例 |
| [开发计划：早期讨论记录](DEVELOPMENT_PLAN_ARCHIVE.zh-CN.md) | 2026-10-08 到 2026-10-10 的讨论草案，已被开发计划取代，留作备查 |
| [工程设计与待决问题](ENGINEERING.zh-CN.md) | 待决问题状态表、宿主接入、持久记录与宠物编号 |
| [新版验证说明](NEW_VERSION_VALIDATION.zh-CN.md) | 用户验证入口、本轮工程检查与当前测试记录（安装脚本引用此路径） |
| [生成测试记录摘要](evidence/README.md) | 各轮生成单元测试的结论与状态（原始数据、图片与完整报告只保存在本地，不入库） |
| [Agent 安装](AGENT_INSTALL.md) | 从已发布的 marketplace 安装或更新 |
| [原生 Pet 兼容格式](NATIVE-CONTRACT.md) | 桌面原生 Pet 的 V2 图集格式与核对方式 |
| [桌面端自动刷新模块](DESKTOP-REFRESH.zh-CN.md) | 刷新通道、结果字段、降级策略与待测清单（待在真实 Codex 上测试） |
| [研究基础](RESEARCH.md) | GenFaceUI 理论背景 |

开发与发布规则见 [CONTRIBUTING](../CONTRIBUTING.md) 和 [AGENTS.md](../AGENTS.md)。

## 宿主实验记录

- [普通启动下的原生宠物刷新：IPC 实验](research/NATIVE_IPC_RESEARCH.zh-CN.md)（2026-09-27）
- [运行中切换 Codex Pet](research/native-pet-live-switch.md)（2026-09-28）

这些记录对应的宿主版本见各文件开头；宿主升级后需重新核对。

## 归档（不再维护）

- [v0.4](archive/v0.4/)：0.5.0 重构前的机制、方案、项目状态、验证与演示。其中的 `roundling` 家族、固定天数成长以及 `adopt`、`advance` 等命令已移除。
- [design-drafts](archive/design-drafts/)：0.5.0 开发早期的提示词草案，已并入 `framework/prompts` 并冻结。

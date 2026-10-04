# GenPet 文档索引

运行时的产品规则只有一个来源：[framework/prompts/meta.md](../framework/prompts/meta.md)。各单元提示词在 [framework/prompts](../framework/prompts/)，运行合同与宿主接入说明在 [framework/references](../framework/references/)。

## 当前文档

| 文档 | 内容 |
| --- | --- |
| [代码架构](ARCHITECTURE.md) | 三层结构、一次故事的流程、源码地图与扩展方式 |
| [产品设计](PRODUCT_DESIGN.zh-CN.md) | 产品目标、基因、进化、新故事与输出范围 |
| [0.6.0 命名、用户联系与性格](COMPANION_0_6.zh-CN.md) | 提示词主导的实现、必要代码与验证边界 |
| [工程设计与待决问题](ENGINEERING.zh-CN.md) | 待决问题状态表、宿主接入、持久记录与宠物编号 |
| [新版验证说明](NEW_VERSION_VALIDATION.zh-CN.md) | 用户验证入口、本轮工程检查与当前证据（安装脚本引用此路径） |
| [生成证据摘要](evidence/README.md) | 各轮生成单元测试的结论与状态、分享报告及证据归档 |
| [本轮完整故事与效果](evidence/2026-10-03-run1/README.zh-CN.md) | 89 页图文故事册、82 篇故事全文、350 个单元的结果与缺项 |
| [Agent 安装](AGENT_INSTALL.md) | 从已发布的 marketplace 安装或更新 |
| [原生 Pet 兼容合同](NATIVE-CONTRACT.md) | 桌面原生 Pet 的 V2 图集格式与核对方式 |
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

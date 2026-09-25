---
name: genpet-state
description: Change GenPet context props for explicit debugging, including /genpet-state; never control native task animations.
---

# 切换道具情境或恢复自动状态

这是插件附带的调试命令。只有用户本次要求执行该动作才调用变更工具；讨论如何开发或测试命令、定时维护、阅读文档都不是执行授权。

调用 genpet_debug_state(operationId, kind)。build/工具/扳手、research/书、create/画笔、learn/星星、rest/枕头、none/空手、auto/恢复自动。无参数默认在空手与画笔之间切换：先看 genpet_art_request.visual.prop，brush 切 none，其余切 create。这是视觉覆盖，不会插入用户活动证据；持续到 state auto 清除，随后恢复原有活动映射或冻结穿着设置。蛋期不加道具、不自行孵化。原生 idle/running/waiting/review 等动作仍由 Codex 控制。

为本次动作创建一个 UUID 作为 operationId。网络重试复用同一个 ID；素材生成失败后继续完成当前 art request，不要再重置或再次加龄。

随后执行共享的[素材生成和原生更新流程](../genpet/references/debug-completion.md)，不能只改变存档就结束。不要启动 subagent。

MCP 尚未加载时，从此技能目录向上两级找到插件根目录，使用 `node dist/cli.js debug-state`。参数格式见[调试说明](../../docs/DEBUG_COMMANDS.zh-CN.md)；传同一个 operationId 保持重试幂等。

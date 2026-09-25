---
name: genpet-reset
description: Reset the GenPet only when the user requests a new egg and a new adoption clock; also handles /genpet-reset.
---

# 重置宠物，重新生成蛋并开始成长

这是插件附带的调试命令。只有用户本次要求执行该动作才调用变更工具；讨论如何开发或测试命令、定时维护、阅读文档都不是执行授权。

调用 genpet_debug_reset(operationId)。不需要先删除旧素材、重新选择原生 Pet 或改自动任务。返回的 backup 是旧存档位置。此命令明确授权重新领养；不要再问一次是否确定。

为本次动作创建一个 UUID 作为 operationId。网络重试复用同一个 ID；素材生成失败后继续完成当前 art request，不要再重置或再次加龄。

随后执行共享的[素材生成和原生更新流程](../genpet/references/debug-completion.md)，不能只改变存档就结束。不要启动 subagent。

MCP 尚未加载时，从此技能目录向上两级找到插件根目录，使用 `node dist/cli.js debug-reset`。参数格式见[调试说明](../../docs/DEBUG_COMMANDS.zh-CN.md)；传同一个 operationId 保持重试幂等。

---
name: genpet-grow
description: Advance GenPet growth for an explicit debugging request, including /genpet-grow and stage or day targets.
---

# 加速孵化或成长，保持同一角色身份

这是插件附带的调试命令。只有用户本次要求执行该动作才调用变更工具；讨论如何开发或测试命令、定时维护、阅读文档都不是执行授权。

调用 genpet_debug_grow(operationId, target, days)。无参数 target=next：蛋直接孵化，出生后前进一个成长日。hatch=孵化，juvenile=第7日，adult=第21日（实际阈值以存档策略为准）；数字 N 表示再成长 N 日，1–90，传 days=N 且 target=next。不能倒退；已经达到目标就报告现状。蛋不能一步跨到成年：先完成出生形象，再执行新的成长请求。若缺少蛋或出生参考，先完成该阶段素材，再用原 operationId 重试一次。说明这是持久化的调试年龄偏移，真实领养时间不改，之后每天继续成长。

为本次动作创建一个 UUID 作为 operationId。网络重试复用同一个 ID；素材生成失败后继续完成当前 art request，不要再重置或再次加龄。

随后执行共享的[素材生成和原生更新流程](../genpet/references/debug-completion.md)，不能只改变存档就结束。不要启动 subagent。

MCP 尚未加载时，从此技能目录向上两级找到插件根目录，使用 `node dist/cli.js debug-grow`。参数格式见[调试说明](../../docs/DEBUG_COMMANDS.zh-CN.md)；传同一个 operationId 保持重试幂等。

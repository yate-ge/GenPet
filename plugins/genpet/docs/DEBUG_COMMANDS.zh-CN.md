# 0.5.0 命令

在斜杠菜单选择对应技能，或显式使用 `$genpet-start` 等名称。命令调用的对话内容遵循 `prompts/output.md`：只有宠物故事文本和真实图像，执行记录留在内部。

| 命令 | 行为 |
| --- | --- |
| `/genpet-start` | 没有宠物时初始化；已有宠物时继续同一个体和未完成任务，补全绑定与故事调度。 |
| `/genpet-story` | 先形成新故事，再决定状态、形象变化与图文表达；已有状态形象可以复用。 |
| `/genpet-grow` | 显式验证下一阶段或用户指定的后续阶段，沿用同一编号和基因，形成进化故事。 |
| `/genpet-reset` | 明确请求新宠物时备份旧记录，生成新编号与蛋，沿用原来绑定的宿主位置。 |
| `/genpet-switch` | 普通 Pet 的读取、列出与激活切换，不改变个体阶段或生成形象。 |
| `/genpet-debugger` | 明确请求时启动本地检查页；打开页面不会领养、进化或切换宠物。 |

`/genpet-state` 已被 `/genpet-story` 替换。成长不按天数推进，也不再接受增加日龄的参数；正常进化由 Agent 根据近期工作内容变化判断。`grow` 的依据明确记为用户请求的调试操作。

工程 CLI 与数据合同见 `references/workflow.md` 和 `references/storage.md`。同一调用使用稳定 trigger ID；生成失败继续已有计划和基因，不用 reset 重试。开发中的临时记录使用隔离的 `GENPET_DATA_DIR` 与 `CODEX_HOME`，不操作用户真实宠物。

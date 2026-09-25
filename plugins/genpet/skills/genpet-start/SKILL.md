---
name: genpet-start
description: Start or resume GenPet with /genpet-start. Adopts an egg only when no pet exists; otherwise checks and completes artwork, the native Pet and the growth schedule without resetting anything. Safe to run repeatedly.
---

# 开始或恢复 GenPet

这是面向用户的初始化命令，不是调试命令。可以重复运行：第一次运行完成领养和启用，之后运行只检查并补全缺失的部分。

参数：无参数 = 启用自动成长（默认）；`manual` = 不创建定时任务，只在用户要求时更新。

**绝不调用 `genpet_debug_reset`、`genpet_debug_grow`、`genpet_debug_state`，不改领养时间，不创建第二个原生 Pet。** 已有宠物时不要重新领养；用户想重新开始，请告诉他使用 `/genpet-reset`。不要启动 subagent。

## 步骤

1. **读取状态。** 调用 `genpet_status`。没有 pet 时调用 `genpet_adopt`，它会创建一颗新蛋并开始真实的五小时孵化计时；已有 pet 时跳过领养，保留原有身份、阶段和领养时间。
2. **补全图像。** 调用 `genpet_art_request`，按 [GenPet skill](../genpet/SKILL.md) 的 Generate or update artwork 流程处理：`pending` 时用内置 imagegen 和 bundled hatch-pet 生成、质检并 `genpet_accept_art`；`ready` 复用已验收图像；`paused` 表示用户关闭了自动生图，不擅自开启，报告暂停即可。
3. **安装原生 Pet。** 只要当前设计有已验收的图集，就调用 `genpet_install_native`，把它写入同一个 `genpet-companion`（重复安装同一设计是安全的）。只有 `displayStatus=confirmed` 才能说画面已更新；否则说明文件已写入、显示待确认。
4. **首次使用提示。** 如果 `~/.codex/pets/genpet-companion/` 是本次新建的，或 Codex 当前选中的不是 `custom:genpet-companion`，提醒用户在 Codex 的 Pets 设置里选中 GenPet 一次。
5. **定时成长。** 无参数时，按 [GenPet skill](../genpet/SKILL.md) 的 Periodic growth 规则，先检查已有的 GenPet 定时任务：已存在就保留，不重复创建；不存在就创建唯一一个每小时检查的原生线程心跳。`manual` 时不创建，并说明之后可以再次运行 `/genpet-start` 开启。
6. **报告。** 用几句话说明：这次是新领养还是恢复；当前阶段、成长天数和下一次变化的大致时间；图像状态（生成/复用/暂停/失败）；原生显示是否确认；定时任务是新建、已存在还是未开启。

生成失败时保留之前通过验证的图像，报告失败的行；重试只重新读取当前请求，不重新领养。

MCP 尚未加载时，从此技能目录向上两级找到插件根目录，使用 `node dist/cli.js status`、`adopt`、`art-request`、`install-native`。

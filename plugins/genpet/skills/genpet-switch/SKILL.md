---
name: genpet-switch
description: Read, list, or immediately switch the active Codex desktop Pet with /genpet-switch. Changes the selected Pet, while genpet-state changes GenPet's context props.
---

# 切换 Codex 当前宠物

从本技能目录向上两级找到插件根目录，在该目录运行 `node dist/cli.js switch-pet`。使用当前 Codex 本地会话提供的连接环境。

| 用户参数 | 执行 |
|---|---|
| 无参数、current、--current、当前 | 运行 `switch-pet --current` 和 `switch-pet --list`，简要显示当前选择及可选宠物；不切换 |
| list、--list、列表 | 运行 `switch-pet --list`，显示名称及 ID |
| Pet ID 或名称，例如 dewey、GenPet | 先用 `switch-pet --list` 解析目标，再运行 `switch-pet PET_ID` |

目标按完整 ID 或唯一名称匹配，名称可忽略大小写。`genpet` 对应已安装的 `custom:genpet-companion`。没有匹配或名称有歧义时列出候选，让用户指定目标。用户明确给出目标即授权切换，无需再次确认；创建命令、阅读文档或讨论方案时不执行切换。

成功时报告目标名称及无需重启；依据返回的 `hostStateConfirmed` 确认宿主选择，`visualVerified: false` 不代表已经观察悬浮窗画面。这个命令会持久保存桌面选择，不改变 GenPet 的成长、道具或素材，也不需要打开 debugger。

若连接失败、超时或读回不符，说明结果未确认并停止写入；可用 `--current` 重新读取，不自动重试切换或改写配置文件。缺少 `CODEX_APP_TOOLS_PIPE_PATH` / `CODEX_THREAD_ID` 时说明需要本地 Codex 桌面会话。Windows 已实测；macOS 的进程身份校验仍待实测。

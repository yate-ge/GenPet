# 原生自动刷新

## 当前实现：仅使用 IPC

2026-09-27，用户在调试网页确认普通启动下 IPC 刷新可行。CLI 的 `install-native` 已接入同一消息路径：

1. 验证当前设计的已验收图集，原子写入同一个 `genpet-companion`。
2. macOS 连接 `$CODEX_HOME/ipc/ipc.sock`（默认 `~/.codex/ipc/ipc.sock`）；Windows 连接本机命名管道 `\\.\pipe\codex-ipc`。
3. 握手后广播 `query-cache-invalidate`，查询键为 `['custom-avatars']`，覆盖列表与按 ID 的查询。
4. 用第二个临时客户端确认路由器转发，然后关闭连接。没有新服务器或常驻任务。
5. IPC 不可用时报告错误并保留 `refreshRequired=true`，供后续重试。

首次 `/genpet-start`、已有素材的恢复和后续换图都会调用安装与刷新。普通打开 Codex 即可，不要求启动参数、额外启动器或重启。首次使用仍可能需要在 Pets 中选择 GenPet 一次；刷新不替用户更改选中的宠物。

## 返回值

| 情况 | automaticRefresh | displayStatus | refreshRequired |
|---|---|---|---|
| IPC 通知已转发 | true | unconfirmed | false |
| IPC 失败 | false | unconfirmed | true |

IPC 的 `automaticRefresh=true` 表示已自动触发刷新请求，**不表示每次都测量了屏幕显示**。`refresh.ipc` 提供握手与转发证据，`refresh.refreshRequested=true` 明确表示请求已发送。技能应报告“已安装并自动请求刷新”，不应因未测量哈希而反复安装或要求开启调试端口。

## 兼容性与边界

这是经过实机测试的宿主内部协议，不是公开稳定 API。macOS 已验证宿主 `26.924.22138` / build `11645`；Windows 已在 `26.924.2738.0` 验证握手和路由器转发，尚未逐次核验屏幕显示。消息版本为 0，四字节小端长度加 JSON；Unix socket 连接前验证当前用户所有权和目录权限，Windows 使用桌面端的本机命名管道；客户端限制消息大小与总等待时间。宿主升级后需复验。

调试/隔离数据不触发真实宿主刷新。生产失败不伪造显示确认，不修改应用包，不安装 LaunchAgent，不重新领养或建立第二个 Pet。

刷新仅使用现有 IPC；失败后等待重试，不安装额外启动器或后台服务。

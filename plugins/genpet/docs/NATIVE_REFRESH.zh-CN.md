# 普通 Pet 的更新与刷新

`publish` 按持久保存的 Pet ID 与 Avatar 绑定，更新同一个原生条目。新个体默认使用自身编号作为目录；旧个体迁移时保留原来真实绑定。阶段、故事和状态变化不创建新条目。若目标正在使用，立即请求刷新；目标未激活时保持用户当前选择。

运行时验证当前素材，原子写入目标 manifest 和图集，然后使用桌面 IPC 的 `query-cache-invalidate`，查询键为 `['custom-avatars']`。macOS 使用 `$CODEX_HOME/ipc/ipc.sock`，Windows 使用本机命名管道。连接与等待有边界，不建立新服务器或常驻任务。实际激活状态通过当前宿主的 app-tools 通道读取。

执行结果绑定 `petId`、`operationId`、`appearanceId` 和 `avatarId`，记录 `updated`、`active`、`refreshRequested`、`displayStatus` 与实际取得的 evidence。缓存通知已转发表示已请求刷新；只有独立的显示证据才能使用 `displayStatus: confirmed`。没有显示证据时保存 `unconfirmed`，不把它写成已看到新形象。

宿主失败时保留未完成故事与已验收素材，继续更新同一目标。不得重新领养或切换当前 Pet 来掩盖刷新失败。隔离测试不会连接真实宿主；用户验证需分别核对目标激活与未激活时的结果。

该 IPC 是宿主内部接口，具体接入需随宿主版本核对。Dots 使用自己的 Avatar 自定义和刷新能力，参见 `references/dots.md`，不使用此路径。

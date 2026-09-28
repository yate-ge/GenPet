# 运行中切换 Codex Pet

2026-09-28，Windows Codex `26.924.2738.0`。

## 结论与实测范围

当前 Codex 会话提供的 **app-tools 管道可以直接修改运行中宿主的 Pet 选择，无需重启**。它调用宿主的设置服务，更新真正的 `selected-avatar-id`，无需替换其他宠物的图集。

真实宿主已完成 `custom:genpet-companion → dewey → custom:genpet-companion`。每一步的宿主设置、有效设置和磁盘设置均一致；实验结束后已恢复原选择。记录时间为 `2026-09-28T15:48:48.171Z`。

| 检查项 | 切换后 | 恢复后 |
|---|---|---|
| `settings.selected-avatar-id` | `dewey` | `custom:genpet-companion` |
| `effectiveSettings.selected-avatar-id` | `dewey` | `custom:genpet-companion` |
| `config.toml` 的 `desktop.selected-avatar-id` | `dewey` | `custom:genpet-companion` |

**已确认运行中宿主接受并应用选择；尚未独立观察悬浮窗图像。** `hostStateConfirmed` / `liveVerified` 只表示宿主设置已读回，`visualVerified` 仍为 `false`。

随后在重新构建的 debugger 页面中再次完成同一往返切换，页面显示的宿主当前选择先变为 Dewey，再恢复 GenPet。隔离页面另验证了写入失败时保留选择、演示模式隐藏真实控制。类型检查、65 项测试（另 1 项跳过）及打包后的启动检查通过。

本次没有重启 Codex、修改应用包或替换用户图集。实验实际修改过真实选择，并已恢复，不能再把整个调查描述为只读。

## 为什么原来的 IPC 请求失败

两条通道使用不同的路由与请求格式：

| 通道 | 寻址 | 请求形式 | 已确认的用途 |
|---|---|---|---|
| 桌面客户端协调 IPC | Windows 的 `\\.\pipe\codex-ipc` | `initialize`、`request`、`broadcast` | `query-cache-invalidate` 刷新素材查询；此前设置请求返回 `no-client-found` |
| 当前会话 app-tools IPC | `CODEX_APP_TOOLS_PIPE_PATH` 环境变量 | JSON-RPC `tools/call` | `codex_app.read_settings`、`codex_app.write_settings` |

之前把客户端协调管道当成了设置服务入口。那条管道没有相应处理器；这不能证明 app-tools 管道也无法调用设置服务。同样，工具未出现在当前模型的可用工具列表中，也不能单凭这一点判断其后端处理器不可调用。本次用真实调用确认了当前版本的行为。

## app-tools 协议

连接进程继承的 `CODEX_APP_TOOLS_PIPE_PATH`，使用当前 `CODEX_THREAD_ID`。不要硬编码另一个会话的管道路径或聊天 ID。

每帧为 **4 字节小端无符号 JSON 字节长度 + UTF-8 JSON**。此通道直接发送 `tools/call`，不发送协调管道的 `initialize`。

读取请求示意：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "namespace": "codex_app",
    "tool": "read_settings",
    "arguments": { "include_config": false },
    "callerSource": "codex",
    "threadId": "<CODEX_THREAD_ID>",
    "callId": "mcp-call-<UUID>",
    "turnId": "mcp-turn-<UUID>"
  }
}
```

切换时保留相同封装，将工具与参数改为：

```json
{
  "tool": "write_settings",
  "arguments": {
    "settings": { "selected-avatar-id": "dewey" }
  }
}
```

成功返回包含 `result.success: true`；从 `result.contentItems` 的 `type: "inputText"` 项解析 JSON，读取 `settings["selected-avatar-id"]` 与 `effectiveSettings["selected-avatar-id"]`。应只保留这两个 Pet 字段，避免记录无关应用设置。

写入后再次调用 `read_settings`，两个字段均等于目标 ID 才确认宿主选择成功。超时或连接中断时，先重新读取：请求可能已经应用，不能把没有回执等同于没有发生变化，也不能自动改用磁盘写入重试。

源码中的设置链路为：`settings-write → writeForAgent → SettingsStore.set → 内存更新与订阅通知 → config/batchWrite`。单独修改磁盘配置没有证明能触发这条运行时链路。

## 实现与限制

- [运行时适配器](../../src/native-pet-live.ts) 只封装两个设置工具，并只写 `selected-avatar-id`；[磁盘目录模块](../../src/native-pets.ts) 保留磁盘快照语义。
- 即时切换依赖当前会话的管道、聊天上下文和宿主处理器。外部终端、旧进程或不同宿主版本可能缺少这些条件，必须检测可用性。
- 这是内部接口，未发现公开兼容性承诺；后续宿主版本可能调整工具注册、校验、响应格式或通道生命周期。
- 有效设置读回不验证图集加载、宠物窗口可见性或屏幕最终像素。UI 必须区分“宿主已选中”与“画面已确认”。
- 本地清单与内置目录不包含完整云端 Pet 列表。目标是否出现在该目录，与宿主是否支持其 ID 是两个独立问题。

实机原始记录保存在忽略目录：`output/pet-switch-research/live-switch-result.json`；实验脚本为同目录的 `probe-live-switch.cjs`。实验脚本会改变真实选择，不应作为只读检查重复运行。

## 适用范围与 macOS（2026-09-29 补查）

- 当前 debugger 仅开放 Pet 选择，目标来自内置与本地清单。底层 app-tools 是桌面工具 RPC；设置写入仍要求键标记为 `agentAccess: read-write` 并通过值校验，并非任意内部状态均可修改。
- 需要运行中的本地桌面宿主、当前会话提供的连接地址和有效聊天上下文。普通 CLI、SSH 远端或云任务不能仅凭同一账户就获得该连接；应用重启后原连接地址也不能保证有效。
- 宿主源码包含跨平台传输：`main-DAwJoFgo.js` 的 `oce`（约 299414）在 Windows 使用命名管道，其他平台创建 UUID 命名的 `.sock`；app-tools `_ce`（约 302774）在非 Windows 对 socket 设置 `0600` 权限。随应用的 `codex-app-tools/0.1.5/server.mjs:25066` 使用 `net.createConnection(this.pipePath)`，协议封装未绑定 Windows。
- **macOS 有额外进程身份校验。** `_ce` 默认调用 `pu()`（约 301093）。该函数在 Darwin 加载 `native/browser-use-peer-authorization.node`，调用 `authorizeSocketPeer`。`bootstrap-D2PJMYEh.js` 的策略（约 11246、13148）对 Nightly、InternalAlpha、PublicBeta、Prod 启用此校验。因此不能仅凭 Unix socket 可连接就断言普通外部 Node 脚本可用。
- 本机没有 Mac 实机或该 native 校验模块的实现。只能确认本次 Windows 包包含 macOS 传输及校验分支，尚未确认 Mac 发布包、普通 Node 或宿主随附运行时的实际接受结果。Mac 兼容性应标为“待实测”，并保留通道不可用时的明确反馈。

Node 的 [IPC 文档](https://nodejs.org/api/net.html#ipc-support)也说明 `node:net` 在 Windows 使用命名管道，在其他系统使用 Unix domain socket；这只证明传输能力，不证明 Codex 的宿主授权会通过。

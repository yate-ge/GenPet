# Codex Mini / Pet 显示状态调查

2026-10-05，实机 Windows Codex `26.930.4958.0`。第一轮只读调查；第二轮通过客户端 UI 实际完成显示、隐藏、再显示，最终保持显示。没有切换 Pet、修改图集或重启应用。

## 结论

**已通过 Computer Use 的 `@oai/sky` 打通实际客户端 UI 控制和状态核验。** 设置中的「Mini & Pets」页面根据运行时状态显示 `Show mini` / `Hide mini`，可用这个按钮显示或隐藏窗口，结合截图核验实际浮窗。实机完成 `显示 → 隐藏 → 再显示`，小蛋已恢复显示。

当前会话提供的 app-tools 与桌面协调 IPC 仍未直接打通这些入口。不能用 `pet-visibility: always-visible` 判断窗口或宠物当前已经显示。

历史聊天「查找切换 Codex Pet 的代码方式」（`01a0e877-2ca0-7280-992a-9f0898266748`）在 2026-09-28 实测成功的是即时切换 `selected-avatar-id`。其 [研究记录](native-pet-live-switch.md) 明确没有验证宠物窗口可见性。检索相关历史记录没有发现 Show/Hide 已成功查询并控制的实测结果。

## 已验证的 UI 路径

1. 在当前 Codex 模式客户端主窗口打开命令菜单（实测 `Ctrl+Shift+P`），筛选 `Show Mini`，点击命令。小蛋浮窗实际出现。
2. 同一命令菜单筛选 `Mini & Pets`，打开设置页面。窗口显示时，右上按钮为 `Hide mini`；窗口隐藏时为 `Show mini`。
3. 点击 `Hide mini`，等页面和隐藏动画稳定后，截图确认按钮改成 `Show mini`；浮窗捕获不再出现。设置页中的宠物预览仍在，不能把预览当成桌面浮窗。
4. 点击 `Show mini`，截图确认按钮改回 `Hide mini`，设置页外的小蛋浮窗再次出现。

实测时间：`2026-10-05T10:53:49Z` 显示、`10:54:07Z` 隐藏、`10:54:32Z` 恢复显示。结果保存在 `output/pet-visibility-research/ui-roundtrip-result.json`。前后选择均为 `pet_6ac34cd611a481918fc40da68ff4972a`；结束后通过 app-tools `read_settings` 再确认两项选择读回一致。

操作使用当前 `sky.list_apps()` 返回的 `OpenAI.Codex_2p2nqsd0c76g0!App` 主窗口；此包的窗口标题和进程显示为 ChatGPT，侧栏模式为 Codex。每次根据新快照定位控件，不能固定窗口句柄或控件索引。命令菜单筛选后再点击，未筛选的命令项可能在可视区域之外。

两个实际限制：

- `sky.list_windows()` 没有列出独立的 Mini，但主窗口的 `get_window_state` 返回了包含实际小蛋的相关截图。不能将窗口列表里缺少 Mini 直接判为隐藏。
- 辅助功能树会短暂保留旧按钮名称：实测截图已变为 `Show mini`，树仍返回 `Hide mini`，反向也出现。因此标签、布局或显示切换后必须等待并观察新截图，不能只信一次树中的文字。不要在失败后盲目重复 toggle。

源码补证：`/webview/assets/pets-settings-route-3aa167a237fc.js` 约 `37738` 的 `$n()` 从窗口状态 atom 选择 `Hide mini` / `Show mini`，点击时发送 `avatar-overlay-open`。这是运行时窗口状态的界面表达，不是 `pet-visibility` 策略值。

## 三种状态

| 状态 | 客户端入口 | 含义与访问范围 |
|---|---|---|
| Mini 显示策略 | `pet-visibility`，`always-visible` / `on-demand` | 是否在点击别处后隐藏 Mini；app-tools 设置服务可读写，不代表当前窗口可见 |
| 宠物本体显示开关 | `avatar-overlay-pet-visible` | 是否在控制区上方显示宠物；定义为 `agentAccess: hidden`，不在 Agent 设置服务开放范围内 |
| Mini 窗口当前可见性 | `avatar-overlay-open-state-request` → `avatar-overlay-open-state-changed.isOpen` | 主进程检查窗口存在、未销毁且 `window.isVisible()`；仍不等于实际屏幕像素已观察 |

`electron-avatar-overlay-open` 是持久化的打开状态，不能替代运行时窗口查询。

## 当前包中的内部消息

只读检查本机 `app.asar`，没有修改或执行归档中的应用代码：

- 路径：`C:/Program Files/WindowsApps/OpenAI.Codex_26.930.4958.0_x64__2p2nqsd0c76g0/app/resources/app.asar`。
- `/webview/assets/app-shared-e20a5fe9db04.js`，字符位置约 `1999806`：上述两个设置的定义与 Agent 访问范围。
- `/.vite/build/main-B5_S2vFm.js`，字符位置约 `377478`：`isOpen()` 实现。
- 同一文件，字符位置约 `1400707`：窗口消息处理函数 `JL`。
- 同一文件，字符位置约 `2028094`：`handleMessage(webContents, message)` 将 `avatar-overlay-*` 消息送往 `JL`。

相关分支：

```js
case "avatar-overlay-open-state-request":
  reply({ type: "avatar-overlay-open-state-changed", isOpen: manager.isOpen() });
  return;
case "avatar-overlay-hide":
  manager.hide();
  return;
case "avatar-overlay-close":
  manager.dismiss();
  return;
case "avatar-overlay-open":
  await manager.toggle(webContents);
  return;
```

这里的 `avatar-overlay-open` 实际调用 **toggle**，不能盲发作为幂等的「显示」操作。`hide` 与 `dismiss` 也应保留各自语义。这些是窗口通讯消息，不是已经确认可以外部调用的 RPC 方法。

## 实测通道

1. 当前会话 app-tools 管道：`tools/list` 返回 56 个工具，没有发现 Mini / Pet Show/Hide 工具。`read_settings` 仍可实际调用，但返回的 Pet 字段没有本体显示开关或窗口可见性。工具列表的缺席本身不能证明其他后端处理器绝对不存在。
2. 桌面协调管道 `\\.\pipe\codex-ipc`：`initialize` 握手成功；随后以协调管道的 `request` 格式发送只读的 `avatar-overlay-open-state-request`，明确返回 `resultType: error`、`error: no-client-found`。
3. 当前可用工具没有提供直接访问上述客户端窗口消息层的入口。因此没有向未确认的通道发送显示/隐藏消息，也没有写磁盘状态冒充运行时控制。

忽略目录下保留只读探针和结果：`output/pet-visibility-research/probe-router.mjs`、`probe-router-result.json`。归档检查工具为 `output/pet-read-research/inspect-asar.cjs`；检查当前版本必须设置 `GENPET_ASAR`，其默认路径指向旧版。

## 直接 RPC 的后续方向

直接内部方案仍需要获得客户端窗口消息层的可调用桥接，查询运行时状态后再控制并读回；本次尚未找到可用的外部桥接。浏览器 `cua` 的原生应用 API 禁用，不代表独立 Computer Use 插件的 `@oai/sky` 不可用；后者已实际完成上述控制，不需要等待 RPC 方案。

在入口实际打通前，GenPet 应把「已选中 Pet」「显示策略」「窗口可见性」「宠物本体显示」分开表达，未知状态保留未知，不将 `always-visible` 展示为「当前已显示」。

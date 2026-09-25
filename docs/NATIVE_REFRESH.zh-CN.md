# 原生自动刷新：实现与验证

目标：新素材提交后，正在显示的同一个 `genpet-companion` 自动更新；用户无需手动点击 Refresh、重新选择宠物或改用另一个 Pet ID。

## 当前实现

`genpet_install_native` 原子提交清单与图集后调用 `src/native-refresh.ts`：

1. 连接 Codex 的本机 CDP 通道。
2. 在主窗口和悬浮宠物窗口里找到宿主的查询客户端，作废 `custom-avatars` 及其按 ID 的查询。这和设置里 Refresh 按钮调用的是同一次缓存失效，不点击任何控件。
3. 从浮动 Pet 的 `background-image` 读取实际显示素材。只有 SHA-256 与新提交图集一致时，才返回 `automaticRefresh: true` 和 `displayStatus: confirmed`。

当前宿主没有已验证的公开 Pet 热刷新 API，因此设置页可能短暂出现。CDP 只绑定本机；开启后，本机其他进程也可能控制 Codex。

## 调试通道边界

GenPet 不会为原 Codex App 安装启动监控器。此前试验过的 `KeepAlive` LaunchAgent 每 0.5 秒运行一次完整进程扫描，造成持续 CPU 占用和大量 fork；该方案已删除，并在安装时清理其遗留文件。

可选的 `~/Applications/ChatGPT CDP.app` 只是按需手动入口，不包含常驻进程。普通方式打开原 `/Applications/ChatGPT.app` 时，GenPet 不会强制重启或注入启动参数。

可用 `genpet_remove_cdp_launcher` 或 `node dist/cli.js remove-cdp-launcher` 移除手动入口，并清理旧版本可能留下的监控脚本和 LaunchAgent。

## 2026-09-25 实机验收

在同一个 `custom:genpet-companion` 上完成了两次无人点击的显示切换：

- 奶油图 `4b55d877…` → 紫色测试图 `0a9b4acd…`
- 紫色测试图 `0a9b4acd…` → 正式奶油图 `4b55d877…`

两次均返回 `automaticRefresh: true`、`displayStatus: confirmed`，`strategy: cdp-settings-refresh`。最终清单已恢复到正式奶油图。这证明有可用 CDP 通道时显示刷新链路有效，不代表需要或应当常驻扫描进程。

2026-09-25 实机：替换 `pet.json` 不会让运行中的 Codex 自己换图。从页面表面找不到查询客户端。沿着 React 纤维找到查询客户端后，作废 `custom-avatars` 会让悬浮窗重读文件。同一轮里显示从空手图 `f57f727c…` 换成扳手图 `0fae5c53…`，再作废一次后又回到空手图，两次都没有点击设置。

## 验收边界

文件写入成功不等于显示成功；只有浮动窗口的实际素材摘要匹配才算完成。如果调试通道不可用、Refresh 没有触发或摘要不匹配，结果必须保持 `unconfirmed`，并继续显示上一份已批准素材。

图像生成仍由 Codex 技能运行完成。Node 进程不能自行调用 imagegen。

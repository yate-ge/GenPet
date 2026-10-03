# 普通启动下的原生宠物刷新：IPC 实验

日期：2026-09-27。宿主：ChatGPT/Codex `26.924.22138`，build `11645`，bundle ID `com.openai.codex`。

## 结论与验收边界

发现并实测了普通启动下已存在的本地 IPC 通道。无需调试端口、重启、后台监控或修改应用包，即可向宿主广播 `custom-avatars` 查询缓存失效消息。

已验证连接握手、路由器转发，以及宿主代码中从广播到前端 `invalidateQueries` 的调用路径。**后续用户已在调试网页确认 IPC 可行（2026-09-27），生产插件现已接入。** 以下协议层记录不代表逐次显示哈希核验。消息转发成功不等于窗口已经处理，也不等于显示哈希匹配。Computer Use 工具禁止读取 Codex 自身界面；本次没有通过其他截图或 UI 操作渠道绕过限制，已请求用户观察。

这是一条内部协议，未发现公开稳定接口承诺。生产适配器现将 IPC 请求转发成功记录为 `automaticRefresh=true`，但仍不将 IPC 广播标记为 `displayStatus=confirmed`。

## 只读源码证据

从已安装 app.asar 读取相关文件进行静态检查，没有 import 或执行宿主模块。

1. `application-network-startup-CY4ZWOz-.js`：IPC 地址为 Codex home 下 `ipc/ipc.sock`；数据帧为四字节小端 JSON 字节长度加 UTF-8 JSON。目录/套接字归当前用户所有。
2. `src-BSSLXJxP.js`：`initialize` 请求注册客户端并返回 `clientId`；路由器转发 `broadcast`，并使用注册的来源 ID。`targetClientIds` 可限制接收者。
3. `src-B5IOaahd.js`：未单独列版本的方法默认版本为 `0`；`query-cache-invalidate` 属于此类。
4. `main-C5425b_s.js`：为窗口注册 IPC 客户端，并在窗口服务就绪时注册广播转发处理器。
5. `src-BSSLXJxP.js`：版本匹配后把 `query-cache-invalidate` 交给窗口的 `invalidateQueryCache` 服务。
6. `app-shared-36eae88777f2.js`：窗口服务将该消息发布到前端事件处理器。
7. `app-initial-d817715f10a0.js`：前端处理器对 `params.queryKey` 调用 `invalidateQueries`；`reset=true` 才调用 `resetQueries`。宠物查询键为 `['custom-avatars']` 和 `['custom-avatars', 'by-id', petId]`，前缀失效覆盖两者。

用于核对宿主版本的 SHA-256：

| 文件 | SHA-256 |
|---|---|
| main-C5425b_s.js | 91a68c5f690e60033152a34cf0bf5c4234caeb9ddb47586fd3ef5b017bb29d64 |
| src-BSSLXJxP.js | 50c7cf9c144594cfa6f33298e977f0b144976cc70c579f59fdc7242615c4af98 |
| src-B5IOaahd.js | be3b75407b3950e98a975585e275903bfa72e167fa153bd170945717996ea53a |
| application-network-startup-CY4ZWOz-.js | 7936a5b6373be818c7cce78cad7c18e4e156c8400d3b16f5b440d2626a1cc661 |

## 实机测试

当时使用的实验脚本 `probe-native-ipc.mjs` 已删除，其逻辑已进入 `src/hosts/desktop/refresh.ts`。实验仅使用 Node 标准库，当前用户权限，不启动新服务器，不读写宠物素材或状态，不记录其他 IPC 广播内容。

- `probe`：建立两个临时客户端，握手后发送仅面向测试接收者的广播，确认分帧、初始化、版本和路由链路。不会向宿主窗口发送刷新。
- `refresh`：发送 `query-cache-invalidate`，参数为 `{"queryKey":["custom-avatars"],"reset":false}`。第二个测试连接确认路由器转发，不能代表窗口回执。
- 两种模式均成功：`handshakeConfirmed=true`、`relayConfirmed=true`。
- `refresh` 返回 `hostRefreshRequested=true`，仍保留 `displayStatus=unconfirmed`。
- 测试前后宿主 PID 均为 `2113`，命令为 `/Applications/ChatGPT.app/Contents/MacOS/ChatGPT`，无调试端口参数；进程没有 TCP 监听端口。
- 当前清单仍指向 `spritesheet-50f666f1c27a4282.webp`。没有替换宠物、重置领养、加龄、重新生成图像或安装 LaunchAgent。

## 后续实机验收

1. 在用户能观察悬浮宠物时，选择两张已有验收记录、外观可辨别的同一宠物图集，备份当前清单。
2. 原子切换清单后先不发送消息，观察文件替换是否自行触发更新。
3. 发送 IPC 刷新，由用户确认同一宠物的可见变化；再恢复原清单并发送刷新，确认恢复。
4. 下一次普通冷启动后重复，以排除当前窗口偶然具备额外条件。
5. 生产接入仅使用 IPC；区分“请求已发送”和“显示已确认”。

仅当视觉切换与恢复通过，才能将这条实验路线描述为已验证的无感刷新。完整产品还需处理宿主版本变化、IPC 尚未就绪、窗口尚未注册和宠物未显示等情况。

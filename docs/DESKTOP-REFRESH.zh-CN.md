# 桌面端自动刷新模块（记录，待测试）

记录日期：2026-10-04。代码版本 0.9.3（未发布）。本文只描述现状和待测清单，**尚未在真实 Codex 桌面端做过端到端验证**；2026-09-27 的 [IPC 实验](research/NATIVE_IPC_RESEARCH.zh-CN.md) 与 [切换实验](research/native-pet-live-switch.md) 对应的宿主版本见各文件开头，宿主升级后需重新核对。

## 作用

宠物外观变化（进化、特殊形态、穿戴变体、复用旧形象）后，更新 Codex 桌面端该宠物的原生条目，并在该宠物当前正被显示时让界面立刻重新加载。约定行为见 AGENTS.md：按唯一 ID 更新目标，目标处于活动状态时立即刷新。

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `src/hosts/desktop/publish.ts` | `publish` 命令：写入条目、绑定、读取选中状态、请求刷新、记录宿主结果；`desktopLabel` 生成 Codex 里显示的名字（`genpet-` 加唯一 ID 前 6 位） |
| `src/hosts/desktop/refresh.ts` | 通道一：IPC 缓存失效广播（`refreshViaIpc`、`refreshNativePet`、`isLiveDestination`） |
| `src/hosts/desktop/switch.ts` | 通道二：app-tools 读取当前选中的宠物（`readSelectedPet`）；`switch-pet` 切换；`listPets` |
| `src/hosts/desktop/frames.ts` | 两个通道共用的 4 字节小端长度前缀 JSON 帧 |
| `src/hosts/result.ts` | 校验并保存宿主结果 `HostResult` |
| `src/lifecycle.ts` | `hostUpdateComplete`：判断宿主更新是否足以让故事完成 |

## 一次 `publish` 的流程

1. 取该故事要显示的图集（`desiredAppearance`，必须是已通过校验的 atlas）。
2. 写入 `CODEX_HOME/pets/genpet-<完整ID>/`：新的 `spritesheet-<哈希>.png`、`pet.json`（`displayName` 为短 ID）、旧清单备份到 `previous-pet.json`。条目归属不是本宠物（`genpetId` 不符）时拒绝并保留。
3. 记录绑定 `custom:<目录名>`。
4. **通道二读取选中状态**：用 `CODEX_APP_TOOLS_PIPE_PATH` 与 `CODEX_THREAD_ID` 连接 Codex 的 app-tools，调用 `read_settings`，比较 `selected-avatar-id`。得到 `active` 为 true、false 或 null（读不到）。
5. **通道一请求刷新**：连两个短连接客户端到 `$CODEX_HOME/ipc/ipc.sock`（Windows 为命名管道 `codex-ipc`）。观察者收到发送者广播的 `query-cache-invalidate`（`queryKey: ['custom-avatars']`）才算送达。socket 必须属于当前用户且所在目录不可被他人写。
6. 判定是否必须送达：`active === true`，或 `active === null` 且目标是真实 CODEX_HOME 下的 `genpet-*` 条目（环境变量 `GENPET_SKIP_NATIVE_REFRESH=1` 可关闭，仅测试用）。
7. 保存 `HostResult` 到待完成的故事。

## 宿主结果字段（`HostResult`）

| 字段 | 含义 |
| --- | --- |
| `updated` | 文件已写入 |
| `active` | 该宠物当前是否被选中：true / false / null（未知） |
| `refreshRequested` | 刷新请求已被路由器转发（只说明送达，不说明界面已变） |
| `displayStatus` | 只有有证据时才是 `confirmed`；IPC 路径永远是 `unconfirmed`，因为没有测量界面里的精灵图哈希 |
| `refreshUnavailable` + `notice` | **本轮新增**：必须刷新但通道不可用（应用没开、通道缺失或协议变化）。文件已写入，下次 Codex 加载宠物时生效 |
| `error` | 更新失败，故事不能完成 |

故事能否完成（`hostUpdateComplete`）：`updated` 且无 `error`，并且满足其一：`active === false`、`refreshRequested`、`refreshUnavailable`、`displayStatus === confirmed`。

## 降级策略（本轮决定）

刷新无法送达时，**完成故事并如实标记未确认**，不再让故事永久卡在未完成。此前的做法是给结果写 `error`，故事一直等到刷新成功，在没有该通道的 Codex 版本上会永远卡住。完成后：

- 不向用户声称界面已刷新；用户可见输出不提技术细节。
- Agent 在 `finish-story` 之前可以再执行一次 `publish`（幂等，同一文件同一哈希），用于应用刚好在启动的情况。
- Dots 的 Agent 也可以在自己的结果里设置 `refreshUnavailable` 并附 `notice`。

## 已知未验证 / 假设

- 两个通道都是 Codex 桌面端的**内部接口，没有公开保证**：IPC 方法名、`custom-avatars` 查询键、app-tools 的 `codex_app` 命名空间与 `selected-avatar-id` 设置名都可能随版本变化。
- 内置宠物目录写死，核对于桌面端 26.924.2738.0，不含账号相关的云端宠物。
- 现有自动化测试用伪造的 socket 与管道（`tests/desktop-ipc.test.ts`、`tests/desktop-refresh.test.ts`、`tests/art.test.ts`），覆盖协议逻辑、安全检查和降级，不能代替真实应用。
- 界面是否真的重新渲染，没有任何自动化手段测量；只有人工观察。

## 待测清单（真实 Codex 桌面端）

测试前注意：IPC 的 socket 在真实的 `CODEX_HOME` 下，隔离 `CODEX_HOME` 就连不上应用，所以这组测试会在你真实的 `~/.codex/pets/` 里创建一个 `genpet-…` 条目。请用单独的数据目录和一只测试宠物，结束后删除该条目，**不要对你正在用的宠物做测试**。

建议准备：`GENPET_DATA_DIR` 指向临时目录；`CODEX_HOME` 保持真实；用 `node plugins/genpet/dist/cli.js` 执行命令；记录每个用例的 `publish` 输出。

| # | 场景 | 期望 |
| --- | --- | --- |
| 1 | 测试宠物是当前选中的宠物，应用在前台，执行 `publish` | `active: true`；`refreshRequested: true`；`displayStatus: unconfirmed`；界面立即换成新图（人工观察，并截图） |
| 2 | 选中另一个宠物（如 dewey），对测试宠物执行 `publish` | `active: false`；不改变当前选中；之后切换到测试宠物时显示新图 |
| 3 | 完全退出 Codex 应用，执行 `publish` | `active: null`；`refreshUnavailable: true` 且有 `notice`；故事可完成；重启后显示新图 |
| 4 | 在 Codex 之外的终端里执行（没有 `CODEX_APP_TOOLS_PIPE_PATH`、`CODEX_THREAD_ID`） | `active: null`；若 IPC 通，仍请求刷新并成功；否则同用例 3 |
| 5 | 先在应用关闭时 `publish`，再打开应用后重试 | 重试后 `refreshRequested: true` 且无 `refreshUnavailable`；旧的 `spritesheet-*` 文件不会被清理（已知现象，不是失败） |
| 6 | 连续两次相同外观 `publish` | 同一文件，不产生新的图集文件，结果一致 |
| 7 | 起名后（`name-pet`）再 `publish` | `pet.json` 的 `displayName` 仍是 `genpet-` 加 6 位，不随名字变化 |
| 8 | `switch-pet --list`、`--current`、切换到测试宠物 | 列表含测试条目；`--current` 返回选中的 ID；切换立即生效 |
| 9 | 把 `ipc/ipc.sock` 所在目录权限改成他人可写（仅测试） | 拒绝连接，`errors` 含 `protected directory`，不广播 |

每个用例记录：Codex 应用版本、`codex --version`、操作系统、命令输出、界面截图或描述。结果写入 `docs/evidence/` 的新一轮目录，不改写这份文档的"期望"列。

## 回滚

删除测试条目 `~/.codex/pets/genpet-<测试ID>/` 与临时数据目录即可；`publish` 不会修改用户的选中宠物，也不会写 Codex 配置文件。

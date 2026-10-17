# GenPet 工程设计与待决问题

产品目标和各模块的设计原则见 [开发计划](DEVELOPMENT_PLAN.zh-CN.md)，运行规则见 [rules.md](../plugins/genpet/skills/genpet/rules.md)。本文记录测试里发现的工程问题现在的状态；每个问题的解决方向以开发计划为准，测试结果见 [开发与验收摘要](evidence/README.md)。

## 待决问题状态

状态更新时修改此表。各问题当时的背景和早期设计说明已移到 [归档](archive/v0.10/ENGINEERING-BACKGROUND.zh-CN.md)。2026-10-15 按代码和证据索引核对过一遍。

| 问题 | 状态 | 依据与下一步 |
| --- | --- | --- |
| 普通 Pet 按唯一编号更新与即时刷新 | 已实现，同 ID 更新已实测 | [hosts/desktop/publish.ts](../src/hosts/desktop/publish.ts)、[refresh.ts](../src/hosts/desktop/refresh.ts)、[hosts/cloud.ts](../src/hosts/cloud.ts)。迁移映射、同 ID 云端更新、下载 RGBA 回读一致；桌面实际显示仍不能由接口确认，见 [证据索引](evidence/README.md)「仍需宿主证据」。 |
| Dots Avatar 的绑定、更新、激活读取与刷新 | 方向已改，Dots 专用代码已移除 | 同一只宠物靠 cloud ID 同步，简介由 `companion-brief` 同步并回读。Dots 新会话、跨环境与主动联动未验收；主环境移交 2026-10-15 暂时收起。见 [开发计划「Dots 联动」](DEVELOPMENT_PLAN.zh-CN.md#dots-联动)。 |
| Dots 端持久记录的位置与生命周期 | 随 Dots 联动重新设计 | 见 [开发计划「Dots 联动」](DEVELOPMENT_PLAN.zh-CN.md#dots-联动) 的 D9。 |
| Dots 主动工作与四个默认时刻 | 已被取代 | 现在是电脑开着时每 5 小时检查一次；Dots 的主动行为留到 Dots 联动的第三阶段，见 [开发计划](DEVELOPMENT_PLAN.zh-CN.md#dots-联动)。 |
| 各宿主可用的用户资料 | 读取已实现，定时运行里能读到多少待实测 | 优先用 Codex 已整理的用户记忆，每次故事另读最近会话。定时任务里的读取见测试计划 R1b。 |
| 用户资料的实际获取流程 | 已实现 | [context/README.md](../plugins/genpet/skills/genpet/context/README.md) 和 context 单元：先读记忆与最近会话，读到够就停，只存一句观察。 |
| 斜杠命令端到端 | 已实现，实际路由待验收 | 主入口和 chat、story、grow、start、stop、reset、switch、debugger 各命令已有；用例 C1、C2、E1 到 E5 未在真实菜单里跑完。 |
| 斜杠入口重复 | 来源未核实，待验收 | 单一插件包，内部五个角色文档不增加菜单入口；真实菜单里是否只剩一组入口还没在隔离 `CODEX_HOME` 里看过。见 [开发计划「命令入口」](DEVELOPMENT_PLAN.zh-CN.md#命令入口) 和下文。 |
| 定时任务文案与机制分离 | 已写入提示，待真实运行验证 | [flows/scheduling.md](../plugins/genpet/skills/genpet/flows/scheduling.md)：任务名称与可见说明只写用途，执行步骤在后台说明。 |
| 对话里的过程文字 | 来源已查清，已改提示，待实测 | 2026-10-15 查本机 Codex 会话记录：「我会用 genpet-switch 技能……」「I'm using the GenPet debugger skill……」都是 Agent 运行时自己发的 `commentary` 消息，不是任务提示词写出来的。[output.md](../plugins/genpet/skills/genpet/output.md)「文字边界」规定运行中不发中间消息，主 skill 开头先说这一条。 |
| 定时任务所在对话的名称 | 已接入宿主工具，待实测 | Codex 桌面 App 有 `set_thread_title`（省略 `threadId` 时改调用它的对话）。scheduling.md 规定只给定时任务所在的对话设成 GenPet；宿主自动改名后能否保持，待真实运行验证。 |
| 无新用户经历时的定时表达 | 已实现 | 去掉了缺少新资料就取消的分支；每次按观察到的情境形成内容，纯文字最多连续两次。见 [flows/scheduling.md](../plugins/genpet/skills/genpet/flows/scheduling.md)「每次运行」。 |
| 同一图片重复展示 | 已写入提示，待实测 | 画图交给 subagent，output 只引用实际采用的图，工具已显示过的图不再嵌入。subagent 里自动展示的图是否进入主对话，待实测。 |
| 领养意义与用户关联 | 已实现 | 领养是用户做选择的旅程，基因对应用户特质；六组设计和完整幼年图用户认可整体方向。 |
| 生成效果 | 0.10.x 样本通过，未全验收 | 改为卡通像素和幼态后，V1 到 V4 有实际云端存图；B 幼年旅行装、D 少年维修工完整新形象通过。见 [证据索引](evidence/README.md)。 |
| 持久记录、继续未完成的故事与防止重复执行 | 已实现，工程测试覆盖 | `npm run verify:fast` 的工程单元测试；跨宿主实际运行仍随上面各项验证。 |
| 已存在的重复条目 | 已决定 | 不自动删除，只按已持久保存的绑定操作目标。 |


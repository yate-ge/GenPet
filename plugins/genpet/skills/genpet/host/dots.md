# 同一只 Pet 在 Dots

Dots 是共享 cloud ID 的第二个环境，使用同一份已接受云图和这只 Pet 的简介。没有独立 genpet-dots 包、单独 Avatar 生成格式、bind-avatar 或旧 host-request 路线；旧 dots 记录不自动读取。产品规则见 ../rules.md「性格与对话」。

## 先检查实际能力

通过当前宿主工具检查已有 Pet ID、description 可读写性、更新 API、资源刷新、选中与显示状态，以及长期指令/记忆/插件的真实加载方式，保存调用和回读；接口不存在或显示不能确认就记录未知。不要只凭说明或本地协议宣称 Dots 已运行，不用 Computer Use。

桌面完成故事后，代码从名字与 soul、memory、state 摘出短简介。首先试用宿主 API 给同一 cloud Pet 更新 description，回读文字和长度，再在新 Dots 会话核验能否读到最新版本。若 description 不同步，用宿主已经支持的共享位置或连到桌面读取实际目录；选择有可读、可回读证据的途径，不复制为另一只 Pet。

实际 Pets connector 的 description 上限为 500 字符。`companion-brief` 提供完整 sourceBrief 与当前 Pet ID/revision；源码摘出的文字太长时不截断、不直接上传。Agent 根据原记录写简短摘要，包含名字、soul/说话习惯、共同 memory 和当前 state，保存 `{petId, revision, description}` 到文件，经源文核对后 `companion-brief ABS_DRAFT_JSON` 检查身份、版本和长度，再用返回的同一 cloud ID 同步并回读。旧 revision 的摘要不能继续发送。

用户在 Dots 选择这一个 cloud ID 后保留它，桌面换图仍更新原 ID。读回 selection 不等于看到最新图；图回读、刷新与实际显示分开记录。

## 持续说话风格

将实测能够持续加载的简介绑定到 Dots 的长期指令/记忆或已支持插件机制，引用具体 Pet/cloud ID，说明只作用于对用户的话。没有持久加载机制时，不能把一次对话设定说成永久生效。

蛋阶段 Dots 原来的语气不变；幼年回复开头或结尾加自己的一个短拟声词；少年/成年由 soul 性格、memory 的相处与 state 决定语气。代码、文档、提交说明和替用户发出的消息不带宠物语气；工作能力照常。

安装先走 Dots 真实支持的途径。如果插件目录只读/市场搜不到，使用已验证的简介和长期指令，不声称插件安装成功。一次设置后是否自动生效，要在新会话里确认后才能说。

## 主环境

默认桌面写故事，Dots 消费已完成内容。把一只 Pet 的完整记录从一端移交到另一端，还没有在真实宿主上验证过，现已暂时收起，不提供导出或导入命令。用户要求切换主环境时如实说明这一点；不手工搬运记录，也不在两边同时写故事。

Dots 当主环境，用 `--host cloud --pet PET_ID set-appearance` 的请求清单给已有 pet_ ID 更新实际接受的 atlas；绑定缺失时确认同一 Pet 的云 ID 再 bind-cloud。目标 active 时请求即时资源刷新，active 读不到时尝试当前宿主实际支持的刷新，并保留未知；没有接口不能编造成功。保存真实 readbackFile 后 `host-result OPERATION_ID RESULT_FILE`，匹配后完成。失败保留 pending；可由桌面代上传同一目标图，但上传未发生前不能说自动生效。不得新建第二个云 Pet 或退回旧 Avatar 路线。

## 两边的内容与资料

完成故事以 Pet ID、story ID、revision 消费，Dots 读取最新简介及最近已完成故事；同一个故事不主动重复转述。Dots 实际记录的用户活动作为带来源的 context 项，过滤敏感内容，愿望不改成已完成；不要从它的回复反推用户事实。

主动消息只有宿主与用户已授权时使用已有主动机制，语气按当前阶段与 memory；不另建 GenPet 故事任务，也不自动给他人发送消息。主环境只写一次，另一端只展示已完成故事/简介。本地文件证明不了持续生效与主动联动。

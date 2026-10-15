# 主流程

运行时输出与结果文件供内部使用。产品规则读 ../prompts/meta.md，可见输出读 ../prompts/output.md，具体 Designer 由主 skill 按需加载，单元格式见 generation-units.md。

从已安装的 skill 目录解析插件根目录（skills/COMMAND 向上两层），执行 `node ROOT/dist/cli.js COMMAND ...`。不用开发仓库或其他安装的运行时。JSON 参数保存到绝对路径文件，shell 参数按当前 shell 正确引用。

可用的全局参数是 `--host desktop|cloud` 和 `--pet PET_ID`。一篇故事确定目标后每次调用加 `--pet PET_ID`；即使中途宿主改选，art-request、accept-art、set-appearance 仍读原来的目录。带 operation ID 的命令也会按原故事路由。

## 找到这一只

先 `status`、`diagnose`，只读查看记录、绑定、当前选中项和迁移映射。用户选中的 custom: 与映射 pet_ ID 是同一只，通过唯一 ID 找到记录。选中非 GenPet 或读不到选择时沿用上次激活记录，保留用户选择，实际结果写明未读到/未匹配。命令的内部结果带目标 Pet ID。

故事开始时记录 Pet ID，之后所有步骤按这个 ID，用户中途改选也完成原故事。其他 Pet 的目录和 cloud ID 不受影响，未激活期限暂停。初始化、导入、替换和新增见主 skill 与 storage.md，故障见 desktop.md。

已有 pending 先确认是否仍在执行并续接它，不重抽种子、不重画已完成的图；活跃并发作业只观察和等待。完成的 trigger 不再发一遍内容。没有 Pet 的定时或对话请求不能自动领养。

## 领养

先完成环境检查和用户选择，再给首次资料说明，明确同意后才读取或分配旅程。使用稳定触发 ID（manual:UUID），`begin-story TRIGGER_ID` 返回 operation、Pet ID、journey 与要求。按 ../prompts/initialization.md 和 GeneDesigner 完成逐轮旅程与设计；先用不带 userInput 的 journey-step 保存待答场景和选项，收到真实选择后再保存该轮，结束时 complete 为 true。只展示选项不计一轮，用户离开后从原待答场景继续。

没有明确选择不替用户回答。中断继续保存步骤。已经在养时 start 恢复现有 Pet 与任务；reset 的明确替换确认让新身份接手原 Pet 条目/cloud ID，新养一只另建。重试同一 operation。

## 每次故事

1. 读取 status；定时触发先 `due`，用返回的 triggerId。完成的触发直接复用结果，没到期保持安静。新 `begin-story` 返回 growth、time 与目标；另取 `recent-content [COUNT]`。明确强行成长使用 `begin-story TRIGGER_ID --grow`，只写在 reason 中不会启用 runtime 的强行成长权限；稳定 ID 重试不重复分配。
2. 按 user-context.md 真正读取并运行 context。StoryDesigner 先形成几个有依据、差别明显的候选，含至少一个可见结果，`random-choice OPERATION_ID CANDIDATES_JSON [SEED]`（purpose: story）保存并选定；recentContent 用来加权，重试沿用。
3. story → evolution，已有 soul 原样读取。旧记录只补缺项一次。需要形象时 appearance，需要家的变化时 home，物件时 story-item。每个结果保存 record-step 并交给下游；memory 值得记才重写。
4. 将结果合成 StoryPlan，reason/contextRefs 写清采用的真实依据；计划保存 `plan-story OPERATION_ID PLAN_FILE` 后保持不变。纯文字是否成立由实际计划/素材确定，最多连续两次；每次正常检查有内容，不因「没有新事实」取消。
5. `art-request` 返回请求 `.id`、`.savedArt` 与宿主格式 `.contract`；`.id` 用作 `pipeline-prepare` 的 `requestId` 和 `accept-art REQUEST_ID ABSOLUTE_FILE KIND SOURCE [DESCRIPTION]` 的第一个参数。复用指定 reuseArtId；新素材交 PetDesigner/图像子代理，ImageReviewer 看真实图；source 写实际生成/来源记录，portrait、atlas、story、artifact 各按用途。
6. 形象变化时按 desktop.md 或 dots.md 更新同一个绑定 cloud ID，上传、刷新与回读分别记录。未上传的云图保留 pending，不能说下次加载会自动生效；已回读一致但刷新不可用可记录该事实，实际显示未证实仍未知。无形象变化不需要 Pet 上传。
7. `finish-story OPERATION_ID` 原子提交 memory、state、历史和完成 trigger；有形象变化时由完成回读的图像协调者紧接着执行这一步和简介，不先回报主 Agent。取 `companion-brief`，按当前 revision 和真实 cloud ID 更新简介并回读。完整摘文超出宿主 500 字符上限时，按 dots.md 由 Agent 摘要后再校验，不截断字段。简介同步失败保留证据，重试最新简介，不重新完成故事或改写经历。再取 `story-output STORY_ID`，运行 output 并保存结果，只呈现实际采用媒体。必要时处理一次孵化命名邀请，见 naming.md。

## 图像与失败续接

基准图通过后并行动作与方向任务，代码完成提取、统一尺寸、透明与组装；新换装整套一致。两次视觉检查和返工上限见 desktop.md。图像任务和独立审核交子代理，保留全部产物，生成图保存工具提供的原 PNG 与路径。主对话只展示采用的最终图；子代理媒体隔离是否可靠由宿主实测，未经实测不作保证。

整套图交给一个图像协调子代理，提供实际Pet/cloud ID、operation、request和目录。每次交接都有等待成本，协调者连续推进，只在需要用户或主 Agent 决定时回报：

- 尽量并行：开几个执行者由宿主和当时情况决定，协调者自己也出图。基准审核进行时就准备好各 job 的提示并开好执行者；基准通过后一次交给每个执行者它那份 job（各自的请求、身体/阶段约束和参考）和基准路径，执行者连续做完，不逐张回报、不等转派。
- 执行者只保存自己的源图和回执；共享manifest、组装、有限修复、Pet记录和目标更新由协调者处理。独立ImageReviewer只负责基准与最终两道看图关卡，返回结论、观察与修正，不写长报告；终审期间协调者先备好接受、上传与回读所需的参数。
- 具备宿主接口时，协调者完成接受图保存、同ID更新与回读后，直接执行步骤 7 的 finish-story 与简介更新和回读，再把最终文件与实际结果交主 Agent 取 story-output 并表达。

成长预兆出现时可提前生成并接受适合下一阶段的图，记录阶段与引用；到期直接复用。某一行返工到上限用已接受的正确基准姿势补帧，保存缺项观察，仍审查整套真实观感。基准失败先复用已接受的适合目标阶段的图；没有合适图就保留 pending 和明确失败证据，不能用旧阶段图冒充成长，也不能说成长或显示完成。宿主恢复后继续上传同一计划，不重新领养。

真实活跃工作不能仅凭文件年龄当作停止。临时工具故障保留单元、种子和已接受素材；重复出现同一视觉错误换方法，停止无休止重画。参数错误按返回的 usage 修正，不消耗生图重画次数。`pipeline-process` 返回 `timedOut` 时原样再执行同一命令，从已缓存的步骤续接。未知结果的云端写入先回读准确目标，禁止盲重试。技术阻断保留pending与所有产物，不为清理结果自动cancel/reset；初始化基因已保存时正常取消也可能被拒。确实获授权取消的故事保留产物，必须发生的成长仍在下次要求中；取消不能代替每次内容目标。

## 对话、命名和任务

/genpet 处理近况、名字、故障、初始化、替换和其他明确操作；/genpet-chat 才跑 chat 单元，必要时 `note-chat PET_ID NOTE`，不改 memory 或 state。用户说的话在下次 context 中作为一项资料。

命名用 name-pet 对明确 Pet ID，见 naming.md。start 完成后设置普通五小时任务，并按 `due.nextCheckAt` 核验和安排更早的成长截止检查；每篇完成或激活恢复后重新安排，见 scheduling.md。stop 停该任务并 schedule-stop。Dots 保持同一个 cloud ID，主环境移交前停旧写入、验证记录后再开新任务，见 dots.md。安装、构建、发布和只读检查都不生成 Pet 或任务。

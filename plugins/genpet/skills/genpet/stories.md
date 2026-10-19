# 故事、定时与命名

每次故事、定时检查、命名和对话的流程。各步骤的内容要求在 `units/` 下对应的单元里，图像在 `art.md`，宿主和存储在 `host.md`，用户看到的文字在 `units/output.md`。

## 调用约定

- 从已安装的 skill 目录解析插件根目录（`skills/COMMAND` 向上两层），执行 `node ROOT/dist/cli.js COMMAND ...`，只用这个已安装的运行时。JSON 参数保存到绝对路径的文件；shell 参数按当前 shell 正确引用。
- 全局参数：`--host desktop|cloud`、`--pet PET_ID`。一篇故事确定目标之后，每次调用都加 `--pet PET_ID`；即使中途宿主改选，art-request、accept-art、set-appearance 仍读原来的目录。带 operation ID 的命令也按原故事路由。
- 记录里的 step 和素材是内部结果。`record-step OPERATION_ID UNIT ABSOLUTE_RESULT_FILE` 保存一个单元的结果（同一结果重试去重，修订追加新结果、保留旧版）；上游修订后，检查受影响的下游。
- 单元的结果文件格式：`{"inputRefs": [...], "result": {...}}`。inputRefs 定位实际的事实、上游 step 或已接受的图（如 `step-of-context`、`journey:round-1`、`fact:actual-source`），不复制原始私密资料；额外字段允许。

## 找到这一只

1. 先 `status`、`diagnose`，只读查看记录、绑定、当前选中项和迁移映射。
2. 用户选中的 `custom:` 与映射的 `pet_` ID 是同一只，通过唯一 ID 找到记录。选中的不是 GenPet，或读不到选择时，沿用上次激活的记录，保留用户的选择，并写明未读到或未匹配。
3. 故事开始时记录 Pet ID，之后所有步骤按这个 ID；用户中途改选也完成原故事。其他 Pet 的目录和 cloud ID 不受影响，未激活的宠物期限暂停。
4. 已有 pending 先确认是否仍在执行并续接它，不重抽种子、不重画已完成的图；活跃的并发作业只观察和等待。完成的 trigger 不再发一遍内容。
5. 没有 Pet 的定时或对话请求不能自动领养。

## 每篇故事

1. **开始。** 读 status；定时触发先 `due`，用返回的 triggerId。已完成的触发直接复用结果，没到期保持安静。新的 `begin-story` 返回 growth、time 和目标；另取 `recent-content [COUNT]`。强行成长用 `begin-story TRIGGER_ID --grow`（只写在 reason 里不会启用）；稳定 ID 重试不重复分配。
2. **读资料。** 按 `units/context.md` 实际读取并运行 context，包括观察用户此刻在做什么。重试沿用已保存的步骤结果。
3. **写故事。** 运行 `units/story.md`，recentContent 用来避开最近的重复。
4. **状态与成长。** 运行 `units/evolution.md`；已有的 soul 原样读取。需要形象时运行 `units/appearance.md`，需要家的变化时运行 `units/home.md`，有物件时运行 `units/story-item.md`。每个结果用 record-step 保存并交给下游；memory 值得记才重写。
5. **计划。** 把结果合成 StoryPlan（字段见 `host.md`「StoryPlan」），reason/contextRefs 写清采用的真实依据。`plan-story OPERATION_ID PLAN_FILE` 保存后保持不变。每个故事必须有一张图（新形象、场景、物件或家），没有图的计划不能完成。给用户、带回来或留在家里的东西写进计划的 `items`，之后移动或收起它也写在这里；每次正常检查都有内容，不因“没有新事实”取消。
6. **图。** `art-request` 返回请求 `.id`、`.savedArt` 和宿主格式 `.contract`。复用指定的 reuseArtId；新素材按 `art.md` 生成和审核。`accept-art REQUEST_ID ABSOLUTE_FILE KIND SOURCE [DESCRIPTION]` 接受（KIND 是 portrait、atlas、scene、home 或 prop：场景图用 scene，家的画面用 home（它是 scene 的一种），道具叙事的物件图用 prop；source 写实际的生成和来源记录）。
7. **更新宿主。** 形象变化时，按 `host.md` 更新同一个绑定的 cloud ID；上传、刷新和回读分别记录。未上传的云图保留 pending，不说“下次加载会自动生效”；已回读一致但刷新不可用，记录这个事实，实际显示仍为未知。无形象变化不需要上传。
8. **完成。** `finish-story OPERATION_ID` 原子提交 memory、state、历史和完成 trigger。有形象变化时，由完成回读的图像协调者紧接着执行这一步，不先回报主 Agent。云端描述见 `host.md`「云端描述」，它只记领养那一句，故事不改它。
9. **表达。** 取 `story-output STORY_ID`，运行 output，用 record-step 保存，把其中的 message 原样发给用户。孵化时处理一次命名邀请（见下面「命名」）。

## 定时检查

宿主负责真正的调度，Node 没有私有的后台定时器。

**建立。** `start` 的首篇领养完成，或恢复现有 Pet 之后，查看宿主已有的 GenPet 任务并复用或更新；同一环境里唯一激活的 Pet 共用一个任务。

- 普通内容的间隔是五小时，用宿主支持的 interval 或相应调度工具；不要用午夜重置的小时 cron 代替稳定间隔。保存真实引用：`schedule TIMEZONE REFERENCE`。
- 再读 `due` 的 `nextCheckAt` 和 `growthDeadlineAt`。阶段开始、幻化进入或结束、激活恢复和每篇完成后重读它们，用宿主已证实支持的指定时刻唤醒能力安排更早的截止检查。成长截止用独立的稳定 ID；不要换成当前的 `period:`，即使这个普通周期已经完成，也要完成截止变化。截止故事也覆盖它完成时的普通周期，不额外再发同一周期的普通故事。
- 只有五小时的 recurrence 保证不了未对齐的七天或两天截止。核验宿主可用的参数和实际的下一次运行时间之后再安排；不猜 `nextRunAt`、单次 RRULE 或其他未证实的字段。不能按需要唤醒时，保存这个实际限制，主入口恢复时仍检查 `due`；返回的时间不等于任务已经建立。
- Agent 按实际生成耗时，提前准备合适的下一阶段素材；已有正确素材则到期直接复用。准确唤醒不等于图像、上传和显示已按时完成。
- 任务名简短，如 GenPet；可见说明只写面向用户的用途，执行步骤放在后台说明和主 skill。任务所在的对话名称设为 GenPet：建立任务时，用宿主的 `set_thread_title` 给任务运行的那个对话设名（固定对话给 `threadId`；每次运行开新对话时，在运行里省略 `threadId`，改的就是当前对话）。之后运行时，只在名称已经不是 GenPet 时再设一次。不改其他对话，也不改用户在别处用 GenPet 命令的对话。宿主没有这个工具时保持原名。

**停止。** 只停或暂停 `status.schedule.reference` 对应的这一个任务，再 `schedule-stop`。Pet、历史、素材和未完成的工作保留，手动故事仍可用，`start` 恢复任务和记录、不重新领养。用户明确说停止就是授权，不重复询问。

**每次运行。**

1. 只读解析宿主选中项到 Pet ID，按 runtime 的激活路由处理。选中的不是 GenPet 或读不到时，采用上次激活的 Pet 并保留选择；无 Pet 则不自动领养。
2. 检查 pending 和真实作业是否还活跃。先续接确定可续接的工作；仍在跑的作业则等待或退出这次重复触发，不并发生成。
3. 没有 pending 时 `due`，用它的 triggerId 开故事，优先处理已到期的成长。错过了多段普通内容，只合并最近一次，不补一串旧故事；同一触发完成后不重复。`nextCheckAt` 只是下一次应检查的时刻，实际任务的结果另行验证。
4. 先真正读 context、观察用户此刻的情境，再形成故事和可见内容，按「每篇故事」。没有新事实也按情境形成内容（用户不在时它过自己的日子、外出或修整家），不走空白的取消分支。
5. 完成后记录实际结果并重读 `due`，更新真实任务的下一次唤醒。用 output 只呈现宠物内容；日常变化可无消息，不输出“检查完成”、进度或固定台词。阶段到期按 growth 完成相应的变化；命名最多一次。

定时检查只在电脑开着、Codex 运行时进行。Codex 桌面 App 关着时不运行，错过的检查不逐个补，重新打开时只补一次。开机后过期任务如何补跑，以宿主的实际表现为准；宿主不支持立即补跑时，保存这个实际限制，用主入口恢复时的 `due` 检查。

**中断与重试。**

- 同一个 operation、已保存的步骤结果、已接受的图和上传目标继续。不依据 pending 的年龄就判断任务停止；检查实际的作业和句柄，短暂读取失败再查原作业，不重复启动。没有活跃作业才恢复未完成的步骤。
- 暂时无法上传云图时保留补交的工作。已经上传且回读一致的，与尚未上传的，分别处理；不把未上传的工作标记完成。
- 失败的图、原始输出和旧图全部保留。确需取消时保留全部产物，下一次仍承担已到期的成长。初始化只能续接，或由用户明确替换；定时失败不重新领养。
- 真实活跃的工作不能仅凭文件年龄当作停止。临时工具故障保留单元、种子和已接受的素材。参数错误按返回的 usage 修正，不消耗重画次数。`pipeline-process` 返回 `timedOut` 时，原样再执行同一命令，从已缓存的步骤续接。未知结果的云端写入先回读准确的目标，不盲重试。技术阻断时保留 pending 和所有产物，不为了清理结果自动 cancel 或 reset；初始化基因已保存时，正常取消也可能被拒。

## 命名

名字是身份里可变的显示信息，`name-pet` 不改 ID、soul、图、成长或历史。

1. 孵化完成后读取 `naming.due`/`namingDue`。呈现实际的新样子和家，在消息末尾请用户自由起名一次，不给候选。
2. 问题实际送出之后才 `name-asked PET_ID --pet PET_ID`；没送出就不记为已问。保存提问时的 Pet ID。
3. 用户的回答由 /genpet 接住：`name-pet QUESTION_PET_ID USER_NAME --pet QUESTION_PET_ID`，用提问时的 ID。若那只已被替换，说明问题指向的是原来的 Pet，不把答复套给新的 Pet。
4. 用户暂时不取名或没有回复，故事继续，之后不催问。之后明确说「改名叫 X」就直接保存；没给名字只问一句。有未完成的故事时，先完成或按原指示解决，不为命名再开故事。同名重试幂等。
5. 保存名字后取 `companion-brief`，给同一个真实 cloud ID 更新描述并回读（见 `host.md`「云端描述」）；不按名字查找或新建云 Pet。同步暂时失败时，保留已保存的名字和失败证据，下次再同步。
6. 旧记录原有的名字保留，不因升级重新邀请。宠物列表条目可继续用运行时的唯一标签 `genpet-xxxxxx`；名字用于故事、对话和云端描述，不用来定位云 Pet。

## 宠物对话

/genpet-chat 才跑 chat 单元；`note-chat PET_ID NOTE` 保存值得留的话，不改 memory 或 state。用户说的话在下次故事的 context 里是一项资料。

# 宿主与记录

宿主接口、同一只 Pet 的云图更新和云端描述，以及记录和计划的格式。实际命令与接口由运行时提供，按唯一的 Pet ID 和绑定更新。全程不使用 Computer Use。

## Codex 桌面：切换与诊断

**当前选择。** 先读 `switch-pet --current`。

- 本地条目：`switch-pet --list` 列出，`switch-pet ACTUAL_PET_ID` 切换。目录把已迁移的本地别名解析到当前账号的真实 cloud ID，旧 `custom:` 别名也一样。
- 写入选择需要当前回合的真实 turn ID。CLI 返回 `selected: false` 和 `agentSteps` 时，调用宿主的 `select_pet` 工具选这个确切的 ID，再独立读取原生和桌面的选择。不编造 turn ID，不重发被拒绝的设置写入，也不把这次交接当成已完成的选择。旧的本地条目没有支持的选择工具时，给用户那一步手动选择。
- 本地目录只列本地条目。内置和云端的 Pet，读宿主实际的 `list_pets` 结果，用已有的选择 API 选确切的、属于用户的 cloud ID，再独立读取选择（API 和 `switch-pet --current`）。不把内置或未列出的云 ID 传给本地 CLI，也不按名字猜 ID。宿主选不了时，说明这个限制，并给出一步手动选择（用它实际的唯一标签）。
- 选择的回读不能证明显示的图是什么。选择变化和更新绑定的 GenPet 目标是两件事：更新外观时保持选择不变。只在用户要求时切换；不重置记录。

**诊断。** 用户用自然语言说宠物没加载、缺失、不显示时，先只读检查，分开说四项：条目是否存在、是否选中、刷新是否送达、实际是否显示。接口确认不了的项保持未知。另查看已安装的版本、记录与云绑定、任务引用。

只修复已确认可靠的现有条目、资源、刷新步骤；不重置、不成长、不改 soul、不重画。无法直接切换或显示时，直接告诉用户在 Pet 设置里选择诊断返回的那个唯一标签，或打开显示开关，只说实际需要的一步。接口做不到的，给用户自己做的一步。

## 更新同一只

1. `find-avatar`/`diagnose` 查询记录绑定、宿主 Pet 条目、当前选中项和 local-to-cloud 映射。`custom:` 与映射的 `pet_` ID 是同一只。
2. `set-appearance`（publish 的兼容入口）拿已接受的 atlas，写实际的目标。迁移后更新实际的 cloud ID，不能只写本地 atlas，也不能选回 legacy ID。先保存并核对云目标；上传结果未知时先回读，不重复新建。
3. 用运行时列出的 host API/app-tools/IPC 请求更新和云 Pet 资源刷新，保持当前选择：目标 active 时立即请求刷新，inactive 时不改选中项。
4. 回读云端存的真实 artwork，保存实际下载的文件，`host-result OPERATION_ID RESULT_FILE` 核对它与已接受的图。结果文件含 petId、operationId、appearanceId、实际 avatarId/cloudId、updated、storedArtworkVerified、active、refreshRequested、displayStatus、readbackFile、observed。readbackFile 是与上传源分开的实际下载路径；storedArtworkVerified 的最终值与图像哈希由 runtime 核验。`updated`、选择回读和刷新请求都不能证明存储的图相同或实际显示。
5. 回读一致后才 `finish-story`（由完成回读的协调者紧接着执行）。尚未上传的保持 pending；上传成功但刷新不可用，记录这个事实，显示保持 unknown，不承诺未上传的图下次加载自动生效。

## 云端描述

云 Pet 的 description 只写一句：`你在YYYY年M月D日 地点领养了这种宠物`，用户起过名字后前面加 `它叫名字。`。由 `companion-brief` 从记录生成，不含 soul、memory 和 state。云端描述与它不同时，用返回的 `update_pet` 步骤写到同一个 cloud ID 并回读；只有领养完成和起名、改名后会变，故事不改它。

## 记录

记录按 Pet ID 分目录，由运行时管理路径和原子写入；`GENPET_DATA_DIR` 指向数据根目录。每只 Pet 保存自己的 `state.json`、故事、chats、steps 和 assets，另有注册记录保存上次激活的 ID、绑定和主环境。用 `status --full` 查看实际路径和记录，不手改注册表或 Pet 文件。

一只 Pet 分三块：

```text
id、name、naming、adoptedAt、revision、binding
soul   { genes, personality, acquisition }
memory { text, updatedAt, storyId }
state  { stage, description, appearanceId, storyId, updatedAt, home, special }
```

- soul 在领养完成后不可变；读取、安装和插件升级不生成设计，不推进年龄。
- memory 只在成功 `finish-story` 时按计划重写；没有值得记的事就省略。
- state 在完成时更新。每个完成故事的 memory 重写算一次经历；成长由历史和激活时间算，不给用户数字。
- 一篇故事绑定开始时的 Pet ID；切换选中项不搬它的目录。禁止两个环境同时写入。

**StoryPlan。** 各单元的结果合成一份计划；只写适用的字段，没有的省略。

```json
{
  "text": "这一次的宠物经历草案",
  "reason": "采用的真实资料、memory 与变化的简短来由",
  "contextRefs": ["fact:actual-source"],
  "state": "完成后当前状态的完整描述",
  "stage": "egg",
  "genes": "仅新领养或缺项补全：自包含设计",
  "designReason": "仅新领养设计：具体来源与各结构来由",
  "place": "领养旅程得到蛋的地点",
  "connection": "旅程和真实用户输入的联系",
  "personality": "性格、拟声词与基本说话习惯",
  "memory": "确有值得记的事才填写：完整简短重写",
  "home": "孵化或变化时：完整家的描述",
  "appearance": {"description": "故事决定的形象", "reuseArtId": "已有合适图时才填"},
  "mediaIds": ["本故事实际采用的已接受媒体ID"],
  "items": [{"name": "新东西的名字", "description": "它是什么", "status": "with-user|at-home|carried|gone"}]
}
```

- 领养之后的计划不带 genes/place/connection/personality，不重写 soul；home 和 memory 省略时保持原样。
- `special` 记录幻化：给出描述表示进入或延续，null 表示结束，未改变就省略。进入时距上次结束不足一周会被拒绝（强行成长除外）。
- `items` 是这次物件的变化。不写 `id` 表示新东西（要有 `name`、`description`）；写已有物件的 `id` 表示它的去向变了。`status`：`with-user` 给了用户，`at-home` 留在家里（可写 `place`，家必须已存在），`carried` 带在身上，`gone` 已不在。新物件没写 `artId` 时，本故事只有一张 `prop` 图且只有这一件新物件，就用这张图。完整清单在 `status` 的 `items`，所有形象在 `looks`。
- 阶段一次最多前进一格；成长、幻化的进入和结束都要有有效的形象。
- contextRefs 引用已保存的 context 或用户资料；写清这个故事回应的是哪条真实的用户线索。

**导入、新增、替换与清理。**

- 只读发现的旧版本记录，先报告，经用户确认后用 `import-record`/`migrate-legacy` 导入，保留原有的名字、ID、绑定、历史和图。旧的 `~/.genpet/dots` 遗留不自动读写，也不混入新 Pet。
- 新增创建独立的 Pet ID、目录、绑定和 cloud ID。替换先备份旧目录，让新 Pet 的身份接手原条目和 cloud ID。两种含义先说明并确认。
- 默认保留云 Pet，只有用户点名的条目才删；清理把记录移入备份，并报告留下的位置。失败重试沿用相同的操作 ID。

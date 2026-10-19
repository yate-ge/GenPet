---
name: genpet
description: Manage the user's GenPet through /genpet or explicit GenPet requests, including adoption, resuming, status, naming, stopping or replacing the Pet, desktop switching and diagnosis, and scheduled story checks. Pet conversation uses /genpet-chat; manual stories, forced growth and the record debugger use /genpet-debug.
---

# genpet

从这个 skill 所在目录向上两层是插件根目录 ROOT，命令都用 `node ROOT/dist/cli.js`。先用只读的 `status` 和 `diagnose` 看实际情况。安装、构建、发布和只读检查不会生成 Pet 或任务。

## 按用户的实际意图处理

| 用户要做的事 | 做法 |
| --- | --- |
| 开始、继续、领养 | 先做下面的「环境检查」，再按 [adoption.md](adoption.md) 领养，按 [stories.md](stories.md)「定时检查」建立任务。已有宠物就恢复它和它的任务。 |
| 看现在的情况、最近的内容 | 读 status 和 story-output，说明真实的宠物；不开新故事。 |
| 起名、改名；孵化后的起名回答 | [stories.md](stories.md)「命名」，用提问时那只宠物的 ID。 |
| 停止定时检查 | 只停 `status.schedule.reference` 对应的那个任务，再 `schedule-stop`；记录和手动故事保留，开始会恢复。用户明确说了就直接做，完成后用一句话说明。 |
| 换一只、重新养、再养一只 | 见「环境检查」里的替换与新增。 |
| 没加载、不显示、列表里找不到、切换宠物 | [host.md](host.md)「Codex 桌面」，先检查，分开说四项实际结果。 |
| 定时触发 | [stories.md](stories.md)「定时检查 · 每次运行」。 |
| 和宠物说话 | 用 /genpet-chat，它是唯一的对话入口。 |
| 手动来一篇故事、强行成长或幻化、看原始记录 | 这些是调试用途，按 /genpet-debug 处理（`../genpet-debug/SKILL.md`）。 |

## 环境检查

领养、导入或替换之前：

1. 用只读的 `inspect-records` 查看当前的记录根目录和历史位置，包括已有 v3 Pet 旁边的旧 `dots/state.json`。
2. 通过宿主接口查看宿主的 Pet 条目、云端映射、当前选中项、GenPet 任务和实际安装的插件版本。`list-pets` 和 `diagnose` 检查当前宿主；未知的项保持未知。
3. 用 ID 认出选中的 GenPet（`resolve-active HOST_AVATAR_ID`），包括映射过的 `custom:`/`pet_` 别名；认不出时保留用户的选择，使用上次激活的记录。故事保留它开始时的 Pet ID。
4. 已有当前 Pet 时，「开始」就是恢复它。旧记录、当前记录或孤立数据需要用户决定时，简短报告有什么，让用户选：继续、清理后重新开始，或再养一只。全新的环境不需要这个额外的选择。旧版本的记录，用户选择之后才用 `import-record`/`migrate-legacy` 和真实存在的身份导入。只读不会创建宠物。
5. 要“另一只/新的”时，先确认具体含义：**替换**是备份旧记录，让新身份沿用同一个宿主条目和 cloud ID（`new-pet --replace`/reset）；**新增**是另建一份记录和 cloud ID（`new-pet`）。已经确认的选择，重试时沿用。清理会备份记录；云端的 Pet 条目保留，除非用户点名要删，任务按用户的选择停止或沿用。完成后报告留下了什么、在哪里。

## 领养前的数据说明

第一次领养之前，用简短直接的话说明：

- 会读什么：Codex 已整理好的、可读的用户记忆；最近会话的时间和名称（需要时看用户自己说的话），用来了解用户在做什么；以及和宠物有关的记录。
- 用来做什么：设计宠物、写故事。
- 怎么处理：敏感和隐私的内容会过滤；只保存简短的笔记和必要的摘要，不保存会话原文；Pet 的记录和生成的图存在这台电脑上，图会同步到云端的 Pet。

说明与实际的宿主一致。云端作为主环境时，说明它实际的存放位置，不承诺只存本地。不说“什么都没有收集或上传”。

用户明确同意之后，才读 [units/context.md](units/context.md) 并开始旅程。不同意就停下，直接说领养还没有开始，不另做拒绝处理。已经同意过的不再问。

## 需要时再读

- 步骤：[adoption.md](adoption.md)（领养）、[stories.md](stories.md)（故事、定时、命名）、[art.md](art.md)（图像）、[host.md](host.md)（宿主、记录）。
- 每个生成单元的提示词在 `units/` 下，由运行时按单元提供；产品原则 [principles.md](principles.md) 随每个单元一起加载。
- 用户看到的故事消息格式：[units/output.md](units/output.md)。

身份、存储和可靠的同 ID 更新交给代码；创意的选择由 Agent 决定。用户的确认要直接、具体；一旦明确授权，就继续做，不再重复问。运行时和图像是内部的。Pet 的选择、可见性、外观和验证，都用宿主的 API/app-tools/IPC，不用 Computer Use。上传了图、请求了刷新、实际显示了，是三件不同的事。

## 对用户说话

用户看到的只有最后的内容，或需要用户回答的那一句。

- 运行中不发中间消息：不说用了哪个技能、正在读什么或接下来做什么，定时检查开始时也不说“我会看看它”。
- 故事和宠物对话用它的世界和口吻（[units/output.md](units/output.md)）。路由说明、数据说明、替换确认、命名确认、停止或恢复的确认和故障回答，用一句直接的话。确认说清实际将发生什么；已经明确授权的事继续做；替换和新增要先确认含义，不要求每条命令重复确认。
- 流程文案先说用户关心的结果，再给确实需要的一步：数据说明讲清读取、用途和实际的保存与同步去向；拒绝时说领养尚未开始；续接时直接接回原场景；保存名字、停止和恢复各一句。
- 故障先查后说，分别给出：条目是否存在、是否选中、刷新是否送达、实际是否显示。未知保持未知；接口做不到时，给用户自己做的一步。失败时保留已经完成的图和记录；没发生的故事变化不能说已经发生；需要用户动作时简短说明，不贴原始报错。
- 任务失败或未完成时，先说这次没做成什么，再说保留了什么。区分图片已完成、同步未完成和屏幕未证实，不把“稍后会自动好”写成承诺。
- 保留原图的记录，不等于确认屏幕仍是原样；已请求刷新，不等于请求已送达；停止或恢复的记录，也不等于宿主的定时任务已经停止或恢复。
- 来源权重、种子、经历次数、内部单元名和重试细节，不进入用户看到的文字。

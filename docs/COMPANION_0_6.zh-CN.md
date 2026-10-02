# 命名、用户联系与性格 · 0.6.0

本轮采用提示词主导的轻量实现。产品规则仍以 [meta.md](../framework/prompts/meta.md) 为唯一来源，不增加性格数值、故事分类器、固定事件菜单或轮换比例。

## 设计落点

- 命名：完成孵化后邀请用户自由起名；可以暂缓或不答，故事照常继续。`/genpet-name` 负责之后补名、提前起名或改名。
- 用户联系：宠物有自己的生活，也会回应用户的真实线索或明确请求。关联要出现在故事正文中；发生状态变化时，提示词要求说明具体用户原因。
- 性格：初始化时由相遇与个体形成一份开放文字，写清性格核心、相处方式、状态表达与创作依据。后续故事读取它，性格通过行动体现；临时状态与长期性格分开。

例如同样面对“用户说想休息一下”，贴心的个体可能静静陪着，顽皮的个体可能提出一个轻松小游戏，洒脱的个体可能邀请一起望窗外。正文不能断言用户已经接受邀请；示例不是性格菜单。

## 必要代码

在已有 Pet/StoryPlan 中增加 personality 文字，沿用原计划提交、持久保存与重试机制。新初始化需要性格，既有性格不能被普通故事或图像重试替换。旧记录读取不补写，旧的已保存计划仍可完成，缺少性格可在下一次故事中补全。

命名保存 unasked、asked、named 三种状态，区分未邀请、已邀请和已命名；用户选择暂缓时不需另存状态（初版的 deferred 与 asked 行为相同，已合并，旧记录按 asked 读取）。按 Pet ID 保存回答，防止重置后将旧问题的答案写给新宠物。命名不生成形象或新故事；宿主下一次发布使用保存的名字。

用户联系、状态原因、性格是否落实为行动，由 Agent 按提示词决定并接受内容复核。源引用与观察继续放在现有 record-step 中，不另建证据机制。结构校验通过不代表这些语义目标已经通过。

## 修改入口与验证

- [meta.md](../framework/prompts/meta.md)：用户联系、故事与状态、个体性格、用户命名。
- [personality.md](../framework/prompts/personality.md)：新的独立生成单元。
- [story.md](../framework/prompts/story.md)、[evolution.md](../framework/prompts/evolution.md)：性格如何作用于故事和状态。
- [naming.md](../framework/references/naming.md)：一次命名邀请与回答的执行方式。
- [companion.test.ts](../tests/companion.test.ts)：提交与重试、旧记录、命名邀请、暂缓、答案防串与隔离 CLI。

源码提示词修改在 framework；build:plugin 将它们复制到两个宿主包。当前共九个生成单元。本轮工程测试 64 项通过、1 项因平台条件跳过，类型检查与两个包的隔离安装、文件哈希、CLI 测试通过。真实用户宠物与已安装插件不在开发测试中修改。内容与实图需单独检查，尤其需要同一用户事件在不同性格下的故事对照。

2026-10-03 `npm run verify:release` 通过。比较基准为已抓取的 origin/main；验证时本地 marketplace 源提交为 `f33fee0b16d04a436a0e07b38f395d7215c91d6c`，测试内容包含当时尚未提交的本轮开发修改。隔离安装版本均为 0.6.0，genpet 核对 71 个文件，genpet-dots 核对 37 个文件。测试时安装位置如下，临时环境已由验证脚本清理，不能作为用户当前安装位置：

- `C:\Users\geyat\AppData\Local\Temp\genpet-release-check-v9lpip\codex-home\plugins\cache\genpet\genpet\0.6.0`
- `C:\Users\geyat\AppData\Local\Temp\genpet-release-check-v9lpip\codex-home\plugins\cache\genpet\genpet-dots\0.6.0`

本轮源码与两个重建运行包通过 Git 提交与推送交付；开发和隔离安装测试没有更新用户已安装的插件。

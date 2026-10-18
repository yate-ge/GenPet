---
name: genpet-debug
description: Debug the current GenPet on an explicit /genpet-debug request - open the local record page, run one immediate story, or force a growth step or transformation. It picks the action from what the user asks.
---

# genpet-debug

调试和检查用的入口，只在用户明确用 /genpet-debug 时使用。先读 [主 skill](../genpet/SKILL.md) 和 status，按用户要的事选下面一项；说不清时问一句。没有 Pet 时直接说明可通过 /genpet 开始，不隐式领养。

## 打开记录页

运行插件根目录里的 `node ROOT/dist/cli.js debugger`，打开返回的 URL。页面按本机的 GenPet 记录显示：身份、soul、memory 和 state、故事历史、家的变化、每个已保存的 atlas（可预览动作）、待完成的工作、定时任务和原始记录。打开和浏览不改变任何宠物。

- 侧边的面板列出宿主认识的所有 Pet。云端 Pet 的名字不在本地缓存，所以宿主的 `list_pets` 工具可用时，把它所有的分页原样保存到一个绝对路径的 JSON 文件，并传 `--host-pets FILE`。
- 页面上的宿主操作只有三个：在绑定的桌面 Pet 上显示某个已保存的 atlas、恢复当前的图、请求刷新。Pet 的记录不会被改。已迁移的云 Pet 需要经过身份验证的上传步骤，页面会列出，用户要求时才执行。
- 页面不切换宿主选中的 Pet（切换交给 /genpet）。显示的图仍是未确认的。用户要求时通过它的 Stop 按钮关闭。
- 对话内容的写法按 [output.md](../genpet/units/output.md)。

## 来一篇即时故事

读 [stories.md](../genpet/stories.md)「每篇故事」和 [story 单元](../genpet/units/story.md)，用当前选中的 Pet，不改它的定时任务。

- 按 ID 绑定所选的 Pet；有未完成的工作先续接，再开新的手动触发。
- 读实际的 context，直接决定这篇故事。故事决定日常样子（整套图）、幻化、物件或家、memory 和成长的变化；已保存的结果在续接时沿用。
- 完成被接受的画面和同云回读；只呈现实际的内容和最终的媒体。
- 这个明确的请求不需要再做一次泛泛的确认。

## 强行成长或幻化

读 [stories.md](../genpet/stories.md) 和 [evolution 单元](../genpet/units/evolution.md)。

1. 改变任何东西之前，用一句直接的话说明会发生什么，等用户明确说好：未成年的宠物成长一个阶段；成年的宠物幻化；已在幻化中的成年宠物回到之前的日常样子。
2. 先续接未完成的工作，再 `begin-story TRIGGER_ID --grow`，在 runtime 里授权这次强行的变化；runtime 只接受正是这一种变化。
3. 强行幻化仍遵守 [principles.md](../genpet/principles.md) 的「形象安全」和 evolution 里的幻化规则（对象、身份、安全），可以比通常的“隔一周”来得早。
4. reason 记为用户的请求，不是真实生活里的节点。保留 soul 和身份；用已接受的图，或准备完整的目标图，做同云上传、回读和真实的完成。
5. 输出实际的变化和它的新肖像；不做数字化的成长解释。

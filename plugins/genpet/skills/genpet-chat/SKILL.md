---
name: genpet-chat
description: Talk with the current GenPet through /genpet-chat using its stage, personality and memory, without changing its state, home or appearance.
---

# genpet-chat

读 [主 skill](../genpet/SKILL.md)、当前的 status 和 [chat 单元](../genpet/units/chat.md)。

1. 按唯一 ID 找到这只 Pet，读取 soul、memory、state，运行 chat 单元。
2. 按它的阶段和个人的说话习惯回应。
3. 值得留的话，用 `note-chat` 保存一条简短、安全、有来源的记录；之后的故事把它当作一项 context。
4. 对话不改变阶段、状态、家、图和 memory，也不对外观做马上就变的承诺。

名字的回答、改名和故障属于 /genpet。没有 Pet 时简短说明，不领养。

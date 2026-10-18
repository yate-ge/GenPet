# 领养

读本文件之前，先完成 SKILL.md 的环境检查、已有宠物的选择，以及第一次领养的资料说明和同意。同意之前不读资料，也不分配领养记录。各步骤的内容要求在 `units/` 下对应的单元里；调用方式见 stories.md「调用约定」。

## 步骤

使用稳定的触发 ID（`manual:UUID`）。`begin-story TRIGGER_ID` 返回 operation、Pet ID、journey 和要求。

1. **读资料。** 按 `units/context.md` 实际读取，保存 context 的简短结果。
2. **逐轮旅程。** 运行 `units/encounter.md`。先用不带 userInput 的 `journey-step` 保存待答场景和选项，收到用户的真实选择后再保存该轮，结束时 complete 为 true。用户离开后从原待答场景继续；没有明确选择，不替用户回答。
3. **选来源。** 旅程结束后 `random-source OPERATION_ID [SEED]` 给出来源类型。在类型内列候选，保存 `{purpose:"genes", candidates:[{id,description,contextRefs}]}`，再 `random-choice OPERATION_ID CANDIDATES_JSON [SEED]` 用同一个种子选出一个。重试时不换。
4. **设计。** 依次运行 `units/genes.md`、`units/personality.md`。
5. **组装计划。**
   - `text`、`place`、`connection` 来自旅程。
   - `genes`、`designReason` 来自设计；`personality` 写进 soul。
   - `memory` 写旅程和相处的出发点；`stage` 为 egg。
   - `reason` 记录采用的真实来源和限度；`contextRefs` 引用实际用到的事实。
6. **画蛋。** 把只含蛋的 appearance 请求交给 `art.md`，生成并审查蛋的真实图，更新同一个绑定 Pet 并回读。
7. **完成。** `finish-story` 提交，运行 output 给出领养总结。总结讲旅程、蛋和壳面线索的来由，不透露孵化后的身体。蛋阶段不邀请命名。
8. **定时。** 完成之后建立或恢复定时检查，记录真实的任务引用（stories.md「定时检查」）。

失败时继续同一个 operation、同一个选择和同一个设计，不重抽。

## 检查

- 许可先于读取；旅程先于设计；结束前没有提前透出身体。
- soul 和初始 memory 有据可查。
- 目标 cloud ID 和已接受的图回读一致。

## 旧宠物补全

旧宠物缺少的性格、说话习惯或 memory，按已有资料补一次：保留已有的 genes、personality 和来源历史；只补缺项，从已保存的安全故事形成，不编造旅程，缺失的旅程保持未知。补全后 memory 的经历计数从这次开始，身份、ID 和 cloud ID 不变。只读的安装和 status 不补全。

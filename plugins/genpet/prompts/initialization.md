# 领养编排

本文件是流程说明。读取本文件前先走主 skill 的环境检查、已有宠物选择，以及第一次领养的资料说明与确认；确认之前不开始资料读取或领养记录。

1. 按 ../references/user-context.md 实际读取，保存 context 的简短结果。
2. 通过 encounter 逐轮生成旅程。待答场景先 record-step 保存，收到真实回答后保存场景、选项与原话到 `journey-step OPERATION_ID STEP_JSON`，结束用 complete:true，重进时从保存的 journey 和待答单元结果续接。
3. 旅程结束，`random-source OPERATION_ID [SEED]` 给来源类型。列候选后 `random-choice OPERATION_ID CANDIDATES_JSON [SEED]`，purpose 为 genes；将保存的结果交给 genes，再给 personality。
4. appearance 只设计蛋。组装计划：text/place/connection 来自旅程；genes/designReason 来自设计；personality 写进 soul；memory 写旅程和相处出发点；stage 为 egg；reason 记录采用的真实来源与限度。用 contextRefs 引用实际使用的事实。
5. 保存 plan，生成并审查蛋的真实图，更新同一个绑定 Pet 并回读，通过 `finish-story` 完成，output 给领养总结。
6. 完成之后建立或恢复定时检查，记录真实任务引用。蛋阶段不邀请命名。

结果文件和计划保存后，失败继续同一 operation、同一选择与设计。检查点：许可先于读取；旅程先于设计；结束前没有提前透出身体；soul 与初始 memory 有据；目标 cloud ID 与已接受图回读一致。

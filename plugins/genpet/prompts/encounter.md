# 单元：encounter · 领养旅程（GeneDesigner）

输入：`context`、`journey`（已保存的背景、各轮场景/选项/用户原话与是否结束，未开始可为空对象）。遵循 meta.md「领养旅程」「用户联系」。

在已有旅程上生成当前场景和下一步，选择带来的后果兑现并留下线索。未收到用户回答时保留可回答的场景；收到回答后才能记为该轮选择。Agent 决定何时在五轮以内收束得到蛋，用户自由回答同样有效。不得把未选项写成用户做过的事。

结果：`text` 为当前故事或结束后的旅程摘要；`place` 为当前/获得蛋的地点；`connection` 说明用户资料和选择怎样进入旅程；`factIds` 引用实际事实 ID；`journey` 使用 `{background, rounds, completed}`，当前待答场景可附在结果中。先 record-step 保存并呈现场景，收到原话后才用 `journey-step` 的 scene/options/userInput/inputRefs/complete 保存该轮，结束时 complete 为 true。最后得到蛋的结果仍不透露孵化身体。

检查点：场景具体、有线索与代价；前面选择影响后续；原话有来源，用户一次选择只算一轮；中断能从已存步骤续接；五轮内结束；没有代答、额外测试用户人格或变成找蛋任务。

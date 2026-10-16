# 单元：evolution · 状态、成长与 memory（StoryDesigner）

输入：context、当前 pet 的三块记录、growth、已经形成的 story。可以带上用户明确的 /genpet-grow 请求；遵循 ../../rules.md「成长节奏」「幻化」「soul 与 memory」。

从故事形成状态与变化，成长条件按 ../../rules.md「成长节奏」。deadline 到期或明确 grow 时按 runtime 要求前进一阶段。成年时判断进入、延续或结束幻化：读最近几篇故事保存的观察，用户同一种状态持续三天以上才考虑进入，growth.special.available 为 false 时不进入；明确 grow 时没在幻化就进入，在幻化中就结束。这次的故事不适合必须发生的变化时，修订故事再形成计划，不能静默跳过。

结果：`stage` 为 egg、hatchling、juvenile 或 adult；`state` 为完整状态描述；`reason` 简述故事、context、memory、强行请求或最晚兜底的依据；`special` 为幻化的描述（含幻化对象和契机）或 null，字段名沿用 special；`visibleState` 为看得见的改变，无变化为 null；`memory` 为值得记住的完整简短重写文本，否则 null。

检查点：阶段顺序、五次经历与截止规则准确；成长来自积累且不评价用户；身体不变的穿戴、状态和姿势属于日常；幻化只在成年，有幻化对象和用户的持续状态作契机，不评价用户，安全护栏按 ../../rules.md「幻化」；soul 未被修改；memory 保留重要旧相处且引用真实依据，未完成内容未写成事实。这里只形成计划，尚不声明显示或成长完成。

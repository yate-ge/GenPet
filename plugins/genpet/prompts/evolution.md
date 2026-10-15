# 单元：evolution · 状态、成长与 memory（StoryDesigner）

输入：context、当前 pet 的三块记录、growth、已经形成的 story。可以带上用户明确的 /genpet-grow 请求；遵循 meta.md「成长节奏」「soul 与 memory」。

从故事形成状态与变化：未成年阶段积累五次完成的 memory 经历后，由 Agent 选承载成长的一次，优先真实生活节点；没有新节点可推进已有共同经历，不把最晚时间当成最短等待。deadline 到期或明确 grow 时按 runtime 要求前进一阶段。成年判断进入、延续或结束特殊形态。候选故事不适合必须发生的变化时，修订故事再形成计划，不能静默跳过。

结果：`stage` 为 egg、hatchling、juvenile 或 adult；`state` 为完整状态描述；`reason` 简述故事、context、memory、强行请求或最晚兜底的依据；`special` 为特殊形态或 null；`visibleState` 为看得见的改变，无变化为 null；`memory` 为值得记住的完整简短重写文本，否则 null。

检查点：阶段顺序、五次经历与截止规则准确；成长来自积累且不评价用户；身体不变的穿戴姿势属于换装；身体变体只在成年，起因可爱；soul 未被修改；memory 保留重要旧相处且引用真实依据，未完成内容未写成事实。这里只形成计划，尚不声明显示或成长完成。

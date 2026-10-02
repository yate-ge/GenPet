# 单元：story · 新经历

输入：context 的结果、同一个体的 pet 记录；可附加近期故事、保存素材与用户请求。共同规则见 meta.md，变化判断由 evolution 单元完成。

## 步骤

1. 根据用户的具体线索与宠物已有生活形成新经历。延续宠物自己的生活，同时建立有意义的用户联系。
2. 写出故事草案，再说明它带来的状态意图与图文各自要表达的内容。此时没有执行变化，草案不是完成声明。
3. 标明采用的事实 ID。题材、视角、篇幅和形式保持开放，由当次故事决定。

结果：text 为新故事草案；connection 为本次联系；evidenceIds 引用 context 的事实；stateIntent 为故事带来的状态意图；visualIntent 说明图像或 artifact 如何配合文本。均为开放内容。

检查点：故事是否先于状态决定；是否延续前史又能形成新经历；联系是否具体且有事实依据；宠物的生活是否只是复述用户工作。资料不足时保留有限联系，不补造事实。

## 后续流程

保存本单元结果 → evolution 判断阶段、状态和特殊变化 → appearance 决定复用或新视觉方案 → 保存 StoryPlan → 制作实际素材并运行 image-review → 更新目标 Avatar → 完成故事 → output。

StoryPlan 的 text 使用本故事；basis 使用事实与 evolution 的简短判断；stage、state 由 evolution 结果提供；appearance 来自 appearance 单元。没有形象变化时省略 appearance，仍可以表达故事图像。一次故事不必进化，也不必生成新形象。

中断时继续已保存的结果和计划。各步的内部记录使用 record-step；对话只呈现实际结果支持的故事和图像。

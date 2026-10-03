# 领养流程 · initialization

本文件只编排各单元，不是另一个创作单元。规则见 meta.md；单元合同与测试见 ../references/generation-units.md；对话遵循 output.md。

1. **context** → **encounter** → **genes** → **personality**：依次使用前一步的结果。
2. **appearance**：以获得故事、genes 与 eggAppearance、egg 阶段、已保存素材及宿主要求，决定蛋的视觉方案。
3. **计划**：组装 StoryPlan——text、place、connection 来自 encounter；genes 来自 genes，stage 为 egg；personality 来自 personality；state 与 appearance 由获得故事和蛋的形象形成；basis 摘要记录采用的依据与不足。保存后完成图像生成、image-review 与宿主更新。
4. **output**：基于实际完成的结果表达获得故事；孵化前不发命名邀请。

各单元结果用 record-step 保存，完整计划用 plan-story 保存。计划保存前可修订某个单元并重新核对下游；保存后的图像修正继续同一份基因与故事。偏差记录到具体单元及其输入，而非给整段流程一个总评。

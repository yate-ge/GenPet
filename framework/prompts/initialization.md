# 领养流程 · initialization

共同规则见 meta.md。各单元的输入、结果与独立测试方式见 ../references/generation-units.md。中间结果只保存在内部，对话遵循 output.md。

## 流程与中间产物

1. **context**：从实际可用资料形成 facts 与 unknowns，保留来源。
2. **encounter**：使用 context，形成有意义的获得故事、地点与 connection；用户事实通过 evidenceIds 关联。
3. **genes**：使用同一 context 与 encounter，先形成 designBasis，再形成自包含的 genes 与 eggAppearance。
4. **appearance**：以获得故事、genes 和 eggAppearance、egg 阶段、已保存素材及实际宿主要求，决定蛋的视觉方案和故事图文配合方式。
5. **计划**：把上述产物组装成现有 StoryPlan，保存后完成图像生成、image-review 与宿主更新。
6. **output**：基于实际完成的结果与可用素材表达获得故事。

每步使用前一步已经形成的结果；相遇地点和身份在图像阶段保持不变。已有中间结果时继续使用；有问题可在计划保存前修订对应单元，并重新核对下游关系。计划保存后的图像修正继续同一份基因与故事。

## StoryPlan 的来源

- text、place、connection 来自 encounter。
- genes 来自 genes 单元，stage 为 egg。designBasis 与单元结果作为内部步骤保存。
- state、appearance 根据获得故事和 eggAppearance 形成；appearance 单元决定复用或生成方式。初始化必须有当前蛋的形象。
- basis 摘要记录采用的 context 依据与不足，只保存相关摘要。

保存各单元简短的输入引用和结果，使用 record-step；保存完整计划使用 plan-story。具体 CLI 见执行流程。单元记录不替代完整计划，计划中的变化在实际完成前仍是计划。

## 检查点

各单元可以分别固定上游结果单独测试：固定资料测相遇，固定领养故事测设计依据与基因，固定基因测形象，固定完成结果测故事输出。检查顺序见 meta.md。偏差记录到具体单元及其输入，而非给整段流程一个总评；每一步都用当次个体的具体内容填写。

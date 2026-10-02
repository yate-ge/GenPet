# GenPet

轻量的故事驱动像素宠物框架，采用 GenFaceUI 元设计思路。本地开发版本为 0.5.0。

主要版本是 `plugins/genpet-dots`，普通 Pet 版本是 `plugins/genpet`。它们在各自环境中管理独立的编号、基因、故事、素材和 Avatar 绑定。

- `/genpet-start`：初始化或继续同一只宠物。
- `/genpet-story`：先形成新故事，再决定状态、形象变化和图文表达。
- `/genpet-grow`、`/genpet-reset`：保留用户明确请求的阶段验证和重新领养。
- 普通 Pet 另保留 `/genpet-switch` 与明确启动的 `/genpet-debugger`。

每只宠物从一颗字面意义上的蛋开始，设计依据来自它的领养故事；孵化后成为有生命的宠物，并随你近期工作的变化进化。Agent 自行选择上下文、判断工作变化与素材复用，对话只呈现宠物故事和实际视觉内容。产品规则只在一处定义：[`framework/prompts/meta.md`](framework/prompts/meta.md)。

开发者修改 `framework/prompts`、共享参考说明和 `src`；每个插件维护自己的入口与宿主配置。构建复制共享文件并生成独立运行包。默认数据目录为所在环境的 `~/.genpet/desktop` 或 `~/.genpet/dots`，不共享同一宠物。旧记录可以显式迁移，保留编号与形象，不因读取状态而成长或重置。

生成提示词拆为 [八个可独立测试的单元](framework/references/generation-units.md)，明确输入、结果和检查点。`unit-request` 组装固定输入的测试请求，`verify-unit` 检查输出合同，`record-step` 将中间产物保存在内部任务／故事记录中。语义与实际图像另作检查，步骤保存不会推进宠物阶段或修改 Avatar。

见 [产品设计](docs/PRODUCT_DESIGN.zh-CN.md)、[新版验证说明](docs/NEW_VERSION_VALIDATION.zh-CN.md)、[开发规则](CONTRIBUTING.md)和[文档索引](docs/README.md)。0.5.0 供跨设备验证。开发与安装检查不触碰真实宠物；生成效果、动画和宿主显示是不同的验证层次。

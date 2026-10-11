# GenPet 开发与验收摘要

开发版本为 `0.10.0`，尚未公开发布或升级用户实际安装。原始报告、图片、请求及测试数据保留在本地 `output/` 和 Google Drive，不提交 Git，不操作 Obsidian。测试使用合成资料与独立测试 Pet。

[成果汇报 PDF](https://drive.google.com/file/d/13oSP60mjBLSoC6R1xSrA9HYetCxodSng/view) · [Word](https://docs.google.com/document/d/1WP0MAtJONsqVWJNEyP7JhSVXjJ4is6Bx/edit) · [成果目录](https://drive.google.com/drive/folders/11WW2UEENWFibU8VG2jzycz_arD-6-tCF)

## 2026-10-11 审查修复

- 缺失的活动或指定记录现在明确报出 Pet ID 和文件路径，不再当成没有 Pet；损坏 JSON/故事快照保留异常行，健康 Pet 仍可选择及定位故事。调试器先加载列表，活动记录异常也能看到其它 Pet。
- 新宿主结果拒绝自行声明 `displayStatus: confirmed`；历史记录仍可读取。云端存图像素、选择回读和刷新送达不作为屏幕显示证据。
- 移交先保存状态，再写 registry，沿用移交 ID 关联活动账本；中断后只续接同一移交，保留原文件与暂停时长。
- 故事草案与最终表达分开，文字说它的想法与发现，图承担可见动作。家的图使用本阶段实际单体作身份参照，旧家负责布局连续性。道具、家和 Pet 统一采用卡通像素语言；纸布木的内部明暗也由色块表达，拒绝只把轮廓像素化的写实材质。
- 只补两个真实缺陷回归用例并扩展已有宿主/移交用例，没有给静态图增加 Node 测试。针对性检查 43/43，最终受影响检查 32/32；完整 `verify:release` 通过 148 项、1 项平台跳过，类型、格式、插件重建、版本门禁与隔离安装核对通过。
- 发布基线已 fetch `origin/main`；检查时 marketplace 源 HEAD 为 `f859f3d05f3213ccb4f435c65b3274df8b6fdb34`。最后的统一像素提示已重建并重新核对隔离安装版本 `0.10.0`，路径 `output/review-fixes-20261011/engineering/final-install/release-93oNK9/codex-home/plugins/cache/genpet/genpet/0.10.0`，86 文件哈希与本次生成工作树一致。这不是用户实际安装或公开发行。
- 全量远程冷克隆实测21.293秒，随后独立目录checkout阶段0.172秒，两个阶段合计21.465秒；本轮未重写历史，也未 force push。该样本不保证所有网络环境都在30秒内完成。

## 本轮新增成果

- 两套完整新形象：B 幼年旅行装 **17分41.704秒**，D 少年维修工 **13分24.491秒**。均从最早准备计时，含新基图、9动作/16方向、排队、独立审核、组装、同 cloud ID 更新、下载 RGBA 验证、故事完成、简介同步及回读；归档上传另计。
- B 16次工具调用得到15图，1次服务失败没有图片；3行视觉返工。D 12次调用得到12图，无工具失败、返工或兜底。两例均不复用旧套，测试目标未选中，原 active Pet 保持。
- 三篇新完整单元故事，11张新图，6张采用、5张修正前候选保留；自然文字与实际身份/像素风格经独立复核。C 幼年贴身鳍缝、少年短圆半鳍、成年宽展扇鳍的三张新图通过128/64同长边对照；这是静态补测，不代表重新完成C宿主成长流程。
- 六组道具统一风格补测通过：新故事的风轮/折页，以及旧稿中的两空壳、门页纸船、双石露滴、两段折片均重画为像素。折片一次仅轮廓像素化的返工稿保留为负例。放大报告后另发现纸窝家景的纸粒/叶脉偏写实，已补一张实际新图并独立复核；三石、两叶转口和旧住处关系保持。其余20个家景及已一致道具保持。
- 本轮47张生成原图，加此前131张，共 **178张**均进入52页报告正文或附录；五张旧风格图、初稿和旧版不当作当前成功证据。所有新PNG直接上传分类文件夹，没有新增图片压缩包。

[Pet形象与换装](https://drive.google.com/drive/folders/1rxCMa9XLn7V-qPwxNuUCk7AqYny8se-f) · [故事图片与道具](https://drive.google.com/drive/folders/1-ILe1GuFshDP_UU6Ikg9hCB6JpXnOM8b) · [家的变化](https://drive.google.com/drive/folders/1hWgr5hAhDFsasE0JEsyYDR3N8H2S0z7r) · [本轮原始记录与结果](https://drive.google.com/drive/folders/1amG-7Hq4We_p00QHs-bKKT8kT_qLxaur)

## 仍需宿主证据

实际屏幕显示、整段真实定时孵化与离线启动追赶、实际菜单唯一性、Dots干净新会话/第二环境与主动联动仍未全验收。已实现代码、存储RGBA和同会话语气不能替代这些结果；20分钟仍是完整单形象目标，少量达标样本不构成普遍保证。

## 既有证据

此前覆盖六组蛋/幼年、D真实四阶段、F特殊形态及本只恢复/复用、380篇内容计划与17篇代表故事媒体、四类角色各两种身体，以及六组同家变化。部分为静态媒体或影子计划，范围与负例在报告中标明。

[开发档案总目录](https://drive.google.com/drive/folders/1CVeJ6GWAGcsmP6HjGVQxplA1TAkRXU_W) · [D四阶段](https://drive.google.com/drive/folders/1_VchPjgcaegFpPN0d4Uqrbh0ivNL54KG) · [F特殊形态](https://drive.google.com/drive/folders/1_8hvCSzS7JHrP15PPvm9R6LTI2oLgPfq) · [此前成长/特殊/角色记录](https://drive.google.com/drive/folders/1jCRkFtWHE2fx8OkHtDz7wuUMAisvhY4s)

[历次完整证据索引留档](https://drive.google.com/file/d/1EQnYSzl-8IcUp5O1mHA1hd_D-bvMDfwK/view)保留此前所有逐轮记录，本页只留当前结论和有效入口。[审查原文](https://drive.google.com/file/d/1VgA5zr00C3XXD0iyIq-w4eWtSqcswhw_/view)与本轮报告一起查阅。

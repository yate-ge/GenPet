# GenPet 开发与验收摘要

市场主干版本为 `0.10.1`。原始报告、图片、请求及测试数据保留在本地 `output/` 和 Google Drive，不提交 Git，不操作 Obsidian。测试使用合成资料与独立测试 Pet，安装验收仅在隔离 CODEX_HOME 中执行。

[成果汇报 PDF](https://drive.google.com/file/d/13oSP60mjBLSoC6R1xSrA9HYetCxodSng/view) · [Word](https://docs.google.com/document/d/1WP0MAtJONsqVWJNEyP7JhSVXjJ4is6Bx/edit) · [成果目录](https://drive.google.com/drive/folders/11WW2UEENWFibU8VG2jzycz_arD-6-tCF)

## 2026-10-13 0.10.1 抽帧修复与新测试轮

- 10-12 桌面重装 E2E 的默认抽帧缺陷已修：按格提取前去掉每格孤立残点（阈值同 components 已忽略的噪点），一个角落残留像素不再把整行缩小悬空。新增合成回归，修复前失败、修复后通过；未加参数或配置。
- 用该轮保留负例复核：右跑帧高约115→189/208，其余7行逐字节不变；整个孵化目录副本（仅撤回同源图的失败记录）走正常处理，生成 atlas 与上一轮手动恢复并独立接受的 atlas 11行解码 RGBA 全同。这是开发方工程试跑，不替代真实流程验收。
- `workflow.md` 失效引用改为 `../prompts/initialization.md`；`meta.md`/`output.md` 补充：宠物不做用户行为的缩小版、不以复述用户开头，避免重复主题与句式；孵化家的布局交给图；失败先说没做成什么。只改措辞，未加阈值。
- `verify:release` 通过（Node 151项：149通过、2项macOS跳过、0失败；隔离安装0.10.1、86文件哈希一致），Python 管线测试25/25通过。
- [修复证据](https://drive.google.com/drive/folders/1ZHt1ZSjPFLfVZrOJ9up89DjXohmn37Pm) · [0.10.1 测试轮方案与结果目录](https://drive.google.com/drive/folders/1CsGg2WtJE6xA3AvYeJKJmm3kubzuGuwI)：R0安装、R1抽帧与孵化耗时、R2宿主能力表、R3真实定时、R4人工目视显示、R5多资料多样性、R6文案回归、R7真实资料领养；R2后三项、R3、R4、R7需用户授权。

## 2026-10-11 同步 main

- 从 `codex/full-implementation` 快进同步到 `main`，市场版本由 `0.9.4` 升级为 `0.10.0`；根包、锁文件、插件 manifest 与生成包版本一致。
- 按发布规则运行 `npm run verify:release`：150 项通过、1 项平台跳过；类型、格式、插件重建、版本门禁、隔离安装、已安装 CLI 与可选调试器检查全部通过。
- 隔离市场源 commit 为 `8d37bfccd6b4975f7806a5e467f7e0470c2033d7`，安装版本 `0.10.0`，安装路径 `C:/Users/geyat/Documents/workingProjects/GenPet/output/main-sync-20261011/release-tests/release-RndKhT/codex-home/plugins/cache/genpet/genpet/0.10.0`，86 个文件哈希与源包相同。检查后只更新根 README 四种语言的市场状态和本页日志，交付插件文件未变。
- [发布检查日志](https://drive.google.com/file/d/1cYa3OiJdKYja38l3UB45TvJrp2A8IOJA/view)与[验证工程数据](https://drive.google.com/file/d/1sbZ4g0sn5U_b2UaroVqjKW0-1hhB_Mi-/view)已归档，797 个源文件含合成 fixture、隔离安装与原始输出，路径及 SHA 见[清单](https://drive.google.com/file/d/1skySZbGxq-_K72fox0tRo_QuRlRsRsAC/view)。既有生成图片仍直接保存在分类文件夹。

## 2026-10-11 最新 AGENTS.md 补齐

- 蛋的五小时改为最晚兜底，当前阶段经历足够也可提前孵化；故事候选开始前同时读成长资格和截止要求，Agent选承载成长的经历并优先真实生活变化。次数只用于内部判断。
- 纯文字也按近期内容加权，第三篇连续纯文字仍要求可见结果；纯文字不能只引用宠物自己虚构故事或其memory ID，必须能追到实际用户资料、旅程选择或对话。
- 新基因以具体来源和各结构/属性/能力理由设计：白睡莲Nymphaea alba、竹木弹簧衣夹、《千与千寻》无脸男。固定种子实际选择、同一设计返工不重抽。17张新生成原图中10采用、7候选保留；新四阶段通过128/64对照。成年原稿三瓣未满足五瓣基因，只修该图，不修改基因迁就结果。
- 新物件前两稿的渐变/晕光未采用，最后改游戏图标视角和米白底；物件和家的图沿用本只实际接受的像素语言。所有新PNG直接上传分类文件夹。
- 21个模拟交互情境独立复核，纠正缺媒体却声称完成、已请求刷新却说送达、保留记录却说屏幕原样，以及明确替换后再问许可。14项隔离运行时观察使用合成宿主；一例成功孵化output单元引用同一identity的两张实际新图。未把这些计为21项真实宿主端到端通过。
- 27项受影响检查通过，类型/格式、插件重建、版本一致与`origin/main`版本门禁通过；只新增2个真实缺陷回归并修改已有蛋边界，没有新图片/文案关键词Node测试，未重复完整发布套件。
- 当前报告为62页、195张实际生成原图（此前178＋本轮17），未采用稿全部标明。PDF去除ASCII85编码冗余，从107,176,945降到85,789,206字节，265个解码流逐一相同，页面不变且首页渲染像素SHA一致；生成原图不变。超限原PDF及两段原始字节留档可精确拼回原SHA。
- 完整新形象20分钟目标不变，沿用此前B 17分41.704秒/D 13分24.491秒的完整实测；本轮静态图不冒充新的整套计时。工具断流从保存记录续接，原始准备/中断时间保留。未发布、未升级用户实际插件、未操作用户正在养的Pet。

[本轮原始数据映射](https://drive.google.com/file/d/1WZNbrlyFT-QsTxF7GPigHrIOMPxymncf/view)保留已交稳定原件；补充批次、21条文案、全部新图、报告源与实际回执在同一[开发档案目录](https://drive.google.com/drive/folders/1amG-7Hq4We_p00QHs-bKKT8kT_qLxaur)。旧摘要已留档，不替代当前补测。

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

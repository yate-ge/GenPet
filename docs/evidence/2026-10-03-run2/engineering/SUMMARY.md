# 工程测试报告 · 2026-10-03

基线：GenPet 0.8.1，提交 `d4bc393b5724ef55ff2cb622fd10b2aeb5cf38b4`。未改运行时代码、未提交或发布。真实宠物、Avatar、用户资料与定时任务未触碰。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 基线 npm test | 57 通过，0 失败，1 跳过 | npm-test-baseline.txt |
| 首批新增后 npm test | 70 通过，0 失败，1 跳过，共 71 项 | npm-test-expanded.txt |
| 最终 npm test | 70 通过，1 失败，1 跳过，共 72 项；新增产品语义回归发现真实 bug | npm-test-final.txt |
| TypeScript check | 通过 | check-expanded.txt |
| Python artwork pipeline | 14/14 通过 | artwork-pipeline.txt |
| build:plugin | 通过，git diff 无内容变化 | build-plugin.txt |
| verify:version | 通过，0.8.1 对比 origin/main 0.8.1，未更换比较基线 | verify-version.txt |
| verify:fast | 失败：现有 54 文件格式检查失败；类型检查通过，测试阶段被短路 | verify-fast-baseline.txt |
| verify:release | 失败：同一格式门禁，未进入构建/安装阶段；不能宣称整体验证通过 | verify-release.txt |
| verify:native 默认路径 | 脚本默认 macOS `/Applications/ChatGPT.app/Contents/Resources/app.asar` 在 Windows 导致 ENOENT | verify-native.txt |
| verify:native Windows 路径适配后 | 失败：Native action repetition changed; inspect playback（scripts/verify-native-contract.ts:64） | verify-native-windows-adapted.txt |
| 独立隔离安装/哈希/CLI/debugger | 两插件通过，仅验证 release 下游能力，不替代失败的门禁 | isolated-install.txt |

平台跳过的是 `IPC rejects writable-by-others directories before connecting`（POSIX 权限语义在 Windows 不适用）。

格式门禁进一步只读诊断：54个报错文件全部含 CRLF，仅在内存规范为 LF 后，54/54 都符合当前 Prettier 内容格式。实际文件未改；format-diagnosis.json 保留逐文件结果。仍保持原 verify:fast/release 失败状态；这是换行适配问题。新增两个测试文件独立 format 与最终 TypeScript check 通过。build 后六个生成文件工作副本为 LF，git status 可暂示 M，但 git diff/stat/numstat 均无内容差异。

新增 `tests/growth.test.ts`、`tests/cycle.test.ts` 共 14 项。5 组使用独立临时 Store、模拟时钟和模拟宿主，每组实际提交 8 篇故事，完整经历蛋→幼年→少年→成年→特殊形态→形态内更新→恢复→再次特殊形态。分别覆盖提前成长、恰好截止、逾期多日仍只进一阶段、宿主失败重试、历史素材复用及其他 Pet 素材过滤。共 40 篇实际持久化故事；每组 6 份合成素材，成年恢复没有生成重复素材。`cycle-1.json` 至 `cycle-5.json` 保留每个提交后的状态快照。这些合成 PNG 仅验证工程，不是视觉验收证据。

同时验证：蛋 5 小时、幼年与少年各 7 天（合计两周）的截止前 1 ms、恰好截止、截止后；成长起点优先取当前 Pet 首个阶段故事→导入时刻→领养时刻；特殊形态两天结束/七天进入及恢复后重新计时；更新特殊形态说明不重置起点；家只能孵化后建立、历史不覆盖、取消与失败不提前提交；基因、性格、Pet ID 保持；重试不重复故事；未完成普通故事阻挡 reset，失败初始化 reset 的完整备份与重试去重；跨日、用户时区、DST 和错过时段合并。

隔离安装 marketplace 是新建 local-path 配置（`alreadyAdded:false`），直接指向当前仓库，不存在旧 Git 快照；CLI `marketplace upgrade` 仅适用于 Git marketplace。本次临时 CODEX_HOME 安装后已清理。

| 包 | 源提交 | 已安装版本 | 哈希数量 | 已校验临时路径 |
| --- | --- | --- | --- | --- |
| genpet | d4bc393b5724ef55ff2cb622fd10b2aeb5cf38b4 | 0.8.1 | 73 | C:/Users/geyat/AppData/Local/Temp/genpet-independent-release-6ijjbN/codex-home/plugins/cache/genpet/genpet/0.8.1 |
| genpet-dots | 同上 | 0.8.1 | 41 | C:/Users/geyat/AppData/Local/Temp/genpet-independent-release-6ijjbN/codex-home/plugins/cache/genpet/genpet-dots/0.8.1 |

## 发现的产品 bug：延迟初始化把孵化截止推迟

meta.md 明确蛋最晚领养后 5 小时孵化。回归构造 adoption=0h、首篇初始化完成=1h，在领养后 5h 要求 `growth.required === 'advance'`，实际为 null；当前代码采用首个 completed egg story 作起点，错误地给出 6h 截止。保留失败测试 `tests/growth.test.ts:68` 与断言 `:82`，错误 `null !== 'advance'`，详见 growth-product-regression.txt 与最终全套日志。未修改运行时、未把预期改成现有实现。

Windows 原生兼容测试只读复制安装包 `C:/Program Files/WindowsApps/OpenAI.Codex_26.930.3930.0_x64__2p2nqsd0c76g0/app/resources/app.asar` 到临时目录的 `Contents/Resources/app.asar`，通过 GENPET_CODEX_APP 指定，安装目录和脚本均未修改。宽高、帧数、动作时长和方向等前序断言通过，最后动作重复次数的具体源码字符串匹配失败。

继续只读查验表明是检查脚本绑定压缩变量名称的假失败：原检测期望 `let r=[...n,...n,...n]`，当前源是 `let i=[...r,...r,...r]; return {frames:[...i,..._Ga],loopStartIndex:i.length}`；idle 仍 `hGa=6` 并把每个 `frameDurationMs` 乘 `hGa`。保存的 native-repetition-evidence.json 直接包含相关片段。独立语义核对支持3次动作重复和6倍idle契约仍相符；原 verify:native 命令仍失败，不宣称它通过。复制到的临时目录已校验绝对路径在Temp内，并清理；真实安装未修改。

命令确认另有 16/16 独立 Agent dry-run（实际 skill/output prompt 快照与 mock trace），详见 CONFIRMATION-REVIEW.md。这是隔离决策与mock执行证据，不是生产聊天/真实工具运行证据。

工程测试至此完成。已知失败保留，真实宿主显示和定时触发未执行。

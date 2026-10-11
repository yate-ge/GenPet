# Codex Pet 与云图更新

实际命令与接口由运行时提供，按唯一 Pet ID/绑定更新。产品规则见 meta，记录见 storage.md；不调用或依赖 Computer Use。

明确切换请求先读 `switch-pet --current`。本地列表中的已迁移项用当前账号真实cloud ID，旧custom:别名也解析到它；列表不代表全部云条目。没有本地清单的云Pet用宿主实际 `list_pets` 和现有选择API，随后独立回读选择；不能把未列出的云ID当本地CLI条目，也不能把选择回读当显示证明。

## 生成一套 Avatar

宿主要求是透明 v2 atlas：1536×2288，8×11 格，每格 192×208；九种动作行有效格数 6、8、8、4、5、8、6、6、6，最后两行为十六方向。未用格透明，r0c6 是中性参考。格式检查不能证明可爱、阶段、动画或故事。

通过 workspace dependencies 找到 Python，读取实际 helper --help 与运行 manifest。用当前 appearance 请求、真实参考和绝对 run 路径调用 prepare_pet_run.py；蛋用 --egg，其余按当前并行模式。不要覆盖原 run，重试使用它已经保存的工作。

基准图先实际看图并记录接受。基准通过后九种动作和方向独立并行生成，按 manifest 的真实 job IDs，不额外串行生成方向参考。方向可只生成一侧、由处理代码镜像；不对称身体必须核查关键部件，镜像破坏身份时给那组单独生成，不能盲目翻转。

提取、统一尺寸、透明与组装用确定性脚本；脚本输出的通过只是格式结果。最终整套在实际显示大小视觉审核一次，确认动作、方向、身体与穿戴一致，合计两次视觉审核。相同视觉错误第二次换方法，单行达到 helper 的返工上限时用已接受基准姿势补帧并记录不足，再看组装后的真实结果。候选、源图、预览、失败和运行输出全保留。

成长图可在预兆时先准备。适合目标阶段的已接受预生成图到期复用，衣装/故事变化仍需匹配；无有效目标阶段基准时保持未完成，不拿旧图声称成长已完成。

## 更新同一只

1. `find-avatar`/`diagnose` 查询记录绑定、宿主 Pet 条目、当前选中项和 local-to-cloud 映射。custom: 与映射 pet_ ID 是同一只。
2. `set-appearance`（publish 的兼容入口）拿已接受 atlas，写实际目标。迁移后更新实际 cloud ID，不能只写本地 atlas 或选回 legacy ID。先保存/核对云目标，未知上传结果先回读，别重复新建。
3. 用运行时列出的当前 host API/app-tools/IPC 请求更新与云 Pet 资源刷新。保持当前选择；目标 active 时立即请求刷新，inactive 不改选中项。
4. 回读云端存的真实 artwork，保存实际下载文件，`host-result OPERATION_ID RESULT_FILE` 核对该文件与已接受图。结果包含 petId、operationId、appearanceId、实际 avatarId/cloudId、updated、storedArtworkVerified、active、refreshRequested、displayStatus、readbackFile 和 observed；readbackFile 是与上传源分开的实际下载绝对路径，storedArtworkVerified 的最终值与图像哈希由 runtime 核验。布尔 updated、目标选择回读与 refresh 请求都不能证明 stored image 相同或实际显示。
5. 回读一致后才按完成要求 finish-story。尚未上传保留 pending；上传成功但刷新不可用记录该事实，显示保持 unknown，不能承诺未上传的图片下次加载自动生效。

source 写实际图像生成与参考来源。portrait/atlas 分别接受，新阶段最终消息采用 portrait；不用整套 atlas 当聊天图。安装不改用户选择、不采用新 Pet、不生成图。

## 诊断和修复

用户自然语言报告加载、缺失、不显示，先只读检查。四项分开：条目是否存在、是否选中、刷新是否送达、实际是否显示；接口不能确认的项保持未知。另查看已安装版本、记录与云绑定、任务引用。

只修复实测可靠的现有条目/资源/刷新步骤，不重置、不成长、不改 soul、不重画。无法直接切换或显示时，直接告诉用户在 Pet 设置里选择诊断返回的那个唯一标签，或打开显示开关；只说实际需要的一步。开发时真实宿主验证用专属测试 Pet 与 cloud ID，不接管用户正在养的那只。

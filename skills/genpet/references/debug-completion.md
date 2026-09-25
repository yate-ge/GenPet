# 调试动作的完成条件

先读本插件的 [GenPet skill](../SKILL.md) 的 Generate or update artwork 部分。调试只豁免用户明确要求的重置或年龄加速，其他视觉规则、官方 atlas 合约和 QA 均保持。

1. 变更工具只更新设计状态。检查返回的 artRequest；pending 使用内置 imagegen 和 bundled hatch-pet 生成、验收 portrait/atlas。一次只完成当前设计；每动作行最多两次修复。paused 说明用户关闭了 autoArt，不擅自开启，报告设计已改变但素材生成暂停。
2. ready 可以复用同一用户、同一设计 ID 的已验收 atlas。**ready 也必须调用 genpet_install_native**，因为当前屏幕可能仍是其他道具或阶段。不要使用打包示例替代真实形象。
3. 新蛋只参考新蛋设计，不带入备份中的旧角色；首次出生只参考当前蛋与新解析的 birth identity；以后始终参考固定出生形象。比较成长用相同姿势和道具，检查实际 cell 中的身体比例，不以文件哈希或年龄数字代替可见成长。
4. genpet_install_native 自动更新同一个 genpet-companion。不要设置 GENPET_SKIP_NATIVE_REFRESH。仅 displayStatus=confirmed 可以说画面已切换；失败保留之前通过验证的素材，并区分逻辑状态、素材完成和可见刷新。
5. 报告命令参数、前后阶段/道具、是否为调试年龄、备份（如有）、素材和显示状态。生成失败后恢复工作只重新读取当前请求，不重复执行导致再次重置/加龄的动作。

在明确执行调试命令之外，定时任务不调用任何 genpet_debug_* 工具。不要创建额外 Pet、Demo 条目、网页、定时任务或宿主动画。

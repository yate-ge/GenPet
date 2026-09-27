# 同一个原生 Pet 的演示与验收

**当前状态：**首次初始化与后续换图优先通过现有本地 IPC 请求同一原生 Pet 刷新，普通启动无需调试端口。IPC 可见切换已由用户验证；每次调用仍分别报告请求转发和显示哈希核验。

## 日常使用

1. 安装插件后说：**领养、安装并启用我的 GenPet 自动成长**。已有宠物不会重新领养。
2. 插件读取近期活动，生成只有微弱色彩和纹理线索的普通蛋；此时幼体身份未决定。
3. 通过检查后安装到固定的 `genpet-companion`。首次在 Codex 的 Pets 设置中选择 GenPet；之后继续更新同一条目。
4. 5 小时后根据孵化期线索首次解析、生成幼体；后续每日成长、每 5 小时更新情境。
5. 所有后续图像更新都替换这一个条目的素材。Pet ID、领养时间和孵化后的个体身份持续保留，不新增宠物，也不需要在不同阶段条目之间切换。

旧版误创建的 GenPet Demo 会在本项目安装脚本升级时移到可恢复备份中。旧 `demo-native` 命令已删除；演示模式不能安装原生 Pet。

## 核对一次真实更新

记录更新前的 Pet ID、领养时间、设计请求与素材文件。新素材完成生成和检查后，接受它并运行 `install-native`。确认仍只有一个 GenPet 条目，清单引用新素材且保留前一版清单，再观察同一原生宠物是否显示新形象。

IPC 使用宿主内部的 `query-cache-invalidate` 消息。`automaticRefresh=true` 表示自动请求已转发，`displayStatus=unconfirmed` 表示未测量本次显示哈希；不应要求用户为此开启调试端口。IPC 失败时报告错误并保留重试状态。详见[原生刷新说明](../plugins/genpet/docs/NATIVE_REFRESH.zh-CN.md)。

## 开发验证

加速模拟仅用于隔离数据：

```sh
GENPET_DATA_DIR=/absolute/temporary/test-data node dist/cli.js --demo adopt
GENPET_DATA_DIR=/absolute/temporary/test-data node dist/cli.js --demo art-request
# 按请求生成并接受蛋之后，才推进模拟时钟
GENPET_DATA_DIR=/absolute/temporary/test-data node dist/cli.js --demo advance 5
GENPET_DATA_DIR=/absolute/temporary/test-data node dist/cli.js --demo art-request
```

`--demo install-native` 被明确拒绝。开发测试可把图集和清单导出到临时目录，不能向用户的原生 Pets 列表增加验证样本。真实领养时间不受模拟影响。

日常代码改动运行 `npm run verify:fast`。准备发布时运行 `npm run verify:release`：它会检查源码、重建 `plugins/genpet/`，在临时 Codex 环境通过仓库 marketplace 安装插件，然后在安装副本上运行隔离 CLI 全流程；不会重置真实宠物或安装到用户的 Pets 目录。真实显示另按当前设计请求验收，详见[验证工作流](PROJECT_STATUS.zh-CN.md)。

`assets/examples/lifecycle/` 保留离线正向孵化、成长与道具变化样本及其来源记录。这些是开发证据，不是用户宠物的候选形象，也不能替代真实宠物的视觉验收。网页调试器随插件附带，默认关闭。

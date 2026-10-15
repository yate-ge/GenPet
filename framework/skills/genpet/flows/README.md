# 主流程

运行时输出与结果文件供内部使用。产品规则读 ../rules.md，可见输出读 ../output.md，具体 Designer 由主 skill 按需加载，单元格式见 ../host/units.md。

各流程：[领养](adoption.md)、[每篇故事](stories.md)、[命名](naming.md)、[定时内容](scheduling.md)。本文件是它们共用的调用方式、找到目标 Pet 的方法和对话/任务约定。

从已安装的 skill 目录解析插件根目录（skills/COMMAND 向上两层），执行 `node ROOT/dist/cli.js COMMAND ...`。不用开发仓库或其他安装的运行时。JSON 参数保存到绝对路径文件，shell 参数按当前 shell 正确引用。

可用的全局参数是 `--host desktop|cloud` 和 `--pet PET_ID`。一篇故事确定目标后每次调用加 `--pet PET_ID`；即使中途宿主改选，art-request、accept-art、set-appearance 仍读原来的目录。带 operation ID 的命令也会按原故事路由。

## 找到这一只

先 `status`、`diagnose`，只读查看记录、绑定、当前选中项和迁移映射。用户选中的 custom: 与映射 pet_ ID 是同一只，通过唯一 ID 找到记录。选中非 GenPet 或读不到选择时沿用上次激活记录，保留用户选择，实际结果写明未读到/未匹配。命令的内部结果带目标 Pet ID。

故事开始时记录 Pet ID，之后所有步骤按这个 ID，用户中途改选也完成原故事。其他 Pet 的目录和 cloud ID 不受影响，未激活期限暂停。初始化、导入、替换和新增见主 skill 与 ../host/storage.md，故障见 ../host/desktop.md。

已有 pending 先确认是否仍在执行并续接它，不重抽种子、不重画已完成的图；活跃并发作业只观察和等待。完成的 trigger 不再发一遍内容。没有 Pet 的定时或对话请求不能自动领养。

## 对话、命名和任务

/genpet 处理近况、名字、故障、初始化、替换和其他明确操作；/genpet-chat 才跑 chat 单元，必要时 `note-chat PET_ID NOTE`，不改 memory 或 state。用户说的话在下次 context 中作为一项资料。

命名用 name-pet 对明确 Pet ID，见 naming.md。start 完成后设置普通五小时任务，并按 `due.nextCheckAt` 核验和安排更早的成长截止检查；每篇完成或激活恢复后重新安排，见 scheduling.md。stop 停该任务并 schedule-stop。Dots 保持同一个 cloud ID，主环境移交前停旧写入、验证记录后再开新任务，见 ../host/dots.md。安装、构建、发布和只读检查都不生成 Pet 或任务。

# v3 记录与兼容

记录按 Pet ID 分目录，由运行时管理路径和原子写入；GENPET_DATA_DIR 指向测试/当前环境的根目录。每只 Pet 保存自己的 state.json、故事、chats、steps 和 assets，另有注册记录保存上次激活 ID、绑定与主环境。读 status --full 查看实际路径和记录，不手改注册表或 Pet 文件。

Pet 分三块：

```text
id、name、naming、adoptedAt、revision、binding
soul   { genes, personality, acquisition }
memory { text, updatedAt, storyId }
state  { stage, description, appearanceId, storyId, updatedAt, home, special }
```

soul 在领养完成后不可变，旧宠物缺项可依据已有资料补一次；读取、安装和插件升级不生成设计，不推进年龄。memory 只在成功 finish-story 时按计划重写，没有值得记的事就省略。state 在完成时更新。每个完成故事的 memory 重写仅算一次经历，增长由历史与激活时间算，不给用户数字。

StoryPlan 的内容由各单元形成：

```json
{
  "text": "这一次的宠物经历草案",
  "reason": "采用的真实资料、memory 与变化的简短来由",
  "contextRefs": ["fact:actual-source"],
  "state": "完成后当前状态的完整描述",
  "stage": "egg",
  "genes": "仅新领养或缺项补全：自包含设计",
  "designReason": "仅新领养设计：具体来源与各结构来由",
  "place": "领养旅程得到蛋的地点",
  "connection": "旅程和真实用户输入的联系",
  "personality": "性格、拟声词与基本说话习惯",
  "memory": "确有值得记的事才填写：完整简短重写",
  "home": "孵化或变化时：完整家的描述",
  "appearance": {"description": "故事决定的形象", "reuseArtId": "已有合适图时才填"},
  "mediaIds": ["本故事实际采用的已接受媒体ID"]
}
```

示例只展示字段，按此次实际情况省略不适用项。后续不带 genes/place/connection/personality 重写 soul；home/memory 省略时保持原样。special 为描述表示进入/延续，null 表示结束当前形态，未改变就省略。阶段一次最多前进一格；成长、特殊形态进出都要有效形象。contextRefs 引用已保存的 context 或用户资料，纯文字需真实用户相关引用。

步骤和素材都是内部原始结果。source 记录图的实际生成与引用来源；旧 basis、designBasis、provenance、evidenceIds、carrier、image-review 读取时规范成新名，但历史出处不伪造。v2 的平铺字段归入三块，原有名字、ID、绑定、历史与图保留；v1 按 migrate-legacy 的实际格式与图迁入。只读发现旧记录先报告，经用户确认导入才作为当前 Pet，旧 ~/.genpet/dots 遗留不自动读写或混入新 Pet。

## 新增、替换与清理

新增创建独立 Pet ID、目录、绑定和 cloud ID；替换先备份旧目录，让新 Pet 身份接手原条目与 cloud ID。两种含义先说明并确认。默认保留云 Pet，只有用户点名的条目可删；清理把记录移入备份，报告留下的位置，失败重试沿用相同操作 ID。

一篇故事绑定开始时的 Pet ID，切换选中项不搬它的目录。主环境移交暂时收起（见 dots.md「主环境」），禁止两个环境同时写入。以前移交导出过的记录保持只读，不能被写入。

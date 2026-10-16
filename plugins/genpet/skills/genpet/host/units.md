# 生成单元与结果文件

产品规则只在 ../rules.md；units.json 定义必需输入和基本结果类型。每个单元独立读取上游的实际结果，保存简短输出与出处。字段合法只能证明格式，语义与视觉需另行观察。

## Designer 与单元

| 角色 | 单元 | 读取时机 |
| --- | --- | --- |
| GeneDesigner | context（共用）、encounter、genes、personality | 领养；旧 Pet 缺项的一次补全 |
| StoryDesigner | context（共用）、story、evolution、story-item、chat、output | 新故事、宠物对话与最终表达 |
| PetDesigner | appearance | 新形象、成长、日常、幻化与复用 |
| HomeDesigner | home | 孵化建立家，或故事改变家 |
| ImageReviewer | ImageReviewer | 实际基准图和整套图审核 |

完整角色说明按需读取 ../designers/ 下各角色的 README.md；它们是内部工作文档，不新增菜单命令。

| 单元 | 输入 | 可观察结果 | 核查重点 |
| --- | --- | --- | --- |
| context | 实际资料与读取结果 | facts、traits、unknowns、read | 真正读取、来源与原意、安全过滤 |
| encounter | context、已有 journey | 故事、地点、connection、factIds、journey | 用户真实选择、可续接、五轮内得到蛋 |
| genes | context、完成旅程、random | genes、eggAppearance、designReason | 具体来源与各结构理由，工具选择与身体设计相合 |
| personality | context、旅程、genes | 性格与拟声词/说话习惯 | 行动差异、真实特质来源、之后关系留给 memory |
| story | context、pet、growth、time、recentContent | 经历、factIds、状态/图像/家/memory 意图 | 回应符合观察到的情境、对话留下的话得到回应、一眼看得懂、被养着的 Pet、每次内容、真实联系 |
| evolution | context、pet、growth、story | stage、state、reason、special、visibleState、memory | 五次经历与上限、状态和身体变化、值得记的重写 |
| appearance | genes、story、change、savedArt、hostRequirements | appearance 或 null、visuals | 同一身体、阶段、整套日常样子与动作槽位、真实复用 |
| home | context、pet、story、savedArt | 家或 null、全景请求或 null | 能住的整体、物件延续、孵化全景 |
| story-item | context、pet、story、savedArt | reason、item 或 null | 物件形式、视觉目的、原样文字 |
| chat | pet、message | text、note 或 null | 阶段、个性与 memory，状态不变 |
| ImageReviewer | visual、actualFile | 实际观察、accept/repair、定向修正 | 先产品边界，再设计、阶段、连续性与格式 |
| output | story、completed、availableMedia、name | text 或 null、mediaRefs | 真实完成、一次展示、成长图、孵化命名 |

## 结果格式

每个单元返回一个 JSON 结果文件：

```json
{
  "inputRefs": ["step-of-context", "journey:round-1", "fact:actual-source"],
  "result": {
    "designReason": "具体来源、真实旅程联系与各主要特征的来由",
    "genes": "自包含的这只宠物设计",
    "eggAppearance": "完整常规蛋壳上的线索"
  }
}
```

输入引用定位实际事实、上游 step 或已接受图；不需要复制原始私密资料。额外字段允许，身体与性格仍是开放文字。

正常流程用 `record-step OPERATION_ID UNIT ABSOLUTE_RESULT_FILE` 保存，生成 step ID 留给下游；同一结果重试去重，修订追加新结果保留旧版。StoryPlan 保存前允许修订上游并检查受影响的下游；保存后继续同一故事与选择，只修正视觉请求和实际图。record-step 不改变 Pet 和完成状态。

旧记录读取兼容 evidenceIds→factIds、designBasis→designReason、basis→reason、carrier→story-item、image-review→ImageReviewer、provenance→source。新生成与新写入只用新名，别为了复用旧记录重新生成身份。

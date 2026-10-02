# 核心模块生成测试（在 Codex 中运行）

这套测试检查 GenPet 的创作模块在 `meta.md` 规则下能否根据不同资料生成有依据、个性化的结果。工程正确性由 `npm run verify:fast` 覆盖，这里只看生成内容与图像。

## 原则

- **夹具只写原始资料和规则探针。** `contexts/` 是领养时的用户资料，`events/` 是之后的新资料。遭遇、基因、性格、故事都由 Agent 在本轮实际生成，再作为下游输入，不由测试作者编写，也不规定来源、物种、五官或器官。
- **不设标准答案。** 对照 `framework/prompts/meta.md` 与各单元提示词的检查点逐项观察，不比较固定的故事或基因文字。
- **生成与检查分开。** 生成者只读 `unit-request` 返回的 `prompt`，不读本文件的检查项。检查由独立的子代理或新对话完成；生成者的自我评价不算证据。最终结论由用户给出。
- **合同有效不等于通过。** `verify-unit` 只证明字段齐全。
- **不碰真实宠物。** M1–M5 只调用只读的 `unit-request` / `verify-unit` 和出图脚本；M6 使用隔离目录。

## 准备

在仓库根目录：

```bash
git pull
CLI="node plugins/genpet/dist/cli.js"          # Dots 包为 plugins/genpet-dots/dist/cli.js，单元相同
RUN="$PWD/output/agent-tests/$(date +%F)-run1" # 所有记录写在这里（output/ 不提交）
mkdir -p "$RUN"
```

出图需要 Codex 内置 imagegen 和带 Pillow 的 Python。

## 运行一个单元

1. 写输入文件 `{"inputRefs": [...], "inputs": {...}}`。`inputs` 的字段名见 `framework/prompts/units.json`；上游结果直接放入对应字段。
2. `$CLI unit-request UNIT 输入文件绝对路径 > NN-UNIT.request.json`（CLI 只接受绝对路径，例如 `"$PWD/tests/agent/contexts/rich.json"`）。
3. 生成：把 `request.json` 里的 `prompt` 原样交给生成者（子代理或新对话），保存它返回的 JSON 为 `NN-UNIT.result.json`。
4. `$CLI verify-unit UNIT NN-UNIT.result.json`，失败就记为合同问题，不进入检查。
5. 检查：另一个子代理只读该单元的提示词、`meta.md`、输入和结果，按下面的检查项写观察，保存为 `NN-UNIT.review.md`。

输入怎么组装：

- context 的 `availableContext` 取自 `contexts/*.json` 的 `inputs`，或 `events/*.json` 的 `availableContext`。
- `pet` 用本主线前面的实际结果组装：`{"id": "fictional:rich", "stage", "genes", "personality", "state", "stories": [已形成故事的 text]}`。
- 事件里的 `elapsedDays` 和 `growRequest` 原样附加到 evolution 的 `inputs`。

每个用例一个目录，例如 `$RUN/rich/01-context.request.json`。

## 模块与用例

三条主线各自独立：`rich`（生活与工作混合）、`interest`（只有爱好）、`sparse`（几乎没有资料）。M1 的结果是 M2–M5 的输入。

### M1 领养设计：context → encounter → genes → personality

每条主线依次运行四个单元。`rich` 再从同一份 encounter 独立运行一次 genes 和 personality，用于比较。

| 单元 | 检查项 |
| --- | --- |
| context | 每条事实能回到输入来源；没有补造职业、地点、心情；资料不足写进 unknowns |
| encounter | 联系直接使用具体事实，不层层转译成隐喻；sparse 如实保持有限联系 |
| genes | `designBasis` 写出人类熟悉、可辨认的来源，并说明为什么来自这段领养故事；主要身体特征由来源转化而来；蛋是完整的常规蛋，个体差异在壳面；孵化后是有生物器官的生命 |
| personality | 能解释具体行动选择，而不只是形容词；没有推断用户人格；不是按物种套性格 |
| 横向比较 | 三条主线的宠物各自跟随自己的资料，不是同一模板换色；`rich` 两次结果可以相似或不同，但都必须有依据，差异本身不算通过 |

### M2 形象：蛋与幼年

每条主线：

1. **蛋**：appearance 输入 `genes`、`story`（M1 的 encounter 文本）、`change`（`{"stage":"egg"}`）、`savedArt: []`、`hostRequirements`（普通 Pet 的 v2 图集要求）。把结果中蛋的视觉请求作为 `VISUAL_PROMPT`：

   ```bash
   python3 plugins/genpet/vendor/hatch-pet/scripts/prepare_pet_run.py --egg \
     --output-dir "$RUN/rich/egg-run" --pet-name test-rich --pet-id test-rich \
     --pet-notes "$VISUAL_PROMPT" --style-preset pixel
   ```

   只生成 run 里的 base 图（按其 `base-pet.md`），不生成动画。
2. **幼年**：用 `events/shared.json` 跑 context → story，再跑 evolution，并在输入里附加 `"growRequest": "用户明确请求 /genpet-grow 进入 hatchling"`。用这次故事与变化、蛋图作为 `savedArt` 跑 appearance，然后用 `--parallel --reference 蛋图` 准备 run，只生成 base 图。
3. **检查**：image-review 单元，输入视觉请求与实际文件。原图看一次，再缩到实际显示尺寸看一次：

   ```bash
   python3 -c "from PIL import Image; import sys; Image.open(sys.argv[1]).resize((192,208), Image.NEAREST).save(sys.argv[2])" 原图 小图.png
   ```

| 检查项 | 看什么 |
| --- | --- |
| 产品边界 | 蛋一眼是蛋；幼年遮住名字和故事也能看出是可爱的活物同伴 |
| 设计兑现 | 设计依据里的来源特征在身体上看得见，并被转化而非照搬 |
| 卡通像素与幼态 | 小尺寸下轮廓紧凑、色块少而清楚；幼年明显没长开，不是缩小的成年或写实插画加像素边 |
| 连续性 | 幼年延续蛋的壳面配色线索与 genes 的身体关系 |

### M3 故事

每条主线的宠物（M1 结果，阶段用 M2 后的 hatchling）分别跑：

- `events/none.json` → context → story：独立生活。
- `events/shared.json` → context → story：共同经历。

再做一组性格对照：把 `rich` 和 `interest` 两只宠物放进同一个 `shared` 事件。

| 检查项 | 看什么 |
| --- | --- |
| 用户联系 | 共同经历在正文里写出具体用户线索与宠物的回应；独立生活如实说明没有新联系，不补造用户行为或情绪 |
| 性格 | 性格通过行动体现，不只是标签；两只宠物面对同一事件的反应不同且各有依据 |
| 自己的生活 | 宠物有自己的经历，不只是复述用户的事 |

### M4 进化

对每条主线的 hatchling，分别用以下事件跑 context → story → evolution：

| 事件 | 期望 |
| --- | --- |
| `long-gap`（100 天，无资料） | 保持原阶段；时间本身不是依据 |
| `life-change`（搬家、自己做饭） | 可以进化或保持，但 basis 必须回到这条事实；非工作变化同样可以成为依据 |
| `work-change`（第一次做技术分享） | 同上 |
| `none` 附加 `growRequest` | 进入请求的阶段，basis 标明是调试请求，不伪造用户变化 |

另外检查：每个状态变化都有用户原因；性格影响反应方式，但不充当进化触发；specialChange 只在成年出现。

### M5 输出与命名

- **未完成**：output 输入 M4 某次进化的 story，`completed` 写实际未完成的状态（如 `{"stage":"hatchling","appearanceUpdated":false}`），`availableMedia: []`。不能宣称已经进化，也不能编造图片。
- **孵化完成**：输入 M2 幼年的 story、`completed`（`{"stage":"hatchling","appearanceUpdated":true,"namingDue":true}`）和幼年图。正文保留用户联系与性格行动；只提一次自由命名邀请，不替宠物起名。

### M6 生命周期（可选，隔离）

在 Codex 新对话中设置隔离目录后运行 `/genpet-start`，以 `contexts/rich.json` 的内容作为可用资料：

```bash
export GENPET_DATA_DIR="$RUN/e2e/data" CODEX_HOME="$RUN/e2e/codex-home" GENPET_SKIP_NATIVE_REFRESH=1
```

检查：只创建一只宠物；重试同一 trigger 不新建；蛋的图集能 `accept-art` 并 `publish` 到隔离的 `codex-home/pets/` 下唯一条目；`finish-story` 后 `status` 与 `story-output` 一致；蛋阶段不发命名邀请。这一项需要生成完整的蛋图集，耗时较长；不验证真实宿主显示。

## 记录与报告

每个单元保留 request、result、verify 输出、review；图像保留原图、小图与 run 目录。不保存真实用户资料。

最后按 `REPORT_TEMPLATE.zh-CN.md` 写 `$RUN/REPORT.md`：每个检查项记为 通过 / 需修正 / 不确定，并附一句具体观察。“用户结论”一栏留给你填写。

## 一次性交给 Codex 的指令

```text
请按 tests/agent/README.zh-CN.md 运行 M1–M5（M6 先不跑），记录写到 output/agent-tests/<今天>-run1/。
生成每个单元时只把 unit-request 返回的 prompt 交给一个独立子代理（不可用时新开对话），
检查交给另一个子代理，生成者不评价自己的结果。不要读取或修改我的真实宠物、Avatar 或定时任务。
完成后按 REPORT_TEMPLATE.zh-CN.md 写报告，并把蛋和幼年图（原图与 192×208 小图）列在报告里。
```

只想先看一部分时，把 “M1–M5” 换成具体模块，例如 “M1 和 M2 的 rich 主线”。

#!/usr/bin/env node
/**
 * Writes fictional Codex session records for observation tests (TEST_PLAN_0.10.12 R1a, R2).
 * Usage: node tests/agent/sessions/make-sessions.mjs OUT_DIR [NOW_ISO]
 * Each scenario gets OUT_DIR/<scenario>/codex-home (point CODEX_HOME at it). The expected observations are printed
 * to stdout for the reviewer only; keep them out of the Agent's reach.
 * The layout follows what Codex Desktop wrote on 2026-10-15; the Agent must still find the records itself.
 */
import { mkdir, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const [out, nowArg] = process.argv.slice(2);
if (!out) throw new Error('Usage: make-sessions.mjs OUT_DIR [NOW_ISO]');
const now = nowArg ? Date.parse(nowArg) : Date.now();
const hours = h => now - h * 3_600_000;

/** A desktop user session unless `origin` says otherwise; `genpet` marks GenPet's own scheduled run. */
const session = (name, startH, endH, messages = [], extra = {}) => ({ name, startH, endH, messages, ...extra });
const genpetRuns = (fromH, toH) => {
  const runs = [];
  for (let h = fromH; h >= toH; h -= 5) runs.push(session('GenPet', h, h - 0.1, ['（定时检查）'], { genpet: true }));
  return runs;
};

const scenarios = {
  busy: {
    expected: '今晚一直在同一个项目里修同一个问题，到深夜仍在继续',
    sessions: [
      session('修复登录超时', 7, 5, ['登录接口偶尔超时，帮我看看重试逻辑']),
      session('登录超时 重试逻辑', 5, 2.5, ['把重试改成指数退避']),
      session('登录超时 压测', 2.5, 0.2, ['帮我写个压测脚本复现超时']),
      session('子任务', 2, 1.9, ['分析日志'], { origin: 'subagent' }),
      ...genpetRuns(10, 0.5),
    ],
  },
  milestone: {
    expected: '卡了一阵的问题修好了，刚刚发布了新版本',
    sessions: [
      session('修复支付回调', 30, 26, ['支付回调签名校验失败']),
      session('支付回调 修复', 8, 3, ['终于找到原因了，是时区']),
      session('发布 1.2 版本', 1.5, 0.4, ['帮我写这次发布的更新说明']),
      ...genpetRuns(30, 0.5),
    ],
  },
  ordinary: {
    expected: '在，但没什么特别：几小时前整理了周报',
    sessions: [session('整理周报', 3.5, 3, ['帮我把这周做的事整理成周报']), ...genpetRuns(10, 0.5)],
  },
  'open-idle': {
    expected: 'Codex 一直开着（定时检查照常），但三天没有用户会话',
    sessions: [session('整理照片', 74, 72, ['帮我把旅行照片按日期重命名']), ...genpetRuns(70, 0.5)],
  },
  'closed-then-open': {
    expected: '六天没来，最近两天 Codex 没开（没有定时检查），现在刚重新打开、还没开新会话',
    sessions: [session('读论文笔记', 146, 144, ['帮我总结这篇论文的方法部分']), ...genpetRuns(140, 50)],
  },
  'vague-title': {
    expected: '名称看不出主题，需要读第一条消息：在复习线性代数，准备考试',
    sessions: [
      session('New chat', 4, 1, ['帮我复习线性代数第三章的特征值，下周要考试', '再出几道练习题']),
      session('New chat', 1, 0.3, ['特征值和特征向量的几何意义是什么']),
      ...genpetRuns(10, 0.5),
    ],
  },
  reading: {
    expected: '刚读完一本书，在整理最后一章的读书笔记（日常的事，按日常的分量回应）',
    sessions: [
      session('读书笔记 海底的四季', 3, 1, ['帮我整理《海底的四季》最后一章的读书笔记，写冬天的海那一章']),
      ...genpetRuns(10, 0.5),
    ],
  },
  cooking: {
    expected: '在改一道家常菜的方子，刚定下第四版（它不能假装替用户备好锅和刀）',
    sessions: [
      session('红烧肉方子', 6, 1.5, ['把我的红烧肉方子改一下，少放点糖', '这是第四版了，就按这个定了']),
      ...genpetRuns(10, 0.5),
    ],
  },
  sensitive: {
    expected: '只用「在写课程作业」；室友争执的会话不使用、不保存',
    sessions: [
      session('和室友吵架之后怎么沟通', 3, 2.5, ['昨晚和室友吵得很凶，我该怎么开口']),
      session('课程作业 数据可视化', 2, 0.5, ['帮我用图表展示这组调查数据']),
      ...genpetRuns(10, 0.5),
    ],
  },
};

const iso = ms => new Date(ms).toISOString();
const line = (ms, type, payload) => JSON.stringify({ timestamp: iso(ms), type, payload });

for (const [name, scenario] of Object.entries(scenarios)) {
  const home = path.join(out, name, 'codex-home');
  const index = [];
  for (const item of scenario.sessions) {
    const id = randomUUID();
    const start = hours(item.startH);
    const end = hours(item.endH);
    const day = new Date(start);
    const dir = path.join(
      home,
      'sessions',
      String(day.getFullYear()),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    );
    await mkdir(dir, { recursive: true });
    const origin = item.origin === 'subagent' ? 'codex_exec' : 'Codex Desktop';
    const lines = [
      line(start, 'session_meta', {
        id,
        session_id: id,
        timestamp: iso(start),
        cwd: item.genpet ? path.join(home, 'automations', 'genpet') : `/home/fictional/projects/${name}`,
        originator: origin,
        source: item.origin === 'subagent' ? 'exec' : 'vscode',
        thread_source: item.origin === 'subagent' ? 'subagent' : item.genpet ? 'automation' : 'user',
      }),
      ...item.messages.map((text, i) =>
        line(start + ((end - start) * i) / Math.max(1, item.messages.length), 'response_item', {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        }),
      ),
    ];
    const file = path.join(dir, `rollout-${iso(start).replace(/[:.]/g, '-')}-${id}.jsonl`);
    await writeFile(file, lines.join('\n') + '\n');
    await utimes(file, end / 1000, end / 1000);
    if (item.origin !== 'subagent') index.push({ id, thread_name: item.name, updated_at: iso(end) });
  }
  await writeFile(path.join(home, 'session_index.jsonl'), index.map(row => JSON.stringify(row)).join('\n') + '\n');
}
const expected = Object.fromEntries(Object.entries(scenarios).map(([name, scenario]) => [name, scenario.expected]));
console.log(JSON.stringify({ fictional: true, out, now: iso(now), expected }, null, 2));

#!/usr/bin/env node
/**
 * Lays the stories of several chain groups side by side, step by step, for reading.
 * Usage: node tests/agent/chain/compare.mjs ROUND_DIR PET_KEY GROUP... > out.md
 * ROUND_DIR holds one folder per group (baseline/, template/, dice/), each with PET_KEY/step-XX/.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [roundArg, key, ...groups] = process.argv.slice(2);
if (!roundArg || !key || !groups.length) throw new Error('Usage: compare.mjs ROUND_DIR PET_KEY GROUP...');
const round = path.resolve(roundArg);
const timeline = JSON.parse(await readFile(path.join(here, 'timelines.json'), 'utf8'))[key];
const names = { baseline: '基线', template: '放开结构', dice: '放开结构 + 骰子' };
const json = async file => (existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : null);
const oneLine = value => (typeof value === 'string' ? value : JSON.stringify(value)).replace(/\s*\n\s*/g, ' ');

const lines = [];
for (let k = 1; k <= timeline.length; k++) {
  const situation = timeline[k - 1];
  const step = `step-${String(k).padStart(2, '0')}`;
  lines.push(`### 第 ${k} 次（距上次 ${situation.gapH} 小时）`, '');
  lines.push(
    `情况：${situation.read === 'failed' ? '这次没能读到最近的会话' : situation.facts.join(' ') || '无新动静'}`,
  );
  if (situation.chat) lines.push(`对话里留下的话：「${situation.chat}」`);
  lines.push('');
  for (const group of groups) {
    const dir = path.join(round, group, key, step);
    const parsed = await json(path.join(dir, 'result.json'));
    const story = parsed?.result ?? parsed;
    const surprise = (await json(path.join(dir, 'input.json')))?.inputs?.surprise;
    lines.push(`**${names[group] ?? group}**`);
    if (surprise?.happens)
      lines.push(`🎲 骰子：${surprise.kind}${story?.surprise ? `｜用法：${oneLine(story.surprise)}` : ''}`);
    if (!story) {
      lines.push('（没有结果）', '');
      continue;
    }
    lines.push('', `> ${oneLine(story.text)}`, '');
    lines.push(`画面：${oneLine(story.visualIntent)}`);
    if (story.homeIntent) lines.push(`家：${oneLine(story.homeIntent)}`);
    lines.push('');
  }
}
console.log(lines.join('\n'));

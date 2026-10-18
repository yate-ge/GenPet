#!/usr/bin/env node
/**
 * Independent review of one story chain in a fresh Codex context.
 * Usage: node tests/agent/chain/run-review.mjs CHAIN_DIR START_INPUT_JSON PET_KEY
 * Writes CHAIN_DIR/review.md. The reviewer gets the product rules, the observed situations and the stories, and the
 * questions to answer; it gets no expected conclusions.
 */
import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTimeline } from './timeline.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const [dirArg, startArg, key] = process.argv.slice(2);
if (!dirArg || !startArg || !key) throw new Error('Usage: run-review.mjs CHAIN_DIR START_INPUT_JSON PET_KEY');
const dir = path.resolve(dirArg);
const model = process.env.GENPET_CHAIN_MODEL ?? 'gpt-6-astra';
const rules = await readFile(path.join(root, 'plugins/genpet/skills/genpet/rules.md'), 'utf8');
const start = JSON.parse(await readFile(path.resolve(startArg), 'utf8')).inputs;
const user = await loadTimeline(key);
const timeline = user.steps;

const steps = [];
for (const name of (await readdir(dir)).filter(n => n.startsWith('step-')).sort()) {
  const file = path.join(dir, name, 'result.json');
  if (!existsSync(file)) continue;
  const parsed = JSON.parse(await readFile(file, 'utf8'));
  const input = JSON.parse(await readFile(path.join(dir, name, 'input.json'), 'utf8')).inputs;
  const n = Number(name.slice(5));
  const outputFile = path.join(dir, name, 'output-result.json');
  const shown = existsSync(outputFile) ? JSON.parse(await readFile(outputFile, 'utf8')) : null;
  steps.push({
    step: n,
    situation: timeline[n - 1],
    story: parsed.result ?? parsed,
    surprise: input.surprise,
    message: shown ? ((shown.result ?? shown).message ?? '（没有消息）') : undefined,
  });
}

const dice = steps.some(s => s.surprise);
const earlier = start.recentContent.items.map((item, i) => `${i + 1}. ${item.text}`).join('\n');
const chain = steps
  .map(({ step, situation, story, surprise, message }) =>
    [
      `### 第 ${step} 次检查（距上次 ${situation.gapH} 小时）`,
      `观察到的情况：${situation.read === 'failed' ? '这次没能读到最近的会话' : situation.facts.join(' ') || '无'}`,
      situation.chat ? `对话里留下的话：${situation.chat}` : null,
      surprise ? `骰子：${surprise.happens ? `这次要有一件「${surprise.kind}」类的意外` : '这次不加意外'}` : null,
      `故事：${story.text}`,
      message !== undefined ? `用户看到的消息：${message}` : null,
      `联系（内部）：${story.connection}`,
      `状态意图：${story.stateIntent}`,
      `画面意图：${story.visualIntent}`,
      `家的变化：${story.homeIntent ?? '无'}`,
      `memory 重写：${story.memoryIntent ?? '无'}`,
      dice && story.surprise
        ? `意外说明（内部）：${typeof story.surprise === 'string' ? story.surprise : JSON.stringify(story.surprise)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
  )
  .join('\n\n');

const storyQuestions = `1. 逐篇一行：第几次｜它做了什么（10 字内）｜回应是否符合当时观察到的情况（是/部分/否，说明）｜和前面哪一篇（含测试前的 10 篇）在地点、物件、做法或结尾上明显重复（写篇号和重复点，没有写「无」）｜对用户来说是否出乎意料又说得通（是/否）。
2. 雷同：整条序列里反复出现的地点、物件、动作、句式或收尾，各出现几次。有没有越往后越像的趋势。
3. 连续：前后故事有没有通过 memory、家里的东西或用户自己的情况连起来；有没有一条线被推进或了结，还是每次重开。
4. 意外：哪几篇让人意外又说得通，各写一句为什么；意外的大致比例。
5. 回应：对话留下的两句话是否在下一次故事里得到回应、方式如何；离开两天之后回来那次怎么处理；读不到会话那次怎么处理；节点（完成、开始）那几次是否给了一样一看就懂的东西或直接对用户说话。
6. 其他违反产品规则的地方（假装在用户现实里做事、复述用户的事、提问或预告、敏感内容等），写篇号和原文片段。这次测试里成长不允许发生（每次输入的 growth.canAdvance 都是 false，也没有必须的成长），阶段应一直是开始时的阶段；有没有故事或意图把它写成了下一阶段，也写篇号。纯文字是否超过连续两次，按画面意图开头是否写明纯文字来数。
${
  dice
    ? `7. 骰子：每三次检查里由代码随机挑一次，要求故事里有一件指定类型的意外，具体内容由故事自己想；只在和对话留下的话冲突、必须成长或情境敏感时可以不用。逐个列出骰子要求意外的那几次：有没有用上｜意外是什么（10 字内）｜是否说得通、和这只宠物和它的家对得上｜它的回应是否仍然对上当时的情境｜读起来是否生硬或像硬塞进去的。再说没有骰子的那几次是否也有自然的意外。
8. 总评：`
    : '7. 总评：'
}这条序列读起来是丰富、有期待感，还是趋于固化。一段话，具体说依据。`;
const userQuestions = `产品的设定：宠物像用户家里养的猫，一直看着用户，故事以用户为中心，是它冲着用户此刻在做的事的反应；它的家、物件和性格是回应的方式，不是一条它自己的生活线；只有用户不在时（很久没来、读不到会话）才讲它自己在做什么。有「用户看到的消息」时，那是 output 单元写给用户的最终消息；用户一读能否认出、说得是否直接、有没有复述用户的事，主要按这条消息和画面意图来评（这次不画图，画面意图代表桌面上会看到的样子）。

1. 逐篇一行：第几次｜它做了什么（10 字内）｜用户一读是否知道它在回应自己（是/部分/否，说明）｜回应是否对得上当时观察到的情况（是/部分/否）｜是不是在写它自己的生活（是/否；用户不在时写自己不算问题，注明）｜和前面哪一篇明显重复（写篇号和重复点，没有写「无」）。
2. 以用户为中心：多少篇直接回应用户（对用户说话、为用户做或给东西、陪着用户做这件事），多少篇在写它自己；写它自己的那些是不是都在用户不在的时候。挑出最好和最差的各两篇，写原文片段和原因。
3. 直接和分寸：有没有直接说出它看到的用户在做的事；说得是否具体、准确；有没有照抄会话原文或代码；有没有虚构用户的情绪、行为或结果；有没有读起来让人不舒服或像在评判用户的地方。
4. 敏感内容：观察到的情况里有身体、心理、家事、人际冲突、离职这类内容的那几次，故事、意图和 memory 有没有用上它们（写篇号和原文）；用户在对话里主动说的心情，回应得是否得体。
5. 回应：对话留下的话是否在下一次故事里得到回应、方式如何；用户卡住时、完成和开始的节点、离开后回来、读不到会话，各怎么处理。
6. 雷同与连续：反复出现的做法、句式、物件，各出现几次；跨几次的线是不是跟着用户的事走，有没有推进或了结。
7. 其他违反产品规则的地方（假装在用户现实里做事、提问或预告、成长越界、纯文字连续超过两次等），写篇号和原文片段。这次测试里成长不允许发生（每次 growth.canAdvance 都是 false），阶段应一直不变。纯文字按画面意图开头是否写明纯文字来数。
8. 总评：用户读这一串故事，会不会觉得这是一只一直看着自己、陪着自己的宠物。一段话，具体说依据。`;

const prompt = `你是独立评审。下面是一只 GenPet 宠物连续 ${steps.length} 次定时检查的故事，每次由一个全新的上下文按产品规则写出。请只根据这里给的材料评审，不要运行命令，不要修改任何文件。

# 产品规则

${rules}

# 这只宠物

名字：${start.pet.name}；阶段：${start.pet.state.stage}
性格：${start.pet.soul.personality}
基因：${start.pet.soul.genes}
开始时的 memory：${user.memory ?? start.pet.memory?.text ?? '无'}
开始时的家：${start.pet.state.home ?? '无'}

${user.who ? `这位用户：${user.who}（宠物之前的故事来自另一段测试，memory 已换成和这位用户的）\n\n` : ''}这次连续测试之前的 10 篇故事（用来判断是否和更早的内容雷同）：
${earlier}

# 连续 ${steps.length} 次检查

${chain}

# 要回答的问题

「故事」是 story 单元写的内部草案，用户看到的文字之后由 output 单元另写，所以评它做了什么、怎么回应，不评文字长度和排版；联系、意图和 memory 是内部记录，用来理解它想做什么。

${user.who ? userQuestions : storyQuestions}

用中文写，Markdown 格式，直接输出评审正文。`;

const home = await mkdtemp(path.join(os.tmpdir(), 'genpet-review-'));
const work = await mkdtemp(path.join(os.tmpdir(), 'genpet-review-work-'));
await copyFile(path.join(os.homedir(), '.codex/auth.json'), path.join(home, 'auth.json'));
await writeFile(path.join(dir, 'review-prompt.txt'), prompt);
const res = await new Promise((resolve, reject) => {
  const child = spawn(
    'codex',
    [
      'exec',
      '--skip-git-repo-check',
      '-s',
      'read-only',
      '-m',
      model,
      '-c',
      'model_reasoning_effort="high"',
      '-C',
      work,
      '--json',
      '-o',
      path.join(dir, 'review.md'),
      '-',
    ],
    { env: { ...process.env, CODEX_HOME: home }, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', d => (stdout += d));
  child.stderr.on('data', d => (stderr += d));
  child.on('error', reject);
  child.on('close', code => resolve({ code, stdout, stderr }));
  child.stdin.end(prompt);
});
await rm(path.join(home, 'auth.json'), { force: true });
await writeFile(path.join(dir, 'review-events.jsonl'), res.stdout);
await writeFile(path.join(dir, 'review-stderr.txt'), res.stderr);
if (existsSync(path.join(home, 'sessions')))
  await rename(path.join(home, 'sessions'), path.join(dir, 'review-sessions'));
await rm(home, { recursive: true, force: true });
await rm(work, { recursive: true, force: true });
console.log(`[${key}] review exit ${res.code}, ${steps.length} stories`);

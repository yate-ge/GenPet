#!/usr/bin/env node
/**
 * Runs the story unit as a chain of consecutive checks for one Pet, one fresh Codex context per step.
 * Usage: node tests/agent/chain/run-chain.mjs START_INPUT_JSON PET_KEY OUT_DIR [STEPS]
 *   START_INPUT_JSON  a saved story-unit input (context, pet, growth, time, recentContent) to continue from
 *   PET_KEY           the timeline key in timelines.json (A, B, C)
 * Env: GENPET_CHAIN_MODEL (default gpt-6-astra), GENPET_CHAIN_EFFORT (default medium),
 *   GENPET_CHAIN_VARIANT: unset for the current prompt; `template` swaps the story unit's fixed writing structure for
 *   variants/template.md; `dice` does the same and adds variants/dice.md with a seeded surprise roll as input.
 *
 * Only the story unit runs. Between steps this script carries the result forward the way finish-story would:
 * memoryIntent rewrites memory and counts one experience, stateIntent and homeIntent become the new state, and the
 * story joins recentContent. What the story showed (appearance, home, item or text only) is guessed from its
 * intents, because no image or evolution unit runs. Growth is frozen so the chain tests variety, not stage changes.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const cli = path.join(root, 'plugins/genpet/dist/cli.js');
const [startArg, key, outArg, stepsArg] = process.argv.slice(2);
const startFile = startArg && path.resolve(startArg);
const out = outArg && path.resolve(outArg);
if (!startFile || !key || !out) throw new Error('Usage: run-chain.mjs START_INPUT_JSON PET_KEY OUT_DIR [STEPS]');
const model = process.env.GENPET_CHAIN_MODEL ?? 'gpt-6-astra';
const effort = process.env.GENPET_CHAIN_EFFORT ?? 'medium';
const timeline = JSON.parse(await readFile(path.join(here, 'timelines.json'), 'utf8'))[key];
const steps = Math.min(Number(stepsArg ?? timeline.length), timeline.length);
const start = JSON.parse(await readFile(startFile, 'utf8')).inputs;
const english = /^[\x00-\x7F]*$/.test(start.pet.name);
const variant = process.env.GENPET_CHAIN_VARIANT ?? '';
if (!['', 'template', 'dice'].includes(variant)) throw new Error(`Unknown GENPET_CHAIN_VARIANT: ${variant}`);
const fixedStructure = '先写它为什么在意这件事、经历后有什么小发现，再让行动支持这个想法。';
const variantText = async name => (await readFile(path.join(here, 'variants', `${name}.md`), 'utf8')).trim();
const replacement = variant
  ? [await variantText('template'), variant === 'dice' ? await variantText('dice') : null].filter(Boolean).join('\n\n')
  : null;
/**
 * The surprise roll: in every block of three checks one random check gets a surprise, and its kind is drawn from a
 * shuffled deck of broad classes so kinds do not repeat until the deck runs out. Seeded by pet, so reruns match.
 */
const kinds = english
  ? [
      'a visitor',
      'the weather or season changes',
      'finding or noticing something',
      'a small mishap',
      'learning or working out a new trick',
      'an old thing turns up again',
      'something met while out',
    ]
  : [
      '来了一位访客',
      '天气或季节变了',
      '捡到或发现一样东西',
      '出了点小差错',
      '学会或想出一样新本领',
      '一件旧东西又冒出来',
      '出门时遇到的事',
    ];
const draw = (
  n => () =>
    createHash('sha256').update(`genpet-chain:${key}:${n++}`).digest().readUInt32BE(0) / 0x1_0000_0000
)(0);
const surprises = new Map();
{
  let deck = [];
  for (let block = 0; block * 3 < timeline.length; block++) {
    const k = block * 3 + 1 + Math.floor(draw() * 3);
    if (!deck.length) {
      deck = [...kinds];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(draw() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    surprises.set(k, deck.pop());
  }
}
const roll = k => ({ happens: surprises.has(k), kind: surprises.get(k) ?? null });

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => (stdout += d));
    child.stderr.on('data', d => (stderr += d));
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(opts.input ?? '');
  });

const iso = ms => new Date(ms).toISOString();
const jsonOut = s => {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : s;
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  return JSON.parse(body.slice(first, last + 1));
};

/** A rough guess at what the finished story would have shown; the reviewer judges the real content. */
const outputsOf = r => {
  if (
    /^\s*(本次|本篇)?(为)?(纯文字|只有文字)|^\s*(pure text|text[- ]only|this is a text-only)/i.test(
      r.visualIntent ?? '',
    )
  )
    return [];
  const changed = !/保持原样|身体与衣物不变|unchanged|no change|stays the same|same as before/i.test(
    r.stateIntent ?? '',
  );
  const result = changed ? ['appearance'] : [];
  if (r.homeIntent) result.push('home');
  return result.length ? result : ['item'];
};

const pet = structuredClone(start.pet);
const recent = structuredClone(start.recentContent.items);
let lastStoryAt = Date.parse(start.time.lastStoryAt);
let at = lastStoryAt;
let experiences = start.growth.experiences ?? 0;
await mkdir(out, { recursive: true });
const log = [];

for (let k = 1; k <= steps; k++) {
  const step = timeline[k - 1];
  at += step.gapH * 3_600_000;
  const dir = path.join(out, `step-${String(k).padStart(2, '0')}`);
  await mkdir(dir, { recursive: true });
  const failed = step.read === 'failed';
  const facts = (step.facts ?? []).map((text, i) => ({
    id: `s${k}-f${i + 1}`,
    text,
    source: `synthetic-session@${iso(at - 3_600_000)}`,
  }));
  if (step.chat)
    facts.push({
      id: `s${k}-chat`,
      text: english ? `Words the user left in pet chat: "${step.chat}"` : `用户在宠物对话里留下的话：「${step.chat}」`,
      source: `genpet-chat@${iso(at - 2 * 3_600_000)}`,
    });
  const context = {
    facts,
    traits: [],
    unknowns: failed
      ? [english ? 'Recent sessions could not be read this time' : '这次没能读到最近的会话']
      : (step.unknowns ?? []),
    read: failed
      ? { status: 'failed', error: 'session_index.jsonl could not be read', sources: [] }
      : { status: 'success', sources: ['session_index.jsonl'] },
  };
  let textOnlyStreak = 0;
  for (const item of [...recent].reverse()) {
    if (item.outputs.length) break;
    textOnlyStreak++;
  }
  const input = {
    inputRefs: [
      `chain/${key}/step-${k}:context`,
      `chain/${key}/step-${k}:pet`,
      `chain/${key}/step-${k}:recent-content`,
    ],
    inputs: {
      context,
      pet,
      growth: {
        ...start.growth,
        experiences,
        canAdvance: false,
        required: null,
        advanceBy: iso(at + 30 * 24 * 3_600_000),
      },
      time: {
        lastStoryAt: iso(lastStoryAt),
        hoursSinceLastStory: Math.round(((at - lastStoryAt) / 3_600_000) * 10) / 10,
        checkIntervalHours: 5,
        now: iso(at),
      },
      recentContent: {
        items: recent.slice(-10),
        textOnlyStreak,
        visualRequired: textOnlyStreak >= 2,
        memory: pet.memory,
      },
      ...(variant === 'dice' ? { surprise: roll(k) } : {}),
    },
  };
  const inputFile = path.join(dir, 'input.json');
  await writeFile(inputFile, JSON.stringify(input, null, 2));
  const req = await run('node', [cli, 'unit-request', 'story', inputFile], { cwd: root });
  if (req.code) throw new Error(`unit-request failed at step ${k}: ${req.stderr}`);
  await writeFile(path.join(dir, 'request.json'), req.stdout);
  let { prompt } = JSON.parse(req.stdout);
  if (replacement) {
    if (!prompt.includes(fixedStructure)) throw new Error('story.md no longer has the sentence this variant replaces');
    prompt = prompt.replace(fixedStructure, replacement);
    await writeFile(path.join(dir, 'prompt.txt'), prompt);
  }

  let result;
  let verify;
  // Resume: a step that already has a contract-valid result is read back instead of run again.
  const saved = path.join(dir, 'result.json');
  if (existsSync(saved) && (await run('node', [cli, 'verify-unit', 'story', saved], { cwd: root })).code === 0) {
    const parsed = JSON.parse(await readFile(saved, 'utf8'));
    result = parsed.result ?? parsed;
  }
  for (let attempt = 1; attempt <= 2 && !result; attempt++) {
    const home = await mkdtemp(path.join(os.tmpdir(), 'genpet-chain-'));
    const work = await mkdtemp(path.join(os.tmpdir(), 'genpet-chain-work-'));
    await copyFile(path.join(os.homedir(), '.codex/auth.json'), path.join(home, 'auth.json'));
    const t0 = Date.now();
    const last = path.join(dir, `last-message-${attempt}.txt`);
    const res = await run(
      'codex',
      [
        'exec',
        '--skip-git-repo-check',
        '-s',
        'read-only',
        '-m',
        model,
        '-c',
        `model_reasoning_effort="${effort}"`,
        '-C',
        work,
        '--json',
        '-o',
        last,
        '-',
      ],
      { env: { ...process.env, CODEX_HOME: home }, input: prompt },
    );
    await rm(path.join(home, 'auth.json'), { force: true });
    await writeFile(path.join(dir, `codex-events-${attempt}.jsonl`), res.stdout);
    await writeFile(path.join(dir, `codex-stderr-${attempt}.txt`), res.stderr);
    if (existsSync(path.join(home, 'sessions')))
      await rename(path.join(home, 'sessions'), path.join(dir, `codex-sessions-${attempt}`));
    await rm(home, { recursive: true, force: true });
    await rm(work, { recursive: true, force: true });
    const ms = Date.now() - t0;
    try {
      const parsed = jsonOut(await readFile(last, 'utf8'));
      const resultFile = path.join(dir, 'result.json');
      await writeFile(resultFile, JSON.stringify(parsed, null, 2));
      const v = await run('node', [cli, 'verify-unit', 'story', resultFile], { cwd: root });
      verify = { code: v.code, out: v.stdout.trim(), err: v.stderr.trim() };
      if (v.code === 0) result = parsed.result ?? parsed;
    } catch (error) {
      verify = { code: 1, err: String(error) };
    }
    await writeFile(
      path.join(dir, `run-${attempt}.json`),
      JSON.stringify({ exit: res.code, ms, model, effort, variant, verify }, null, 2),
    );
  }
  if (!result) {
    log.push({ step: k, at: iso(at), error: verify });
    console.error(`[${key}] step ${k} failed`, verify);
    break;
  }
  const outputs = outputsOf(result);
  recent.push({
    id: `chain-${key}-${k}`,
    at,
    outputs,
    stage: pet.state.stage,
    text: result.text,
    reason: result.connection,
  });
  if (result.memoryIntent) {
    pet.memory = { text: result.memoryIntent, updatedAt: at, storyId: `chain-${key}-${k}` };
    experiences++;
  }
  if (result.stateIntent)
    pet.state = { ...pet.state, description: result.stateIntent, updatedAt: at, storyId: `chain-${key}-${k}` };
  if (result.homeIntent) pet.state = { ...pet.state, home: result.homeIntent };
  pet.revision = (pet.revision ?? 0) + 1;
  lastStoryAt = at;
  log.push({
    step: k,
    at: iso(at),
    outputs,
    memory: Boolean(result.memoryIntent),
    surprise: input.inputs.surprise ?? null,
    surpriseUse: result.surprise ?? null,
    text: result.text,
  });
  await writeFile(
    path.join(out, 'chain.json'),
    JSON.stringify({ key, pet: pet.name, model, effort, variant, steps: log }, null, 2),
  );
  console.log(`[${key}] step ${k}/${steps} ${outputs.join(',') || 'text'}${result.memoryIntent ? ' +memory' : ''}`);
}

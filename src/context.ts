import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { open, readdir, stat } from 'node:fs/promises';
import type { Profile } from './core.js';

export type ContextKind = 'build' | 'research' | 'create' | 'learn' | 'rest';
export interface ContextScan {
  entries: Array<{ kind: ContextKind; summary: string; source: 'codex-local'; occurredAt: number; externalId: string }>;
  stats: { files: number; messages: number };
  warnings: string[];
}
export interface InitialActivitySummary {
  counts: Record<ContextKind, number>;
  selected: ContextKind | null;
  classifiedTaskCount: number;
}
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 200;
const LABELS: Record<ContextKind, string> = { build: '构建', research: '研究', create: '创作', learn: '学习', rest: '休息' };
const RULES: Record<ContextKind, RegExp[]> = {
  build: [/\b(?:implement|debug|bug|compile|deploy|refactor|repository|typescript|javascript|coding)\b/i, /开发|编程|代码|修复|构建|部署|调试|测试|仓库/],
  research: [/\b(?:research|paper|papers|literature|experiment|hypothesis|citation|citations|study)\b/i, /论文|文献|研究|实验|假设|引文|学术|调研/],
  create: [/\b(?:illustration|poster|artwork|story|poem|logo|animation|creative|drawing|design)\b/i, /插画|海报|绘画|创作|作曲|故事|诗歌|设计|生成图片|画一/],
  learn: [/\b(?:learn|teach|explain|tutorial|understand|lesson|practice)\b/i, /学习|教我|解释|教程|练习|理解|讲解/],
  rest: [/\b(?:rest|break|relax|sleep|pause)\b/i, /休息|放松|睡觉|暂停|休假/],
};
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function classify(text: string): ContextKind | null {
  // Presence, never repetition, supplies evidence. A huge prompt gets no extra vote.
  const scores = Object.entries(RULES).map(([kind, rules]) => ({ kind: kind as ContextKind, score: rules.filter(rule => rule.test(text)).length }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 && scores[0].score > scores[1].score ? scores[0].kind : null;
}
function userText(record: any): string | null {
  if (record?.type === 'event_msg' && record.payload?.type === 'user_message') return typeof record.payload.message === 'string' ? record.payload.message : null;
  if (record?.type !== 'response_item' || record.payload?.type !== 'message' || record.payload.role !== 'user') return null;
  if (!Array.isArray(record.payload.content)) return null;
  return record.payload.content.filter((part: any) => part?.type === 'input_text' || part?.type === 'text').map((part: any) => typeof part.text === 'string' ? part.text : '').join('\n');
}
function cleanText(text: string): string {
  return text
    .replace(/<(environment_context|recommended_plugins|send_user_message_question_reply)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(?:environment_context|recommended_plugins|send_user_message_question_reply)\b[^>]*>[\s\S]*$/gi, '')
    .replace(/\s+/g, ' ').trim().slice(0, 16000);
}

/** Read-only local keyword extraction. This is not LLM comprehension or personality inference. */
export async function scanCodexContext(options: { codexHome?: string; nowMs?: number; hours?: number } = {}): Promise<ContextScan> {
  const nowMs = options.nowMs ?? Date.now();
  const hours = options.hours ?? 5;
  if (!Number.isFinite(nowMs) || !Number.isFinite(hours) || hours <= 0 || hours > 168) throw new Error('Context window must be between 0 and 168 hours with a finite clock.');
  const startMs = nowMs - hours * 3_600_000;
  const root = options.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), '.codex');
  const result: ContextScan = { entries: [], stats: { files: 0, messages: 0 }, warnings: [] };
  const warnings = new Set<string>();
  // A task created months ago can still receive new messages. Select recently
  // modified files, then enforce message timestamps instead of folder dates.
  const candidates: Array<{file:string;mtime:number}>=[];
  try {
    const all=(await readdir(join(root,'sessions'),{recursive:true,withFileTypes:true})).filter(f=>f.isFile()&&f.name.endsWith('.jsonl'));
    for(let i=0;i<all.length;i+=32) {
      const batch=await Promise.all(all.slice(i,i+32).map(async f=>{const file=join(f.parentPath,f.name);const info=await stat(file).catch(()=>null);return info&&info.mtimeMs>=startMs?{file,mtime:info.mtimeMs}:null;}));
      candidates.push(...batch.filter((v):v is {file:string;mtime:number}=>v!==null));
    }
    candidates.sort((a,b)=>b.mtime-a.mtime);
  }catch(error:any){if(error.code!=='ENOENT')warnings.add('部分本地会话目录无法读取。');}
  for (const candidate of candidates) {
      if (result.stats.files >= MAX_FILES) { warnings.add('已达到 200 个会话文件上限；本次结果可能不完整。'); break; }
      result.stats.files++;
      let text: string;
      let handle;
      try {
        handle = await open(candidate.file, 'r');
        const stat = await handle.stat();
        const headerBuffer=Buffer.alloc(Math.min(stat.size,128*1024));
        const headerRead=await handle.read(headerBuffer,0,headerBuffer.length,0);
        const header=headerBuffer.subarray(0,headerRead.bytesRead).toString('utf8');
        let metadata:any;try{metadata=JSON.parse(header.split('\n')[0]);}catch{}
        const source=metadata?.type==='session_meta'?metadata.payload?.source:null;
        if((source&&typeof source==='object'&&('subagent' in source))||(typeof source==='string'&&source.includes('subagent')))continue;
        const count = Math.min(stat.size, MAX_FILE_BYTES);
        const start = Math.max(0, stat.size - count);
        const buffer = Buffer.alloc(count);
        const read = await handle.read(buffer, 0, count, start);
        text = buffer.subarray(0, read.bytesRead).toString('utf8');
        if (start > 0) { text = header.slice(0,header.lastIndexOf('\n'))+'\n'+text.slice(text.indexOf('\n') + 1); warnings.add('较大会话仅检查前 128 KiB 和最后 2 MiB；中间线索可能被省略。'); }
      } catch { warnings.add('部分本地会话文件无法读取。'); continue; }
      finally { await handle?.close(); }
      const seen = new Set<string>();
      const matches = new Map<ContextKind, { count: number; at: number; ids: string[] }>();
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let record;
        try { record = JSON.parse(line); } catch { warnings.add('部分会话包含未完成或无效记录，已跳过。'); continue; }
        const at = typeof record.timestamp === 'number' ? record.timestamp : Date.parse(record.timestamp);
        if (!Number.isFinite(at) || at < startMs || at > nowMs) continue;
        const raw = userText(record);
        if (!raw) continue;
        // Scheduler instructions and explicit pet-debug commands are controls,
        // not observations of the person's activity.
        if (raw.includes('<heartbeat>') || /^\s*[/\$](?:genpet:)?genpet-(?:reset|grow|state)\b/.test(raw)) continue;
        const prompt = cleanText(raw);
        if (!prompt || prompt.startsWith('# AGENTS.md instructions') || prompt.startsWith('<permissions instructions>')) continue;
        const promptId = digest(prompt);
        if (seen.has(promptId)) continue;
        seen.add(promptId);
        result.stats.messages++;
        const kind = classify(prompt);
        if (!kind) continue;
        const group = matches.get(kind) ?? { count: 0, at, ids: [] as string[] };
        // Each task/category has at most three votes; one task ultimately produces one entry.
        group.count = Math.min(3, group.count + 1);
        group.at = Math.max(group.at, at);
        group.ids.push(promptId);
        matches.set(kind, group);
      }
      const ranked = [...matches.entries()].sort((a, b) => b[1].count - a[1].count);
      if (!ranked.length || (ranked[1] && ranked[0][1].count === ranked[1][1].count)) continue;
      const [kind, evidence] = ranked[0];
      // Identity is stable across repeat scans within the same five-hour evidence bucket.
      const externalId = `codex-local:${digest(`${candidate.file}:${kind}:${Math.floor(evidence.at / 18_000_000)}`).slice(0, 24)}`;
      result.entries.push({ kind, summary: `本地 Codex · ${LABELS[kind]} · ${evidence.count} 条任务线索`, source: 'codex-local', occurredAt: evidence.at, externalId });
  }
  result.entries.sort((a, b) => a.occurredAt - b.occurredAt || a.externalId.localeCompare(b.externalId));
  result.warnings = [...warnings];
  return result;
}

export function summarizeInitialActivity(scan: ContextScan): InitialActivitySummary {
  const counts: Record<ContextKind, number> = { build: 0, research: 0, create: 0, learn: 0, rest: 0 };
  for (const entry of scan.entries) counts[entry.kind]++;
  const ranked = (Object.keys(counts) as ContextKind[]).sort((a, b) => counts[b] - counts[a]);
  const selected = counts[ranked[0]!] > 0 && counts[ranked[0]!] > counts[ranked[1]!] ? ranked[0]! : null;
  return { counts, selected, classifiedTaskCount: scan.entries.length };
}

export function deriveInitialProfile(scan: ContextScan): Partial<Profile> {
  const { selected } = summarizeInitialActivity(scan);
  if (!selected) return {};
  // These are an editable companion design metaphor, not claims about the user.
  switch (selected) {
    case 'build': return { interest: 'build', palette: 'sage', temperament: 'calm' };
    case 'research': return { interest: 'research', palette: 'sky', temperament: 'curious' };
    case 'create': return { interest: 'create', palette: 'peach', temperament: 'playful' };
    case 'learn': return { interest: 'learn', palette: 'lilac', temperament: 'curious' };
    case 'rest': return { palette: 'sage', temperament: 'calm' };
  }
}

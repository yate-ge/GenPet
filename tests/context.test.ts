import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanCodexContext, deriveInitialProfile, summarizeInitialActivity } from '../src/context.js';
const NOW = Date.parse('2026-09-24T02:00:00Z');
function user(message: string, timestamp = '2026-09-24T01:00:00Z') { return { timestamp, type: 'event_msg', payload: { type: 'user_message', message } }; }
async function fixture(t: any, files: Record<string, unknown[]>) {
  const root = await mkdtemp(join(tmpdir(), 'genpet-context-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, records] of Object.entries(files)) {
    const full = join(root, 'sessions', path); await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, records.map(record => typeof record === 'string' ? record : JSON.stringify(record)).join('\n'));
  }
  return root;
}
test('reads UTC boundary user evidence, removes envelopes and duplicates, leaks no private content', async t => {
  const secret = '请帮我研究论文 SECRET_PRIVATE_TOKEN /private/private-project';
  const root = await fixture(t, {
    '2026/09/23/one.jsonl': [user(secret, '2026-09-23T23:00:00Z'), { timestamp: '2026-09-23T23:00:00Z', type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: secret }] } }],
    '2026/09/24/two.jsonl': [user('<environment_context>调试代码</environment_context><recommended_plugins>代码开发</recommended_plugins>研究文献'), user('<send_user_message_question_reply>部署代码</send_user_message_question_reply>'), user('昨天的研究论文', '2026-09-23T18:00:00Z'), user('未来研究', '2026-09-24T03:00:00Z'), { timestamp: '2026-09-24T01:00:00Z', type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'text', text: 'debug compile code' }] } }],
  });
  const scan = await scanCodexContext({ codexHome: root, nowMs: NOW });
  assert.equal(scan.stats.messages, 2); assert.equal(scan.entries.length, 2);
  assert.ok(scan.entries.every(entry => entry.kind === 'research'));
  assert.deepEqual(deriveInitialProfile(scan), { interest: 'research', palette: 'sky', temperament: 'curious' });
  assert.deepEqual(summarizeInitialActivity(scan), {counts:{build:0,research:2,create:0,learn:0,rest:0},selected:'research',classifiedTaskCount:2});
  assert.doesNotMatch(JSON.stringify(scan), /SECRET_PRIVATE_TOKEN|private-project|one\.jsonl/);
  assert.deepEqual((await scanCodexContext({ codexHome: root, nowMs: NOW })).entries, scan.entries);
});
test('one long mixed task cannot dominate and ambiguous or unsupported evidence stays unclassified', async t => {
  const root = await fixture(t, {
    '2026/09/24/huge.jsonl': [user('research paper 调研论文 implement debug 代码开发 illustration poster 插画创作 '.repeat(150))],
    '2026/09/24/unknown.jsonl': [user('hello'), user('你好'), user('研究并开发')],
    '2026/09/24/build.jsonl': [user('请修复代码'), user('调试错误'), user('开发功能'), user('构建新版'), user('部署新版')],
    '2026/09/24/create.jsonl': [user('请画一幅插画')],
  });
  const scan = await scanCodexContext({ codexHome: root, nowMs: NOW });
  assert.equal(scan.entries.length, 2);
  assert.match(scan.entries.find(entry => entry.kind === 'build')!.summary, /3 条/);
  assert.deepEqual(deriveInitialProfile(scan), {});
  assert.equal(summarizeInitialActivity(scan).selected,null);
});
test('missing directories, malformed records and invalid clocks are handled safely', async t => {
  const root = await fixture(t, { '2026/09/24/session.jsonl': ['{broken', user('learn tutorial'), user('休息', 'bad')] });
  const scan = await scanCodexContext({ codexHome: root, nowMs: NOW });
  assert.equal(scan.entries[0]?.kind, 'learn'); assert.equal(scan.warnings.length, 1);
  assert.equal((await scanCodexContext({ codexHome: join(root, 'absent'), nowMs: NOW })).entries.length, 0);
  await assert.rejects(() => scanCodexContext({ codexHome: root, nowMs: NaN }));
  await assert.rejects(() => scanCodexContext({ codexHome: root, hours: 999 }));
});
test('large session reads bounded head and tail and filters stale earlier evidence', async t => {
  const root = await fixture(t, { '2026/09/24/large.jsonl': [user('研究论文','2026-09-20T00:00:00Z'), JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) }), user('create illustration')] });
  const scan = await scanCodexContext({ codexHome: root, nowMs: NOW });
  assert.equal(scan.entries[0]?.kind, 'create'); assert.ok(scan.warnings.some(warning => warning.includes('2 MiB')));
});
test('recent messages in older tasks are read; delegated agent prompts are excluded',async t=>{
 const root=await fixture(t,{
  '2026/08/01/old-active.jsonl':[user('研究论文')],
  '2026/09/24/subagent.jsonl':[{type:'session_meta',payload:{source:{subagent:{spawn:{}}}}},user('build implement 编程代码')],
 });
 const scan=await scanCodexContext({codexHome:root,nowMs:NOW});
 assert.equal(scan.stats.messages,1);assert.equal(scan.entries[0].kind,'research');
});
test('pet commands and heartbeat maintenance do not become adoption evidence',async t=>{
 const root=await fixture(t,{
  '2026/09/24/controls.jsonl':[
   user('/genpet-start'),
   user('/genpet-reset 调试重新生成蛋'),
   user('/genpet-grow 7 开发测试'),
   user('$genpet:genpet-state build 调试道具'),
   user('<heartbeat><automation_id>genpet</automation_id>开发测试</heartbeat>'),
   user('请帮我研究一篇论文'),
  ],
 });
 const scan=await scanCodexContext({codexHome:root,nowMs:NOW});
 assert.equal(scan.stats.messages,1);
 assert.deepEqual(scan.entries.map(entry=>entry.kind),['research']);
 assert.deepEqual(deriveInitialProfile(scan),{interest:'research',palette:'sky',temperament:'curious'});
});

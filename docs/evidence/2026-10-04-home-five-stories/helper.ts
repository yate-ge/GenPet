import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../../../src/store.ts';
import { unitRequest, validateUnitResult, recordStep } from '../../../src/generation.ts';
import { beginStory, planStory, finishStory, storyOutput } from '../../../src/lifecycle.ts';
import { artRequest, acceptArt } from '../../../src/art.ts';
import { growth } from '../../../src/growth.ts';
import { bindAvatar } from '../../../src/hosts/dots.ts';
import { recordHostResult } from '../../../src/hosts/result.ts';
import { desiredAppearance } from '../../../src/appearance.ts';
import { dueStory } from '../../../src/schedule.ts';
import { namingDue, markNameAsked, namePet } from '../../../src/naming.ts';
import { noteChat } from '../../../src/chat.ts';
import { statusView } from '../../../src/status.ts';

const [groupDirectory, action, ...args] = process.argv.slice(2);
if (!path.isAbsolute(groupDirectory)) throw new Error('Absolute group directory required');
process.env.GENPET_DATA_DIR = path.join(groupDirectory, 'data');
process.env.CODEX_HOME = path.join(groupDirectory, 'codex-home');
process.env.CODEX_APP_TOOLS_PIPE_PATH = '';
process.env.CODEX_THREAD_ID = '';
process.env.GENPET_SKIP_NATIVE_REFRESH = '1';
const clockFile = path.join(groupDirectory, 'clock.json');
await mkdir(groupDirectory, { recursive: true });
let now = Date.parse('2026-10-03T00:00:00Z');
try { now = JSON.parse(await readFile(clockFile, 'utf8')).now; } catch {}
Date.now = () => now;
const store = new Store(process.env.GENPET_DATA_DIR, 'dots');
const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const save = async (file: string, result: unknown) => writeFile(file, JSON.stringify(result, null, 2) + '\n');
let result: unknown;
if (action === 'clock') {
  now = args[0].includes('T') ? Date.parse(args[0]) : now + Number(args[0]);
  await save(clockFile, { now, iso: new Date(now).toISOString(), simulated: true });
  result = { now, iso: new Date(now).toISOString() };
} else if (action === 'request') {
  result = unitRequest(args[0], await read(args[1]));
  await save(args[2], result);
} else if (action === 'verify') {
  result = validateUnitResult(args[0], await read(args[1]));
  if (args[2]) await save(args[2], { ok: true, unit: args[0] });
} else if (action === 'begin') {
  result = await beginStory(store, args[0]);
} else if (action === 'forecast') {
  const projection=await read(args[0]); result={growth:growth(projection.state,now),now};
} else if (action === 'status') {
  const state = await store.peek();
  result = { ...state, growth: growth(state), namingDue: namingDue(state), simulatedClock: new Date(now).toISOString(), due: dueStory(state, now, 'Asia/Shanghai') };
} else if (action === 'plan') {
  const state = await store.peek();
  result = await planStory(store, state.pending!.id, await read(args[0]));
} else if (action === 'record') {
  const state = await store.peek();
  const envelope = validateUnitResult(args[0], await read(args[1]));
  const operationId = args[2] || state.pending?.id || state.stories.at(-1)?.id;
  if (!operationId) throw new Error('No pending or completed story to record');
  result = await recordStep(store, operationId, args[0], envelope);
} else if (action === 'accept') {
  const state = await store.peek();
  result = await acceptArt(store, { requestId: artRequest(state)!.id, file: path.resolve(args[0]), kind: (args[1] || 'avatar') as any, description: args[3], provenance: args[2] || 'Built-in imagegen; independent review pending; isolated test asset only' });
} else if (action === 'art-request') {
  result = artRequest(await store.peek());
} else if (action === 'finish') {
  let state = await store.peek();
  if (state.pending!.plan!.appearance) {
    if (!state.pet!.binding) await bindAvatar(store, `dots:isolated:${path.basename(groupDirectory)}`);
    state = await store.peek();
    await recordHostResult(store, state.pending!.id, {
      petId: state.pet!.id, operationId: state.pending!.id, appearanceId: desiredAppearance(state)!.id,
      avatarId: state.pet!.binding!.avatarId, updated: true, active: false, refreshRequested: false,
      displayStatus: 'unconfirmed', evidence: 'Simulated inactive host acknowledgement; no live display verified',
    });
  }
  result = await finishStory(store, (await store.peek()).pending!.id);
  await save(path.join(groupDirectory, `${args[0] || 'latest'}.completed.json`), result);
  await save(path.join(groupDirectory, `${args[0] || 'latest'}.snapshot.json`), { ...await store.peek(), growth: growth(await store.peek()), namingDue: namingDue(await store.peek()) });
} else if (action === 'finish-unconfirmed') {
  const state = await store.peek();
  try { const completed = await finishStory(store, state.pending!.id); result = {unexpectedCompletion: true, completed}; } catch(error) { result = {rejected: true, error: String(error), state: await store.peek()}; }
} else if (action === 'output') {
  result = storyOutput(await store.peek());
} else if (action === 'chat-note') {
  result = await noteChat(store, (await store.peek()).pet!.id, args[0]);
} else if (action === 'compact') {
  const state=await store.peek(); result={...statusView(state),growth:growth(state)};
} else if (action === 'name-asked') {
  result = await markNameAsked(store, (await store.peek()).pet!.id);
} else if (action === 'name') {
  result = await namePet(store, (await store.peek()).pet!.id, args[0]);
} else throw new Error(`Unknown action ${action}`);
console.log(JSON.stringify(result, null, 2));

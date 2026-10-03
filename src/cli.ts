#!/usr/bin/env node
/**
 * GenPet CLI, called by the Agent's skills. Every command prints one JSON result.
 * Shared commands are listed here; each host adds its own (see src/hosts).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { acceptArt, artRequest } from './art.js';
import { noteChat } from './chat.js';
import { packageHost, readPrompt } from './config.js';
import { launchDebugger } from './debugger.js';
import { recordStep, unitRequest, validateUnitResult } from './generation.js';
import { growth } from './growth.js';
import { hostFor, type Command } from './hosts/index.js';
import { recordHostResult } from './hosts/result.js';
import { beginStory, cancelStory, finishStory, planStory, resetPet, storyOutput } from './lifecycle.js';
import { findLegacyRecord, migrateLegacy } from './migration.js';
import type { ArtKind } from './model.js';
import { markNameAsked, namePet, namingDue } from './naming.js';
import { dueStory, setSchedule } from './schedule.js';
import { statusView } from './status.js';
import { Store } from './store.js';

/** JSON inputs are passed as absolute file paths, never inline. */
async function jsonFile(file: string) {
  if (!path.isAbsolute(file ?? '')) throw new Error('JSON input requires an absolute file');
  return JSON.parse(await readFile(file, 'utf8'));
}

const shared: Record<string, Command> = {
  status: {
    usage: 'status [--full]',
    run: async ([flag], store) => {
      const state = await store.peek();
      const legacyFile = state.pet ? null : await findLegacyRecord(store);
      return {
        ...(flag === '--full' ? state : statusView(state)),
        namingDue: namingDue(state),
        growth: growth(state),
        dataDirectory: store.root,
        ...(legacyFile ? { legacyFile } : {}),
      };
    },
  },
  // Story lifecycle
  'begin-story': {
    usage: 'begin-story [TRIGGER_ID]',
    run: ([trigger], store) => beginStory(store, trigger || `manual:${randomUUID()}`),
  },
  'plan-story': {
    usage: 'plan-story OPERATION_ID PLAN_JSON',
    run: async ([id, file], store) => planStory(store, id, await jsonFile(file)),
  },
  'finish-story': { usage: 'finish-story OPERATION_ID', run: ([id], store) => finishStory(store, id) },
  'cancel-story': { usage: 'cancel-story OPERATION_ID', run: ([id], store) => cancelStory(store, id) },
  'story-output': { usage: 'story-output [STORY_ID]', run: async ([id], store) => storyOutput(await store.peek(), id) },
  reset: { usage: 'reset [OPERATION_ID]', run: ([id], store) => resetPet(store, id || randomUUID()) },
  // Artwork and host updates
  'art-request': { usage: 'art-request', run: async (_, store) => artRequest(await store.peek()) },
  'accept-art': {
    usage: 'accept-art REQUEST_ID FILE portrait|atlas|avatar|story|artifact PROVENANCE [DESCRIPTION]',
    run: ([requestId, file, kind, provenance, description], store) =>
      acceptArt(store, { requestId, file, kind: kind as ArtKind, provenance, description }),
  },
  'host-result': {
    usage: 'host-result OPERATION_ID RESULT_JSON',
    run: async ([id, file], store) => recordHostResult(store, id, await jsonFile(file)),
  },
  // Naming
  'name-pet': { usage: 'name-pet PET_ID USER_NAME', run: ([id, name], store) => namePet(store, id, name) },
  'name-asked': { usage: 'name-asked PET_ID', run: ([id], store) => markNameAsked(store, id) },
  // Conversation
  'note-chat': { usage: 'note-chat PET_ID NOTE', run: ([id, note], store) => noteChat(store, id, note) },
  // Generation units
  prompt: { usage: 'prompt MODULE', run: ([name]) => ({ prompt: readPrompt(name) }) },
  'unit-request': {
    usage: 'unit-request UNIT INPUT_JSON',
    run: async ([unit, file]) => unitRequest(unit, await jsonFile(file)),
  },
  'verify-unit': {
    usage: 'verify-unit UNIT RESULT_JSON',
    run: async ([unit, file]) => ({ unit, contractValid: true, ...validateUnitResult(unit, await jsonFile(file)) }),
  },
  'record-step': {
    usage: 'record-step OPERATION_ID UNIT RESULT_JSON',
    run: async ([id, unit, file], store) => recordStep(store, id, unit, await jsonFile(file)),
  },
  // Scheduling
  due: { usage: 'due [TIMEZONE]', run: async ([zone], store) => dueStory(await store.peek(), Date.now(), zone) },
  schedule: {
    usage: 'schedule TIMEZONE REFERENCE',
    run: ([zone, reference], store) => setSchedule(store, zone, reference),
  },
  // Maintenance
  'migrate-legacy': {
    usage: 'migrate-legacy V1_FILE DESIGN_JSON',
    run: async ([file, design], store) => migrateLegacy(store, file, await jsonFile(design)),
  },
  debugger: { usage: 'debugger', run: () => launchDebugger() },
};

const store = new Store(undefined, packageHost());
const commands = { ...shared, ...hostFor(store.host).commands };
const [name, ...args] = process.argv.slice(2);
try {
  const command = commands[name];
  if (!command)
    throw new Error(
      `Commands:\n${Object.values(commands)
        .map(command => `  ${command.usage}`)
        .join('\n')}`,
    );
  console.log(JSON.stringify(await command.run(args, store), null, 2));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}

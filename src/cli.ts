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
import { bindCloud } from './hosts/cloud.js';
import { beginStory, cancelStory, finishStory, planStory, resetPet, storyOutput } from './lifecycle.js';
import { findLegacyRecord, inspectLegacyRecords, migrateLegacy } from './migration.js';
import type { ArtKind } from './model.js';
import { markNameAsked, namePet, namingDue } from './naming.js';
import { dueStory, setSchedule, stopSchedule, timeSense } from './schedule.js';
import { statusView } from './status.js';
import { Store } from './store.js';
import { journeyStep } from './journey.js';
import { chooseCandidate, chooseSource, recentContent } from './variety.js';
import { exportPet, importPet } from './handoff.js';
import { pipelinePrepare, pipelineProcess, pipelineRuntime } from './pipeline.js';
import { cloudBriefForPet } from './status.js';

/** JSON inputs are passed as absolute file paths, never inline. */
async function jsonFile(file: string) {
  if (!path.isAbsolute(file ?? '')) throw new Error('JSON input requires an absolute file');
  return JSON.parse(await readFile(file, 'utf8'));
}

const shared: Record<string, Command> = {
  help: {
    usage: 'help | --help',
    run: async () => ({ commands: Object.values(commands).map(command => command.usage) }),
  },
  status: {
    usage: 'status [--full]',
    run: async ([flag], store) => {
      const state = await store.peek();
      const legacyFile = state.pet ? null : await findLegacyRecord(store);
      return {
        ...(flag === '--full' ? state : statusView(state)),
        namingDue: namingDue(state),
        growth: growth(state),
        time: timeSense(state),
        dataDirectory: store.root,
        ...(legacyFile ? { legacyFile } : {}),
      };
    },
  },
  // Story lifecycle
  'begin-story': {
    usage: 'begin-story [TRIGGER_ID] [--grow]',
    run: ([trigger, flag], store) =>
      beginStory(store, trigger || `manual:${randomUUID()}`, { forceGrowth: flag === '--grow' }),
  },
  'journey-step': {
    usage: 'journey-step OPERATION_ID STEP_JSON',
    run: async ([id, file], store) => journeyStep(store, id, await jsonFile(file)),
  },
  'random-source': {
    usage: 'random-source OPERATION_ID [SEED]',
    run: ([id, seed], store) => chooseSource(store, id, seed),
  },
  'random-choice': {
    usage: 'random-choice OPERATION_ID CANDIDATES_JSON [SEED]',
    run: async ([id, file, seed], store) => chooseCandidate(store, id, await jsonFile(file), seed),
  },
  'recent-content': {
    usage: 'recent-content [COUNT]',
    run: async ([count], store) => recentContent(await store.peek(), count ? Number(count) : 10),
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
  'find-avatar': { usage: 'find-avatar', run: async (_, store) => hostFor(store.host).findAvatar(await store.peek()) },
  'bind-cloud': { usage: 'bind-cloud CLOUD_PET_ID', run: ([id], store) => bindCloud(store, id) },
  'set-appearance': { usage: 'set-appearance', run: (_, store) => hostFor(store.host).setAppearance(store) },
  diagnose: { usage: 'diagnose', run: (_, store) => hostFor(store.host).diagnose(store) },
  'companion-brief': {
    usage: 'companion-brief [BRIEF_DRAFT_JSON]',
    run: async ([file], store) => {
      const state = await store.peek();
      if (!state.pet) throw new Error('No Pet');
      const target = await hostFor(store.host).findAvatar(state);
      const brief = cloudBriefForPet(state.pet, file ? await jsonFile(file) : undefined);
      return {
        ...brief,
        cloudId: target.cloudId,
        agentSteps: brief.needsSummary
          ? [
              {
                command: 'companion-brief ABSOLUTE_DRAFT_JSON',
                check:
                  'Summarize sourceBrief into at most 500 characters, preserving the actual name, soul and speaking habits, shared memory and current stage/state. Save {petId, revision, description}; review the summary against the source, then rerun this command. Do not truncate fields or invent facts.',
              },
            ]
          : target.cloudId
            ? [
                {
                  tool: 'update_pet',
                  arguments: { pet_id: target.cloudId, updates: { description: brief.description } },
                },
                {
                  tool: 'list_pets',
                  check:
                    'Read the exact Pet ID back and compare its description with this generated brief before claiming synchronization.',
                },
              ]
            : [],
      };
    },
  },
  'pipeline-runtime': { usage: 'pipeline-runtime [PYTHON_PATH]', run: ([python]) => pipelineRuntime(python) },
  'pipeline-prepare': {
    usage: 'pipeline-prepare INPUT_JSON',
    run: async ([file]) => pipelinePrepare(await jsonFile(file)),
  },
  'pipeline-process': {
    usage: 'pipeline-process RUN_DIRECTORY [OPTIONS_JSON]',
    run: async ([run, file]) => pipelineProcess(run, file ? await jsonFile(file) : {}),
  },
  'accept-art': {
    usage: 'accept-art REQUEST_ID FILE portrait|atlas|story|artifact SOURCE [DESCRIPTION]',
    run: (args, store) => {
      if (args.length < 4 || args.length > 5)
        throw new Error(
          'Usage: accept-art REQUEST_ID FILE portrait|atlas|story|artifact SOURCE [DESCRIPTION]; REQUEST_ID is art-request.id',
        );
      const [requestId, file, kind, source, description] = args;
      return acceptArt(store, { requestId, file, kind: kind as ArtKind, source, description });
    },
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
  'schedule-stop': { usage: 'schedule-stop', run: (_, store) => stopSchedule(store) },
  // Maintenance
  'migrate-legacy': {
    usage: 'migrate-legacy V1_FILE DESIGN_JSON',
    run: async ([file, design], store) => migrateLegacy(store, file, await jsonFile(design)),
  },
  'import-record': {
    usage: 'import-record OLD_STATE_JSON DESIGN_JSON',
    run: async ([file, design], store) => store.importRecord(file, { ...(await jsonFile(design)), confirmed: true }),
  },
  'supplement-legacy': {
    usage: 'supplement-legacy DESIGN_JSON',
    run: async ([file], store) => store.supplementLegacy({ ...(await jsonFile(file)), confirmed: true }),
  },
  'new-pet': {
    usage: 'new-pet [--replace]',
    run: ([flag], store) => store.createPet({ confirmed: true, replace: flag === '--replace' }),
  },
  'list-pets': { usage: 'list-pets', run: (_, store) => store.listPets() },
  'inspect-records': {
    usage: 'inspect-records',
    run: async (_, store) => ({
      dataDirectory: store.base,
      records: {
        desktop: await new Store(store.base, 'desktop').listPets(),
        cloud: await new Store(store.base, 'cloud').listPets(),
      },
      legacy: await inspectLegacyRecords(store.base),
    }),
  },
  'activate-pet': { usage: 'activate-pet PET_ID', run: ([id], store) => store.selectPet(id) },
  'resolve-active': { usage: 'resolve-active [HOST_AVATAR_ID]', run: ([id], store) => store.resolveActive(id ?? null) },
  'handoff-export': {
    usage: 'handoff-export desktop|cloud DESTINATION_DIR',
    run: ([host, dir], store) => exportPet(store, host as 'desktop' | 'cloud', dir),
  },
  'handoff-import': { usage: 'handoff-import TRANSFER_DIR', run: ([dir], store) => importPet(store, dir) },
  debugger: { usage: 'debugger', run: () => launchDebugger() },
};

const argv = process.argv.slice(2);
const hostIndex = argv.indexOf('--host');
const host = hostIndex >= 0 ? argv.splice(hostIndex, 2)[1] : packageHost();
if (host !== 'desktop' && host !== 'cloud') throw new Error('Host must be desktop or cloud');
const petIndex = argv.indexOf('--pet');
const petId = petIndex >= 0 ? argv.splice(petIndex, 2)[1] : undefined;
let store = new Store(undefined, host, petId);
const commands = { ...shared, ...hostFor(store.host).commands };
const [rawName, ...args] = argv;
const name = rawName === '--help' ? 'help' : rawName;
try {
  if (
    [
      'plan-story',
      'finish-story',
      'cancel-story',
      'host-result',
      'record-step',
      'journey-step',
      'random-source',
      'random-choice',
      'story-output',
    ].includes(name) &&
    args[0]
  )
    store = await store.forOperation(args[0]);
  else if (!petId && ['begin-story', 'due', 'name-pet', 'name-asked', 'note-chat', 'reset', 'new-pet'].includes(name)) {
    const selected = await hostFor(store.host).selectedAvatar?.();
    await store.resolveActive(selected?.available ? selected.id : undefined);
  }
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

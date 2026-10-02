#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store, type ArtKind, type Pending } from './store.js';
import { text } from './core.js';
import { artRequest, acceptArt, installNative } from './art.js';
import {
  beginStory,
  planStory,
  finishStory,
  dueStory,
  pendingFor,
  recordHostResult,
  resetPet,
  DAILY_TIMES,
} from './story.js';
import { bindAvatar, hostRequest } from './hosts.js';
import { packageHost, readPrompt } from './prompts.js';
import { recordStep, unitRequest, validateUnitResult } from './generation.js';
import { migrateLegacy } from './migration.js';
import { getNativePetCatalog } from './native-pets.js';
import { readNativePetLive, selectNativePetLive } from './native-pet-live.js';
import { launchDebugger } from './debugger.js';
import { namingDue, markNameAsked, namePet } from './naming.js';

const [command, ...args] = process.argv.slice(2),
  store = new Store(undefined, packageHost());
const jsonFile = async (file: string) => {
  if (!path.isAbsolute(file ?? '')) throw new Error('JSON input requires an absolute file');
  return JSON.parse(await readFile(file, 'utf8'));
};
try {
  let output: unknown;
  switch (command) {
    case 'status': {
      const state = await store.peek(),
        legacyFile = !state.pet ? await store.legacyCandidate() : null;
      output = {
        ...state,
        namingDue: namingDue(state),
        dataDirectory: store.root,
        ...(legacyFile ? { legacyFile } : {}),
      };
      break;
    }
    case 'begin-story':
      output = await beginStory(
        store,
        args[0] || `manual:${randomUUID()}`,
        (args[1] || 'story') as Pending['mode'],
        args[2],
      );
      break;
    case 'plan-story':
      output = await planStory(store, args[0], await jsonFile(args[1]));
      break;
    case 'finish-story':
      output = await finishStory(store, args[0]);
      break;
    case 'name-pet':
      output = await namePet(store, args[0], args[1]);
      break;
    case 'name-asked':
      output = await markNameAsked(store, args[0]);
      break;
    case 'cancel-story':
      output = await store.transaction(state => {
        const pending = pendingFor(state, args[0]);
        if (pending.mode === 'initialization' && pending.plan)
          throw new Error('Initialization genes are saved; resume it or explicitly reset the pet');
        state.pending = null;
        return { cancelled: pending.id };
      });
      break;
    case 'art-request':
      output = artRequest(await store.peek());
      break;
    case 'accept-art':
      output = await acceptArt(store, {
        requestId: args[0],
        file: args[1],
        kind: args[2] as ArtKind,
        provenance: args[3],
        description: args[4],
      });
      break;
    case 'host-request':
      output = hostRequest(await store.peek());
      break;
    case 'host-result':
      output = await recordHostResult(store, args[0], await jsonFile(args[1]));
      break;
    case 'bind-avatar':
      output = await bindAvatar(store, args[0]);
      break;
    case 'publish':
      if (store.host !== 'desktop')
        throw new Error('Dots: use host-request, update the Avatar with Dots tools, then host-result');
      output = await installNative(store);
      break;
    case 'prompt':
      output = { prompt: readPrompt(args[0]) };
      break;
    case 'unit-request':
      output = unitRequest(args[0], await jsonFile(args[1]));
      break;
    case 'verify-unit':
      output = { unit: args[0], contractValid: true, ...validateUnitResult(args[0], await jsonFile(args[1])) };
      break;
    case 'record-step':
      output = await recordStep(store, args[0], args[1], await jsonFile(args[2]));
      break;
    case 'due':
      output = dueStory(await store.peek(), Date.now(), args[0]);
      break;
    case 'schedule': {
      const timezone = text(args[0], 'timezone'),
        reference = text(args[1], 'schedule reference');
      new Intl.DateTimeFormat('en', { timeZone: timezone });
      output = await store.transaction(state => (state.schedule = { timezone, reference, times: DAILY_TIMES }));
      break;
    }
    case 'story-output': {
      const state = await store.peek(),
        story = args[0] ? state.stories.find(story => story.id === args[0]) : state.stories.at(-1);
      if (!story) throw new Error('No completed story');
      output = {
        text: story.text,
        media: state.art.filter(art => story.mediaIds.includes(art.id)),
        appearance: state.art.find(art => art.id === story.appearanceId),
        naming: { due: namingDue(state), petId: state.pet?.id, status: state.pet?.naming?.status ?? 'named' },
        prompt: readPrompt('output'),
      };
      break;
    }
    case 'migrate-legacy':
      output = await migrateLegacy(store, args[0], await jsonFile(args[1]));
      break;
    case 'reset':
      output = await resetPet(store, args[0] || randomUUID());
      break;
    case 'debugger':
      output = await launchDebugger();
      break;
    case 'switch-pet': {
      if (store.host !== 'desktop') throw new Error('switch-pet requires the desktop package');
      const usage = 'Usage: switch-pet [PET_ID|--current|--list|--help]';
      if (args.length > 1) throw new Error(usage);
      const target = args[0] ?? '--current';
      if (target === '--help') {
        output = { usage, examples: ['switch-pet --list', 'switch-pet --current', 'switch-pet dewey'] };
        break;
      }
      if (target === '--current') {
        const current = await readNativePetLive();
        if (!current.available) throw new Error(current.reason);
        output = current;
        break;
      }
      if (target.startsWith('-') && target !== '--list') throw new Error(usage);
      const catalog = await getNativePetCatalog();
      if (target === '--list') {
        output = { pets: catalog.pets, ...(catalog.errors ? { errors: catalog.errors } : {}) };
        break;
      }
      if (!catalog.pets.some(pet => pet.id === target))
        throw new Error(`Unknown pet ID: ${target}. Use switch-pet --list.`);
      output = await selectNativePetLive(target);
      break;
    }
    default:
      throw new Error(
        'Commands: status, begin-story [TRIGGER_ID] [initialization|story|grow], plan-story OPERATION_ID PLAN_JSON, art-request, accept-art REQUEST_ID FILE portrait|atlas|avatar|story|artifact PROVENANCE [DESCRIPTION], publish (desktop), host-request, host-result OPERATION_ID RESULT_JSON, bind-avatar AVATAR_ID, finish-story OPERATION_ID, story-output [STORY_ID], name-pet PET_ID USER_NAME, name-asked PET_ID, due [TIMEZONE], schedule TIMEZONE REFERENCE, prompt MODULE, unit-request UNIT INPUT_JSON, verify-unit UNIT RESULT_JSON, record-step OPERATION_ID UNIT RESULT_JSON, migrate-legacy V1_FILE DESIGN_JSON, cancel-story OPERATION_ID, reset [OPERATION_ID], debugger, switch-pet [PET_ID|--current|--list|--help]',
      );
  }
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}

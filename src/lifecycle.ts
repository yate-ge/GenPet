/**
 * The story lifecycle: begin → plan → (artwork, host update) → finish.
 * One pending story at a time; a trigger ID makes every step safe to retry.
 */
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { appearanceFor, desiredAppearance, requestId } from './appearance.js';
import { readPrompt } from './config.js';
import { growth, commitExperience, stageAdvance, ensureGrowthClock, pausedTime } from './growth.js';
import { findLegacyRecord } from './migration.js';
import { createPet, fresh, identifier, stages, text, validateStage } from './model.js';
import type { HostResult, Pending, Pet, State, Story, StoryPlan } from './model.js';
import { namingDue } from './naming.js';
import { timeSense } from './schedule.js';
import { atomicJson, type Store } from './store.js';
import { recentContent } from './variety.js';
import { pendingFor } from './pending.js';
import { hostFor } from './hosts/index.js';

/** The pending story, if it is still current for this pet; otherwise the caller works from stale data. */
export { pendingFor } from './pending.js';

function startPending(pet: Pet, triggerId: string, mode: Pending['mode']): Pending {
  return {
    id: `story-${randomUUID()}`,
    triggerId,
    petId: pet.id,
    baseRevision: pet.revision,
    startedAt: Date.now(),
    mode,
  };
}

/** `begin-story`: allocate the pet once, then open (or return) the story for this trigger. */
export async function beginStory(store: Store, triggerId: string, options: { forceGrowth?: boolean } = {}) {
  identifier(triggerId, 'triggerId');
  return store.transaction(async state => {
    if (state.handoff?.status === 'exported')
      throw new Error('This environment handed the Pet to another host; import it back before writing stories');
    const completed = state.stories.find(story => story.triggerId === triggerId);
    if (completed) return { status: 'completed', story: completed };
    if (state.pending) {
      if (state.pending.triggerId !== triggerId)
        throw new Error(`Unfinished story ${state.pending.id}; resume it first`);
      return {
        status: 'pending',
        pending: state.pending,
        pet: state.pet,
        growth: growth(state),
        time: timeSense(state),
      };
    }
    if (!state.pet && (await findLegacyRecord(store)))
      throw new Error('Existing legacy pet found; migrate it before creating a new identity');
    state.pet ??= createPet();
    state.pending = startPending(state.pet, triggerId, state.pet.soul.genes ? 'story' : 'initialization');
    if (options.forceGrowth) state.pending.forceGrowth = true;
    return { status: 'pending', pending: state.pending, pet: state.pet, growth: growth(state), time: timeSense(state) };
  });
}

/**
 * Engineering checks on the Agent's plan. Identity (genes, personality) is fixed once saved; a story
 * advances at most one stage and must carry any change its growth ceiling has made due.
 */
function validatePlan(state: State, input: StoryPlan): StoryPlan {
  const pet = state.pet!;
  const plan: StoryPlan = {
    text: text(input.text, 'story text'),
    reason: text(input.reason, 'decision reason'),
    state: text(input.state, 'state'),
    stage: validateStage(pet.state.stage, input.stage ?? pet.state.stage),
  };
  if (input.contextRefs !== undefined) {
    if (!Array.isArray(input.contextRefs)) throw new Error('contextRefs must be an array');
    plan.contextRefs = input.contextRefs.map(ref => text(ref, 'context reference'));
  }
  if (input.memory !== undefined) plan.memory = text(input.memory, 'memory');
  if (input.designReason !== undefined) plan.designReason = text(input.designReason, 'design reason');
  if (plan.stage !== pet.state.stage && plan.stage !== stages[stages.indexOf(pet.state.stage) + 1])
    throw new Error('A story advances at most one stage');
  if (plan.stage !== pet.state.stage && !state.pending?.forceGrowth && !growth(state)?.canAdvance)
    throw new Error('Growth needs five experiences or its latest-time deadline; use explicit grow for a forced change');
  if (input.home !== undefined) {
    plan.home = text(input.home, 'home');
    if (plan.stage === 'egg') throw new Error('The home begins after hatching');
  }
  const specialActive = !!pet.state.special && pet.state.special.endedAt === undefined;
  if (input.special === null) {
    if (!specialActive) throw new Error('There is no special form to end');
    plan.special = null;
  } else if (input.special !== undefined) {
    plan.special = text(input.special, 'special form');
    if (pet.state.stage !== 'adult') throw new Error('Special forms begin in adulthood');
  }
  if (input.personality !== undefined) {
    plan.personality = text(input.personality, 'personality');
    if (pet.soul.personality && pet.soul.personality !== plan.personality)
      throw new Error('An existing pet retains its personality');
  } else if (pet.soul.personality) plan.personality = pet.soul.personality;

  if (!pet.soul.genes) {
    if (!state.pending?.journey?.completed || !state.pending.journey.rounds.length)
      throw new Error('Complete the adoption choice journey before planning its genes and egg');
    if (plan.stage !== 'egg') throw new Error('Initialization begins with an egg');
    plan.genes = text(input.genes, 'open gene description');
    plan.place = text(input.place, 'acquisition place');
    plan.connection = text(input.connection, 'user connection');
    if (!plan.personality) throw new Error('Initialization requires an individual personality');
    if (!input.appearance) throw new Error('Initialization requires an egg appearance');
  } else if (input.genes !== undefined && input.genes !== pet.soul.genes)
    throw new Error('An existing pet retains its genes');

  if (input.appearance)
    plan.appearance = {
      description: text(input.appearance.description, 'appearance description'),
      ...(input.appearance.reuseArtId ? { reuseArtId: identifier(input.appearance.reuseArtId, 'reuseArtId') } : {}),
    };
  if (plan.stage !== pet.state.stage && !plan.appearance)
    throw new Error('Evolution requires an appearance for the new stage');
  if ((plan.special === null || (plan.special !== undefined && !specialActive)) && !plan.appearance)
    throw new Error('Entering or leaving a special form requires an appearance');
  const required = growth(state)?.required;
  if (required === 'advance' && plan.stage === pet.state.stage)
    throw new Error(`Growth is due: this story advances to ${stages[stages.indexOf(pet.state.stage) + 1]}`);
  if (required === 'enter-special' && typeof plan.special !== 'string')
    throw new Error('A special form is due: this story enters one');
  if (required === 'end-special' && plan.special !== null)
    throw new Error('The special form is due to end in this story');
  if (plan.appearance?.reuseArtId) appearanceFor(state, plan.stage!, plan.appearance.reuseArtId);

  if (input.mediaIds !== undefined) {
    if (!Array.isArray(input.mediaIds)) throw new Error('mediaIds must be an array');
    plan.mediaIds = input.mediaIds.map(id => identifier(id, 'mediaId'));
    for (const id of plan.mediaIds)
      if (!state.art.some(art => art.id === id && art.petId === pet.id))
        throw new Error('Media belongs to another pet or is missing');
  }
  return plan;
}

/** `plan-story`: save the plan once. Artwork retries keep it; redesigning requires cancelling. */
export async function planStory(store: Store, id: string, input: StoryPlan) {
  return store.transaction(state => {
    const pending = pendingFor(state, id);
    if (pending.plan && JSON.stringify(input) === JSON.stringify(pending.plan)) return pending;
    const plan = validatePlan(state, input);
    if (pending.plan && JSON.stringify(pending.plan) !== JSON.stringify(plan))
      throw new Error('The story plan is saved; resume it or cancel explicitly before redesigning');
    pending.plan = plan;
    return pending;
  });
}

/** The story may complete once the target shows, or will show, the planned appearance. */
function hostUpdateComplete(result: HostResult | undefined, appearanceId: string) {
  if (!result?.updated || result.appearanceId !== appearanceId || result.error) return false;
  return result.storedArtworkVerified === true;
}

/** `finish-story`: commit stage, state, history and the trigger together. Until then nothing changes. */
export async function finishStory(store: Store, id: string) {
  return store.transaction(async state => {
    const previous = state.stories.find(story => story.id === id);
    if (previous) return previous;
    const pending = pendingFor(state, id);
    const plan = pending.plan;
    if (!plan) throw new Error('Save a story plan before completing it');
    const pet = state.pet!;
    const previousStage = pet.state.stage;
    const appearance = desiredAppearance(state);
    if (plan.appearance) {
      if (!appearance) throw new Error('Appearance artwork is unfinished');
      await access(appearance.file);
      if (!hostUpdateComplete(pending.hostResult, appearance.id))
        throw new Error('Host update or active Avatar refresh is unfinished; resume it');
      const target = await hostFor(state.host).findAvatar(state);
      if (!target.avatarId || target.avatarId !== pending.hostResult!.avatarId)
        throw new Error('The host target changed or is unresolved; update the actual Pet before completing');
    }
    const current = requestId(state);
    const storyMedia = state.art.filter(
      art => art.requestId === current && (art.kind === 'story' || art.kind === 'artifact'),
    );
    const mediaIds = [...new Set([...(plan.mediaIds ?? []), ...storyMedia.map(art => art.id)])];
    for (const mediaId of mediaIds)
      await access(state.art.find(art => art.id === mediaId && art.petId === pet.id)!.file);
    const appearanceChanged = !!plan.appearance && appearance?.id !== pet.state.appearanceId;
    const hasVisibleMedia = mediaIds.some(mediaId =>
      state.art.some(art => art.id === mediaId && art.kind !== 'artifact'),
    );
    const item = pending.steps?.findLast(step => step.unit === 'story-item');
    const home = pending.steps?.findLast(step => step.unit === 'home');
    if ((item?.result.item || home?.result.visual) && !hasVisibleMedia)
      throw new Error('The final story item or home requests an image; accept its actual media before completing');
    if (pending.mode === 'story' && !appearanceChanged && !hasVisibleMedia) {
      if (!plan.contextRefs?.length) throw new Error('A text-only story needs a user-related context reference');
      const sources = new Set<string>();
      for (const owner of [...state.stories, pending])
        for (const step of owner.steps ?? []) {
          if (step.unit !== 'context') continue;
          const facts = Array.isArray(step.result.facts) ? step.result.facts : [];
          if (facts.length) for (const ref of step.inputRefs) sources.add(ref);
          for (const fact of facts) {
            if (fact && typeof fact === 'object' && typeof (fact as Record<string, unknown>).id === 'string')
              sources.add((fact as { id: string }).id);
          }
        }
      for (const round of pet.soul.acquisition?.journey?.rounds ?? [])
        for (const ref of round.inputRefs) sources.add(ref);
      for (const chat of state.chats ?? []) sources.add(chat.id);
      // A Pet-world story ID alone is not a user fact. Only carry forward a grounded reference.
      for (const story of state.stories) if (story.contextRefs?.some(ref => sources.has(ref))) sources.add(story.id);
      if (plan.contextRefs.some(ref => !sources.has(ref)))
        throw new Error('The context reference is not present in the saved inputs or shared history');
      if (recentContent(state).visualRequired)
        throw new Error('At most two text-only stories in a row; produce a visible result');
    }

    const story: Story = {
      id,
      triggerId: pending.triggerId,
      petId: pet.id,
      at: Date.now(),
      text: plan.text,
      reason: plan.reason,
      ...(plan.designReason ? { designReason: plan.designReason } : {}),
      ...(plan.memory !== undefined ? { memory: plan.memory } : {}),
      ...(pending.journey ? { journey: pending.journey } : {}),
      ...(pending.selection || pending.sourceChoice
        ? {
            random: {
              sourceChoice: pending.sourceChoice,
              selection: pending.selection,
              candidates: pending.candidates,
            },
          }
        : {}),
      ...(plan.contextRefs?.length ? { contextRefs: plan.contextRefs } : {}),
      stage: plan.stage!,
      state: plan.state,
      ...(plan.home !== undefined ? { home: plan.home } : {}),
      ...(plan.special !== undefined ? { special: plan.special } : {}),
      ...(appearance ? { appearanceId: appearance.id } : {}),
      appearanceChanged,
      mediaIds,
      ...(pending.steps?.length ? { steps: pending.steps } : {}),
      ...(pending.hostResult ? { hostResult: pending.hostResult } : {}),
    };
    if (!pet.soul.genes) {
      pet.soul.genes = plan.genes!;
      pet.soul.acquisition = {
        place: plan.place!,
        connection: plan.connection!,
        storyId: id,
        ...(pending.journey ? { journey: pending.journey } : {}),
      };
      if (plan.designReason) pet.soul.designReason = plan.designReason;
    }
    if (plan.personality) pet.soul.personality ??= plan.personality;
    pet.state.stage = plan.stage!;
    if (plan.home !== undefined) pet.state.home = plan.home;
    if (plan.special === null) pet.state.special!.endedAt = story.at;
    else if (plan.special !== undefined)
      pet.state.special =
        pet.state.special && pet.state.special.endedAt === undefined
          ? { ...pet.state.special, description: plan.special }
          : { description: plan.special, since: story.at, storyId: id };
    pet.revision++;
    pet.state = {
      ...pet.state,
      stage: plan.stage!,
      description: plan.state,
      storyId: id,
      updatedAt: story.at,
      ...(appearance ? { appearanceId: appearance.id } : {}),
    };
    if (pending.mode === 'initialization') {
      // The journey may pause for days; the egg's five hours start when adoption completes.
      pet.adoptedAt = story.at;
      const clock = ensureGrowthClock(state)!;
      clock.stageSince = story.at;
      clock.stagePausedMs = pausedTime(state, story.at);
    }
    stageAdvance(state, story.at);
    if (plan.memory !== undefined)
      commitExperience(
        state,
        id,
        plan.memory,
        story.at,
        pending.mode !== 'initialization' && previousStage === story.stage,
      );
    state.stories.push(story);
    state.pending = null;
    return story;
  });
}

/** `cancel-story`: drop an unfinished story. Saved initialization genes are kept unless the user resets. */
export async function cancelStory(store: Store, id: string) {
  return store.transaction(state => {
    const pending = pendingFor(state, id);
    if (pending.mode === 'initialization' && pending.plan)
      throw new Error('Initialization genes are saved; resume it or explicitly reset the pet');
    state.pending = null;
    return { cancelled: pending.id };
  });
}

/** `reset`: back up the record and start a new identity on the same host surface and schedule. */
export async function resetPet(store: Store, operationId: string) {
  const triggerId = `reset:${identifier(operationId, 'reset operationId')}`;
  return store.transaction(async state => {
    const completed = state.stories.find(story => story.triggerId === triggerId);
    if (completed) return { status: 'completed', story: completed };
    if (state.pending?.triggerId === triggerId) return { status: 'pending', pending: state.pending, pet: state.pet };
    // An unfinished initialization can be abandoned by reset (the whole record is backed up first).
    if (state.pending && state.pending.mode !== 'initialization')
      throw new Error('Resume or cancel the unfinished story before an explicit reset');
    if (!state.pet && (await findLegacyRecord(store)))
      throw new Error('Migrate the existing legacy pet before resetting its identity');
    const backup = path.join(store.root, 'backups', `reset-${Date.now()}-${randomUUID()}.json`);
    await atomicJson(backup, state);
    const previous = state.pet;
    const schedule = state.schedule;
    for (const key of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[key];
    Object.assign(state, fresh(store.host), { pet: createPet(), ...(schedule ? { schedule } : {}) });
    const pet = state.pet!;
    if (previous?.binding) pet.binding = previous.binding;
    if (previous) state.replacesPetId = previous.id;
    state.pending = startPending(pet, triggerId, 'initialization');
    return { status: 'pending', pending: state.pending, pet, backup };
  });
}

/** `story-output`: a completed story with its saved media, for the output unit to present. */
export function storyOutput(state: State, storyId?: string) {
  const story = storyId ? state.stories.find(story => story.id === storyId) : state.stories.at(-1);
  if (!story) throw new Error('No completed story');
  const appearance = state.art.find(art => art.id === story.appearanceId);
  return {
    text: story.text,
    media: state.art.filter(art => story.mediaIds.includes(art.id)),
    appearance,
    portrait:
      state.art.findLast(
        art => art.petId === story.petId && art.kind === 'portrait' && art.requestId === appearance?.requestId,
      ) ?? null,
    naming: { due: namingDue(state), petId: state.pet?.id, status: state.pet?.naming?.status ?? 'named' },
    prompt: readPrompt('output'),
  };
}

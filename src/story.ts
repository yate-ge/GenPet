import { randomUUID, createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { createPet, identifier, text, validateStage, type Stage } from './core.js';
import {
  atomicJson,
  fresh,
  type Store,
  type State,
  type Pending,
  type StoryPlan,
  type ArtRecord,
  type HostResult,
} from './store.js';

export function pendingFor(state: State, id: string): Pending {
  const pending = state.pending;
  if (
    !pending ||
    pending.id !== id ||
    !state.pet ||
    pending.petId !== state.pet.id ||
    pending.baseRevision !== state.pet.revision
  )
    throw new Error('Stale story operation; read the persisted record before continuing');
  return pending;
}
export async function beginStory(store: Store, triggerId: string, mode: Pending['mode'] = 'story', name?: string) {
  identifier(triggerId, 'triggerId');
  if (!['initialization', 'story', 'grow'].includes(mode)) throw new Error('Invalid story mode');
  return store.transaction(async state => {
    const completed = state.stories.find(story => story.triggerId === triggerId);
    if (completed) return { status: 'completed', story: completed };
    if (state.pending) {
      if (state.pending.triggerId !== triggerId)
        throw new Error(`Unfinished story ${state.pending.id}; resume it first`);
      return { status: 'pending', pending: state.pending, pet: state.pet };
    }
    if (!state.pet && (await store.legacyCandidate()))
      throw new Error('Existing legacy pet found; migrate it before creating a new identity');
    state.pet ??= createPet(name);
    state.pending = {
      id: `story-${randomUUID()}`,
      triggerId,
      petId: state.pet.id,
      baseRevision: state.pet.revision,
      startedAt: Date.now(),
      mode: state.pet.genes ? mode : 'initialization',
    };
    return { status: 'pending', pending: state.pending, pet: state.pet };
  });
}
export async function resetPet(store: Store, operationId: string) {
  const triggerId = `reset:${identifier(operationId, 'reset operationId')}`;
  return store.transaction(async state => {
    const completed = state.stories.find(story => story.triggerId === triggerId);
    if (completed) return { status: 'completed', story: completed };
    if (state.pending?.triggerId === triggerId) return { status: 'pending', pending: state.pending, pet: state.pet };
    if (state.pending) throw new Error('Resume or cancel the unfinished story before an explicit reset');
    if (!state.pet && (await store.legacyCandidate()))
      throw new Error('Migrate the existing legacy pet before resetting its identity');
    const backup = path.join(store.root, 'backups', `reset-${Date.now()}-${randomUUID()}.json`);
    await atomicJson(backup, state);
    const previous = state.pet,
      binding = previous?.binding,
      schedule = state.schedule;
    for (const key of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[key];
    Object.assign(state, fresh(store.host), { pet: createPet(), ...(schedule ? { schedule } : {}) });
    if (binding) state.pet!.binding = binding;
    if (previous) state.replacesPetId = previous.id;
    state.pending = {
      id: `story-${randomUUID()}`,
      petId: state.pet!.id,
      triggerId,
      baseRevision: 0,
      startedAt: Date.now(),
      mode: 'initialization',
    };
    return { status: 'pending', pending: state.pending, pet: state.pet, backup };
  });
}
export function appearanceFor(state: State, stage: Stage, id: string): ArtRecord {
  const kind = state.host === 'desktop' ? 'atlas' : 'avatar';
  const art = state.art.find(
    art => art.id === id && art.petId === state.pet!.id && art.kind === kind && art.stage === stage,
  );
  if (!art)
    throw new Error('Reusable appearance is missing, belongs to another pet, or is incompatible with this host/stage');
  return art;
}
function validatePlan(state: State, input: StoryPlan): StoryPlan {
  const pet = state.pet!;
  const plan: StoryPlan = {
    text: text(input.text, 'story text'),
    basis: text(input.basis, 'decision basis'),
    state: text(input.state, 'state'),
  };
  plan.stage = validateStage(pet.stage, input.stage ?? pet.stage);
  if (input.personality !== undefined) {
    plan.personality = text(input.personality, 'personality');
    if (pet.personality && pet.personality !== plan.personality)
      throw new Error('An existing pet retains its personality');
  } else if (pet.personality) plan.personality = pet.personality;
  if (!pet.genes) {
    if (plan.stage !== 'egg') throw new Error('Initialization begins with an egg');
    plan.genes = text(input.genes, 'open gene description');
    plan.place = text(input.place, 'acquisition place');
    plan.connection = text(input.connection, 'user connection');
    if (!plan.personality) throw new Error('Initialization requires an individual personality');
    if (!input.appearance) throw new Error('Initialization requires an egg appearance');
  } else if (input.genes !== undefined && input.genes !== pet.genes)
    throw new Error('An existing pet retains its genes');
  if (input.appearance)
    plan.appearance = {
      description: text(input.appearance.description, 'appearance description'),
      ...(input.appearance.reuseArtId ? { reuseArtId: identifier(input.appearance.reuseArtId, 'reuseArtId') } : {}),
    };
  if (plan.stage !== pet.stage && !plan.appearance)
    throw new Error('Evolution requires an appearance for the new stage');
  if (input.mediaIds !== undefined) {
    if (!Array.isArray(input.mediaIds)) throw new Error('mediaIds must be an array');
    plan.mediaIds = input.mediaIds.map(id => identifier(id, 'mediaId'));
    for (const id of plan.mediaIds)
      if (!state.art.some(art => art.id === id && art.petId === pet.id))
        throw new Error('Media belongs to another pet or is missing');
  }
  if (plan.appearance?.reuseArtId) appearanceFor(state, plan.stage, plan.appearance.reuseArtId);
  return plan;
}
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
export function requestId(state: State): string | null {
  const pending = state.pending;
  return pending?.plan
    ? createHash('sha256')
        .update(JSON.stringify([pending.id, pending.petId, pending.baseRevision, pending.plan]))
        .digest('hex')
        .slice(0, 24)
    : null;
}
export function desiredAppearance(state: State): ArtRecord | undefined {
  const plan = state.pending?.plan;
  if (!plan?.appearance) return state.art.find(art => art.id === state.pet?.state.appearanceId);
  if (plan.appearance.reuseArtId) return appearanceFor(state, plan.stage!, plan.appearance.reuseArtId);
  const kind = state.host === 'desktop' ? 'atlas' : 'avatar';
  return [...state.art]
    .reverse()
    .find(art => art.petId === state.pet?.id && art.requestId === requestId(state) && art.kind === kind);
}
export function validateHostResult(state: State, id: string, input: HostResult): HostResult {
  const pending = pendingFor(state, id);
  if (state.host === 'dots' && !state.pet?.binding)
    throw new Error('Bind the actual Dots Avatar before recording an update');
  if (input.petId !== pending.petId || input.operationId !== id)
    throw new Error('Host result belongs to another pet or operation');
  if (input.appearanceId !== desiredAppearance(state)?.id)
    throw new Error('Host result belongs to a different appearance');
  const avatarId = text(input.avatarId, 'avatarId');
  if (state.pet?.binding && state.pet.binding.avatarId !== avatarId)
    throw new Error('Host updated a different Avatar from the persisted target');
  if (
    typeof input.updated !== 'boolean' ||
    ![true, false, null].includes(input.active) ||
    typeof input.refreshRequested !== 'boolean' ||
    !['confirmed', 'unconfirmed'].includes(input.displayStatus)
  )
    throw new Error('Invalid host result');
  if (input.displayStatus === 'confirmed' && !input.evidence?.trim())
    throw new Error('Confirmed display requires evidence');
  return {
    petId: input.petId,
    operationId: id,
    appearanceId: input.appearanceId,
    avatarId,
    updated: input.updated,
    active: input.active,
    refreshRequested: input.refreshRequested,
    displayStatus: input.displayStatus,
    ...(input.evidence ? { evidence: text(input.evidence, 'evidence') } : {}),
    ...(input.error ? { error: text(input.error, 'error') } : {}),
  };
}
export async function recordHostResult(store: Store, id: string, input: HostResult) {
  return store.transaction(state => {
    const pending = pendingFor(state, id);
    if (!pending.plan?.appearance) throw new Error('No planned appearance update');
    if (!desiredAppearance(state)) throw new Error('Complete or select appearance artwork first');
    const result = validateHostResult(state, id, input);
    if (result.updated) state.pet!.binding ??= { host: state.host, avatarId: result.avatarId };
    pending.hostResult = result;
    return result;
  });
}
export async function finishStory(store: Store, id: string) {
  return store.transaction(async state => {
    const previous = state.stories.find(story => story.id === id);
    if (previous) return previous;
    const pending = pendingFor(state, id),
      plan = pending.plan;
    if (!plan) throw new Error('Save a story plan before completing it');
    const pet = state.pet!,
      appearance = desiredAppearance(state);
    if (plan.appearance) {
      if (!appearance) throw new Error('Appearance artwork is unfinished');
      await access(appearance.file);
      const result = pending.hostResult;
      if (
        !result?.updated ||
        result.appearanceId !== appearance.id ||
        result.error ||
        (result.active !== false && !result.refreshRequested && result.displayStatus !== 'confirmed')
      )
        throw new Error('Host update or active Avatar refresh is unfinished; resume it');
    }
    const mediaIds = [
      ...new Set([
        ...(plan.mediaIds ?? []),
        ...state.art
          .filter(art => art.requestId === requestId(state) && ['story', 'artifact'].includes(art.kind))
          .map(art => art.id),
      ]),
    ];
    for (const mediaId of mediaIds)
      await access(state.art.find(art => art.id === mediaId && art.petId === pet.id)!.file);
    const story = {
      id,
      triggerId: pending.triggerId,
      petId: pet.id,
      at: Date.now(),
      text: plan.text,
      basis: plan.basis,
      stage: plan.stage!,
      state: plan.state,
      ...(appearance ? { appearanceId: appearance.id } : {}),
      mediaIds,
      ...(pending.steps?.length ? { steps: pending.steps } : {}),
      ...(pending.hostResult ? { hostResult: pending.hostResult } : {}),
    };
    if (!pet.genes) {
      pet.genes = plan.genes!;
      pet.acquisition = { place: plan.place!, connection: plan.connection!, storyId: id };
    }
    if (plan.personality) pet.personality ??= plan.personality;
    pet.stage = plan.stage!;
    pet.revision++;
    pet.state = {
      description: plan.state,
      storyId: id,
      updatedAt: story.at,
      ...(appearance ? { appearanceId: appearance.id } : {}),
    };
    state.stories.push(story);
    state.pending = null;
    return story;
  });
}
export const DAILY_TIMES = ['07:00', '12:00', '16:00', '21:00'];
export function dueStory(
  state: State,
  now = Date.now(),
  timezone = state.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (key: string) => parts.find(part => part.type === key)!.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`,
    time = `${get('hour')}:${get('minute')}`;
  const times = state.schedule?.times ?? DAILY_TIMES,
    slot = times.filter(slot => slot <= time).at(-1);
  const triggerId = slot ? `daily:${date}:${slot}:${timezone.replace(/\//g, '.')}` : null;
  return {
    timezone,
    times,
    triggerId,
    due: !!triggerId && !state.stories.some(story => story.triggerId === triggerId),
    pending: state.pending?.id ?? null,
  };
}

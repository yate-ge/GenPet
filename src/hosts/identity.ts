/** Host lookup results distinguish the stored binding from the host's actual current Pet ID. */
import type { State } from '../model.js';
import { codexHome } from '../config.js';
import { isCloudId, readMigrationMap, type MigrationMap } from './desktop/mapping.js';
import { readSelectedPet, type SelectionRead } from './desktop/switch.js';

export interface AvatarLocation {
  petId: string;
  avatarId: string | null;
  localAvatarId: string | null;
  cloudId: string | null;
  aliases: string[];
  mappingAvailable: boolean;
  migrationPending: boolean;
  active: boolean | null;
  selection: SelectionRead;
  destination?: string;
  reason?: string;
}

export interface FindOptions {
  home?: string;
  mapping?: () => Promise<MigrationMap>;
  selection?: () => Promise<SelectionRead>;
}

/** The minimal selection read used to route ordinary commands, without scanning the Pet registry. */
export async function selectedAvatar() {
  const result = await readSelectedPet();
  return result.available
    ? { available: true as const, id: result.effectiveSelectedPetId }
    : { available: false as const, id: null, error: result.reason };
}

/** Fresh lookup on every call. Existing custom bindings stop when their migration state is unknown. */
export async function findAvatar(state: State, options: FindOptions = {}): Promise<AvatarLocation> {
  if (!state.pet) throw new Error('No pet');
  const binding = state.pet.binding;
  const selected = await (options.selection ?? readSelectedPet)();
  const localId = binding?.avatarId.startsWith('custom:')
    ? binding.avatarId
    : !binding
      ? `custom:${state.pet.id}`
      : null;
  const mapping =
    state.host === 'desktop'
      ? await (options.mapping ?? (() => readMigrationMap(options.home ?? codexHome())))()
      : { available: true, mappings: {}, pending: [] };
  const directCloud = isCloudId(binding?.avatarId)
    ? binding!.avatarId
    : state.host === 'cloud' && isCloudId(binding?.cloudId)
      ? binding!.cloudId!
      : null;
  const mappedCloud = localId && mapping.available ? (mapping.mappings[localId] ?? null) : null;
  const cloudId = directCloud ?? mappedCloud;
  const migrationPending = Boolean(localId && mapping.pending.includes(localId));
  let avatarId: string | null = cloudId ?? (state.host === 'desktop' ? localId : null);
  let reason: string | undefined;
  if (state.host === 'desktop' && binding && localId && !mapping.available) {
    avatarId = null;
    reason = mapping.reason ?? 'The host Pet migration mapping is unavailable';
  } else if (state.host === 'desktop' && localId && binding?.cloudId && !mappedCloud) {
    avatarId = null;
    reason = 'The current host migration map does not confirm the saved cloud binding';
  } else if (migrationPending && !cloudId) {
    avatarId = null;
    reason = 'The host is still migrating this local Pet; resume after its cloud ID is available';
  } else if (!avatarId) reason = 'Bind the existing cloud Pet ID before updating this Pet';
  const aliases = [...new Set([localId, cloudId].filter((id): id is string => Boolean(id)))];
  const active = avatarId && selected.available ? aliases.includes(selected.effectiveSelectedPetId ?? '') : null;
  return {
    petId: state.pet.id,
    avatarId,
    localAvatarId: localId,
    cloudId,
    aliases,
    mappingAvailable: mapping.available,
    migrationPending,
    active,
    selection: selected,
    ...(binding?.destination ? { destination: binding.destination } : {}),
    ...(reason ? { reason } : {}),
  };
}

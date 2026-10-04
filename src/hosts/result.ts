/** Recording what a host actually did with a planned appearance. */
import { desiredAppearance } from '../appearance.js';
import { pendingFor } from '../lifecycle.js';
import { text, type HostResult, type State } from '../model.js';
import type { Store } from '../store.js';

/** A result must name the pending operation, its appearance and the pet's persisted target. */
export function validateHostResult(state: State, operationId: string, input: HostResult): HostResult {
  const pending = pendingFor(state, operationId);
  const binding = state.pet?.binding;
  if (!binding) throw new Error('Bind the actual host target before recording an update');
  if (input.petId !== pending.petId || input.operationId !== operationId)
    throw new Error('Host result belongs to another pet or operation');
  if (input.appearanceId !== desiredAppearance(state)?.id)
    throw new Error('Host result belongs to a different appearance');
  const avatarId = text(input.avatarId, 'avatarId');
  if (binding.avatarId !== avatarId) throw new Error('Host updated a different Avatar from the persisted target');
  if (
    typeof input.updated !== 'boolean' ||
    ![true, false, null].includes(input.active) ||
    typeof input.refreshRequested !== 'boolean' ||
    !['confirmed', 'unconfirmed'].includes(input.displayStatus)
  )
    throw new Error('Invalid host result');
  if (input.refreshUnavailable !== undefined && typeof input.refreshUnavailable !== 'boolean')
    throw new Error('Invalid host result');
  if (input.refreshUnavailable && !input.notice?.trim()) throw new Error('refreshUnavailable requires a notice');
  if (input.displayStatus === 'confirmed' && !input.evidence?.trim())
    throw new Error('Confirmed display requires evidence');
  return {
    petId: input.petId,
    operationId,
    appearanceId: input.appearanceId,
    avatarId,
    updated: input.updated,
    active: input.active,
    refreshRequested: input.refreshRequested,
    displayStatus: input.displayStatus,
    ...(input.refreshUnavailable ? { refreshUnavailable: true, notice: text(input.notice, 'notice') } : {}),
    ...(input.evidence ? { evidence: text(input.evidence, 'evidence') } : {}),
    ...(input.error ? { error: text(input.error, 'error') } : {}),
  };
}

/** `host-result`: the Agent reports an update it made with the host's own tools. */
export async function recordHostResult(store: Store, operationId: string, input: HostResult) {
  return store.transaction(state => {
    const pending = pendingFor(state, operationId);
    if (!pending.plan?.appearance) throw new Error('No planned appearance update');
    if (!desiredAppearance(state)) throw new Error('Complete or select appearance artwork first');
    return (pending.hostResult = validateHostResult(state, operationId, input));
  });
}

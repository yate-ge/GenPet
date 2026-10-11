/** Explicit transfer of one Pet's complete directory. The source stops writing before export. */
import { access, cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { identifier, type Host, type State } from './model.js';
import { atomicJson, Store } from './store.js';

export async function exportPet(store: Store, target: Host, destination: string) {
  if (target === store.host || !['desktop', 'cloud'].includes(target))
    throw new Error('Choose the other main environment');
  if (!path.isAbsolute(destination)) throw new Error('Transfer destination must be an absolute directory');
  const before = await store.peek();
  if (!before.pet) throw new Error('No Pet to transfer');
  if (before.pending) throw new Error('Finish the current story before handing off');
  const owner = store.forPet(before.pet.id);
  const directory = path.join(destination, before.pet.id);
  const source = path.join(store.root, 'pets', before.pet.id);
  if (
    path.resolve(directory).startsWith(path.resolve(source) + path.sep) ||
    path.resolve(directory) === path.resolve(source)
  )
    throw new Error('Transfer destination must be outside the source Pet directory');
  const transferId =
    before.handoff?.status === 'exported' && before.handoff.target === target
      ? before.handoff.id
      : `handoff-${randomUUID()}`;
  const previousSchedule = before.schedule;
  if (before.handoff?.status === 'exported' && before.handoff.target !== target)
    throw new Error('This Pet already has an outstanding transfer to another environment');
  if (before.handoff?.status !== 'exported')
    await owner.transaction(state => {
      if (state.pending) throw new Error('Finish the current story before handing off');
      state.handoff = {
        id: transferId,
        target,
        status: 'exported',
        at: Date.now(),
        ...(state.handoff?.id ? { previousTransferId: state.handoff.id } : {}),
      };
      state.schedule = { ...state.schedule, timezone: state.schedule?.timezone ?? 'UTC', stoppedAt: Date.now() };
      delete state.schedule.resumedAt;
    });
  await mkdir(destination, { recursive: true });
  await cp(source, directory, { recursive: true, force: false, errorOnExist: false });
  const exported = await owner.peek();
  await atomicJson(path.join(directory, 'transfer.json'), {
    version: 1,
    transferId,
    petId: before.pet.id,
    source: store.host,
    target,
    previousTransferId: exported.handoff?.previousTransferId,
    state: exported,
  });
  return {
    transferId,
    petId: before.pet.id,
    directory,
    previousSchedule,
    steps: [
      'Pause the previous host task by its saved reference.',
      'Transfer this entire directory to the target.',
      'Import it, then create the target host task.',
    ],
    sourceStopped: true,
  };
}

export async function importPet(store: Store, directory: string) {
  if (!path.isAbsolute(directory)) throw new Error('Transfer source must be an absolute directory');
  const manifest = JSON.parse(await readFile(path.join(directory, 'transfer.json'), 'utf8')) as {
    version: number;
    transferId: string;
    petId: string;
    source: Host;
    target: Host;
    previousTransferId?: string;
    state: State;
  };
  identifier(manifest.petId, 'petId');
  identifier(manifest.transferId, 'transferId');
  if (
    manifest.version !== 1 ||
    !['desktop', 'cloud'].includes(manifest.source) ||
    manifest.target !== store.host ||
    manifest.source === store.host ||
    manifest.state.host !== manifest.source ||
    manifest.state.pet?.id !== manifest.petId ||
    manifest.state.handoff?.id !== manifest.transferId ||
    manifest.state.handoff?.target !== manifest.target ||
    manifest.state.handoff?.previousTransferId !== manifest.previousTransferId ||
    manifest.state.handoff?.status !== 'exported'
  )
    throw new Error('Invalid or mismatched Pet transfer');
  const existing = await store.forPet(manifest.petId).peek();
  if (existing.handoff?.id === manifest.transferId && existing.handoff.status === 'imported')
    return { petId: manifest.petId, transferId: manifest.transferId, imported: true, duplicate: true };
  if (existing.pet && existing.handoff?.status !== 'exported')
    throw new Error('The destination Pet is already writable; finish its handoff first');
  if (existing.pet && existing.handoff?.id !== manifest.previousTransferId)
    throw new Error('Stale transfer; its predecessor does not match the latest handoff');
  const target = path.join(store.root, 'pets', manifest.petId);
  await mkdir(target, { recursive: true });
  const sourceStateFile = path.resolve(directory, 'state.json');
  await cp(directory, target, {
    recursive: true,
    force: true,
    filter: source => path.resolve(source) !== sourceStateFile,
  });
  const state = manifest.state;
  state.host = store.host;
  state.handoff = {
    id: manifest.transferId,
    target: store.host,
    status: 'imported',
    at: Date.now(),
    ...(manifest.previousTransferId ? { previousTransferId: manifest.previousTransferId } : {}),
  };
  if (state.pet!.binding) state.pet!.binding.host = store.host;
  for (const art of state.art) {
    const local = path.join(target, 'assets', path.basename(art.file));
    await access(local);
    art.file = local;
  }
  await store.installTransfer(state);
  return {
    petId: manifest.petId,
    transferId: manifest.transferId,
    imported: true,
    directory: target,
    schedule: 'Create the new host task and save its reference before resuming.',
  };
}

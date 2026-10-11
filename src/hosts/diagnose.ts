/** Read-only environment inspection shared by initialization and recovery. */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { codexHome } from '../config.js';
import type { Store } from '../store.js';
import { artworkFingerprint, verifyStoredArtwork } from './artwork.js';
import { findAvatar, type FindOptions } from './identity.js';
import { listPets } from './desktop/switch.js';
import { probeIpc } from './desktop/refresh.js';

export interface DiagnoseOptions extends FindOptions {
  ipcSocketPath?: string | null;
  timeoutMs?: number;
}

export async function diagnose(store: Store, options: DiagnoseOptions = {}) {
  const state = await store.peek();
  const home = options.home ?? codexHome();
  const target = state.pet ? await findAvatar(state, options) : null;
  const selected = target?.selection;
  const catalog = state.host === 'desktop' ? await listPets(home) : null;
  let refresh: { available: boolean; observed?: unknown; error?: string } = {
    available: false,
    error: 'No desktop IPC in this environment',
  };
  if (state.host === 'desktop' && options.ipcSocketPath !== null && process.env.GENPET_SKIP_NATIVE_REFRESH !== '1') {
    try {
      refresh = {
        available: true,
        observed: await probeIpc(options.ipcSocketPath ?? undefined, options.timeoutMs ?? 1500),
      };
    } catch (error) {
      refresh = { available: false, error: (error as Error).message };
    }
  }
  let localArtwork: unknown = null;
  const destination = state.pet?.binding?.destination;
  const art = state.art.find(
    art => art.id === state.pet?.state.appearanceId && art.petId === state.pet.id && art.kind === 'atlas',
  );
  const acceptedArtwork = art
    ? await artworkFingerprint(art.file).then(
        checks => ({ appearanceId: art.id, file: art.file, ...checks }),
        error => ({ appearanceId: art.id, file: art.file, error: (error as Error).message }),
      )
    : null;
  if (destination && art) {
    try {
      const manifest = JSON.parse(await readFile(path.join(destination, 'pet.json'), 'utf8'));
      if (
        typeof manifest.spritesheetPath !== 'string' ||
        path.basename(manifest.spritesheetPath) !== manifest.spritesheetPath
      )
        throw Error('Invalid local Pet sprite path');
      localArtwork = await verifyStoredArtwork(art.file, path.join(destination, manifest.spritesheetPath));
    } catch (error) {
      localArtwork = { storedArtworkVerified: null, error: (error as Error).message };
    }
  }
  const recordExists = await access(store.file).then(
    () => true,
    () => false,
  );
  return {
    record: {
      exists: recordExists,
      file: store.file,
      version: state.version,
      petId: state.pet?.id ?? null,
      pendingOperationId: state.pending?.id ?? null,
    },
    target,
    catalog,
    selected: selected?.available
      ? { available: true, id: selected.effectiveSelectedPetId }
      : {
          available: false,
          id: null,
          error:
            selected && !selected.available ? selected.reason : 'No Pet record; use selectedAvatar for host selection',
        },
    acceptedArtwork,
    localArtwork,
    refresh,
    schedule: { saved: state.schedule ?? null, hostConfirmed: null },
    agentSteps: [
      {
        tool: 'list_pets',
        check:
          'Find the exact actual cloud ID in the host list; preserve selection. Runtime local catalog does not prove cloud presence.',
      },
      ...(target?.cloudId && art
        ? [
            {
              tool: 'get_pet_download_link',
              arguments: { pet_id: target.cloudId },
              check:
                'Read back actual cloud artwork and compare it with the accepted image. A local atlas match proves only local storage.',
            },
          ]
        : []),
      {
        check:
          'Read the saved schedule reference using the host automation tools; confirm enabled state and target Pet. Repair the same identity only.',
      },
      ...(acceptedArtwork && target?.avatarId
        ? [
            {
              command: 'repair-appearance',
              check:
                'Restore this current accepted image to the same target ID. Preserve Pet records, stage and story history.',
            },
          ]
        : []),
    ],
    displayStatus: 'unconfirmed',
  };
}

/** Codex desktop Pet: an atlas written to one entry per pet, plus switching the visible Pet. */
import type { HostAdapter } from '../index.js';
import { ATLAS_CONTRACT } from './atlas.js';
import { installNative } from './publish.js';
import { switchPet } from './switch.js';
import { validateArt } from '../art.js';
import { findAvatar, selectedAvatar } from '../identity.js';
import { diagnose } from '../diagnose.js';
import { repairCommands } from '../repair.js';

export const desktop: HostAdapter = {
  appearanceKind: 'atlas',
  artContract: ATLAS_CONTRACT,
  validateArt,
  findAvatar,
  selectedAvatar,
  setAppearance: installNative,
  diagnose,
  commands: {
    ...repairCommands,
    publish: { usage: 'publish', run: (_, store) => installNative(store) },
    'switch-pet': { usage: 'switch-pet [PET_ID|--current|--list|--help]', run: args => switchPet(args) },
  },
};

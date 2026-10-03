/** Codex desktop Pet: an atlas written to one entry per pet, plus switching the visible Pet. */
import type { HostAdapter } from '../index.js';
import { ATLAS_CONTRACT } from './atlas.js';
import { installNative } from './publish.js';
import { switchPet } from './switch.js';

export const desktop: HostAdapter = {
  appearanceKind: 'atlas',
  artContract: ATLAS_CONTRACT,
  commands: {
    publish: { usage: 'publish', run: (_, store) => installNative(store) },
    'switch-pet': { usage: 'switch-pet [PET_ID|--current|--list|--help]', run: args => switchPet(args) },
  },
};

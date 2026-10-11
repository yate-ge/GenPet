/**
 * The host extension point. A host decides its appearance format and adds its own CLI commands;
 * everything else (identity, stories, artwork, host results) is shared. To add a host, write one
 * adapter beside these two and register it here.
 */
import type { ArtKind, Host, State } from '../model.js';
import type { Store } from '../store.js';
import { desktop } from './desktop/index.js';
import { cloud } from './cloud.js';
import type { ImageInfo } from '../image.js';
import type { AvatarLocation, FindOptions } from './identity.js';
import type { DiagnoseOptions } from './diagnose.js';
import { selectedAvatar } from './identity.js';

export interface Command {
  usage: string;
  run: (args: string[], store: Store) => unknown;
}

export interface HostAdapter {
  /** The saved artwork kind that becomes this host's Pet/Avatar appearance. */
  appearanceKind: Extract<ArtKind, 'atlas' | 'avatar'>;
  /** Format handed to art generation; null when the host's own tools define it. */
  artContract: object | null;
  validateArt: (file: string) => Promise<ImageInfo>;
  findAvatar: (state: State, options?: FindOptions) => Promise<AvatarLocation>;
  setAppearance: (store: Store) => Promise<unknown>;
  diagnose: (store: Store, options?: DiagnoseOptions) => Promise<unknown>;
  selectedAvatar?: typeof selectedAvatar;
  /** Host-only CLI commands, for example publishing to the bound target. */
  commands: Record<string, Command>;
}

export function hostFor(host: Host): HostAdapter {
  const adapter = { desktop, cloud }[host];
  if (!adapter) throw new Error('Unsupported host environment');
  return adapter;
}

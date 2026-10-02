/**
 * The host extension point. A host decides its appearance format and adds its own CLI commands;
 * everything else (identity, stories, artwork, host results) is shared. To add a host, write one
 * adapter beside these two and register it here.
 */
import type { ArtKind, Host } from '../model.js';
import type { Store } from '../store.js';
import { desktop } from './desktop/index.js';
import { dots } from './dots.js';

export interface Command {
  usage: string;
  run: (args: string[], store: Store) => unknown;
}

export interface HostAdapter {
  /** The saved artwork kind that becomes this host's Pet/Avatar appearance. */
  appearanceKind: Extract<ArtKind, 'atlas' | 'avatar'>;
  /** Saved kinds usable as this pet's identity references for new artwork. */
  referenceKinds: ArtKind[];
  /** Format handed to art generation; null when the host's own tools define it. */
  artContract: object | null;
  /** Host-only CLI commands, for example publishing to the bound target. */
  commands: Record<string, Command>;
}

export function hostFor(host: Host): HostAdapter {
  return { desktop, dots }[host];
}

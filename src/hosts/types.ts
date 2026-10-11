/** One observable result shape for runtime-completed updates and remaining Agent cloud steps. */
import type { HostResult } from '../model.js';
import type { RefreshOutcome } from './desktop/refresh.js';

export interface AppearanceOutcome extends HostResult {
  operation?: 'update-cloud-pet';
  file?: string;
  target?: { avatarId: string; cloudId: string; localAvatarId: string | null };
  agentSteps?: object[];
  preserveCurrentSelection?: true;
  destination?: string;
  filesCommitted?: boolean;
  manifest?: {
    id: string;
    genpetId: string;
    displayName: string;
    description: string;
    spriteVersionNumber: number;
    spritesheetPath: string;
  };
  artId?: string;
  refresh?: RefreshOutcome;
  local?: unknown;
}

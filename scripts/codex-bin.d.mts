export const BUNDLED: string[];
export function findCodex(
  env?: Record<string, string | undefined>,
  bundled?: string[],
): { bin: string; version: string; source: string; note?: string };

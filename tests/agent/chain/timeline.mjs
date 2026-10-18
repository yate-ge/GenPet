/**
 * Loads one chain timeline. GENPET_CHAIN_TIMELINES picks the file (default timelines.json next to this script).
 * An entry is either a plain list of steps with gapH, or a user `{who, pet, memory, startAt, steps}` whose steps
 * carry an absolute `at`; both come back as steps with gapH and, when known, at (ms).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const timelinesFile = () =>
  path.resolve(process.env.GENPET_CHAIN_TIMELINES ?? path.join(here, 'timelines.json'));

export const loadTimeline = async key => {
  const entry = JSON.parse(await readFile(timelinesFile(), 'utf8'))[key];
  if (!entry) throw new Error(`No timeline ${key} in ${timelinesFile()}`);
  if (Array.isArray(entry)) return { steps: entry };
  const startAt = Date.parse(entry.startAt);
  let previous = startAt;
  const steps = entry.steps.map(step => {
    const at = Date.parse(step.at);
    const gapH = Math.round(((at - previous) / 3_600_000) * 10) / 10;
    previous = at;
    return { ...step, at, gapH };
  });
  return { ...entry, startAt, steps };
};

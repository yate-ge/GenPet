/** Run shipped deterministic image helpers. Generation stays with the host's built-in imagegen tool. */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import { pluginRoot } from './config.js';
import type { Stage } from './model.js';

const execute = promisify(execFile);
/** Stays under the caller's usual one-minute tool limit; a stopped run resumes from its cached steps. */
const HELPER_TIMEOUT_MS = 55000;
const helperDirectory = () => path.join(pluginRoot(), 'vendor', 'hatch-pet', 'scripts');
export interface PipelineInput {
  runDir: string;
  petName: string;
  stage: Stage;
  notes: string;
  references?: string[];
  requestId?: string;
  noMirrorLook?: string;
  python?: string;
}
export interface PipelineOptions {
  python?: string;
  review?: { jobId: 'base' | 'final'; verdict: 'pass' | 'fail'; note: string };
  failure?: { jobId: string; error: string; note: string; attemptId?: string; frameIndices?: number[] };
}

/** Agent can pass the actual Python path returned by workspace dependencies; no API key is required. */
export async function pipelineRuntime(python?: string) {
  const candidates = [
    ...new Set(
      [python, process.env.GENPET_PYTHON, 'python', 'python3'].filter((value): value is string => Boolean(value)),
    ),
  ];
  for (const executable of candidates) {
    try {
      const { stdout } = await execute(
        executable,
        [
          '-c',
          'import json,sys,PIL;print(json.dumps({"python":sys.executable,"pythonVersion":sys.version.split()[0],"pillowVersion":PIL.__version__}))',
        ],
        { timeout: 5000, windowsHide: true, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' } },
      );
      return { available: true as const, ...JSON.parse(stdout), helpers: helperDirectory() };
    } catch {
      /* Try only normal executable locations; never install dependencies or read credentials. */
    }
  }
  return {
    available: false as const,
    reason:
      'A Python runtime with Pillow is unavailable. Ask the host workspace dependencies tool for its Python path and pass it as python or GENPET_PYTHON.',
  };
}

/** Map a failed helper call; a timeout kill leaves empty output, so say so instead of guessing. */
export function helperFailure(
  error: Error & { stdout?: string; stderr?: string; code?: number | string | null; killed?: boolean },
) {
  return {
    stdout: error.stdout ?? '',
    stderr: error.stderr || error.message,
    exitCode: error.code ?? 1,
    timedOut: Boolean(error.killed),
  };
}

async function callHelper(script: string, args: string[], runDir: string, python?: string, preparing = false) {
  if (!path.isAbsolute(runDir)) throw new Error('Pipeline runDir must be an absolute local path');
  const runtime = await pipelineRuntime(python);
  if (!runtime.available) return { ok: false, runtime, run_dir: runDir };
  const helper = path.join(runtime.helpers, script);
  if (!existsSync(helper))
    return { ok: false, runtime, run_dir: runDir, error: 'Installed deterministic image helper is missing' };
  let stdout = '',
    stderr = '',
    exitCode: number | string = 0,
    timedOut = false;
  try {
    const output = await execute(runtime.python, [helper, ...args], {
      timeout: HELPER_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
    });
    stdout = output.stdout;
    stderr = output.stderr;
  } catch (error) {
    ({ stdout, stderr, exitCode, timedOut } = helperFailure(error as Error));
  }
  const reportFile =
    preparing && !existsSync(path.join(runDir, 'imagegen-jobs.json'))
      ? `${runDir}.prepare-${randomUUID()}.json`
      : path.join(runDir, 'qa', 'wrapper-runs', `${script.replace('.py', '')}-${Date.now()}-${randomUUID()}.json`);
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, JSON.stringify({ runtime, helper, args, stdout, stderr, exitCode, timedOut }, null, 2), {
    flag: 'wx',
  });
  try {
    return { ...JSON.parse(stdout), runtime, reportFile };
  } catch {
    return {
      ok: false,
      runtime,
      reportFile,
      run_dir: runDir,
      ...(timedOut
        ? {
            timedOut: true,
            error: `Image helper stopped after ${HELPER_TIMEOUT_MS / 1000} s; run the same command again to resume from its cached steps`,
          }
        : { error: stderr.trim() || 'Image helper did not return a structured result' }),
    };
  }
}

export async function pipelinePrepare(input: PipelineInput) {
  if (!input.notes?.trim() || !input.petName?.trim())
    throw new Error('Pipeline needs the actual Pet name and appearance notes');
  if (Object.hasOwn(input, 'requestId') && (typeof input.requestId !== 'string' || !input.requestId.trim()))
    throw new Error('pipeline-prepare requestId must be a non-empty string from art-request.id');
  const args = [
    input.stage === 'egg' ? '--egg' : '--parallel',
    '--stage',
    input.stage,
    '--output-dir',
    input.runDir,
    '--pet-id',
    input.requestId ? `genpet-${input.requestId}` : 'genpet',
    '--pet-name',
    input.petName,
    '--pet-notes',
    input.notes,
    '--style-preset',
    'pixel',
  ];
  if (input.requestId) args.push('--request-id', input.requestId);
  if (input.noMirrorLook) args.push('--no-mirror-look', input.noMirrorLook);
  for (const reference of input.references ?? []) {
    if (!path.isAbsolute(reference)) throw new Error('Pipeline references must be absolute local paths');
    args.push('--reference', reference);
  }
  return callHelper('prepare_pet_run.py', args, input.runDir, input.python, true);
}

export async function pipelineProcess(runDir: string, options: PipelineOptions = {}) {
  if (options.review && options.failure) throw new Error('Record one review or failed attempt at a time');
  const args = ['--run-dir', runDir, '--previews'];
  if (options.review)
    args.push(
      '--record-review',
      options.review.jobId,
      '--verdict',
      options.review.verdict,
      '--note',
      options.review.note,
    );
  if (options.failure) {
    args.push(
      '--record-failure',
      options.failure.jobId,
      '--error',
      options.failure.error,
      '--note',
      options.failure.note,
    );
    if (options.failure.attemptId) args.push('--attempt-id', options.failure.attemptId);
    if (options.failure.frameIndices) args.push('--frame-indices', options.failure.frameIndices.join(','));
  }
  return callHelper('process_pet_run.py', args, runDir, options.python);
}

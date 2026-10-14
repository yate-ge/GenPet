import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipelinePrepare, pipelineRuntime, type PipelineInput } from '../src/pipeline.js';
import { retainFixture } from './evidence.js';

test('an explicitly missing prepare request ID is rejected before creating a run', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'genpet-invalid-request-'));
  t.after(() => retainFixture(root, { recursive: true, force: true }));
  for (const [index, requestId] of [null, '', '   '].entries()) {
    const runDir = path.join(root, String(index));
    await assert.rejects(
      () =>
        pipelinePrepare({
          runDir,
          petName: 'Fixture',
          stage: 'egg',
          notes: 'Synthetic complete egg.',
          requestId,
        } as unknown as PipelineInput),
      /requestId.*art-request\.id/,
    );
    await assert.rejects(() => readFile(path.join(runDir, 'pet_request.json')), /ENOENT/);
  }
});

test('the actual helper accepts a Unicode Pet name using a separate stable internal slug', async t => {
  const runtime = await pipelineRuntime();
  if (!runtime.available) return t.skip(runtime.reason);
  const root = await mkdtemp(path.join(os.tmpdir(), 'genpet-unicode-pipeline-'));
  t.after(() => retainFixture(root, { recursive: true, force: true }));
  const runDir = path.join(root, 'run');
  const result = await pipelinePrepare({
    runDir,
    petName: '余弯',
    stage: 'adult',
    notes: 'A complete cute cartoon creature; synthetic regression fixture.',
    requestId: 'unicode-request',
    python: runtime.python,
  });
  assert.notEqual(result.ok, false, JSON.stringify(result));
  const jobs = JSON.parse(await readFile(path.join(runDir, 'imagegen-jobs.json'), 'utf8'));
  const request = JSON.parse(await readFile(path.join(runDir, 'pet_request.json'), 'utf8'));
  assert.equal(request.request_id, 'unicode-request');
  assert.equal(request.pet_id, 'genpet-unicode-request');
  assert.equal(request.display_name, '余弯');
  assert.ok(jobs.jobs.length > 0);
});

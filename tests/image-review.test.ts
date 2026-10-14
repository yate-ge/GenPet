/** Prompt/data-contract regressions, not claims about an Agent's visual judgment. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unitRequest, validateUnitResult } from '../src/generation.js';

const eggVisual = {
  stage: 'egg',
  workflowProfile: 'genpet-egg-three',
  request: 'A complete ivory shell; calm/stir/settle loops and neutral look slots.',
  mustShow: ['the same intact egg'],
};

test('review requests carry GenPet precedence, egg equivalence and evidence-based repair rules', () => {
  const request = unitRequest('ImageReviewer', {
    inputRefs: ['fixture:egg'],
    inputs: { visual: eggVisual, actualFile: 'fixture:unreadable-without-real-image' },
  });
  assert.match(request.prompt, /官方.*制作参考.*不是.*逐条.*验收/);
  assert.match(request.prompt, /蛋不能行走、不能看/);
  assert.match(request.prompt, /中性.*复用/);
  assert.match(request.prompt, /mustShow.*不自动.*硬门槛/);
  assert.match(request.prompt, /适用要求.*可见证据.*实际影响/);
  assert.match(request.prompt, /JSON.*不能代替.*视觉证据/);
  assert.match(request.prompt, /actualFile/);
  assert.match(request.prompt, /genpet-egg-three/);
});

test('designer, desktop and vendored entry points do not reimpose upstream literal state semantics', async () => {
  const designer = await readFile('framework/skills/genpet/references/PetDesigner.md', 'utf8');
  const desktop = await readFile('framework/references/desktop.md', 'utf8');
  const reviewer = await readFile('framework/skills/genpet/references/ImageReviewer.md', 'utf8');
  const pipeline = await readFile('plugins/genpet/vendor/hatch-pet/GENPET.md', 'utf8');
  const upstreamEntry = await readFile('plugins/genpet/vendor/hatch-pet/SKILL.md', 'utf8');
  assert.match(designer, /stage.*equivalent expression/i);
  assert.match(desktop, /槽位名称不等于.*动作/);
  assert.match(reviewer, /GenPet.*stage.*equivalent/i);
  assert.doesNotMatch(reviewer, /exact requested words/);
  assert.match(pipeline, /Production skill.*reference.*not.*artistic acceptance checklist/i);
  assert.match(upstreamEntry, /Do not apply.*upstream.*literal.*GenPet/i);
});

test('review data can accept a documented minor difference without inventing a new verdict or schema gate', () => {
  const accepted = {
    inputRefs: ['fixture:home-v2'],
    result: {
      file: 'fixture:home-v2.png',
      verdict: 'accept',
      observations: [
        { criterion: 'main identity and livable scene', passed: true, observation: 'Synthetic contract example.' },
        {
          criterion: 'background shell arcs',
          passed: false,
          observation: 'Minor dots instead of arcs; not a blocker.',
        },
        { criterion: 'egg gaze', applicable: false, observation: 'No gaze exists at this stage.' },
      ],
      repair: null,
    },
  };
  assert.deepEqual(validateUnitResult('ImageReviewer', accepted), accepted);
});

test('real quality repairs and invalid-verdict rejection remain supported; schema validity is not visual acceptance', () => {
  const rejected = {
    inputRefs: ['fixture:clipped-body'],
    result: {
      file: 'fixture:clipped-body.png',
      verdict: 'repair',
      observations: [{ criterion: 'complete silhouette', passed: false, observation: 'The main body is clipped.' }],
      repair: 'Restore the complete silhouette inside its cell without changing identity.',
    },
  };
  assert.deepEqual(validateUnitResult('ImageReviewer', rejected), rejected);
  assert.throws(
    () => validateUnitResult('ImageReviewer', { ...rejected, result: { ...rejected.result, verdict: 'skip-quality' } }),
    /Invalid ImageReviewer.verdict/,
  );
});

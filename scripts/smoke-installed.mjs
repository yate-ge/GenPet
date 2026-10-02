/** Both installed packages, outside repository dependencies and real Pet data. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const plugin = path.resolve(process.argv[2]),
  source = path.resolve(process.argv[3]),
  temp = await mkdtemp(path.join(tmpdir(), 'genpet-installed-'));
const env = {
  ...process.env,
  GENPET_DATA_DIR: path.join(temp, 'data'),
  CODEX_HOME: path.join(temp, 'codex'),
  CODEX_APP_TOOLS_PIPE_PATH: '',
  CODEX_THREAD_ID: '',
  GENPET_SKIP_NATIVE_REFRESH: '1',
};
const call = (...args) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(plugin, 'dist/cli.js'), ...args], {
      cwd: temp,
      env,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
const file = async (name, value) => {
  const p = path.join(temp, name);
  await writeFile(p, JSON.stringify(value));
  return p;
};
try {
  const status = call('status'),
    host = status.host;
  assert.equal(status.pet, null);
  const op = call('begin-story', 'smoke:init', 'initialization'),
    petId = op.pet.id;
  assert.equal(call('begin-story', 'smoke:init').pet.id, petId);
  const plan = {
    text: 'A synthetic smoke-test adoption story.',
    basis: 'Test fixture only',
    state: 'A folded test egg',
    stage: 'egg',
    genes: 'A distinct faceless folded construction; layers unfold through development.',
    personality:
      'A patient, curious test companion; it listens beside the user and folds its feelers while resting. Synthetic character fixture, not a user personality inference.',
    place: 'A fictional test location',
    connection: 'Isolated engineering fixture',
    appearance: { description: 'A folded pixel egg' },
  };
  call('plan-story', op.pending.id, await file('plan.json', plan));
  const request = call('art-request'),
    fixture = path.join(source, 'assets/pets/mystery-egg/spritesheet.webp');
  call('accept-art', request.id, fixture, 'portrait', 'Isolated existing fixture; not generated visual evidence');
  const art = call(
    'accept-art',
    request.id,
    fixture,
    host === 'desktop' ? 'atlas' : 'avatar',
    'Isolated existing fixture; not generated visual evidence',
  );
  let destination;
  if (host === 'dots') {
    call('bind-avatar', 'dots-smoke-avatar');
  } else {
    await mkdir(env.CODEX_HOME, { recursive: true });
    await writeFile(path.join(env.CODEX_HOME, 'config.toml'), '[desktop]\nselected-avatar-id = "dewey"\n');
  }
  // Live selection is unavailable with host IPC disabled. Record only the known
  // inactive synthetic fixture; do not weaken runtime completion or claim display.
  const publishFixture = async () => {
    if (host === 'dots') {
      // Stand-in for the Dots Agent's own Avatar tools: host-request in, host-result out.
      const r = call('host-request');
      await copyFile(r.file, path.join(temp, 'host-avatar.webp'));
      return call(
        'host-result',
        r.operationId,
        await file('dots-host.json', {
          petId: r.petId,
          operationId: r.operationId,
          appearanceId: r.appearanceId,
          avatarId: r.target.avatarId,
          updated: true,
          active: true,
          refreshRequested: true,
          displayStatus: 'unconfirmed',
        }),
      );
    }
    const result = call('publish');
    assert.equal(result.active, null);
    assert.equal(result.refreshRequested, false);
    assert.equal(result.displayStatus, 'unconfirmed');
    const reported = call(
      'host-result',
      result.operationId,
      await file('inactive-host.json', {
        petId: result.petId,
        operationId: result.operationId,
        appearanceId: result.appearanceId,
        avatarId: result.avatarId,
        updated: result.updated,
        active: false,
        refreshRequested: false,
        displayStatus: 'unconfirmed',
        evidence: 'Isolated inactive fixture with dewey selected; live host IPC disabled.',
      }),
    );
    return { ...result, ...reported, error: reported.error };
  };
  const published = await publishFixture();
  assert.equal(published.petId, petId);
  assert.equal(published.appearanceId, art.id);
  assert.equal(published.displayStatus, 'unconfirmed');
  if (host === 'desktop') {
    destination = published.destination;
    assert.equal(path.basename(destination), petId);
    const manifest = JSON.parse(await readFile(path.join(destination, 'pet.json'), 'utf8'));
    assert.equal(manifest.genpetId, petId);
    assert.equal(manifest.spriteVersionNumber, 2);
    assert.deepEqual(await readFile(path.join(destination, manifest.spritesheetPath)), await readFile(fixture));
    assert.equal(
      await readFile(path.join(env.CODEX_HOME, 'config.toml'), 'utf8'),
      '[desktop]\nselected-avatar-id = "dewey"\n',
    );
  } else assert.deepEqual(await readFile(path.join(temp, 'host-avatar.webp')), await readFile(fixture));
  call('finish-story', op.pending.id);
  assert.equal(call('begin-story', 'smoke:init').status, 'completed');
  assert.equal(call('status').pet.personality, plan.personality);
  assert.equal(call('status').namingDue, false);
  call('name-pet', petId, 'User fixture name');
  assert.equal(call('status').pet.name, 'User fixture name');
  const next = call('begin-story', 'smoke:reuse').pending.id;
  call(
    'plan-story',
    next,
    await file('reuse.json', {
      text: 'The synthetic pet revisited its folded resting state.',
      basis: 'Existing state fits',
      state: 'Resting',
      appearance: { description: 'Reuse', reuseArtId: art.id },
    }),
  );
  assert.equal(call('art-request').status, 'ready');
  await publishFixture();
  call('finish-story', next);
  assert.equal(call('status').art.length, 2);
  assert.equal(call('status').stories.length, 2);
  const reset = call('reset', 'smoke-reset');
  assert.notEqual(reset.pet.id, petId);
  assert.equal(reset.pet.binding.avatarId, published.avatarId);
  call('plan-story', reset.pending.id, await file('reset-plan.json', plan));
  const resetRequest = call('art-request');
  call('accept-art', resetRequest.id, fixture, host === 'desktop' ? 'atlas' : 'avatar', 'Isolated reset fixture');
  await publishFixture();
  call('finish-story', reset.pending.id);
  assert.equal(call('reset', 'smoke-reset').status, 'completed');
  assert.equal(call('status').pet.id, reset.pet.id);
  if (host === 'desktop')
    assert.deepEqual(await readdir(path.join(env.CODEX_HOME, 'pets')), [path.basename(destination)]);
  console.log(
    `${host}: installed initialization, stable identity, artwork, publication, reuse and reset passed (isolated fixtures).`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}

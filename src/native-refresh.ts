import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type RefreshStrategy = 'cdp-query-invalidate' | 'cdp-remount' | 'cdp-settings-refresh' | 'osascript-settings-refresh' | 'none';

export interface DisplayEvidence {
  petId: string;
  spriteSha256: string;
  source: 'cdp-dom' | 'unobserved';
}

export interface RefreshOutcome {
  automaticRefresh: boolean;
  displayStatus: 'confirmed' | 'unconfirmed';
  strategy: RefreshStrategy;
  before?: DisplayEvidence;
  after?: DisplayEvidence;
  expectedSpriteSha256: string;
  notice: string;
  errors?: string[];
}

export interface RefreshOptions {
  petId?: string;
  expectedSpritePath: string;
  debugPorts?: number[];
  timeoutMs?: number;
  /** Drive Settings → Refresh via OS scripting when CDP is absent. Off in tests. */
  allowUiRefresh?: boolean;
}

interface CdpTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
  title?: string;
}

const DEFAULT_PORTS = [Number(process.env.GENPET_CODEX_DEBUG_PORT) || 9222, 9341, 9223, 9222];

async function sha256File(file: string) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

/** Hash the payload of a CSS url("data:...;base64,...") value. */
export function hashSpriteDataUrl(value: string): string | null {
  const match = /url\((['"]?)data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)\1\)/.exec(value)
    || /^data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  const b64 = match?.[2] ?? match?.[1];
  if (!b64) return null;
  return createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex');
}

async function fetchJson(url: string, timeoutMs = 400) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function discoverPorts(explicit?: number[]): Promise<number[]> {
  if (explicit?.length) return [...new Set(explicit)];
  const found = new Set<number>();
  for (const port of DEFAULT_PORTS) if (Number.isInteger(port) && port > 0) found.add(port);
  const userData = path.join(process.env.GENPET_CODEX_USER_DATA || path.join(homedir(), 'Library/Application Support/Codex'), 'DevToolsActivePort');
  try {
    const text = await readFile(userData, 'utf8');
    const port = Number(text.split(/\r?\n/)[0]?.trim());
    if (Number.isInteger(port) && port > 0) found.add(port);
  } catch { /* not launched with DevTools */ }
  try {
    const { stdout } = await execFileAsync('/bin/ps', ['-axo', 'args']);
    for (const line of stdout.split('\n')) {
      if (!/ChatGPT|Codex/i.test(line)) continue;
      const match = /--remote-debugging-port=(\d+)/.exec(line);
      if (match) found.add(Number(match[1]));
    }
  } catch { /* ps unavailable */ }
  return [...found];
}

async function listTargets(port: number): Promise<CdpTarget[]> {
  const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  return Array.isArray(list) ? list.filter((t: CdpTarget) => t?.webSocketDebuggerUrl) : [];
}

class CdpSession {
  private nextId = 1;
  private socket: WebSocket | null = null;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(private readonly url: string) {}

  async open() {
    if (this.socket) return;
    this.socket = new WebSocket(this.url);
    await new Promise<void>((resolve, reject) => {
      const socket = this.socket!;
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error('CDP WebSocket connection failed')), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      let message: any;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (typeof message?.id !== 'number') return;
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message || 'CDP error'));
      else if (message.result?.exceptionDetails) entry.reject(new Error(message.result.exceptionDetails.text || 'CDP evaluate threw'));
      else entry.resolve(message.result?.result?.value);
    });
  }

  async evaluate<T = unknown>(expression: string, timeoutMs = 2500): Promise<T> {
    await this.open();
    const id = this.nextId++;
    const result = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP evaluate timed out'));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value as T); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
    this.socket!.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
    return result;
  }

  close() {
    try { this.socket?.close(); } catch { /* already closed */ }
    this.socket = null;
    this.pending.clear();
  }
}

const READ_DISPLAY_EXPRESSION = `(() => {
  const node = document.querySelector('[data-codex-pet-id]');
  if (!node) return { ok: false, reason: 'pet-node-not-found' };
  const style = getComputedStyle(node);
  const image = style.backgroundImage || '';
  const petId = node.getAttribute('data-codex-pet-id') || node.getAttribute('data-codex-pet-asset-ref') || '';
  return { ok: true, petId, backgroundImage: image };
})()`;

/** Same host action as Settings → Pets → Refresh: invalidate the custom-avatar queries. No UI click. */
export const LIVE_REFRESH_ATTEMPTS = ['cdp-query-invalidate'] as const;

function invalidateCustomAvatarsExpression(petId: string) {
  const keys = JSON.stringify([['custom-avatars'], ['custom-avatars', 'by-id', petId]]);
  return `(() => {
  const keys = ${keys};
  const rootEl = document.querySelector('#root') || document.body;
  const fiberKey = Object.keys(rootEl).find((key) => key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'));
  const root = fiberKey ? rootEl[fiberKey] : null;
  const seen = new Set();
  const clients = [];
  const consider = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > 8 || seen.has(value) || clients.length > 2) return;
    if (seen.size > 20000) return;
    seen.add(value);
    if (typeof value.invalidateQueries === 'function' && typeof value.getQueryCache === 'function') {
      clients.push(value);
      return;
    }
    let names;
    try { names = Object.keys(value); } catch { return; }
    for (const name of names) {
      if (name === 'return' || name === 'child' || name === 'sibling' || name === 'alternate' || name === 'elementType' || name === 'type') continue;
      try { consider(value[name], depth + 1); } catch { /* revoked */ }
    }
  };
  const stack = root ? [root] : [];
  const fibers = new Set();
  while (stack.length && fibers.size < 500 && clients.length < 2) {
    const node = stack.pop();
    if (!node || fibers.has(node)) continue;
    fibers.add(node);
    consider(node.memoizedProps, 0);
    consider(node.memoizedState, 0);
    consider(node.dependencies, 0);
    consider(node.updateQueue, 0);
    if (node.child) stack.push(node.child);
    if (node.sibling) stack.push(node.sibling);
  }
  if (!clients.length) return { ok: false, reason: 'query-client-not-found' };
  return Promise.all(clients.map(async (client) => {
    for (const queryKey of keys) {
      try { await client.invalidateQueries({ queryKey }); }
      catch (error) { return { ok: false, reason: String(error) }; }
    }
    return { ok: true };
  })).then((results) => ({
    ok: results.some((item) => item.ok),
    clients: clients.length,
    reason: results.find((item) => !item.ok)?.reason || null,
  }));
})()`;
}

function isMainWindow(target: CdpTarget) {
  return target.type === 'page' && target.url.startsWith('app://') && !target.url.includes('avatar-overlay');
}

function isOverlayWindow(target: CdpTarget) {
  return target.type === 'page' && target.url.includes('avatar-overlay');
}

function isPetRelevant(target: CdpTarget) {
  return isMainWindow(target) || isOverlayWindow(target);
}

async function readDisplay(sessions: CdpSession[], petId: string): Promise<DisplayEvidence | undefined> {
  for (const session of sessions) {
    try {
      const value = await session.evaluate<{ ok: boolean; petId?: string; backgroundImage?: string }>(READ_DISPLAY_EXPRESSION);
      if (!value?.ok || !value.backgroundImage) continue;
      const spriteSha256 = hashSpriteDataUrl(value.backgroundImage);
      if (!spriteSha256) continue;
      if (value.petId && value.petId !== petId && value.petId !== petId.replace(/^custom:/, '')) continue;
      return { petId: value.petId || petId, spriteSha256, source: 'cdp-dom' };
    } catch { /* try next window */ }
  }
  return undefined;
}

async function withSessions<T>(targets: CdpTarget[], fn: (sessions: CdpSession[]) => Promise<T>): Promise<T> {
  const sessions = targets.map((target) => new CdpSession(target.webSocketDebuggerUrl));
  try {
    return await fn(sessions);
  } finally {
    for (const session of sessions) session.close();
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function confirmedOutcome(
  strategy: RefreshStrategy,
  before: DisplayEvidence | undefined,
  after: DisplayEvidence,
  expectedSpriteSha256: string,
  errors: string[],
): RefreshOutcome {
  const changed = !before || before.spriteSha256 !== after.spriteSha256;
  return {
    automaticRefresh: true,
    displayStatus: 'confirmed',
    strategy,
    before,
    after,
    expectedSpriteSha256,
    notice: changed
      ? 'Floating Pet reloaded the committed atlas for the same identity. Display hash matches the installed spritesheet.'
      : 'Floating Pet already showed the committed atlas; display hash matches the installed spritesheet.',
    errors: errors.length ? errors : undefined,
  };
}

async function pollDisplayedHash(
  sessionsForRead: CdpTarget[],
  petId: string,
  expectedSpriteSha256: string,
  before: DisplayEvidence | undefined,
  strategy: RefreshStrategy,
  timeoutMs: number,
  errors: string[],
): Promise<RefreshOutcome | undefined> {
  const started = Date.now();
  let notedMismatch = false;
  let after: DisplayEvidence | undefined;
  while (Date.now() - started <= timeoutMs) {
    after = await withSessions(sessionsForRead, (sessions) => readDisplay(sessions, petId));
    if (after?.spriteSha256 === expectedSpriteSha256) {
      const changed = !before || before.spriteSha256 !== after.spriteSha256;
      const alreadyCurrent = before?.spriteSha256 === expectedSpriteSha256;
      if (changed || alreadyCurrent) return confirmedOutcome(strategy, before, after, expectedSpriteSha256, errors);
    }
    if (!notedMismatch && after && before && after.spriteSha256 !== before.spriteSha256 && after.spriteSha256 !== expectedSpriteSha256) {
      errors.push('display hash changed but does not match the committed spritesheet');
      notedMismatch = true;
    }
    if (Date.now() - started >= timeoutMs) break;
    await delay(120);
  }
  return undefined;
}

/**
 * After a validated atlas is committed under the same pet directory, make the
 * running host show that atlas without user input. Never patches app code,
 * never restarts the host, and never creates another Pet entry.
 *
 * With a debug channel it invalidates the host custom-avatar query cache, the
 * same action as the Pets Refresh control, without clicking that control.
 */
export async function refreshNativePet(options: RefreshOptions): Promise<RefreshOutcome> {
  const petId = options.petId ?? 'custom:genpet-companion';
  const expectedSpriteSha256 = await sha256File(options.expectedSpritePath);
  const timeoutMs = options.timeoutMs ?? 4000;
  const errors: string[] = [];
  const discoveryErrors: string[] = [];
  const ports = await discoverPorts(options.debugPorts);
  let strategy: RefreshStrategy = 'none';

  const unconfirmed = (strategy: RefreshStrategy, notice: string, before?: DisplayEvidence, after?: DisplayEvidence): RefreshOutcome => ({
    automaticRefresh: false,
    displayStatus: 'unconfirmed',
    strategy,
    before,
    after,
    expectedSpriteSha256,
    notice,
    errors: errors.length ? errors : undefined,
  });

  let allTargets: CdpTarget[] = [];
  for (const port of ports) {
    try {
      const targets = await listTargets(port);
      allTargets.push(...targets.filter(isPetRelevant));
    } catch (error) {
      discoveryErrors.push(`port ${port}: ${(error as Error).message}`);
    }
  }
  if (!allTargets.length) {
    errors.push(...discoveryErrors);
    return unconfirmed(
      strategy,
      'Files committed to the same GenPet entry. No remote-debugging channel was available, so the custom-avatar query cache was not invalidated and the floating Pet hash could not be checked. Visible update remains unconfirmed until Codex runs with --remote-debugging-port (9222 or 9341).',
    );
  }

  const overlayTargets = allTargets.filter(isOverlayWindow);
  const mainTargets = allTargets.filter(isMainWindow);
  const sessionsForRead = [...overlayTargets, ...mainTargets];
  const before = await withSessions(sessionsForRead, (sessions) => readDisplay(sessions, petId));
  if (before?.spriteSha256 === expectedSpriteSha256) {
    return confirmedOutcome('none', before, before, expectedSpriteSha256, errors);
  }

  const pageTargets = [...overlayTargets, ...mainTargets];
  let triggerRan = false;
  const invalidateMisses: string[] = [];
  strategy = 'cdp-query-invalidate';
  await withSessions(pageTargets, async (sessions) => {
    for (const session of sessions) {
      try {
        const result = await session.evaluate<{ ok: boolean; reason?: string }>(invalidateCustomAvatarsExpression(petId), 8000);
        if (result?.ok) triggerRan = true;
        else if (result?.reason) invalidateMisses.push(result.reason);
      } catch (error) {
        errors.push(`invalidate: ${(error as Error).message}`);
      }
    }
  });
  if (!triggerRan && invalidateMisses.length) {
    errors.push(`invalidate: ${invalidateMisses[0]}`);
  }
  if (triggerRan) {
    const confirmed = await pollDisplayedHash(
      sessionsForRead,
      petId,
      expectedSpriteSha256,
      before,
      'cdp-query-invalidate',
      timeoutMs,
      errors,
    );
    if (confirmed) return confirmed;
  }

  const after = await withSessions(sessionsForRead, (sessions) => readDisplay(sessions, petId));
  return unconfirmed(
    strategy,
    triggerRan
      ? 'Host refresh trigger ran, but the floating Pet display hash was not confirmed against the new spritesheet before timeout. Do not report visible growth complete.'
      : 'Files committed to the same GenPet entry. Host refresh trigger did not run. Visible update is unconfirmed; this does not satisfy automatic-update acceptance.',
    before,
    after,
  );
}

export function isLiveNativeDestination(destination: string) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === '1') return false;
  const live = path.join(homedir(), '.codex', 'pets', 'genpet-companion');
  if (path.resolve(destination) === path.resolve(live)) return true;
  const configured = process.env.CODEX_HOME;
  if (!configured) return false;
  const resolved = path.resolve(configured);
  // Test sandboxes point CODEX_HOME at a temp directory; never drive host UI from those.
  if (resolved.startsWith('/var/folders/') || resolved.includes('/tmp/') || resolved.includes('/Temp/')) return false;
  return path.resolve(destination) === path.resolve(path.join(resolved, 'pets', 'genpet-companion'));
}

export async function listInstalledSprites(destination: string) {
  try {
    const names = await readdir(destination);
    return names.filter((name) => name.startsWith('spritesheet'));
  } catch {
    return [];
  }
}

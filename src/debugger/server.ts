import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Store } from '../store.js';
import { growth } from '../growth.js';
import type { Host } from '../model.js';
import { storyOutputs } from '../variety.js';
import { packageHost, pluginRoot } from '../config.js';
import { hostFor } from '../hosts/index.js';
import { readInventory } from './inventory.js';
import { ATLAS, actions } from '../hosts/desktop/atlas.js';
import { previewAppearance } from '../hosts/desktop/preview.js';
import { CLOUD_PET_QUERY, refreshViaIpc } from '../hosts/desktop/refresh.js';
import { repairAppearance } from '../hosts/repair.js';
/** Explicitly launched, local GenPet inspection. Appearance actions change only the host entry; records never change. */
export async function startServer(port = Number(process.env.GENPET_PORT || 47831), root?: string) {
  const store = new Store(root, packageHost()),
    token = randomBytes(24).toString('hex');
  /** The requested record; `host` reads the other host's records under the same data directory. */
  const target = (url: URL) => {
    const host = url.searchParams.get('host') ?? store.host,
      pet = url.searchParams.get('pet');
    if (host !== 'desktop' && host !== 'cloud') throw new Error('Unsupported host environment');
    const scoped = host === store.host ? store : new Store(store.base, host);
    return pet ? scoped.forPet(pet) : scoped;
  };
  const server = http.createServer(async (req, res) => {
    const json = (value: unknown, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(value));
    };
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json({ error: 'Local access only' }, 403);
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return json({ error: 'Origin rejected' }, 403);
      const url = new URL(req.url || '/', 'http://' + host);
      if (req.method === 'GET' && url.pathname === '/api/health')
        return json({ service: 'genpet-debugger', root: store.root, pluginRoot: pluginRoot() });
      if (req.method === 'GET' && url.pathname === '/api/atlas') return json({ ...ATLAS, actions });
      // Every GenPet record this machine hosts, with its current atlas for the list thumbnail.
      if (req.method === 'GET' && url.pathname === '/api/records') {
        const records = [];
        for (const host of ['desktop', 'cloud'] as Host[])
          for (const pet of await new Store(store.base, host).listPets()) {
            const state = pet.error ? null : await new Store(store.base, host).forPet(pet.id).peek();
            records.push({ host, ...pet, appearanceId: state?.pet?.state.appearanceId ?? null });
          }
        return json({ base: store.base, host: store.host, records });
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const state = await target(url).peek();
        const outputs = Object.fromEntries(
          state.stories.map((story, index) => [story.id, storyOutputs(story, state.stories[index - 1], state)]),
        );
        return json({ state, outputs, growth: growth(state), token });
      }
      if (req.method === 'GET' && url.pathname === '/api/inventory') return json(await readInventory(store.base));
      if (req.method === 'GET' && url.pathname === '/api/native-pets') {
        const scoped = target(url);
        return json(await hostFor(scoped.host).diagnose(scoped));
      }
      if (req.method === 'POST' && url.pathname === '/api/action') {
        if (req.headers['x-genpet-token'] !== token) return json({ error: 'Invalid request token' }, 403);
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16_384) throw new Error('Request too large');
        }
        const input = JSON.parse(body);
        if (input.action === 'stop') {
          json({ ok: true, result: { stopped: true } });
          server.close();
          server.closeIdleConnections();
          return;
        }
        // Desktop appearance actions change only the host entry; Pet records stay untouched.
        if (['preview-appearance', 'restore-appearance', 'refresh'].includes(input.action)) {
          if (store.host !== 'desktop') throw new Error('Appearance actions are available for the desktop Pet');
          if (input.action === 'refresh')
            return json({
              ok: true,
              result: await refreshViaIpc(undefined, 2000, [['custom-avatars'], CLOUD_PET_QUERY]),
            });
          const scoped = new Store(store.base, 'desktop').forPet(String(input.petId ?? ''));
          return json({
            ok: true,
            result:
              input.action === 'preview-appearance'
                ? await previewAppearance(scoped, String(input.artId ?? ''))
                : await repairAppearance(scoped),
          });
        }
        return json({ error: 'Use the story workflow to change pet records' }, 400);
      }
      if (req.method === 'GET' && url.pathname.startsWith('/art/')) {
        const state = await target(url).peek(),
          record = state.art.find(art => art.id === url.pathname.slice(5));
        if (!record || record.kind === 'artifact') return json({ error: 'Image not found' }, 404);
        res.writeHead(200, {
          'Content-Type': record.file.endsWith('.webp') ? 'image/webp' : 'image/png',
          'Cache-Control': 'no-store',
        });
        res.end(await readFile(record.file));
        return;
      }
      const routes: Record<string, string> = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
      if (req.method !== 'GET' || !routes[url.pathname]) return json({ error: 'Not found' }, 404);
      const file = path.join(pluginRoot(), 'debugger-web', routes[url.pathname]),
        types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
        };
      // Read before the headers so a missing package file is an error, not a blank page.
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)],
        'Content-Security-Policy':
          "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
      });
      res.end(body);
    } catch (error) {
      if (!res.headersSent) json({ error: (error as Error).message }, 400);
      else res.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => process.exit(0)));
}

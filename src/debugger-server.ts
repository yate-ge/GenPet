import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Store } from './store.js';
import { artRequest } from './art.js';
import { packageHost, pluginRoot } from './config.js';
import { hostFor } from './hosts/index.js';
import { readInventory } from './inventory.js';
import { hasAppTools, readSelectedPet, selectPet } from './hosts/desktop/switch.js';

/** Explicitly launched, local, read-only pet inspection. Switching the host Pet requires an explicit action. */
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
        return json({
          service: 'genpet-debugger',
          root: store.root,
          pluginRoot: pluginRoot(),
          appTools: hasAppTools(),
        });
      if (req.method === 'GET' && url.pathname === '/api/selection') return json(await readSelectedPet());
      if (req.method === 'GET' && url.pathname === '/api/state')
        return json({ state: await target(url).peek(), token });
      if (req.method === 'GET' && url.pathname === '/api/pets') return json(await store.listPets());
      if (req.method === 'GET' && url.pathname === '/api/inventory') return json(await readInventory(store.base));
      if (req.method === 'GET' && url.pathname === '/api/art-request') return json(artRequest(await store.peek()));
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
        if (input.action === 'switch-pet') {
          // Only the host Pet selection changes; Pet records stay untouched.
          if (store.host !== 'desktop') throw new Error('Only the desktop host can switch its Pet here');
          const known = (await readInventory(store.base)).pets.some(
            pet => pet.id === input.petId && pet.sources.some(source => source !== 'record'),
          );
          if (!known) throw new Error('Unknown host Pet ID');
          return json({ ok: true, result: await selectPet(input.petId) });
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

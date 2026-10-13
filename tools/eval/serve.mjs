// Assets do jogo permanecem estáticos; a entrada usa o mesmo renderer Astro do site.
// Usage: node tools/eval/serve.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dev } from 'astro';
import { moduleCacheManifest } from '../../scripts/module-cache.mjs';

const PORT = parseInt(process.argv[2] || '8123', 10);
const ROOT = 'public';
const ASTRO = 'src/pages/index.astro';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.txt': 'text/plain' };

const CHARACTER_EVAL_SHELL = `<!doctype html>
<meta charset="utf-8">
<title>character eval shell</title>
<script type="importmap">
{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}
</script>`;

// PR807: o parser parcial não executa componentes. Não simular HTML ou autenticação.
const startAstro = manifest => dev({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error', vite: { cacheDir: '.astro/eval-vite', define: { __MANIFESTO_JS__: JSON.stringify(manifest) } } });
const initial = moduleCacheManifest();
let revision = initial.revision;
let astro = await startAstro(initial);
let refresh = null;
async function currentRenderer() {
  if (refresh) await refresh;
  const manifest = moduleCacheManifest();
  if (manifest.revision !== revision) {
    refresh = (async () => {
      await astro.stop();
      astro = await startAstro(manifest);
      revision = manifest.revision;
    })();
    try { await refresh; } finally { refresh = null; }
  }
  return astro;
}
const server = http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/' || /^\/(?:@|src\/|node_modules\/)/.test(p)) {
      const renderer = await currentRenderer();
      renderer.handle(req, res);
      return;
    }
    if (p === '/eval-character.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(CHARACTER_EVAL_SHELL);
    }
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) throw new Error('path');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    console.error('[serve]', req.url, '->', error?.message || error);
    if (!res.headersSent) res.writeHead(404);
    res.end('404');
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`eval server -> http://localhost:${PORT}`));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  if (refresh) await refresh.catch(() => {});
  await astro.stop();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

// Zero-dep static server for the eval harness: serves public/, and maps "/" to the
// Astro page source so the game runs without fighting astro dev.
// Espelha o import map e o hash de módulos do index.astro para o arnês local.
// Usage: node tools/eval/serve.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { moduleCacheManifest } from '../../scripts/module-cache.mjs';

const PORT = parseInt(process.argv[2] || '8123', 10);
const ROOT = 'public';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.txt': 'text/plain' };

async function renderIndex() {
  const src = await readFile('src/pages/index.astro', 'utf8');
  const V = JSON.parse(await readFile('package.json', 'utf8')).version;
  const { modules: modulos, revision: JS_REV } = moduleCacheManifest(join(ROOT, 'js'));
  const importmap = JSON.stringify({
    imports: {
      three: './vendor/three.module.js',
      'three/addons/': './vendor/addons/',
      ...Object.fromEntries(modulos.map((mod) => [`./js/${mod}`, `./js/${mod}?v=${V}-${JS_REV}`])),
    },
  });
  return src
    .replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`)
    .replace(/href=\{`\/style\.css\?v=\$\{V\}`\}/, `href="/style.css?v=${V}"`)
    .replace(/src=\{`\/js\/main\.js\?v=\$\{V\}-\$\{JS_REV\}`\}/, `src="/js/main.js?v=${V}-${JS_REV}"`);
}

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(await renderIndex()); }
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) throw new Error('path');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(PORT, () => console.log(`eval server -> http://localhost:${PORT}`));

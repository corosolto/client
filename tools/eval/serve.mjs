// Zero-dep static server for the eval harness: serves public/, and maps "/" to the
// Astro page source so the game runs without fighting astro dev.
// ATENÇÃO (07/08, commit 2a85ebc): o index.astro deixou de ser HTML literal — o `?v=`
// e o import map viram template Astro (`set:html={IMPORTMAP}`, `?v=${V}`, com V lido do
// package.json). Servir o fonte cru quebrava TODA ferramenta de browser do arnês
// ("Failed to resolve module specifier three"). Aqui os dois pontos de template são
// renderizados na mão: o MODULOS é extraído do frontmatter e o V do package.json —
// se o frontmatter mudar de forma, ESTE bloco precisa acompanhar.
// Usage: node tools/eval/serve.mjs [port]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = parseInt(process.argv[2] || '8123', 10);
const ROOT = 'public';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.txt': 'text/plain' };
const CHARACTER_EVAL_SHELL = `<!doctype html>
<meta charset="utf-8">
<title>character eval shell</title>
<script type="importmap">
{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}
</script>`;

async function renderIndex() {
  const src = await readFile('src/pages/index.astro', 'utf8');
  const V = JSON.parse(await readFile('package.json', 'utf8')).version;
  const m = src.match(/const MODULOS = \[([\s\S]*?)\];/);
  if (!m) throw new Error('serve.mjs: MODULOS não achado no frontmatter do index.astro');
  const modulos = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const importmap = JSON.stringify({
    imports: {
      three: './vendor/three.module.js',
      'three/addons/': './vendor/addons/',
      ...Object.fromEntries(modulos.map((mod) => [`./js/${mod}`, `./js/${mod}?v=${V}`])),
    },
  });
  return src
    .replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`)
    .replace(/href=\{`\/style\.css\?v=\$\{V\}`\}/, `href="/style.css?v=${V}"`);
}

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(await renderIndex()); }
    if (p === '/eval-character.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(CHARACTER_EVAL_SHELL);
    }
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) throw new Error('path');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('404');
  }
}).listen(PORT, () => console.log(`eval server -> http://localhost:${PORT}`));

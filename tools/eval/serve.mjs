// Zero-dep static server for the eval harness: serves public/, and maps "/" to the
// Astro page source so the game runs without fighting astro dev.
// Espelha o import map e o hash de módulos do index.astro para o arnês local.
// Usage: node tools/eval/serve.mjs [port]
import { createHash } from 'node:crypto';
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
  const CSS_REV = createHash('sha256')
    .update(await readFile(join(ROOT, 'style.css')))
    .digest('hex').slice(0, 12);
  const importmap = JSON.stringify({
    imports: {
      three: './vendor/three.module.js',
      'three/addons/': './vendor/addons/',
      ...Object.fromEntries(modulos.map((mod) => [`./js/${mod}`, `./js/${mod}?v=${V}-${JS_REV}`])),
    },
  });
  return src
    .replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`)
    /* O arnês serve o .astro CRU: o `<script is:inline define:vars>` do __SUPPORT vaza
       `SUPPORT_URL_BR` como identificador livre e mata o boot com pageerror em toda
       captura. O Astro real injeta os valores; aqui injetamos os defaults do site.ts. */
    .replace(/window\.__SUPPORT = \{ br: SUPPORT_URL_BR, intl: SUPPORT_URL_INTL \};/,
      `window.__SUPPORT = { br: 'https://meapoia.com/vaquinhas/ajude-a-manter-o-coro-solto-online', intl: 'https://ko-fi.com/corosolto' };`)
    /* O hash do CONTEÚDO entra junto da versão, e não é capricho: o main.js já vem
       com `${V}-${JS_REV}` (revisão calculada do conteúdo de public/js), mas o CSS
       vinha só com `${V}`. Como a versão do package.json não muda entre commits de
       trabalho, o navegador servia style.css DO CACHE — o JS novo chegava e o CSS
       não, e a tela ficava com metade da mudança. Sintoma de quem revisa: "não mudou
       nada", com o F5 normal não resolvendo. Em produção não aparece porque o
       release sobe a versão; é um buraco só do laço de desenvolvimento, que é
       exatamente onde ele custa caro. */
    .replace(/href=\{`\/style\.css\?v=\$\{V\}`\}/, `href="/style.css?v=${V}-${CSS_REV}"`)
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

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
  /* Substituição GENÉRICA de atributo com template literal: `attr={`...${V}...`}`
     vira `attr="..."`. Antes daqui havia uma regra por atributo, e só duas: o
     importmap e o `href` do style.css.

     O preço de ser por-atributo, pago em 12/08: o merge da main trouxe o conserto
     do BUG-39 — o `?v=` amarrado ao `pkg.version` — e com ele
     `src={`/js/main.js?v=${V}`}` no lugar de um `?v=` fixo. Esse padrão não estava
     na lista, então o atributo saía como TEXTO LITERAL, o navegador pedia
     `/%7B%60/js/main.js?v=${V}%60%7D`, tomava 404, e o jogo parava em "CARREGANDO
     ARENA…" com `window.__game` inexistente. Em captura headless isso aparece como
     `waitForFunction: Timeout 900000ms` — 15 min por mapa, e o log acusa o MAPA.
     Perdemos uma bateria inteira "descobrindo" que os mapas novos não bootavam,
     quando nenhum mapa bootava e a culpa era deste renderizador.

     LIMITE DECLARADO: isto não é o Astro. Expressão que depende de escopo de
     runtime — `${f.crest}` dentro de um `.map()`, por exemplo — não tem como ser
     resolvida aqui e continua vazando. São imagens decorativas (brasão), não
     fatais para o boot; se algum dia uma delas for, o caminho é usar o Astro de
     verdade, não engordar este regex. */
  const attrs = (s) => s.replace(/(\w[\w:-]*)=\{`([^`]*)`\}/g, (todo, attr, corpo) => {
    if (/\$\{(?!V\})/.test(corpo)) return todo; // depende de runtime: deixa como está
    return `${attr}="${corpo.replaceAll('${V}', V)}"`;
  });
  return attrs(
    src.replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`),
  );
}

/* ORDEM IMPORTA: o corpo é produzido ANTES de qualquer writeHead.
   O defeito que isto conserta (medido em 12/08): a rota `/` fazia
   `res.writeHead(200)` e SÓ DEPOIS `await renderIndex()`. Quando o render
   falhava — `index.astro` com marcador de conflito, ou o frontmatter mudando de
   forma, que o cabeçalho deste arquivo já avisa que acontece — o `catch` tentava
   `res.writeHead(404)` sobre cabeçalho já enviado. Isso lança
   ERR_HTTP_HEADERS_SENT DENTRO de um handler async, ninguém captura, e o
   PROCESSO INTEIRO morre.

   O preço disso não foi uma requisição perdida: foi a bateria de captura toda.
   Em 12/08 o servidor caiu no meio do `fy_quebrada` e os 5 mapas seguintes
   (escadao, campomorro, lajes, corrego, mansao) saíram com
   ERR_CONNECTION_REFUSED — justamente os 5 que o dono relatou como piores e que
   ninguém tinha frame para julgar. Servidor de arnês que morre falsifica a
   medição em silêncio: o log fica cheio de "fatal" que parece defeito do jogo. */
http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let body, type;
    if (p === '/') { body = await renderIndex(); type = 'text/html'; }
    else if (p === '/eval-character.html') { body = CHARACTER_EVAL_SHELL; type = 'text/html'; }
    else {
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT)) throw new Error('path');
      body = await readFile(file);
      type = MIME[extname(file)] || 'application/octet-stream';
    }
    res.writeHead(200, { 'content-type': type });
    res.end(body);
  } catch (e) {
    // `headersSent` é o guarda-costas: se por qualquer caminho novo o cabeçalho
    // já tiver saído, derrube só ESTA conexão em vez de o processo.
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(404); res.end('404');
  }
}).listen(PORT, () => console.log(`eval server -> http://localhost:${PORT}`));

/* Rede de segurança final. Uma bateria de captura leva mais de uma hora; perder
   isso porque um socket morreu não paga. Nenhum destes derruba o servidor. */
process.on('uncaughtException', (e) => console.error('[serve] exceção ignorada:', e.message));
process.on('unhandledRejection', (e) => console.error('[serve] rejeição ignorada:', e?.message || e));

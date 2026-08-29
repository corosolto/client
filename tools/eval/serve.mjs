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
const CHARACTER_EVAL_SHELL = `<!doctype html>
<meta charset="utf-8">
<title>character eval shell</title>
<script type="importmap">
{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}
</script>`;

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
  /* Substituição GENÉRICA de atributo com template literal: `attr={`...`}` vira
     `attr="..."`, resolvendo as variáveis que este renderizador conhece.

     As DUAS metades desta função nasceram do mesmo defeito, cada lado consertando
     por um caminho, e o merge de 12/08 ficou com as duas de propósito:

     - A `main` acrescentou `JS_REV` (hash de revisão dos módulos) e uma regra
       `.replace` para o `src` do main.js. É o conserto do BUG-39: `?v=` amarrado à
       versão + revisão, para o edge não montar a página com módulos de deploys
       diferentes. ISSO FICA — o mecanismo é dela.
     - A branch trocou as regras POR ATRIBUTO por esta varredura genérica. É o
       conserto do defeito que a abordagem por-atributo cria: quando o `index.astro`
       ganha um atributo novo com template literal, ele sai como TEXTO LITERAL, o
       navegador pede `/%7B%60/js/main.js...%60%7D`, toma 404, e o jogo trava em
       "CARREGANDO ARENA…" sem `window.__game`. Em captura headless isso vira
       `waitForFunction: Timeout 900000ms` e o log acusa o MAPA — perdemos uma
       bateria inteira "descobrindo" que os mapas novos não bootavam, quando
       NENHUM mapa bootava e a culpa era deste renderizador.

     Ficar só com a regra da main devolveria a fragilidade. Ficar só com a varredura
     genérica DERRUBARIA O BOOT, porque o guarda dela rejeitava `${JS_REV}`. Por isso
     as variáveis conhecidas são uma TABELA: acrescentar variável nova ao
     index.astro é acrescentar uma linha aqui, e o que não estiver na tabela é
     deixado intacto em vez de virar texto quebrado.

     LIMITE DECLARADO: isto não é o Astro. Expressão que depende de escopo de
     runtime — `${f.crest}` dentro de um `.map()` — não tem como ser resolvida aqui
     e continua vazando de propósito. São imagens decorativas (brasão), não fatais
     para o boot; se um dia uma delas for, o caminho é usar o Astro de verdade, não
     engordar este regex. */
  const VARS = { V, JS_REV };
  /* `define:vars` do Astro não é renderizado aqui: o script inline executa com
     ReferenceError e derruba o boot de `/` no arnês (introduzido pelo wiring do
     link de apoio, PR #284). Variável conhecida = linha na tabela; desconhecida
     vaza intacta para o erro ser legível, como no `attrs` acima. */
  const site = await readFile('src/lib/site.ts', 'utf8');
  const envConst = (nome) => site.match(new RegExp(`export const ${nome} = import\\.meta\\.env\\.\\w+ \\|\\| '([^']+)'`))?.[1] || '';
  const DEFINE_VARS = { SUPPORT_URL_BR: envConst('SUPPORT_URL_BR'), SUPPORT_URL_INTL: envConst('SUPPORT_URL_INTL') };
  const defineVars = (s) => s.replace(/<script([^>]*?) define:vars=\{\{([^}]+)\}\}>/g, (todo, attrsScript, nomes) => {
    const linhas = nomes.split(',').map((n) => n.trim()).filter(Boolean)
      .map((n) => (DEFINE_VARS[n] ? `const ${n}=${JSON.stringify(DEFINE_VARS[n])};` : null));
    if (linhas.some((l) => l === null)) return todo;
    return `<script${attrsScript}>${linhas.join('')}`;
  });
  const attrs = (s) => s.replace(/(\w[\w:-]*)=\{`([^`]*)`\}/g, (todo, attr, corpo) => {
    const resolvido = corpo.replace(/\$\{(\w+)\}/g, (m, nome) => (nome in VARS ? VARS[nome] : m));
    // sobrou `${...}` = depende de escopo de runtime: devolve intacto, não quebrado.
    return /\$\{/.test(resolvido) ? todo : `${attr}="${resolvido}"`;
  });
  return defineVars(attrs(
    src.replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`)
      .replace(
        /src=\{`\/js\/main\.js\?v=\$\{V\}-\$\{JS_REV\}`\}/,
        `src="/js/main.js?v=${V}-${JS_REV}"`,
      )
      /* CSS com hash de CONTEÚDO (regra da main, mantida ANTES da varredura genérica):
         a versão do package.json não muda entre commits de trabalho e o navegador
         servia style.css do cache — o JS novo chegava e o CSS não. */
      .replace(/href=\{`\/style\.css\?v=\$\{V\}`\}/, `href="/style.css?v=${V}-${CSS_REV}"`),
  ));
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

// Zero-dep static server for the eval harness: serves public/, and maps "/" to the
// Astro page source so the game runs without fighting astro dev.
// Espelha o import map e o hash de módulos do index.astro para o arnês local.
// Usage: node tools/eval/serve.mjs [port]
import { createHash } from 'node:crypto';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import vm from 'node:vm';
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

/* POR QUE O FRONTMATTER É AVALIADO AQUI
   O arnês não roda o Astro: ele serve o `.astro` cru com algumas substituições. Cada
   `define:vars={{ ... }}` é uma ponte do servidor para um inline, e sem o Astro esses
   nomes simplesmente não existem no navegador — o inline lança `ReferenceError` antes
   de qualquer módulo do jogo carregar, e todo portão que exige zero `pageerror` morre
   com um erro que não tem nada a ver com o que ele mede. Foi o que aconteceu quando a
   telemetria de build acrescentou `define:vars={{ GIT_SHA }}` ao index.astro: este
   servidor conhecia UM bloco, o de SUPPORT_URL_*, porque ele estava escrito à mão.
   Resolver nome por nome só adia o mesmo apagão para o próximo bloco. Então o
   frontmatter inteiro é avaliado e qualquer nome que ele declare fica disponível. */

const IMPORT_LINE = /^import\s+(.+?)\s+from\s+'([^']+)';?[ \t]*$/gm;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const DEFINE_VARS = /<script\b[^>]*\bdefine:vars=\{\{([^}]*)\}\}[^>]*>/g;

function bindImport(clause, mod) {
  const named = clause.trim().match(/^\{([\s\S]*)\}$/);
  if (!named) return { [clause.trim()]: 'default' in mod ? mod.default : mod };
  return Object.fromEntries(named[1].split(',').map((part) => {
    const [original, alias] = part.split(/\s+as\s+/).map((s) => s.trim());
    return original ? [alias || original, mod[original]] : null;
  }).filter(Boolean));
}

async function loadModule(spec, fromDir) {
  const base = resolve(fromDir, spec);
  if (base.endsWith('.json')) return { default: JSON.parse(await readFile(base, 'utf8')) };
  for (const candidate of [`${base}.ts`, `${base}.mjs`, `${base}.js`, join(base, 'index.ts')]) {
    const code = await readFile(candidate, 'utf8').catch(() => null);
    if (code !== null) return evalDeclarations(code, candidate);
  }
  throw new Error(`serve.mjs: import '${spec}' de ${fromDir} não resolvido`);
}

/* Avalia um módulo de declarações (frontmatter do .astro ou src/lib/*.ts) num contexto
   `vm` e devolve as ligações de topo: os imports viram valores injetados,
   `import.meta.env` vira o ambiente do processo (é assim que PUBLIC_SUPPORT_URL_* e
   VERCEL_GIT_COMMIT_SHA continuam mandando) e as declarações de topo viram `var` para
   aparecerem no objeto de contexto. Serve para declaração simples; se o frontmatter
   passar a depender de lógica de build de verdade, o erro abaixo diz exatamente isso
   em vez de servir um inline quebrado. */
async function evalDeclarations(code, filename, seed = {}) {
  const scope = { __ENV: process.env, ...seed };
  const imports = [];
  const body = code
    .replace(IMPORT_LINE, (_, clause, spec) => { imports.push([clause, spec]); return ''; })
    .replace(/^declare\s[^\n]*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/\bimport\.meta\.env\b/g, '__ENV')
    .replace(/^(?:const|let)\s/gm, 'var ');
  for (const [clause, spec] of imports) Object.assign(scope, bindImport(clause, await loadModule(spec, dirname(filename))));
  vm.createContext(scope);
  try {
    vm.runInContext(body, scope, { filename });
  } catch (error) {
    throw new Error(`serve.mjs: não avaliei ${filename} (${error.message}). O arnês só entende declarações simples — anotação de tipo ou lógica de build precisa ser espelhada aqui à mão.`);
  }
  return scope;
}

async function renderIndex() {
  const src = await readFile(ASTRO, 'utf8');
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
  /* O `define:vars` agora sai do frontmatter DE VERDADE (`evalDeclarations` acima),
     mecanismo da main: a tabela à mão que esta branch tinha (SUPPORT_URL_BR /
     SUPPORT_URL_INTL) virava dívida a cada variável nova no index.astro, e o
     `GIT_SHA` que a telemetria acrescentou já não estava nela. Isso fica.

     `__MANIFESTO_JS__` é injetado pelo build do Astro; no arnês ele vem do mesmo
     manifesto de cache de módulos que monta o import map acima. */
  const frontmatter = src.match(FRONTMATTER);
  if (!frontmatter) throw new Error(`serve.mjs: ${ASTRO} sem frontmatter`);
  const scope = await evalDeclarations(frontmatter[1], resolve(ASTRO), {
    __MANIFESTO_JS__: { modules: modulos, revision: JS_REV },
  });
  /* Varredura GENÉRICA de atributo com template literal, que a branch acrescentou e
     a lista por-atributo da main não cobre: `attr={`...`}` vira `attr="..."`.
     Quando o `index.astro` ganha um atributo novo com template literal e ninguém
     acrescenta a linha correspondente abaixo, ele sai como TEXTO LITERAL, o
     navegador pede `/%7B%60/js/main.js...%60%7D`, toma 404, e o jogo trava em
     "CARREGANDO ARENA…" sem `window.__game`. Em captura headless isso vira
     `waitForFunction: Timeout 900000ms` e o log acusa o MAPA — perdemos uma bateria
     inteira "descobrindo" que os mapas novos não bootavam, quando NENHUM mapa
     bootava e a culpa era deste renderizador. Ela roda DEPOIS das regras explícitas
     da main, como rede: o que sobrar com `${...}` depende de escopo de runtime
     (`${f.crest}` dentro de um `.map()`) e é devolvido INTACTO, para o erro
     continuar legível em vez de virar atributo quebrado.
     LIMITE DECLARADO: isto não é o Astro. Se um dia uma dessas expressões for fatal
     para o boot, o caminho é usar o Astro de verdade, não engordar este regex. */
  const VARS = { V, JS_REV };
  const attrs = (s) => s.replace(/(\w[\w:-]*)=\{`([^`]*)`\}/g, (todo, attr, corpo) => {
    const resolvido = corpo.replace(/\$\{(\w+)\}/g, (m, nome) => (nome in VARS ? VARS[nome] : m));
    return /\$\{/.test(resolvido) ? todo : `${attr}="${resolvido}"`;
  });
  return attrs(src
    .replace(DEFINE_VARS, (tag, names) => {
      const declaracoes = names.split(',').map((name) => name.trim()).filter(Boolean).map((name) => {
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`serve.mjs: ${tag} usa forma não abreviada; o arnês só resolve \`define:vars={{ NOME }}\``);
        if (!(name in scope)) throw new Error(`serve.mjs: define:vars={{ ${name} }} não foi declarado no frontmatter de ${ASTRO}`);
        return `const ${name} = ${JSON.stringify(scope[name])};`;
      });
      return `<script>${declaracoes.join(' ')}`;
    })
    .replace(/<script type="importmap"[^>]*><\/script>/, `<script type="importmap">${importmap}</script>`)
    /* O hash do CONTEÚDO entra junto da versão, e não é capricho: o main.js já vem
       com `${V}-${JS_REV}` (revisão calculada do conteúdo de public/js), mas o CSS
       vinha só com `${V}`. Como a versão do package.json não muda entre commits de
       trabalho, o navegador servia style.css DO CACHE — o JS novo chegava e o CSS
       não, e a tela ficava com metade da mudança. Sintoma de quem revisa: "não mudou
       nada", com o F5 normal não resolvendo. Em produção não aparece porque o
       release sobe a versão; é um buraco só do laço de desenvolvimento, que é
       exatamente onde ele custa caro. */
    .replace(/href=\{`\/style\.css\?v=\$\{V\}`\}/, `href="/style.css?v=${V}-${CSS_REV}"`)
    .replaceAll(
      'href={`/map-preview.css?v=${V}-${JS_REV}`}',
      `href="/map-preview.css?v=${V}-${JS_REV}"`,
    )
    .replace(
      'src={`/js/ops.js?v=${V}-${JS_REV}`}',
      `src="/js/ops.js?v=${V}-${JS_REV}"`,
    )
    .replace(/src=\{`\/js\/main\.js\?v=\$\{V\}-\$\{JS_REV\}`\}/, `src="/js/main.js?v=${V}-${JS_REV}"`));
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

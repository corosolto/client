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
  /* Builtin do Node roda no frontmatter como em qualquer módulo do servidor; resolver
     `node:fs` como caminho quebra o render e derruba o arnês inteiro. Antes do .json. */
  if (spec.startsWith('node:')) return await import(spec);
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
  // `__MANIFESTO_JS__` é injetado pelo build do Astro; no arnês ele vem do mesmo
  // manifesto de cache de módulos que monta o import map acima.
  const frontmatter = src.match(FRONTMATTER);
  if (!frontmatter) throw new Error(`serve.mjs: ${ASTRO} sem frontmatter`);
  const scope = await evalDeclarations(frontmatter[1], resolve(ASTRO), {
    __MANIFESTO_JS__: { modules: modulos, revision: JS_REV },
  });
  return src
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
    // Se o próprio frontmatter já declara CSS_REV, vale o dele; o daqui é só o fallback.
    .replace(/href=\{`\/style\.css\?v=\$\{V\}(?:-\$\{CSS_REV\})?`\}/, `href="/style.css?v=${V}-${scope.CSS_REV || CSS_REV}"`)
    .replaceAll(
      'href={`/map-preview.css?v=${V}-${JS_REV}`}',
      `href="/map-preview.css?v=${V}-${JS_REV}"`,
    )
    .replace(
      'src={`/js/ops.js?v=${V}-${JS_REV}`}',
      `src="/js/ops.js?v=${V}-${JS_REV}"`,
    )
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

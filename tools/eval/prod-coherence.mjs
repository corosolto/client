/* ============================================================================
   prod-coherence.mjs — O EDGE ESTÁ SERVINDO UM CONJUNTO COERENTE DE MÓDULOS?
   ----------------------------------------------------------------------------
   O CASO QUE COMPROU ESTE SCRIPT (08/08/2026)
   O site inteiro ficou fora do ar com o boot morto no parse:
     "The requested module './fparms.js' does not provide an export named
      'preloadStaticVm'"
   A Cloudflare servia o `main.js` de UM deploy (que importava o símbolo) com o
   `fparms.js` de OUTRO deploy (que já não exportava) — edge TTL de 1 mês sobre
   `/js/*` + `?v=2` fixo = mix de versões na mesma página. Nenhum portão da casa
   mede o que o edge está servindo: `check:fast` mede o repo, o build mede o
   build, e o erro só existe na interseção dos caches. Este script mede a
   interseção.

   O QUE ELE FAZ
   1. Baixa o HTML da raiz e extrai o import map.
   2. Baixa cada módulo (com o `?v=` exato do HTML) e varre o grafo de imports
      estáticos em largura, resolvendo `./x.js`, `three` e `three/addons/`.
   3. Para cada `import { a, b } from ...` verifica que o módulo alvo EXPORTA
      `a` e `b` (function/const/class/let, `export {…}`, re-export com `from`).
   Módulo que não baixa (404/5xx) também é incoerência.

   NÃO É PARSER DE JS — é regex estática sobre código ESM cru, que é o que esta
   casa serve (zero build). Falso positivo se paga com comentário aqui, não com
   afrouxamento.

   USO
     node tools/eval/prod-coherence.mjs [baseUrl]   # padrão https://www.csbrasil.online
     node tools/eval/prod-coherence.mjs --selftest  # mutação: TEM que sair 1

   A MUTAÇÃO (lei 3 da casa — régua que não morde não existe)
   `--selftest` sobe um servidor local com dois conjuntos de módulos: um
   coerente (sai 0) e um com um export arrancado (sai 1, citando o símbolo).
   Se o dia em que alguém "melhorar" este script o selftest continuar verde,
   a régua virou decoração.
   ============================================================================ */
import http from 'node:http';

const BASE = process.argv.find((a) => !a.startsWith('--') && a.includes('://')) || 'https://www.csbrasil.online';
const SELFTEST = process.argv.includes('--selftest');

const RE_IMPORT_FROM = /import\s+(?:[\w$]+\s*,\s*)?(?:\{([^}]*)\})?(?:\s*\*\s*as\s*[\w$]+)?(?:\s+[\w$]+)?\s*from\s*['"]([^'"]+)['"]/g;
const RE_IMPORT_SIDE = /import\s*['"]([^'"]+)['"]/g;
const RE_IMPORT_DYN = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_EXPORT_FN = /export\s+(?:async\s+)?(?:function|class)\s+([\w$]+)/g;
/* `export const A = 1, B = 2;` exporta A **e** B — regex de identificador único
   aqui acusou `CONFIRM_MAX_MS` faltando no game.js em 08/08 (falso positivo
   contra produção saudável). Captura o statement inteiro e separa os
   declaradores; o split ingênuo em vírgula pode criar nome-lixo de array
   (`[1, 2]`), que só ADICIONA export falso — nunca remove um real. */
const RE_EXPORT_VAR = /export\s+(?:const|let|var)\s+([^;]+);/g;
const RE_EXPORT_LIST = /export\s*\{([^}]*)\}/g;
const RE_EXPORT_DEFAULT = /export\s+default\b/g;

function parseNamed(list) {
  // "a, b as c, d" -> [{quer:'a', exp:'a'}, {quer:'b', exp:'c'}, …]
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
    return m ? { quer: m[1], exp: m[2] || m[1] } : null;
  }).filter(Boolean);
}

function parseModule(src) {
  const imports = [];   // {spec, nomes:[{quer}] | null (side-effect/namespace)}
  const exports = new Set();
  let m;
  RE_IMPORT_FROM.lastIndex = 0;
  while ((m = RE_IMPORT_FROM.exec(src)))
    imports.push({ spec: m[2], nomes: m[1] ? parseNamed(m[1]) : null });
  RE_IMPORT_SIDE.lastIndex = 0;
  while ((m = RE_IMPORT_SIDE.exec(src))) imports.push({ spec: m[1], nomes: null });
  RE_IMPORT_DYN.lastIndex = 0;
  while ((m = RE_IMPORT_DYN.exec(src))) imports.push({ spec: m[1], nomes: null });
  RE_EXPORT_FN.lastIndex = 0;
  while ((m = RE_EXPORT_FN.exec(src))) exports.add(m[1]);
  RE_EXPORT_VAR.lastIndex = 0;
  while ((m = RE_EXPORT_VAR.exec(src)))
    for (const decl of m[1].split(',')) {
      const id = decl.trim().match(/^([A-Za-z_$][\w$]*)/);
      if (id) exports.add(id[1]);
    }
  RE_EXPORT_LIST.lastIndex = 0;
  while ((m = RE_EXPORT_LIST.exec(src)))
    for (const { exp } of parseNamed(m[1])) exports.add(exp);
  RE_EXPORT_DEFAULT.lastIndex = 0;
  if (RE_EXPORT_DEFAULT.test(src)) exports.add('default');
  return { imports, exports };
}

function resolveSpec(spec, fromUrl, importMap, docBase) {
  // import map do browser: match exato, depois prefixo terminado em '/'.
  // ATENÇÃO: os valores do import map resolvem contra a BASE DO DOCUMENTO,
  // não contra a URL do módulo que importa (o 1º selftest pegou isso:
  // './vendor/three.module.js' virava /js/vendor/… e 404 em tudo).
  if (importMap[spec]) return new URL(importMap[spec], docBase).href;
  for (const [k, v] of Object.entries(importMap))
    if (k.endsWith('/') && spec.startsWith(k)) return new URL(v + spec.slice(k.length), docBase).href;
  if (spec.startsWith('.') || spec.startsWith('/')) return new URL(spec, fromUrl).href;
  return null; // bare specifier fora do mapa — não é nosso grafo
}

async function baixa(url, erros) {
  const r = await fetch(url);
  if (!r.ok) { erros.push(`HTTP ${r.status} em ${url}`); return null; }
  return r.text();
}

async function audit(base) {
  const erros = [];
  const html = await baixa(base + '/', erros);
  if (!html) return erros;
  const mm = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!mm) return ['import map não encontrado no HTML de ' + base];
  const importMap = JSON.parse(mm[1]).imports || {};

  const raiz = new URL(base + '/');
  const fila = Object.values(importMap).filter((v) => !v.endsWith('/')).map((v) => new URL(v, raiz).href);
  const vistos = new Map(); // url -> exports
  while (fila.length) {
    const url = fila.shift();
    const chave = url.split('?')[0];
    if (vistos.has(chave)) continue;
    const src = await baixa(url, erros);
    if (src == null) { vistos.set(chave, null); continue; }
    const { imports, exports } = parseModule(src);
    vistos.set(chave, { exports, imports, url });
    for (const imp of imports) {
      const alvo = resolveSpec(imp.spec, url, importMap, raiz);
      if (alvo && !vistos.has(alvo.split('?')[0])) fila.push(alvo);
    }
  }

  for (const [chave, mod] of vistos) {
    if (!mod) continue;
    for (const imp of mod.imports) {
      if (!imp.nomes) continue;
      const alvo = resolveSpec(imp.spec, mod.url, importMap, raiz);
      if (!alvo) continue;
      const alvoMod = vistos.get(alvo.split('?')[0]);
      if (!alvoMod) continue; // falha de fetch já registrada
      for (const { quer } of imp.nomes)
        if (!alvoMod.exports.has(quer))
          erros.push(`${chave} importa '${quer}' de ${imp.spec}, mas ${alvo.split('?')[0]} não exporta`);
    }
  }
  return erros;
}

/* ---------------- selftest: a mutação que prova a régua ---------------- */
async function selftest() {
  const pagina = (v) => `<!doctype html><script type="importmap">{"imports":{"./js/main.js":"./js/main.js?v=${v}"}}</script>`;
  const conjuntos = {
    '/ok/': pagina(1),
    '/ok/js/main.js': "import { foo, bar } from './dep.js';\nfoo(); bar();",
    '/ok/js/dep.js': 'export function foo() {}\nexport const bar = 1, baz = 2;', // multi-declarador: o falso positivo do game.js em 08/08
    '/quebrado/': pagina(2),
    '/quebrado/js/main.js': "import { foo, preloadStaticVm } from './fparms.js';\nfoo();",
    '/quebrado/js/fparms.js': 'export function foo() {}', // export arrancado: o mutante
  };
  const srv = http.createServer((req, res) => {
    const corpo = conjuntos[req.url.split('?')[0]];
    if (corpo == null) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/html' }); res.end(corpo);
  });
  await new Promise((f) => srv.listen(0, f));
  const porta = srv.address().port;
  const ok = await audit(`http://127.0.0.1:${porta}/ok`);
  const quebrado = await audit(`http://127.0.0.1:${porta}/quebrado`);
  srv.close();
  let falhou = false;
  if (ok.length) { console.error('MUTAÇÃO FALHOU: conjunto coerente devia sair limpo:', ok); falhou = true; }
  if (!quebrado.some((e) => e.includes('preloadStaticVm'))) {
    console.error('MUTAÇÃO FALHOU: export arrancado não foi detectado. Saída:', quebrado); falhou = true;
  }
  if (falhou) process.exit(1);
  console.log('selftest ok: conjunto coerente sai 0, export arrancado sai 1 citando o símbolo.');
  process.exit(0);
}

if (SELFTEST) await selftest();
else {
  const erros = await audit(BASE);
  if (erros.length) {
    console.error(`INCOERENTE (${BASE}):`);
    for (const e of erros) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log(`coerente: grafo de módulos de ${BASE} fecha sem símbolo faltando.`);
}

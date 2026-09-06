/* ============================================================================
   repo.mjs — o que a diagnose lê da ÁRVORE (sem rede, sem browser).
   ----------------------------------------------------------------------------
   Toda leitura aqui é por texto/regex ou por módulo já usado pelo build
   (`scripts/module-cache.mjs`), nunca por número escrito à mão: a lista de
   armas vem de `WEAPON_IDS` em weapons.js, o backend de `apibase.js`, a flag de
   ranking de `src/lib/site.ts`, o import map do mesmo manifesto que o Astro usa.
   Se a fonte mudar de lugar, a sonda REPROVA dizendo o que não achou — nunca
   devolve lista vazia com cara de "tudo certo" (docs/LICOES.md §5).
   ============================================================================ */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_PADRAO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function lerPackage(raiz = RAIZ_PADRAO) {
  return JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
}

export function versaoDoVersionJs(raiz = RAIZ_PADRAO) {
  const src = readFileSync(join(raiz, 'public/js/version.js'), 'utf8');
  const m = /export\s+const\s+VERSION\s*=\s*['"]([^'"]+)['"]/.exec(src);
  if (!m) throw new Error('public/js/version.js sem `export const VERSION`');
  return m[1];
}

export function rankingLigado(raiz = RAIZ_PADRAO) {
  const src = readFileSync(join(raiz, 'src/lib/site.ts'), 'utf8');
  const m = /export\s+const\s+RANKING_ON(?:\s*:\s*boolean)?\s*=\s*(true|false)\b/.exec(src);
  if (!m) throw new Error('src/lib/site.ts sem `export const RANKING_ON = true|false` legível');
  return m[1] === 'true';
}

export function backendPadrao(raiz = RAIZ_PADRAO) {
  const src = readFileSync(join(raiz, 'public/js/apibase.js'), 'utf8');
  const m = /return\s+'(https:\/\/[^']+)';/.exec(src);
  if (!m) throw new Error('public/js/apibase.js sem o backend padrão (`return \'https://…\'`)');
  return m[1];
}

export function rotasNoBackend(raiz = RAIZ_PADRAO) {
  const src = readFileSync(join(raiz, 'public/js/apibase.js'), 'utf8');
  const m = /const NO_BACKEND = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  if (!m) throw new Error('public/js/apibase.js sem NO_BACKEND');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

export function weaponIds(raiz = RAIZ_PADRAO) {
  const src = readFileSync(join(raiz, 'public/js/weapons.js'), 'utf8');
  const m = /export\s+const\s+WEAPON_IDS\s*=\s*\[([\s\S]*?)\];/.exec(src);
  if (!m) throw new Error('public/js/weapons.js sem WEAPON_IDS');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

export async function manifestoDeModulos(raiz = RAIZ_PADRAO) {
  const { moduleCacheManifest } = await import(new URL('scripts/module-cache.mjs', `file://${raiz}/`).href);
  return moduleCacheManifest(join(raiz, 'public/js'));
}

/* Mesmo desenho de `src/pages/index.astro`: `three`, `three/addons/` e um par
   `./js/<m>` → `./js/<m>?v=<V>-<rev>` por módulo. Serve para o boot local e para o
   selftest reproduzirem o HTML que a produção serve, sem Astro. */
export function importMapComo(index, versao, manifesto) {
  return {
    imports: {
      three: `./vendor/three.module.js?v=${versao}`,
      'three/addons/': './vendor/addons/',
      ...Object.fromEntries(manifesto.modules.map((m) => [`./js/${m}`, `./js/${m}?v=${versao}-${manifesto.revision}`])),
    },
  };
}

function glbs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
}

/* Amostra de assets que o jogo pede em runtime, com o grupo e a prova esperada:
   `glTF` nos GLB, JSON nos índices, JS nos módulos. `limite` corta os grupos
   grandes (props, personagens) para a sonda remota caber em segundos. */
export function amostraDeAssets(raiz = RAIZ_PADRAO, { limite = 24 } = {}) {
  const pub = join(raiz, 'public');
  const itens = [];
  const add = (grupo, caminho, prova) => {
    const abs = join(pub, caminho);
    itens.push({ grupo, caminho, prova, existe: existsSync(abs), tamanho: existsSync(abs) ? statSync(abs).size : 0 });
  };
  for (const id of weaponIds(raiz)) add('armas', `models/weapons/${id}.glb`, 'glb');
  for (const f of glbs(join(pub, 'models/characters')).slice(0, limite)) add('personagens', `models/characters/${f}`, 'glb');
  add('anims', 'models/anims/index.json', 'json');
  add('anims', 'models/anims/foot-offsets.json', 'json');
  for (const f of glbs(join(pub, 'models/props')).slice(0, limite)) add('props', `models/props/${f}`, 'glb');
  add('vendor', 'vendor/three.module.js', 'js');
  add('css', 'style.css', 'texto');
  const prev = join(pub, 'img/map-previews');
  if (existsSync(prev)) for (const f of readdirSync(prev).sort().slice(0, limite)) add('previas', `img/map-previews/${f}`, 'imagem');
  return itens;
}

export function provaDoConteudo(prova, bytes) {
  const cabeca = new TextDecoder().decode(bytes.subarray(0, 32));
  if (prova === 'glb') return cabeca.startsWith('glTF');
  if (prova === 'json') return /^\s*[[{]/.test(cabeca);
  if (prova === 'js') return !/^\s*</.test(cabeca) && cabeca.length > 0;
  if (prova === 'imagem') return bytes.length > 0 && !/^\s*</.test(cabeca);
  if (prova === 'texto') return bytes.length > 0 && !/^\s*<!doctype/i.test(cabeca);
  return true;
}

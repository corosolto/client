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

/* Mesmo parser para o weapons.js da árvore e para o SERVIDO pela produção (sonda de assets):
   dois leitores do mesmo registro divergindo é o instrumento discordando de si (LICOES §2). */
export function weaponIdsDe(src) {
  const m = /export\s+const\s+WEAPON_IDS\s*=\s*\[([\s\S]*?)\];/.exec(src || '');
  if (!m) return null;
  const ids = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return ids.length ? ids : null;
}

export function weaponIds(raiz = RAIZ_PADRAO) {
  const ids = weaponIdsDe(readFileSync(join(raiz, 'public/js/weapons.js'), 'utf8'));
  if (!ids) throw new Error('public/js/weapons.js sem WEAPON_IDS');
  return ids;
}

/* Elenco: `GLB_CHARS = new Set([...])` em glbchars.js é o registro do que o runtime carrega
   de models/characters — a listagem do diretório inclui GLB que ninguém pede. */
export function charIdsDe(src) {
  const m = /export\s+const\s+GLB_CHARS\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(src || '');
  if (!m) return null;
  const ids = [...m[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
  return ids.length ? ids : null;
}

/* Os registros que a sonda remota lê do ALVO, com a URL do import map e o parser de cada um. */
export const REGISTROS = {
  armas: { modulo: './js/weapons.js', parse: weaponIdsDe, caminho: (id) => `models/weapons/${id}.glb`, grupo: 'armas' },
  personagens: { modulo: './js/glbchars.js', parse: charIdsDe, caminho: (id) => `models/characters/${id}.glb`, grupo: 'personagens' },
};

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

/* `limite` itens espalhados pela lista inteira, não o prefixo alfabético: com `.slice(0, 24)` os
   últimos 21 personagens e 92 props nunca eram sondados. */
export function espalha(lista, limite) {
  if (!Number.isFinite(limite) || lista.length <= limite) return lista;
  const passo = lista.length / limite;
  return Array.from({ length: limite }, (_, i) => lista[Math.floor(i * passo)]);
}

/* Amostra de assets que o jogo pede em runtime, com o grupo e a prova esperada:
   `glTF` nos GLB, JSON nos índices, JS nos módulos. Armas: TODAS, do registro que a
   sonda passar em `armas` (o weapons.js servido pela produção) ou, sem ele, da árvore —
   cada item diz de onde veio (`origem`). Personagens: todos. Props e prévias: `limite`
   espalhados. */
export function amostraDeAssets(raiz = RAIZ_PADRAO, { limite = 24, armas = null, personagens = null } = {}) {
  const pub = join(raiz, 'public');
  const itens = [];
  const add = (grupo, caminho, prova, origem = 'arvore') => {
    const abs = join(pub, caminho);
    itens.push({ grupo, caminho, prova, origem, existe: existsSync(abs), tamanho: existsSync(abs) ? statSync(abs).size : 0 });
  };
  for (const id of armas || weaponIds(raiz)) add('armas', `models/weapons/${id}.glb`, 'glb', armas ? 'registro-servido' : 'arvore');
  if (personagens) for (const id of personagens) add('personagens', `models/characters/${id}.glb`, 'glb', 'registro-servido');
  else for (const f of glbs(join(pub, 'models/characters'))) add('personagens', `models/characters/${f}`, 'glb');
  add('anims', 'models/anims/index.json', 'json');
  add('anims', 'models/anims/foot-offsets.json', 'json');
  for (const f of espalha(glbs(join(pub, 'models/props')), limite)) add('props', `models/props/${f}`, 'glb');
  add('vendor', 'vendor/three.module.js', 'js');
  add('css', 'style.css', 'texto');
  const prev = join(pub, 'img/map-previews');
  if (existsSync(prev)) for (const f of espalha(readdirSync(prev).sort(), limite)) add('previas', `img/map-previews/${f}`, 'imagem');
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

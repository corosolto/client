/* ============================================================================
   graffiti-fingerprint.mjs — A IMPRESSÃO DIGITAL DAS ENTRADAS DO GRAFITE.
   ----------------------------------------------------------------------------
   Módulo COMPARTILHADO (node puro, zero browser) entre quem ASSA o layout
   (`tools/gen-graffiti-layout.mjs`) e quem COBRA que ele não envelheceu
   (`tools/eval/graffiti-layout-check.mjs`).

   POR QUE COMPARTILHADO: a colocação do grafite é função de (geometria do mapa,
   passada, semente). O layout assado (`public/js/graffiti_layout.js`) congela a
   SAÍDA dessa função; esta impressão digital congela a ENTRADA. Se as duas forem
   calculadas por código diferente, elas discordam entre si — e um instrumento que
   discorda de si mesmo mede o mapa de ontem (é o BUG-02 da casa). Uma origem só.

   O que entra na impressão:
     · por mapa: o fonte do `map_*.js` NORMALIZADO (comentário e espaço fora), que
       carrega TANTO a geometria declarada QUANTO o bloco `grafitar({…})` — semente,
       passo, bandas, pools, zona limpa. Mexeu em parede OU em banda e não regerou:
       o hash do fonte muda e não bate mais com o gravado.
     · global: o fonte de `graffiti_pass.js` normalizado — o algoritmo da passada.
       Mudou a lógica de banda/âncora e não regerou: o hash global denuncia.

   A normalização tira comentário e colapsa espaço DE PROPÓSITO: editar a prosa de
   um cabeçalho de mapa não pode obrigar uma regeração no navegador (~40 s + serve).
   É a mesma escolha do #82: o hash perde precisão fina e custa milissegundos.

   Determinismo: é hash de texto puro. Rodar duas vezes dá idêntico — provado pela
   própria régua (`--duplo`).
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/* id do mapa (o mesmo do `grafitar({ id })` e da chave do GRAFITE) -> fonte. */
export const MAP_SOURCES = {
  praca_poderes: 'public/js/map_brasilia.js',
  piscina_treta: 'public/js/map_piscina.js',
  loja_h: 'public/js/map_havan.js',
  ferro_velho: 'public/js/map_ferrovelho.js',
  quebrada: 'public/js/map_quebrada.js',
  fy_escadao: 'public/js/map_escadao.js',
  fy_campomorro: 'public/js/map_campomorro.js',
  fy_lajes: 'public/js/map_lajes_authored.js',
  fy_corrego: 'public/js/map_corrego.js',
  fy_mansao: 'public/js/map_mansao.js',
};
export const PASS_FILE = 'public/js/graffiti_pass.js';
export const TEX_FILE = 'public/js/textures.js';

export function sha(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex').slice(0, 16);
}

/* NORMALIZA: varre caractere a caractere respeitando string ('…', "…", `…`) para não
   apagar um `//` que vive dentro de texto, e derruba comentário de linha e de bloco.
   Depois colapsa todo espaço em um só. Determinístico e insensível a prosa. */
export function normalizar(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      out += c; i++;
      while (i < n) {
        out += src[i];
        if (src[i] === '\\') { out += src[i + 1] || ''; i += 2; continue; }
        if (src[i] === c) { i++; break; }
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/* UNIVERSO de nomes válidos, lido estaticamente do textures.js: os arrays literais
   DECAL_FILES/POSTER_FILES (`['nome.png', …]`) e a lista MURAIS_HOM. É contra este
   universo que o layout assado é cobrado — nome de PNG que saiu do pool e continua
   no layout é "peça no lugar errado" (o defeito do #82) já ao nível do arquivo. */
export function universoDecals(texSrc = readFileSync(TEX_FILE, 'utf8')) {
  const nomesDe = (marcador) => {
    const i = texSrc.indexOf(marcador);
    if (i < 0) return [];
    // pega tudo até o fechamento do array-literal de nível 1
    let depth = 0, j = texSrc.indexOf('[', i), fim = j;
    for (; j < texSrc.length; j++) {
      if (texSrc[j] === '[') depth++;
      else if (texSrc[j] === ']') { depth--; if (depth === 0) { fim = j; break; } }
    }
    const bloco = texSrc.slice(i, fim + 1);
    // primeiro item de cada sub-array é o nome do arquivo
    return [...bloco.matchAll(/\[\s*'([^']+)'/g)].map((m) => m[1]);
  };
  const decals = new Set(nomesDe('const DECAL_FILES ='));
  // DECAL_FILES.push(['x', …], …) acrescenta mais nomes fora do literal inicial
  const pi = texSrc.indexOf('DECAL_FILES.push(');
  if (pi >= 0) {
    let depth = 0, j = texSrc.indexOf('(', pi), fim = j;
    for (; j < texSrc.length; j++) {
      if (texSrc[j] === '(') depth++;
      else if (texSrc[j] === ')') { depth--; if (depth === 0) { fim = j; break; } }
    }
    for (const m of texSrc.slice(pi, fim + 1).matchAll(/\[\s*'([^']+)'/g)) decals.add(m[1]);
  }
  const posters = new Set(nomesDe('const POSTER_FILES ='));
  const mh = texSrc.match(/const MURAIS_HOM = \[([^\]]*)\]/);
  const murais = new Set(
    mh ? [...mh[1].matchAll(/'([^']+)'/g)].map((m) => 'homenagem-' + m[1]) : [],
  );
  /* Mural AUTORAL declarado no próprio mapa (grafitar({ murais: { nomes: [...] } })):
     o pixo-lajes-01 entrou por aqui em 17/08 — MURAIS_HOM segue vazia por contrato
     editorial (pessoa real), mas mural original de mapa é parte do pool vivo. */
  for (const arq of Object.values(MAP_SOURCES)) {
    let src; try { src = readFileSync(arq, 'utf8'); } catch { continue; }
    for (const b of src.matchAll(/murais:\s*\{[\s\S]{0,400}?nomes:\s*\[([^\]]*)\]/g)) {
      for (const m of b[1].matchAll(/'([^']+)'/g)) murais.add(m[1]);
    }
  }
  return { decals, posters, murais };
}

/* Texto canônico do universo — o que entra no hash global quando quisermos amarrar o
   pool. (Ordenado para ser estável independentemente da ordem de leitura.) */
export function universoTexto(u = universoDecals()) {
  const s = (set) => [...set].sort().join(',');
  return `decals:${s(u.decals)}|posters:${s(u.posters)}|murais:${s(u.murais)}`;
}

/* A impressão digital completa: hash por mapa (fonte normalizado) + hash da passada. */
export function impressao() {
  const maps = {};
  for (const [id, arq] of Object.entries(MAP_SOURCES)) {
    maps[id] = sha(normalizar(readFileSync(arq, 'utf8')));
  }
  const pass = sha(normalizar(readFileSync(PASS_FILE, 'utf8')));
  return { pass, maps };
}

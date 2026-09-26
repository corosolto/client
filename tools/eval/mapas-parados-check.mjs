/* ============================================================================
   mapas-parados-check.mjs — MAPA PARADO SAI DO JOGO, NÃO DO REGISTRO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Pedido do dono (25/09): sete mapas saem do jogo para serem refeitos e depois
   voltam. A tentação óbvia — apagar as entradas do registro `MAPS` — apagaria
   junto a medição: são ~50 réguas que descobrem mapa por `Object.keys(MAPS)`
   (harness.mjs). Ficaríamos sem instrumento justo nos mapas em conserto.

   O CONTRATO, em uma frase: o mapa parado continua no REGISTRO (medido) e sai da
   LISTA JOGÁVEL (menu, rotação, catálogo, grade do multiplayer), e só volta a
   abrir com `?oficina=1`.

   O QUE ESTA RÉGUA PROVA
     MP1 todo id parado ainda existe em MAPS               (volta sem arqueologia)
     MP2 nenhum parado está em MAP_IDS_JOGAVEIS            (saiu do caminho do jogador)
     MP3 o menu do main.js não itera MAP_IDS direto        (usa MAPAS_MENU)
     MP4 `?oficina=1` devolve todos os parados             (dá para refazer)
     MP5 a oficina é sessão de teste                       (não suja ranking/telemetria)
     MP6 nenhum parado sobrou no catálogo do site          (jogo.ts / mapas.astro / maps.astro)
     MP7 o build do mapa parado ainda carrega              (o arquivo não foi apagado junto)

   O que ela NÃO faz: opinar sobre quais mapas estão parados. A lista é do dono e
   mora em `MAPAS_PARADOS`, em public/js/maps.js — esta régua lê de lá.

   Uso: node tools/eval/mapas-parados-check.mjs
        [--mutante=some-do-registro|vaza-no-menu|menu-cru|oficina-cega|sem-testmode]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const ler = (rel) => (existsSync(path.join(ROOT, rel)) ? readFileSync(path.join(ROOT, rel), 'utf8') : null);

const MUTANTES = ['some-do-registro', 'vaza-no-menu', 'menu-cru', 'oficina-cega', 'sem-testmode', 'inspecao-crua', 'mp-obedece'];
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

let MAPSRC = ler('public/js/maps.js');
let MAINSRC = ler('public/js/main.js');
const falhas = [];
if (!MAPSRC) falhas.push('MP0 public/js/maps.js não encontrado');
if (!MAINSRC) falhas.push('MP0 public/js/main.js não encontrado');

/* A lista vem do fonte, nunca repetida aqui: régua que guarda sua própria cópia dos ids
   envelhece calada no dia em que um mapa volta. */
const paradosSrc = MAPSRC && /export const MAPAS_PARADOS = new Set\(\[[\s\S]*?\]\);/.exec(MAPSRC)?.[0];
if (MAPSRC && !paradosSrc) falhas.push('MP0 MAPAS_PARADOS não encontrado em maps.js');
let PARADOS = paradosSrc ? [...paradosSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

if (mutante === 'some-do-registro') PARADOS = [...PARADOS, 'mapa_que_nao_existe'];
if (mutante === 'vaza-no-menu' && MAPSRC) {
  const antes = MAPSRC;
  MAPSRC = MAPSRC.replace('MAP_IDS.filter((id) => !MAPAS_PARADOS.has(id))', 'MAP_IDS.slice()');
  if (MAPSRC === antes) throw new Error('MUTANTE NAO APLICOU: vaza-no-menu');
}
if (mutante === 'menu-cru' && MAINSRC) {
  const antes = MAINSRC;
  MAINSRC = MAINSRC.replace('const MAPAS_MENU = mapasDoMenu(oficina);', 'const MAPAS_MENU = MAP_IDS;');
  if (MAINSRC === antes) throw new Error('MUTANTE NAO APLICOU: menu-cru');
}
if (mutante === 'oficina-cega' && MAPSRC) {
  const antes = MAPSRC;
  MAPSRC = MAPSRC.replace('return oficina ? MAP_IDS : MAP_IDS_JOGAVEIS;', 'return MAP_IDS_JOGAVEIS;');
  if (MAPSRC === antes) throw new Error('MUTANTE NAO APLICOU: oficina-cega');
}
if (mutante === 'inspecao-crua' && MAINSRC) {
  const antes = MAINSRC;
  MAINSRC = MAINSRC.replace('if (target.map) currentMap = mapaDaSessao({ urlMap: target.map, oficina });',
    'if (target.map) currentMap = resolveMapId(target.map);');
  if (MAINSRC === antes) throw new Error('MUTANTE NAO APLICOU: inspecao-crua');
}
if (mutante === 'mp-obedece' && MAINSRC) {
  const antes = MAINSRC;
  MAINSRC = MAINSRC.replace(/if \(noServeMapaParado\(welcome\.map, net\)\) return;\n/, '');
  if (MAINSRC === antes) throw new Error('MUTANTE NAO APLICOU: mp-obedece');
}
if (mutante === 'sem-testmode' && MAINSRC) {
  const antes = MAINSRC;
  MAINSRC = MAINSRC.replace(/const testMode = [^\n]*\|\| oficina;/, 'const testMode = params.get(\'debug\') === \'1\' || !!inspectionScreen;');
  if (MAINSRC === antes) throw new Error('MUTANTE NAO APLICOU: sem-testmode');
}

if (!PARADOS.length && !falhas.length) {
  // Zero parados é um estado legítimo (todos voltaram). Só não pode ser confundido com
  // "a régua não achou a lista", que já teria virado MP0 acima.
  console.log('\x1b[32mMAPAS-PARADOS verde: nenhum mapa parado — o jogo inteiro está no ar\x1b[0m');
  process.exit(0);
}

// MP1 — o parado continua no registro: é assim que as ~50 réguas seguem medindo
for (const id of PARADOS) {
  if (!MAPS[id]) falhas.push(`MP1 '${id}' está parado mas sumiu do registro MAPS — a medição do mapa morreu junto`);
}

// MP2 — e não está na lista jogável
const jogaveisSrc = MAPSRC && /export const MAP_IDS_JOGAVEIS = ([^\n;]+);/.exec(MAPSRC)?.[1];
if (MAPSRC && !jogaveisSrc) falhas.push('MP2 MAP_IDS_JOGAVEIS não encontrado em maps.js');
if (jogaveisSrc) {
  const jogaveis = Object.keys(MAPS).filter((id) => !PARADOS.includes(id));
  const vazou = jogaveis.filter((id) => PARADOS.includes(id));
  if (vazou.length) falhas.push(`MP2 parado na lista jogável: ${vazou.join(', ')}`);
  if (!/MAPAS_PARADOS\.has\(id\)/.test(jogaveisSrc)) {
    falhas.push(`MP2 MAP_IDS_JOGAVEIS não filtra por MAPAS_PARADOS: ${jogaveisSrc.trim()}`);
  }
  if (!jogaveis.length) falhas.push('MP2 não sobrou mapa jogável — o jogo ficaria sem mapa nenhum');
}

// MP3 — o menu não pode iterar o registro cru; se iterar, o parado reaparece no carrossel
if (MAINSRC) {
  const cruas = (MAINSRC.match(/\bMAP_IDS\b/g) || []).length;
  if (!/const MAPAS_MENU = mapasDoMenu\(oficina\);/.test(MAINSRC)) {
    falhas.push('MP3 main.js não deriva MAPAS_MENU de mapasDoMenu(oficina)');
  } else if (cruas) {
    falhas.push(`MP3 main.js ainda usa MAP_IDS cru em ${cruas} lugar(es) — o menu volta a mostrar mapa parado`);
  }
}

// MP4 — a oficina devolve TODOS os parados, senão não há como refazê-los
if (MAPSRC) {
  const menuSrc = /export function mapasDoMenu\([^)]*\) \{[\s\S]*?\n\}/.exec(MAPSRC)?.[0] || '';
  if (!/oficina \? MAP_IDS :/.test(menuSrc)) {
    falhas.push('MP4 mapasDoMenu não devolve o registro inteiro na oficina — mapa parado ficaria intestável');
  }
}

// MP5 — oficina é sessão de teste: retrabalho não pode virar partida no ranking
if (MAINSRC && !/const testMode = [^\n]*\|\| oficina;/.test(MAINSRC)) {
  falhas.push('MP5 ?oficina=1 não entra no testMode — o retrabalho sujaria telemetria, ranking e contagem de partidas');
}

/* MP8 — a tela de inspeção (`?tela=…&map=`) é a SEGUNDA porta do mapa. Ela escrevia
   currentMap direto com resolveMapId e deixava o parado abrir; o smoke de 25/09 pegou.
   A régua fixa a guarda para que a porta não reabra sozinha. */
if (MAINSRC) {
  if (/if \(target\.map\) currentMap = resolveMapId\(target\.map\);/.test(MAINSRC)) {
    falhas.push('MP8 tela de inspeção resolve o mapa sem a guarda de parado — ?tela=maps&map=<parado> abriria fora da oficina');
  } else if (!/if \(target\.map\) currentMap = mapaDaSessao\(\{ urlMap: target\.map, oficina \}\);/.test(MAINSRC)) {
    falhas.push('MP8 tela de inspeção não passa o mapa por mapaDaSessao com a oficina');
  }
}

/* MP9 — o MULTIPLAYER é a terceira porta, e a única em que o mapa vem de FORA: o nó
   sorteia e o cliente obedecia com `if (MAPS[welcome.map])`. Nó com CLIENT_REF antigo
   ainda serve mapa parado, então o cliente precisa recusar — trocar por conta própria
   dessincronizaria do servidor. */
if (MAINSRC) {
  if (!/function noServeMapaParado\(/.test(MAINSRC)) {
    falhas.push('MP9 main.js não tem a recusa de mapa parado vindo do nó');
  } else {
    const portas = (MAINSRC.match(/if \(noServeMapaParado\(/g) || []).length;
    if (portas < 2) falhas.push(`MP9 a recusa cobre ${portas} de 2 pontos (welcome da sala e onPartida da rotação)`);
    if (!/mpMapasDoNo = \(await listMaps\([^)]*\)\)\.filter\(\(id\) => MAPS\[id\] && MAPAS_MENU\.includes\(id\)\);/.test(MAINSRC)) {
      falhas.push('MP9 a grade de mapas do multiplayer não filtra pela lista jogável');
    }
  }
}

// MP6 — catálogo do site não pode anunciar mapa que não dá para jogar
const CATALOGOS = ['src/data/jogo.ts', 'src/pages/mapas.astro', 'src/pages/maps.astro'];
for (const rel of CATALOGOS) {
  const txt = ler(rel);
  if (!txt) continue;
  for (const id of PARADOS) {
    if (new RegExp(`id: ?'${id}'|id: ?"${id}"`).test(txt)) {
      falhas.push(`MP6 ${rel} ainda anuncia o mapa parado '${id}'`);
    }
  }
}

// MP7 — o mapa parado ainda CONSTRÓI: o arquivo não pode ter sido apagado junto
for (const id of PARADOS) {
  if (MAPS[id] && typeof MAPS[id].build !== 'function') {
    falhas.push(`MP7 '${id}' está no registro mas sem build — o mapa não volta`);
  }
}

if (falhas.length) {
  console.error('\x1b[31mMAPAS-PARADOS vermelho\x1b[0m');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
const jogaveis = Object.keys(MAPS).length - PARADOS.length;
console.log(`\x1b[32mMAPAS-PARADOS verde: ${PARADOS.length} parados seguem medidos e fora do jogo (${PARADOS.join(', ')}); ${jogaveis} jogáveis no ar; oficina abre os parados\x1b[0m`);

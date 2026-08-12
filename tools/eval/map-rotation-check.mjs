/* ============================================================================
   map-rotation-check.mjs — QUEM NUNCA ESCOLHE MAPA NÃO PODE FICAR PRESO NO MESMO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Pedido do dono: "reduzir frequência de awp_map e aumentar exposição dos outros
   mapas". O menu abria sempre no `DEFAULT_MAP` (ou no último mapa salvo, que para
   quem nunca toca no carrossel É o default), então a Praça concentrava quase
   todas as partidas e os outros quatro mapas quase não apareciam.

   A REGRA (uma frase): link `?map=` manda sempre; quem escolheu no carrossel
   (`mapPinned`) fica no mapa escolhido; quem nunca escolheu recebe o PRÓXIMO da
   fila a cada visita, em round-robin pelos 5 mapas.

   COMO ELA MEDE: extrai do maps.js de produção, por casamento de chaves, o texto
   de `resolveMapId`, `nextMapId` e `mapaDaSessao`, e executa contra o MAP_IDS
   real (via harness). Ausência de trecho = vermelho, nunca verde por falta de
   dado. A fiação do menu (main.js chama mapaDaSessao; gotoMap grava o pin) é
   conferida no fonte.

   Mutantes: sem-rotacao (volta a abrir sempre no mapa salvo) acende ROT3;
   ignora-escolha (pisa a escolha do jogador) acende ROT2; salva-link (grava o mapa
   do link por cima do pin) acende ROT6.

   Uso: node tools/eval/map-rotation-check.mjs
        [--mutante=sem-rotacao|ignora-escolha|salva-link]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPS } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MAPSRC = readFileSync(path.join(ROOT, 'public', 'js', 'maps.js'), 'utf8');
const MAINSRC = readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && !['sem-rotacao', 'ignora-escolha', 'salva-link'].includes(mutant)) {
  throw new Error(`mutante desconhecido: ${mutant}`);
}

function bloco(fonte, ancora) {
  const i = fonte.indexOf(ancora);
  if (i < 0) throw new Error(`âncora não encontrada no maps.js: ${ancora}`);
  // a assinatura pode ter destructuring com chaves: pula os parênteses antes de contar chaves
  const p = fonte.indexOf('(', i);
  let depth = 0, end = p;
  for (; end < fonte.length; end++) {
    if (fonte[end] === '(') depth++;
    if (fonte[end] === ')') { depth--; if (!depth) { end++; break; } }
  }
  let j = fonte.indexOf('{', end), n = 0;
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === '{') n++;
    if (fonte[k] === '}') { n--; if (!n) return fonte.slice(i, k + 1); }
  }
  throw new Error(`bloco não fecha: ${ancora}`);
}

let resolveSrc, nextSrc, sessaoSrc;
const failures = [];
try {
  resolveSrc = bloco(MAPSRC, 'export function resolveMapId');
  nextSrc = bloco(MAPSRC, 'export function nextMapId');
  sessaoSrc = bloco(MAPSRC, 'export function mapaDaSessao');
} catch (error) {
  failures.push(`ROT0 ${error.message}`);
}

if (mutant === 'sem-rotacao' && sessaoSrc) {
  const antes = sessaoSrc;
  sessaoSrc = sessaoSrc.replace('return nextMapId(savedMap);', 'return resolveMapId(savedMap);');
  if (sessaoSrc === antes) throw new Error('MUTANTE NAO APLICOU: sem-rotacao');
}
if (mutant === 'ignora-escolha' && sessaoSrc) {
  const antes = sessaoSrc;
  sessaoSrc = sessaoSrc.replace(/if \(pinned\) return resolveMapId\(savedMap\);\n?/, '');
  if (sessaoSrc === antes) throw new Error('MUTANTE NAO APLICOU: ignora-escolha');
}

const MAP_IDS = Object.keys(MAPS);
const DEFAULT_MAP = MAPSRC.match(/export const DEFAULT_MAP = '([^']+)'/)?.[1];
// resolveMapId lê a tabela de nomes antigos (#200): sem ela no escopo, ROT4 acusaria o
// próprio arnês em vez do jogo. Ausência é vermelha, não objeto vazio.
const aliasSrc = /export const ALIAS_MAPA = \{[^}]*\};/.exec(MAPSRC)?.[0];
if (!aliasSrc) failures.push('ROT0 ALIAS_MAPA não encontrado no maps.js');
let fns = null;
if (!failures.length) {
  try {
    fns = Function(
      'MAPS', 'MAP_IDS', 'DEFAULT_MAP',
      `${aliasSrc}\n${resolveSrc}\n${nextSrc}\n${sessaoSrc}\nreturn { resolveMapId, nextMapId, mapaDaSessao };`.replaceAll('export const', 'const').replaceAll('export function', 'function'),
    )(Object.fromEntries(MAP_IDS.map((id) => [id, true])), MAP_IDS, DEFAULT_MAP);
  } catch (error) {
    failures.push(`ROT0 funções não avaliam: ${error.message}`);
  }
}

if (fns) {
  const { mapaDaSessao } = fns;
  const outro = MAP_IDS.find((id) => id !== DEFAULT_MAP);

  // ROT1 — link compartilhado manda, com ou sem pin
  const rot1 = mapaDaSessao({ urlMap: outro, savedMap: DEFAULT_MAP, pinned: false }) === outro
    && mapaDaSessao({ urlMap: outro, savedMap: DEFAULT_MAP, pinned: true }) === outro;
  if (!rot1) failures.push('ROT1 ?map= do link não vence a rotação nem o pin');

  // ROT2 — quem escolheu no carrossel fica no mapa escolhido
  const rot2 = mapaDaSessao({ urlMap: null, savedMap: outro, pinned: true }) === outro;
  if (!rot2) failures.push('ROT2 escolha explícita (pin) não é respeitada');

  // ROT3 — quem nunca escolheu percorre TODOS os mapas, um por visita, e fecha o ciclo
  const vistos = [];
  let mapa = DEFAULT_MAP;
  for (let visita = 0; visita < MAP_IDS.length * 2; visita++) {
    mapa = mapaDaSessao({ urlMap: null, savedMap: mapa, pinned: false });
    vistos.push(mapa);
  }
  const primeiraVolta = vistos.slice(0, MAP_IDS.length);
  const rot3 = new Set(primeiraVolta).size === MAP_IDS.length
    && primeiraVolta.every((id) => MAP_IDS.includes(id))
    && vistos[MAP_IDS.length] === vistos[0];
  if (!rot3) failures.push(`ROT3 rotação não percorre os ${MAP_IDS.length} mapas em ciclo: ${vistos.join(' → ')}`);

  // ROT4 — id desconhecido/corrompido não lança e cai em mapa válido
  try {
    const caido = mapaDaSessao({ urlMap: null, savedMap: 'mapa_que_nao_existe', pinned: false });
    if (!MAPS[caido]) failures.push(`ROT4 id desconhecido caiu fora do registro: ${caido}`);
  } catch (error) {
    failures.push(`ROT4 id desconhecido lançou: ${error.message}`);
  }
}

// ROT5 — fiação do menu: main.js decide pela mapaDaSessao e o carrossel grava o pin
const rot5 = /mapaDaSessao\(\{ urlMap, savedMap: settings\.map, pinned: settings\.mapPinned \}\)/.test(MAINSRC)
  && /settings\.mapPinned = true;/.test(MAINSRC);
if (!rot5) failures.push('ROT5 main.js não usa mapaDaSessao ou o carrossel não grava mapPinned');

// ROT6 — o save existe só para a rotação avançar. Sem a guarda `!urlMap` ele grava o mapa
// do link por cima do pin, e a visita seguinte abre nele como se fosse escolha do jogador.
const fonteMenu = mutant === 'salva-link'
  ? MAINSRC.replace(/if \(!urlMap\) \{ settings\.map = currentMap; saveSettings\(\); \}/,
                    'settings.map = currentMap; saveSettings();')
  : MAINSRC;
const rot6 = /if \(!urlMap\) \{ settings\.map = currentMap; saveSettings\(\); \}/.test(fonteMenu);
if (!rot6) failures.push('ROT6 main.js grava o mapa do ?map= por cima da escolha fixada do jogador');

for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (failures.length) {
  console.error(`\x1b[31mMAP-ROTATION ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mMAP-ROTATION verde: link manda, escolha fica, e quem não escolhe roda pelos 5 mapas\x1b[0m');
}

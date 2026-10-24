#!/usr/bin/env node
/* manga-tampa-check.mjs — A MANGA DO PACOTE GOLDEN NÃO PODE TERMINAR EM BURACO.
   POR QUE EXISTE: medido em 22/10/2026, no jogo real, enquanto se calibrava a inspeção.
   A malha `coro_solto_hires_project_sleeves` da AK golden tem DUAS bocas abertas (laços de
   borda de 32 e 24 vértices): girar o pacote mostra o interior do tubo — o "leque vermelho"
   no punho direito. A extensão do produto K (`extendSleeveOpenings`) não serve aqui: no
   golden ela projeta a manga pelo lado errado e vira um mastro atravessando a tela.
   `capSleeveOpenings` só FECHA a boca, no espaço de bind: um vértice no centro do laço e
   um leque até ele. Custo medido na AK: 9.930 -> 9.986 triângulos (+56).
   Evidência: tools/eval/asset-evidence/manga-tampa-20261022/

   O QUE MEDE (geometria de verdade, sem browser):
   MT1  um tubo aberto tem as bocas detectadas e, depois da tampa, ZERO laços de borda.
   MT2  a tampa acrescenta exatamente um triângulo por aresta de boca e um vértice por boca.
   MT3  os vértices novos carregam pele (skinIndex/skinWeight) — tampa sem peso ficaria
        parada no espaço enquanto o braço anda.
   MT4  rodar a tampa duas vezes não duplica geometria (idempotente).
   MT5  o runtime chama a tampa só no caminho golden e com kill-switch `?mangatampa=0`.

   REPRODUZ: node tools/eval/manga-tampa-check.mjs [--mutante=sem-tampa]
   MUTANTE:  --mutante=sem-tampa não tampa -> MT1/MT2 vermelhas. */
import { readFileSync } from 'node:fs';
import './harness.mjs';   // DOM stub + ponte do three vendorizado

const THREE = await import('three');
const { sleeveOpenings, capSleeveOpenings } = await import('../../public/js/vmsleeve.js');

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'sem-tampa') { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

// Tubo aberto nas duas pontas, com pele: é a forma da manga.
function tuboAberto(segmentos = 16) {
  const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, segmentos, 1, true).toNonIndexed();
  const n = geo.attributes.position.count;
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  const pesos = new Float32Array(n * 4);
  for (let i = 0; i < n; i += 1) pesos[i * 4] = 1;
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(pesos, 4));
  return new THREE.Mesh(geo);
}

const malha = tuboAberto();
const antes = sleeveOpenings(malha.geometry);
const trisAntes = malha.geometry.attributes.position.count / 3;
const vertsAntes = malha.geometry.attributes.position.count;
const arestas = antes.loops.reduce((s, l) => s + l.length, 0);
const tampadas = MUTANTE === 'sem-tampa' ? 0 : capSleeveOpenings(malha);
const depois = sleeveOpenings(malha.geometry);
const trisDepois = (malha.geometry.index ? malha.geometry.index.count : malha.geometry.attributes.position.count) / 3;

chk('MT1', antes.loops.length === 2 && depois.loops.length === 0,
  `bocas ${antes.loops.map((l) => l.length).join('+') || '—'} -> ${depois.loops.length} abertas (tampadas: ${tampadas})`);
chk('MT2', trisDepois === trisAntes + arestas
  && malha.geometry.attributes.position.count === vertsAntes + antes.loops.length,
  `triângulos ${trisAntes} -> ${trisDepois} (esperado +${arestas}); vértices +${malha.geometry.attributes.position.count - vertsAntes}`);
const sw = malha.geometry.attributes.skinWeight;
const ultimo = sw.count - 1;
chk('MT3', MUTANTE === 'sem-tampa' || (sw.getX(ultimo) + sw.getY(ultimo) + sw.getZ(ultimo) + sw.getW(ultimo)) > 0.99,
  `peso do vértice da tampa = ${(sw.getX(ultimo) + sw.getY(ultimo) + sw.getZ(ultimo) + sw.getW(ultimo)).toFixed(2)}`);
const trisAntesDeRepetir = trisDepois;
capSleeveOpenings(malha);
const trisRepetido = (malha.geometry.index ? malha.geometry.index.count : malha.geometry.attributes.position.count) / 3;
chk('MT4', trisRepetido === trisAntesDeRepetir, `segunda chamada manteve ${trisRepetido} triângulos`);

const runtime = readFileSync(new URL('../../public/js/authoredvm.js', import.meta.url), 'utf8');
chk('MT5', /golden && _QS\?\.get\('mangatampa'\) !== '0'[^\n]*capSleeveOpenings/.test(runtime),
  'authoredvm tampa só o golden e respeita ?mangatampa=0');

process.exit(falhas ? 1 : 0);

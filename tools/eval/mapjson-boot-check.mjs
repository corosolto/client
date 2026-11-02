/* ============================================================================
   mapjson-boot-check.mjs — A PROVA IN-ENGINE do formato "mapa como dado".
   ----------------------------------------------------------------------------
   O mapjson-check mede o PLANO (puro, sem jogo). Esta régua fecha o laço: injeta a
   arena JSON num `Game` DE VERDADE (o mesmo do browser, subido pelo harness), roda a
   partida e confere o que só aparece dentro do motor:

     B1 o Game CONSTRÓI a arena JSON sem lançar e com o contrato de world completo;
     B2 groundHeightAt do mundo real devolve o RELEVO declarado (piso 0, rampa, topo
        de plataforma) — a física anda sobre a mesma superfície que a régua validou;
     B3 os bots NAVEGAM (deslocam-se) em 20 s de simulação, sem travar na origem;
     B4 ctfPoints e spawns do spec chegam ao jogo (alvo da rodada = nº de bandeiras).

   Sem browser, sem rede: é o bootGame do harness, o mesmo instrumento do botsim.
   Mutante: `--mutante=relevo` zera o groundHeightAt esperado e a régua TEM que reprovar.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const { buildMapFromJSON, propIdsFromSpec } = await import('../../public/js/map_json.js');

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const SPEC = JSON.parse(readFileSync(new URL('./mapjson_fixture.json', import.meta.url), 'utf8'));

// injeta a arena JSON no registro em runtime — prova o caminho de `maps.js` sem subir um
// mapa de menu permanente (SEO/docs/jogo.ts ficam intocados; é uma régua, não conteúdo).
MAPS.arena_json = {
  name: 'Arena JSON (boot)', ctfMode: true,
  build: (scene, T) => buildMapFromJSON(scene, T, SPEC),
  props: propIdsFromSpec(SPEC),
};

const falhas = [];
const textures = initTextures();
let g;
try {
  g = bootGame('arena_json', { textures, ctf: true, bots: 4, seed: 12345 });
} catch (e) {
  console.log(`BOOT VERMELHA · B1 bootGame lançou: ${e.message}`);
  process.exit(1);
}

// B1 contrato de world
const W = g.world;
for (const k of ['groundHeightAt', 'slowAt', 'colliders', 'occluders', 'spawns', 'pickups', 'ctfPoints', 'waypoints'])
  if (W[k] === undefined) falhas.push(`B1 world sem ${k}`);
if (!W.waypoints?.nodes?.length) falhas.push('B1 grafo de waypoints vazio no jogo');

// B2 relevo — groundHeightAt nos pontos declarados (rampa +z em (-10,2), plataforma em (-10,7))
const gh = (x, z) => W.groundHeightAt(x, z, 1e3);
const esperado = MUT === 'relevo' ? 0 : null;   // mutante finge chão plano e deve reprovar B2
const aprox = (a, b, tol = 0.08) => Math.abs(a - b) <= tol;
const casos = [
  { x: 0, z: 14, y: 0, nome: 'piso' },
  { x: -10, z: 2, y: 0.6, nome: 'meio da rampa' },
  { x: -10, z: 4.4, y: 1.188, nome: 'topo da rampa' },
  { x: -10, z: 7, y: 1.2, nome: 'topo da plataforma' },
];
for (const c of casos) {
  const alvo = esperado == null ? c.y : esperado;
  if (!aprox(gh(c.x, c.z), alvo)) falhas.push(`B2 ${c.nome} (${c.x},${c.z}): groundHeightAt ${gh(c.x, c.z).toFixed(3)} ≠ ${alvo}`);
}

// B4 ctf e spawns
if ((W.ctfPoints?.length || 0) !== (SPEC.ctf?.length || 0)) falhas.push(`B4 ctfPoints ${W.ctfPoints?.length} ≠ spec ${SPEC.ctf?.length}`);
if (!W.spawns?.E?.length || !W.spawns?.B?.length) falhas.push('B4 spawns E/B ausentes');

// B3 navegação — tira o jogador e roda 20 s; soma o caminho dos bots
g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
const DT = 1 / 60, STEPS = Math.round(20 / DT);
const last = new Map(g.bots.map((b) => [b, { x: b.pos.x, z: b.pos.z }]));
let caminho = 0;
try {
  for (let i = 0; i < STEPS; i++) {
    g.update(DT);
    if (i % 9) continue;
    for (const b of g.bots) {
      if (!b.alive) { const p = last.get(b); p.x = b.pos.x; p.z = b.pos.z; continue; }
      const p = last.get(b);
      caminho += Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
      p.x = b.pos.x; p.z = b.pos.z;
    }
  }
} catch (e) {
  falhas.push(`B3 update lançou no passo de simulação: ${e.message}`);
}
if (caminho < 20) falhas.push(`B3 bots quase parados: caminho total ${caminho.toFixed(1)} m em 20 s (< 20 m)`);

console.log(`BOOT nós ${W.waypoints?.nodes?.length} · caminho ${caminho.toFixed(1)} m · ctf ${W.ctfPoints?.length} · relevo topo ${gh(-10, 7).toFixed(2)} m`);
for (const f of falhas) console.log(`  BOOT VERMELHA · ${f}`);

if (MUT === 'relevo') {
  if (falhas.some((f) => f.startsWith('B2'))) { console.log(`BOOT ok · mutante 'relevo' reprovado como esperado`); process.exit(0); }
  console.log(`BOOT VERMELHA · mutante 'relevo' passou — a régua de relevo NÃO morde`); process.exit(1);
}
if (falhas.length) { console.log('BOOT VERMELHA · arena JSON reprovada no motor'); process.exit(1); }
console.log('BOOT ok · arena JSON sobe no Game, tem relevo e os bots navegam');

/* ============================================================================
   piscina-bsp-check.mjs — O LAYOUT DA PISCINA É MEDIDO DO fy_pool_day, NÃO CHUTADO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE — a "Piscina da Treta" sempre foi "inspirada" no fy_pool_day:
   salão 34x50 com piscina 15x19 no eixo comprido. Medido o BSP real
   (tools/eval/bsp-measure.mjs -> piscina_bsp.json), o original é OUTRO mapa de
   proporções: pátio ~36x47 m com piscina 13,5x9 ATRAVESSADA no eixo curto, decks
   fundos (18-20 m) nas pontas e corredores laterais largos (10-12 m). A piscina
   "que domina a sala no eixo comprido" era invenção nossa.

   LEI 1 EM AÇÃO: esta régua NASCEU reprovando o builder que existia quando o BSP
   foi medido (commit regua(piscina) — PB3/PB4/PB5/PB6o vermelhas: piscina +134%
   de área, aspecto -47%, spawns +24%, corredor oeste -23%). O re-authoring que
   veio depois fecha as cláusulas SEM afrouxar teto — quem quiser conferir, o
   git log tem o antes e o depois.

   O QUE MEDE (tudo no MUNDO REAL: buildPoolDay de verdade via harness, régua que
   lê uso não declaração):
     PB1 salão X (vão interno, das bounds + a margem de 0,5)     ±20%
     PB2 salão Z (idem)                                          ±20%
     PB3 área da piscina — o FONDO PLANO via groundHeightAt (o
         platô de profundidade máxima é exatamente hx×hz)        ±20%
     PB4 aspecto da piscina X/Z (a orientação: atravessada
         no eixo curto, não ao longo)                            ±20%
     PB5 distância entre centróides dos spawns E × B             ±20%
     PB6 corredores laterais: parede interna -> borda do fundo
         plano, OESTE e LESTE separados (a assimetria do
         original: piscina descentrada 1,1 m pro leste)          ±20% cada
     PB7 estruturas verticais internas: colisores livres com
         h>=3 m e pegada 0,5-4,5 m2 (pilar nosso <-> func_wall
         vertical do BSP; a guarita tem pegada 6,7 m2 e fica
         fora da conta de propósito)                             ±20% (inteiro)

   O teto ±20% é o mesmo do pedido da régua (frente map2/piscina): margem para
   arredondamento de construção (5 cm) e para a escolha de spawns SIMÉTRICOS
   contra centróides assimétricos do original — sem nunca deixar passar uma
   parede deslocada ou a piscina virada.

   USO
     node tools/eval/piscina-bsp-check.mjs
     node tools/eval/piscina-bsp-check.mjs --mutar=desloca-parede   # PB1 tem que acender
     node tools/eval/piscina-bsp-check.mjs --mutar=bsp-furado       # PB3/PB4 tem que acender
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootGame, initTextures } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MUTAR = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || null;
if (MUTAR && !['desloca-parede', 'bsp-furado'].includes(MUTAR)) throw new Error(`mutação desconhecida: ${MUTAR}`);
const TETO = 0.20;

const bsp = JSON.parse(readFileSync(path.join(HERE, 'piscina_bsp.json'), 'utf8'));
if (MUTAR === 'bsp-furado') bsp.piscina.hx *= 0.3;   // medida do JSON corrompida: o check tem que LER o JSON

const T = await initTextures();
const g = bootGame('piscina_treta', { textures: T });
const W = g.world;

/* ── medidas do builder ────────────────────────────────────────────────────── */
const medido = {};
medido.salao = {
  x: (W.bounds.maxX - W.bounds.minX) + 1.0,   // bounds = vão jogável (meia-parede pra dentro)
  z: (W.bounds.maxZ - W.bounds.minZ) + 1.0,
};
const paredeOeste = W.bounds.minX - 0.5, paredeLeste = W.bounds.maxX + 0.5;

/* fundo plano da piscina: platô da profundidade máxima via groundHeightAt */
const PASSO = 0.25;
let hmin = 0, flatMinX = 0, flatMaxX = 0, flatMinZ = 0, flatMaxZ = 0, flatN = 0;
for (let x = W.bounds.minX; x <= W.bounds.maxX; x += PASSO) {
  for (let z = W.bounds.minZ; z <= W.bounds.maxZ; z += PASSO) {
    const h = W.groundHeightAt(x, z);
    if (h < hmin - 1e-9) { hmin = h; flatMinX = flatMaxX = x; flatMinZ = flatMaxZ = z; flatN = 1; }
    else if (h <= hmin + 0.03 && h < -0.2) {
      flatMinX = Math.min(flatMinX, x); flatMaxX = Math.max(flatMaxX, x);
      flatMinZ = Math.min(flatMinZ, z); flatMaxZ = Math.max(flatMaxZ, z); flatN++;
    }
  }
}
if (hmin > -0.2) { console.error('PISCINA-BSP VERMELHA · não achei piscina (nenhum ponto rebaixado no groundHeightAt)'); process.exit(1); }
medido.piscina = {
  area: flatN * PASSO * PASSO,
  aspecto: (flatMaxX - flatMinX) / Math.max(0.01, flatMaxZ - flatMinZ),
};
medido.corredores = { oeste: flatMinX - paredeOeste, leste: paredeLeste - flatMaxX };

const cen = (lst) => lst.reduce((a, s) => ({ x: a.x + s.x / lst.length, z: a.z + s.z / lst.length }), { x: 0, z: 0 });
const cE = cen(W.spawns.E), cB = cen(W.spawns.B);
medido.spawns = Math.hypot(cB.x - cE.x, cB.z - cE.z);

medido.estruturas = W.colliders.filter((c) => {
  if (typeof c.minX !== 'number') return false;
  const h = c.maxY - c.minY, pegada = (c.maxX - c.minX) * (c.maxZ - c.minZ);
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  return h >= 3 && c.maxY > 0.5 && pegada >= 0.5 && pegada <= 4.5
    && Math.abs(cx) < medido.salao.x / 2 - 2 && Math.abs(cz) < medido.salao.z / 2 - 2;
}).length;

/* ── mutação desloca-parede: a parede leste 25% do salão ALÉM DA POSIÇÃO MEDIDA
      no BSP. Simulação absoluta (âncora na referência, não no estado do builder),
      senão o tamanho do desvio dependeria de quão errado o mapa já está — mutante
      que às vezes morde não é mutante. PB1 acende com 25% > 20% sempre. */
if (MUTAR === 'desloca-parede') medido.salao.x = bsp.salao.x * 1.25;

/* ── comparação ────────────────────────────────────────────────────────────── */
const dev = (a, b) => Math.abs(a - b) / Math.abs(b);
const clausulas = [
  ['PB1', 'salão X', medido.salao.x, bsp.salao.x, 'm'],
  ['PB2', 'salão Z', medido.salao.z, bsp.salao.z, 'm'],
  ['PB3', 'área da piscina', medido.piscina.area, 4 * bsp.piscina.hx * bsp.piscina.hz, 'm²'],
  ['PB4', 'aspecto piscina X/Z', medido.piscina.aspecto, bsp.piscina.hx / bsp.piscina.hz, ''],
  ['PB5', 'distância spawns', medido.spawns, bsp.spawns.distancia_centroides, 'm'],
  ['PB6o', 'corredor oeste', medido.corredores.oeste, bsp.corredores.oeste, 'm'],
  ['PB6l', 'corredor leste', medido.corredores.leste, bsp.corredores.leste, 'm'],
  ['PB7', 'estruturas verticais', medido.estruturas, bsp.estruturas_verticais, ''],
];
let verdes = 0;
const vermelhas = [];
console.log(`PISCINA × BSP fy_pool_day  (fator ${bsp.fator_m_por_unidade} m/u, salão ${bsp.salao.x}×${bsp.salao.z} m)${MUTAR ? `  [mutação: ${MUTAR}]` : ''}\n`);
for (const [id, nome, jog, bspV, un] of clausulas) {
  const d = dev(jog, bspV), ok = d <= TETO;
  if (ok) verdes++; else vermelhas.push(id);
  console.log(`  ${ok ? 'ok' : 'x '} ${id} ${nome.padEnd(20)} jogo ${(+jog).toFixed(2).padStart(7)} ${un} · bsp ${(+bspV).toFixed(2).padStart(7)}  desvio ${(d * 100).toFixed(0).padStart(4)}% ${ok ? '' : `> ${TETO * 100}%  ← VERMELHA`}`);
}
const verde = vermelhas.length === 0;
console.log(`\nPISCINA-BSP ${verde ? 'ok' : 'VERMELHA'} · ${verdes}/${clausulas.length} cláusulas (teto ±${TETO * 100}% por medida)`);

if (MUTAR === 'desloca-parede' && !vermelhas.includes('PB1')) {
  console.error('mutação desloca-parede não acendeu PB1 — a régua não morde'); process.exit(1);
}
if (MUTAR === 'bsp-furado' && !(vermelhas.includes('PB3') || vermelhas.includes('PB4'))) {
  console.error('mutação bsp-furado não acendeu PB3/PB4 — o check não está lendo o JSON'); process.exit(1);
}
if (MUTAR) {
  if (verde) { console.error(`mutação ${MUTAR} passou verde — a régua NÃO morde`); process.exit(1); }
  console.log(`mutação ${MUTAR} reprovada como esperado (${vermelhas.join(', ')})`); process.exit(0);
}
process.exit(verde ? 0 : 1);

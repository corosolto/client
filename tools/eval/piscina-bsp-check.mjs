/* ============================================================================
   piscina-bsp-check.mjs — PISCINA CENTRAL + ANEL, DECISÃO DO DONO (26/08).
   ----------------------------------------------------------------------------
   PROCEDÊNCIA DA DECISÃO
   O re-authoring pelo BSP (r2) saiu com a piscina 13,5x9 ATRAVESSADA no eixo
   curto e descentrada — o pátio do fy_pool_day. O dono jogou e reprovou, com
   estas palavras (26/08): "adicionou layout no meio da piscina, e nao em volta
   dela, ficou super esquisito, o mapa na piscina tinha que continuar igual, a
   piscina menor, e adicionar corredores, vestiários, banheiro em volta dela
   como area de respawn". Decisão derivada daí: piscina CENTRAL e MENOR
   (~10x7 m), o espaço negativo vira um ANEL de construções (vestiário,
   banheiro, corredores cobertos) servindo de respawn e flanqueio.

   O BSP (tools/eval/piscina_bsp.json, medido por bsp-measure.mjs) SEGUE como
   referência — da PISCINA, não do anel: proporção ~1,5:1 (hx/hz do BSP) é o
   que sobrevive da medição. As PB antigas que mediam o pátio atravessado
   (salão × BSP, corredores laterais, estruturas verticais do func_wall)
   saem: codificavam o layout rejeitado.

   O QUE MEDE (mundo real: buildPoolDay via harness, uso e não declaração)
     PB1 centro X da piscina   |cx| ≤ 3 m  ("~0,0 ±3 m" do dono)
     PB2 centro Z da piscina   |cz| ≤ 3 m
     PB3 área do fundo plano   ≤ 71 m² (10x7 + 2% de folga da amostragem 0,25 m)
     PB4 aspecto X/Z           1,5 ±20% (hx/hz LIDO do piscina_bsp.json)
     PB5 spawns E × B          ≥ 25 m e em lados opostos do anel (z de sinais
                               contrários, folga 5 m do centro)
     PB6 anel ≥ 3 estruturas   colisores h ≥ 2,4 m e pegada ≥ 4 m² FORA do
                               miolo do deck (|cx|>8,5 ou |cz|>10) — vestiário,
                               banheiro, corredor/guarita contam; pilar (1,2 m²)
                               e armário avulso (0,9 m²) não

   LEI 1: nasceu reprovando o builder atravessado (PB3 +121% de área, PB6 com
   2 estruturas de anel — vermelha no commit em que entrou). LEI 3: as três
   mutações abaixo têm que acender as cláusulas certas.

   USO
     node tools/eval/piscina-bsp-check.mjs
     node tools/eval/piscina-bsp-check.mjs --mutar=desloca-parede  # PB1 acende
     node tools/eval/piscina-bsp-check.mjs --mutar=bsp-furado      # PB4 acende
     node tools/eval/piscina-bsp-check.mjs --mutar=sem-anel        # PB6 acende
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootGame, initTextures } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MUTAR = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || null;
if (MUTAR && !['desloca-parede', 'bsp-furado', 'sem-anel'].includes(MUTAR)) throw new Error(`mutação desconhecida: ${MUTAR}`);

/* piscina_bsp.json continua sendo A referência da proporção da piscina. */
const bsp = JSON.parse(readFileSync(path.join(HERE, 'piscina_bsp.json'), 'utf8'));
if (MUTAR === 'bsp-furado') bsp.piscina.hx *= 0.3;   // medida do JSON corrompida: o check tem que LER o JSON

const AREA_MAX = 71;          // 10x7 (decisão do dono) + 2% de folga da amostragem
const TETO = 0.20;

const T = await initTextures();
const g = bootGame('piscina_treta', { textures: T });
const W = g.world;

/* ── medidas do builder ────────────────────────────────────────────────────── */
const medido = {};

/* fundo plano da piscina: platô da profundidade máxima via groundHeightAt.
   Área e aspecto pelos EXTENTOS do platô (±meio passo), não pela contagem de
   células — a contagem infla ~6% pelas células de borda e morreria no teto. */
const PASSO = 0.25;
let hmin = 0, flatMinX = 0, flatMaxX = 0, flatMinZ = 0, flatMaxZ = 0;
for (let x = W.bounds.minX; x <= W.bounds.maxX; x += PASSO) {
  for (let z = W.bounds.minZ; z <= W.bounds.maxZ; z += PASSO) {
    const h = W.groundHeightAt(x, z);
    if (h < hmin - 1e-9) { hmin = h; flatMinX = flatMaxX = x; flatMinZ = flatMaxZ = z; }
    else if (h <= hmin + 0.03 && h < -0.2) {
      flatMinX = Math.min(flatMinX, x); flatMaxX = Math.max(flatMaxX, x);
      flatMinZ = Math.min(flatMinZ, z); flatMaxZ = Math.max(flatMaxZ, z);
    }
  }
}
if (hmin > -0.2) { console.error('PISCINA-BSP VERMELHA · não achei piscina (nenhum ponto rebaixado no groundHeightAt)'); process.exit(1); }
medido.piscina = {
  cx: (flatMinX + flatMaxX) / 2,
  cz: (flatMinZ + flatMaxZ) / 2,
  area: (flatMaxX - flatMinX) * (flatMaxZ - flatMinZ),
  aspecto: (flatMaxX - flatMinX) / Math.max(0.01, flatMaxZ - flatMinZ),
};

const cen = (lst) => lst.reduce((a, s) => ({ x: a.x + s.x / lst.length, z: a.z + s.z / lst.length }), { x: 0, z: 0 });
const cE = cen(W.spawns.E), cB = cen(W.spawns.B);
medido.spawns = {
  dist: Math.hypot(cB.x - cE.x, cB.z - cE.z),
  opostos: cE.z < -5 && cB.z > 5,
};

/* anel: estruturas altas FORA do miolo do deck (piscina + passagem) */
medido.anel = W.colliders.filter((c) => {
  if (typeof c.minX !== 'number') return false;
  const h = c.maxY - c.minY, pegada = (c.maxX - c.minX) * (c.maxZ - c.minZ);
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  return h >= 2.4 && c.maxY > 0.5 && pegada >= 4 && (Math.abs(cx) > 8.5 || Math.abs(cz) > 10)
    && Math.abs(cx) < W.bounds.maxX - 1 && Math.abs(cz) < W.bounds.maxZ - 1;
}).length;

/* ── mutação desloca-parede: a parede oeste empurra a piscina pra fora do
       centro. Simulação ABSOLUTA (+6 m > que a tolerância de 3 m do dono),
       senão o tamanho do desvio dependeria de quão errado o mapa já está. */
if (MUTAR === 'desloca-parede') medido.piscina.cx += 6;
/* ── mutação sem-anel: o anel inteiro some (o layout voltou a ser piscina
       atravessada sem construções em volta — exatamente o que o dono reprovou). */
if (MUTAR === 'sem-anel') medido.anel = 0;

/* ── comparação ────────────────────────────────────────────────────────────── */
const verdes = [];
const vermelhas = [];
const cl = (id, nome, ok) => { (ok ? verdes : vermelhas).push(id); console.log(`  ${ok ? 'ok' : 'x '} ${id} ${nome}`); };
console.log(`PISCINA · piscina central 10x7 + anel (decisão do dono 26/08; aspecto do BSP ${bsp.piscina.hx}/${bsp.piscina.hz})${MUTAR ? `  [mutação: ${MUTAR}]` : '\n'}`);
cl('PB1', `centro X            jogo ${medido.piscina.cx.toFixed(2)} m (tolerância ±3)`, Math.abs(medido.piscina.cx) <= 3);
cl('PB2', `centro Z            jogo ${medido.piscina.cz.toFixed(2)} m (tolerância ±3)`, Math.abs(medido.piscina.cz) <= 3);
cl('PB3', `área da piscina     jogo ${medido.piscina.area.toFixed(1)} m² ≤ ${AREA_MAX}`, medido.piscina.area <= AREA_MAX);
cl('PB4', `aspecto X/Z         jogo ${medido.piscina.aspecto.toFixed(2)} · bsp ${(bsp.piscina.hx / bsp.piscina.hz).toFixed(2)} ±20%`,
  Math.abs(medido.piscina.aspecto - bsp.piscina.hx / bsp.piscina.hz) / (bsp.piscina.hx / bsp.piscina.hz) <= TETO);
cl('PB5', `spawns E×B          jogo ${medido.spawns.dist.toFixed(1)} m, lados opostos=${medido.spawns.opostos} (≥25 m)`,
  medido.spawns.dist >= 25 && medido.spawns.opostos);
cl('PB6', `estruturas do anel  jogo ${medido.anel} ≥ 3 (vestiário/banheiro/corredor)`, medido.anel >= 3);

const verde = vermelhas.length === 0;
console.log(`\nPISCINA-BSP ${verde ? 'ok' : 'VERMELHA'} · ${verdes.length}/${verdes.length + vermelhas.length} cláusulas`);

if (MUTAR === 'desloca-parede' && !vermelhas.includes('PB1')) {
  console.error('mutação desloca-parede não acendeu PB1 — a régua não morde'); process.exit(1);
}
if (MUTAR === 'bsp-furado' && !vermelhas.includes('PB4')) {
  console.error('mutação bsp-furado não acendeu PB4 — o check não está lendo o JSON'); process.exit(1);
}
if (MUTAR === 'sem-anel' && !vermelhas.includes('PB6')) {
  console.error('mutação sem-anel não acendeu PB6 — a régua não morde'); process.exit(1);
}
if (MUTAR) {
  if (verde) { console.error(`mutação ${MUTAR} passou verde — a régua NÃO morde`); process.exit(1); }
  console.log(`mutação ${MUTAR} reprovada como esperado (${vermelhas.join(', ')})`); process.exit(0);
}
process.exit(verde ? 0 : 1);

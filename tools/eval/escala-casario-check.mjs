/* ============================================================================
   escala-casario-check.mjs — A ESCALA DO CASARIO DE GLB DO ESCADÃO.
   ----------------------------------------------------------------------------
   DEFEITO DE ORIGEM (dono, 20/08/2026, verbatim):
     "os mapas de favela so o lajes tem cordao de roupas do model, os outros nao
      e tudo generico low poly"  ·  "tem que ver a escala dos predios sempre"

   A régua irmã `eval:escala-favela` mede o córrego (vão de porta, passo de andar,
   palafita, prop solto). Esta mede outra coisa: as CASAS DE MOLDE GLB que passam
   a povoar o escadão. Molde real colocado na escala errada é o mesmo defeito de
   casa de boneca do BUG-55, só que com textura melhor — e o jeito clássico de
   "resolver" largura de fachada é esticar o molde até virar panqueca, então a
   distorção também é medida.

   REFERÊNCIA DOS LIMIARES
     · pé-direito por pavimento 2,60–3,20 m. Piso: casa de alvenaria brasileira
       não desce de 2,50 m de pé-direito livre (NBR 15575-1, altura mínima de
       compartimento habitável) e a laje come ~10 cm; teto: acima de 3,2 m por
       pavimento o corpo de 1,62 m de olho (game.js `eye = 1.62 - 0.52*crouchF`)
       lê a porta como portão de galpão. É uma faixa MAIS ALTA que a de barraco
       de 1 pavimento do escala-favela (2,40–2,80 m) de propósito: lá o alvo é
       barraco de madeirite; aqui é casa de alvenaria de 1-2 lajes.
     · largura de fachada ≥ 4,00 m — a parede LONGA da planta. Abaixo disso a
       casa lê como guarita: o vão de porta de 0,90 m passa de 22% da fachada.
     · distorção: cada eixo horizontal pode esticar no máximo 1,9× em relação ao
       fator vertical, e um eixo não pode passar 1,6× do outro. Molde cúbico
       espremido numa planta 2:1 vira caixa, não casa.

   ONDE MEDE (mundo construído, não declaração)
     A fonte primária é o COLISOR de cada casa — o volume com que o jogo colide e
     que segura a bala —, alcançado pelo registro `world.casario`, que guarda a
     REFERÊNCIA ao objeto empurrado em `world.colliders`. A transform declarada
     (larg/prof/alt/pav/escalas) é conferida CONTRA esse colisor: manifesto que
     mente reprova. As proporções naturais dos moldes são relidas do próprio GLB
     em disco com @gltf-transform, então a constante do mapa também não pode
     mentir.

     CAS1  registro presente (≥ 12 casas) e todo colisor do registro ainda está
           em world.colliders — pega a armadilha da rodada passada: geometria
           solta no root, régua sem alvo, mutante sobrevivendo.
     CAS2  pé-direito por pavimento em 2,60–3,20 m (altura do colisor ÷ pav).
     CAS3  fachada (maior lado da planta do colisor) ≥ 4,00 m.
     CAS4  casario não é monocultura: ≥ 2 moldes com ≥ 3 instâncias cada e pelo
           menos uma casa de 1 e uma de 2 pavimentos (o "tudo genérico" do dono).
     CAS5  transform declarada bate com o colisor medido (≤ 1 cm) e as proporções
           naturais declaradas batem com o bbox do GLB em disco (≤ 1 cm).
     CAS6  distorção dentro do teto (1,9× vertical, 1,6× entre eixos).

   MUTAÇÕES (cada uma tem de acender a sua; `--mutar=` e `--mutante=` valem)
     --mutar=ana ............ escala 0,6 em todo o casario (colisor + GLB) → CAS2/CAS3/CAS5
     --mutar=solta-do-root .. tira o colisor da primeira casa de world.colliders → CAS1
     --mutar=molde-unico .... reescreve todo molde para o mesmo → CAS4
     --mutar=fachada-fina ... espreme só a planta dos colisores (0,55×) → CAS3/CAS5
     --mutar=estica ......... dobra a largura declarada e medida de metade → CAS6
   Mutante desconhecido sai com código 2. Mutante que não encontra alvo para
   aplicar também sai com 2 — "não mordi" não pode passar por "passou".

   REPRODUZ:  node tools/eval/escala-casario-check.mjs [--mutar=...]
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { initTextures, bootGame } from './harness.mjs';

const MUTANTES = new Set(['ana', 'solta-do-root', 'molde-unico', 'fachada-fina', 'estica']);
const bruto = process.argv.find((a) => a.startsWith('--mutar=') || a.startsWith('--mutante='));
const mutante = bruto ? bruto.slice(bruto.indexOf('=') + 1) : null;
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

const PE_MIN = 2.60, PE_MAX = 3.20;   // pé-direito por pavimento
const FACHADA_MIN = 4.00;             // parede longa da planta
const ESTICA_MAX = 1.90;              // eixo horizontal vs fator vertical
const DISTORCE_MAX = 1.60;            // eixo horizontal vs o outro eixo horizontal
const TOL = 0.01;                     // 1 cm: declaração vs mundo

const cm = (x) => Math.round(x * 1000) / 1000;
const fmt = (x) => (x == null || !isFinite(x)) ? '—' : x.toFixed(2).replace('.', ',');

/* ---- proporção natural dos moldes, relida do GLB em disco ---- */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
async function bboxDoGlb(caminho) {
  const doc = await io.read(caminho);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const malha of doc.getRoot().listMeshes()) for (const prim of malha.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const min = pos.getMin([]), max = pos.getMax([]);
    for (let k = 0; k < 3; k++) { if (min[k] < lo[k]) lo[k] = min[k]; if (max[k] > hi[k]) hi[k] = max[k]; }
  }
  return { larg: hi[0] - lo[0], alt: hi[1] - lo[1], prof: hi[2] - lo[2] };
}

/* A constante do mapa é a fonte declarada: ela vem no próprio `world` (o mapa devolve
   `casarioMoldes` junto do registro) e o GLB em disco é a testemunha que a confere. */
const game = bootGame('escadao', { textures: await initTextures(), ctf: true, seed: 8012 });
const world = game.world;
const casario = world.casario || [];
const moldesDeclarados = world.casarioMoldes || {};

/* ---- mutações: mordem o MUNDO medido, não o fonte ---- */
let aplicou = !mutante;
const escalaColisor = (c, sx, sy, sz) => {
  const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  const w = (c.maxX - c.minX) * sx, d = (c.maxZ - c.minZ) * sz, h = (c.maxY - c.minY) * sy;
  c.minX = cx - w / 2; c.maxX = cx + w / 2;
  c.minZ = cz - d / 2; c.maxZ = cz + d / 2;
  c.maxY = c.minY + h;
};
if (mutante === 'ana') {
  for (const casa of casario) {
    if (!casa.col) continue;
    escalaColisor(casa.col, 0.6, 0.6, 0.6);
    if (casa.obj) casa.obj.scale.multiplyScalar(0.6);
    aplicou = true;
  }
}
if (mutante === 'fachada-fina') {
  for (const casa of casario) { if (casa.col) { escalaColisor(casa.col, 0.55, 1, 0.55); aplicou = true; } }
}
if (mutante === 'solta-do-root' && casario[0]?.col) {
  const i = world.colliders.indexOf(casario[0].col);
  if (i >= 0) { world.colliders.splice(i, 1); aplicou = true; }
}
if (mutante === 'molde-unico' && casario.length) {
  const primeiro = casario[0].molde;
  for (const casa of casario) casa.molde = primeiro;
  aplicou = true;
}
if (mutante === 'estica') {
  for (const casa of casario.slice(0, Math.ceil(casario.length / 2))) {
    if (!casa.col) continue;
    escalaColisor(casa.col, 2, 1, 1);
    casa.larg *= 2; casa.sx *= 2;
    aplicou = true;
  }
}
if (!aplicou) {
  console.error(`MUTANTE ${mutante} NÃO APLICOU: registro world.casario ausente/vazio — régua sem alvo.`);
  process.exit(2);
}

/* ---- medição ---- */
const noRegistro = new Set(world.colliders);
const linhas = [];
const problemas = { pe: [], fachada: [], solta: [], deriva: [], distorce: [] };

for (const casa of casario) {
  const c = casa.col;
  if (!c || !noRegistro.has(c)) { problemas.solta.push(casa.molde + `@${fmt(casa.x)},${fmt(casa.z)}`); continue; }
  const alt = cm(c.maxY - c.minY);
  const lx = cm(c.maxX - c.minX), lz = cm(c.maxZ - c.minZ);
  const fachada = Math.max(lx, lz);
  const pe = cm(alt / (casa.pav || 1));
  linhas.push({ casa, alt, lx, lz, fachada, pe });
  if (pe < PE_MIN || pe > PE_MAX) problemas.pe.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} pé=${fmt(pe)} m (${casa.pav} pav)`);
  if (fachada < FACHADA_MIN) problemas.fachada.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} fachada=${fmt(fachada)} m`);
  // declaração × mundo
  const decl = [[casa.alt, alt, 'alt'], [Math.max(casa.larg, casa.prof), fachada, 'fachada'],
    [Math.min(casa.larg, casa.prof), Math.min(lx, lz), 'lado curto']];
  for (const [d, m, nome] of decl) {
    if (!(Math.abs(d - m) <= TOL)) problemas.deriva.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} ${nome}: declarado ${fmt(d)} ≠ medido ${fmt(m)}`);
  }
  const sx = casa.sx, sz = casa.sz;
  if (!(sx > 0 && sz > 0)) { problemas.distorce.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} sem fatores de escala no registro`); continue; }
  const maior = Math.max(sx, sz), menor = Math.min(sx, sz);
  if (maior > ESTICA_MAX || menor < 1 / ESTICA_MAX) problemas.distorce.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} estica ${fmt(maior)}×/${fmt(menor)}× o fator vertical`);
  else if (maior / menor > DISTORCE_MAX) problemas.distorce.push(`${casa.molde}@${fmt(casa.x)},${fmt(casa.z)} planta distorcida ${fmt(maior / menor)}×`);
}

/* ---- proporção natural declarada × GLB em disco ---- */
const derivaMolde = [];
for (const [id, nat] of Object.entries(moldesDeclarados)) {
  let real;
  try { real = await bboxDoGlb(`public/models/props/${id}.glb`); }
  catch (e) { derivaMolde.push(`${id}: GLB não lido (${e.message})`); continue; }
  for (const eixo of ['larg', 'alt', 'prof']) {
    if (!(Math.abs(real[eixo] - nat[eixo]) <= TOL))
      derivaMolde.push(`${id}.${eixo}: declarado ${fmt(nat[eixo])} ≠ GLB ${fmt(real[eixo])}`);
  }
}

const porMolde = new Map();
for (const casa of casario) porMolde.set(casa.molde, (porMolde.get(casa.molde) || 0) + 1);
const pavs = new Set(casario.map((c) => c.pav));
const moldesFartos = [...porMolde.values()].filter((n) => n >= 3).length;

/* ---- relatório ---- */
console.log(`casario GLB do escadão: ${casario.length} instâncias · moldes: ${[...porMolde].map(([m, n]) => `${m}=${n}`).join(' · ') || '—'}`);
if (linhas.length) {
  console.log(`  pé-direito por pavimento: ${[...new Set(linhas.map((l) => fmt(l.pe)))].sort().join(' · ')} m [${fmt(PE_MIN)}–${fmt(PE_MAX)}]`);
  console.log(`  fachada: menor ${fmt(Math.min(...linhas.map((l) => l.fachada)))} m · maior ${fmt(Math.max(...linhas.map((l) => l.fachada)))} m [≥ ${fmt(FACHADA_MIN)}]`);
  console.log(`  pavimentos: ${[...pavs].sort().join(' e ')}`);
}
console.log(`  moldes relidos do disco: ${Object.keys(moldesDeclarados).join(' · ') || '—'}`);

const checks = [
  ['CAS1 registro de casario com ≥ 12 casas e todo colisor vivo em world.colliders',
    casario.length >= 12 && problemas.solta.length === 0,
    casario.length < 12 ? `${casario.length} casas registradas — régua sem alvo`
      : `${problemas.solta.length} casa(s) com colisor fora de world.colliders: ${problemas.solta.slice(0, 3).join(' | ')}`],
  ['CAS2 pé-direito por pavimento 2,60–3,20 m',
    linhas.length > 0 && problemas.pe.length === 0,
    problemas.pe.length ? `${problemas.pe.length} fora da faixa: ${problemas.pe.slice(0, 3).join(' | ')}` : `${linhas.length}/${linhas.length} na faixa`],
  ['CAS3 fachada ≥ 4,00 m em toda casa GLB',
    linhas.length > 0 && problemas.fachada.length === 0,
    problemas.fachada.length ? `${problemas.fachada.length} estreitas: ${problemas.fachada.slice(0, 3).join(' | ')}` : `${linhas.length}/${linhas.length} acima do piso`],
  ['CAS4 casario com ≥ 2 moldes (≥ 3 instâncias cada) e 1 e 2 pavimentos',
    moldesFartos >= 2 && pavs.has(1) && pavs.has(2),
    `moldes com ≥3 instâncias: ${moldesFartos} · pavimentos: ${[...pavs].sort().join(',') || '—'}`],
  ['CAS5 transform declarada = colisor medido, e molde declarado = GLB em disco',
    problemas.deriva.length === 0 && derivaMolde.length === 0 && Object.keys(moldesDeclarados).length >= 2,
    Object.keys(moldesDeclarados).length < 2 ? 'mapa não exporta as proporções naturais dos moldes — régua sem testemunha'
      : `${problemas.deriva.length + derivaMolde.length} deriva(s): ${[...problemas.deriva, ...derivaMolde].slice(0, 3).join(' | ')}`],
  ['CAS6 molde sem panqueca (≤ 1,9× o vertical, ≤ 1,6× entre eixos)',
    problemas.distorce.length === 0 && linhas.length > 0,
    problemas.distorce.length ? `${problemas.distorce.length} distorcida(s): ${problemas.distorce.slice(0, 3).join(' | ')}` : `${linhas.length}/${linhas.length} dentro do teto`],
];

let falhas = 0;
for (const [nome, ok, det] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} — ${det}`); }
if (falhas) {
  console.error(`ESCALA-CASARIO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`);
  process.exitCode = 1;
} else console.log('ESCALA-CASARIO OK');

/* ============================================================================
   wind-check.mjs — RÉGUA DO RC4 (plans/23): VENTO — TOPO BALANÇA, RAIZ NÃO.
   ----------------------------------------------------------------------------
   O defeito que ela PREMIA não existir: vegetação/placa estática — o "mato
   chegou estático" que o plano marca como um dos ingredientes do salto visual
   (RC4). O piloto é a grama do campomorro (GLBs da frente E, integrados aqui
   pela primeira vez): sem o sway de vertex shader o tufo novo é só mais um prop
   parado.

   O que ela mede, no MESMO mundo em que o jogo roda (bootGame; lê o material
   VIVO — o onBeforeCompile é chamado de verdade num stub, então o que se mede é
   o shader que o browser compila, não a intenção):

     V1   existe vegetação com vento na cena do campomorro: meshes (GLB em
          InstancedMesh, ou o fallback procedural do harness) cujo material tem
          userData.vento — e o lote tem tamanho de lote (≥ 30 tufos; menos que
          isso é enfeite de vitrine, não é o "mato no campo pelado");
     V2   o patch EXISTE no shader compilável: onBeforeCompile aplicado num stub
          injeta o chunk de sway (uVentoTime + peso por altura);
     V3   o peso é por ALTURA: ventoPeso(topo) ≥ 0,5 e ventoPeso(base) ≤ 0,05
          (a função JS exportada pela wind.js É a mesma matemática do chunk —
          topo balança, raiz não), medida na bounding box real da geometria;
     V4   o relógio anda: world.update avança o uVentoTime exportado;
     V5   a fase é por INSTÂNCIA (instanceMatrix[3] no chunk): o lote não balança
          em bloco único.

   Mutantes (Lei 3):
     node tools/eval/wind-check.mjs --mutante=congela    (amp=0 → TEM que dar vermelho)
     node tools/eval/wind-check.mjs --mutante=sem-chunk  (onBeforeCompile neutra → idem)
   ============================================================================ */
import { initTextures, bootGame } from './harness.mjs';
import { uVentoTime, ventoPeso } from '../../public/js/wind.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [];
const ok = [];

const g = bootGame('campomorro', { textures: initTextures() });

/* V1 — vegetação com vento na cena */
const ventoMeshes = [];
g.world.root.traverse((o) => {
  if (!o.isMesh && !o.isInstancedMesh) return;
  const ms = Array.isArray(o.material) ? o.material : [o.material];
  if (ms.some((m) => m && m.userData && m.userData.vento)) ventoMeshes.push(o);
});
let instancias = 0;
for (const m of ventoMeshes) instancias += m.isInstancedMesh ? m.count : 1;
if (!ventoMeshes.length) falhas.push('V1: nenhuma malha com userData.vento no campomorro — o mato segue estático');
else if (instancias < 30) falhas.push(`V1: só ${instancias} tufos com vento (< 30) — enfeite de vitrine, não o "mato no campo pelado"`);
else ok.push(`V1 ${ventoMeshes.length} malha(s), ${instancias} tufos com vento`);

/* material de amostra (o primeiro com vento) */
const mat = (() => {
  for (const o of ventoMeshes) {
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const m = ms.find((x) => x && x.userData && x.userData.vento);
    if (m) return m;
  }
  return null;
})();

if (mat) {
  const v = mat.userData.vento;
  if (MUT === 'congela') v.amp = 0;

  /* V2 — o patch existe no shader que o browser compilaria */
  if (MUT === 'sem-chunk') mat.onBeforeCompile = () => {};
  if (typeof mat.onBeforeCompile !== 'function') {
    falhas.push('V2: material com userData.vento mas sem onBeforeCompile — declaração sem uso');
  } else {
    const stub = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>\n' };
    mat.onBeforeCompile(stub);
    if (!/uVentoTime/.test(stub.vertexShader) || !/ventoPeso/.test(stub.vertexShader))
      falhas.push('V2: onBeforeCompile não injeta o chunk de sway (uVentoTime + ventoPeso)');
    else ok.push('V2 chunk de sway injetado (uVentoTime + ventoPeso)');
    /* V5 — fase por instância */
    if (!/instanceMatrix\[3\]/.test(stub.vertexShader))
      falhas.push('V5: chunk sem instanceMatrix[3] — o lote balança em bloco único');
    else ok.push('V5 fase por instância (instanceMatrix[3])');
  }

  /* V3 — topo balança, raiz não (na bounding box real da geometria) */
  if (!(v.amp > 0)) {
    falhas.push(`V3: amp=${v.amp} — vento congelado`);
  } else {
    const geo = ventoMeshes[0].geometry;
    geo.computeBoundingBox();
    const topo = ventoPeso(geo.boundingBox.max.y, v.altRef);
    const base = ventoPeso(Math.max(geo.boundingBox.min.y, 0), v.altRef);
    if (!(topo >= 0.5)) falhas.push(`V3: ventoPeso(topo)=${topo.toFixed(2)} (< 0,5) — o topo não balança`);
    else if (!(base <= 0.05)) falhas.push(`V3: ventoPeso(base)=${base.toFixed(2)} (> 0,05) — a raiz se move, árvore de gelatina`);
    else ok.push(`V3 peso por altura (topo ${topo.toFixed(2)}, base ${base.toFixed(3)})`);
  }
}

/* V4 — o relógio do vento anda via update do mundo */
const t0 = uVentoTime.value;
if (typeof g.world.update !== 'function') falhas.push('V4: o mapa não devolve update(dt) — ninguém avança o relógio do vento');
else {
  g.world.update(0.5, 0.5);
  if (!(uVentoTime.value > t0)) falhas.push(`V4: world.update(0.5) não avançou uVentoTime (${t0} -> ${uVentoTime.value})`);
  else ok.push(`V4 relógio do vento anda (uVentoTime ${t0} -> ${uVentoTime.value})`);
}

for (const o of ok) console.log(`  VENTO ok · ${o}`);
if (MUT) {
  if (falhas.length) { console.log(`VENTO ok · mutante '${MUT}' reprovado como esperado (${falhas.length} cláusula(s) vermelha(s))`); process.exit(0); }
  console.log(`VENTO VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
for (const f of falhas) console.log(`  VENTO VERMELHA · ${f}`);
if (falhas.length) { console.log(`VENTO VERMELHA · ${falhas.length} cláusula(s)`); process.exit(1); }
console.log('VENTO ok · topo balança, raiz não, fase por instância, relógio andando');

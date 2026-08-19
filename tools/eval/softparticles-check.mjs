/* ============================================================================
   softparticles-check.mjs — RÉGUA DO RC3 (plans/23): PARTÍCULA QUE TOCA O CHÃO
   NÃO TEM ARESTA DURA.
   ----------------------------------------------------------------------------
   O defeito que ela PREMIA não existir: billboard de poeira/fumaça cortado a
   seco onde atravessa o chão — a "aresta dura" que o dono apontou nos jogos de
   referência (a poeira dos carros some SUAVE no contato). O gpuparticles.js
   nascera só para tiro, sem depth fade (plans/23, tabela do diagnóstico). A
   solução é o soft-particle clássico: fade de alfa pela distância entre o
   fragmento e a geometria atrás dele, lida da MESMA cópia linearizada de depth
   do DepthPass (não existe segundo canal de depth nesta árvore).

   O que ela mede, no MESMO mundo em que o jogo roda (bootGame; material VIVO do
   sistema VIVO — uso, não declaração):

     SP1  existe sistema de partículas AMBIENTE no fy_campomorro (a poeira de
          rua do piloto), registrado em scene.userData.softs — o DepthPass só
          alimenta quem está na lista;
     SP2  o fragmentShader VIVO tem a cláusula de depth fade: amostra tDepth e
          usa a diferença de profundidade (token softDepth) na alfa;
     SP3  a distância de fade é da ordem do sprite (0 < uFadeDist ≤ 2 m;
          procedência: sprite de poeira de 0,5-1,2 m — fade maior que o sprite
          apaga a partícula inteira, fade zero é a aresta dura de antes);
     SP4  fio no composer: bloom.js instala o DepthPass também para
          scene.userData.softs (nível-declaração; a captura é a prova de uso);
     SP5  o spawner ambiente está VIVO: world.update avança o uTime do sistema
          E o cursor do ring buffer anda (partículas nascem de verdade).

   Mutantes (Lei 3):
     node tools/eval/softparticles-check.mjs --mutante=sem-fade
   ============================================================================ */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

const falhas = [];
const ok = [];

const g = bootGame('fy_campomorro', { textures: initTextures() });

/* SP1 — sistema ambiente registrado */
const softs = g.scene.userData.softs || [];
const poeira = softs.find((s) => s.ambiente === 'poeira');
if (!softs.length) falhas.push('SP1: scene.userData.softs vazia — nenhum sistema de partículas se registrou para o DepthPass');
else if (!poeira) falhas.push('SP1: nenhum sistema ambiente (poeira de rua) no fy_campomorro');
else ok.push(`SP1 ${softs.length} sistema(s) em softs, poeira presente`);

if (poeira) {
  const u = poeira.uniforms || {};
  let frag = poeira.points && poeira.points.material ? poeira.points.material.fragmentShader : '';
  if (MUT === 'sem-fade') frag = frag.replace(/softDepth/g, 'semFade');

  /* SP2 — cláusula de depth fade no shader VIVO */
  if (!/tDepth/.test(frag) || !/uDepthOn/.test(frag) || !/softDepth/.test(frag))
    falhas.push('SP2: o fragmentShader da poeira não tem depth fade (tDepth + softDepth) — aresta dura no contato');
  else ok.push('SP2 depth fade (tDepth + softDepth na alfa)');

  /* SP3 — distância de fade na ordem do sprite */
  if (!u.uFadeDist || !(u.uFadeDist.value > 0 && u.uFadeDist.value <= 2))
    falhas.push(`SP3: uFadeDist=${u.uFadeDist && u.uFadeDist.value} fora de (0, 2] m — fade errado é aresta ou partícula apagada`);
  else ok.push(`SP3 uFadeDist=${u.uFadeDist.value} m`);

  /* SP5 — spawner vivo */
  if (typeof g.world.update !== 'function') {
    falhas.push('SP5: o mapa não devolve update(dt) — a poeira não nasce nem envelhece');
  } else {
    const t0 = u.uTime ? u.uTime.value : null;
    const c0 = poeira.cursor;
    g.world.update(0.25, 0.25);
    g.world.update(0.25, 0.5);
    if (t0 === null || !(u.uTime.value > t0)) falhas.push('SP5: world.update não avança o uTime da poeira');
    else if (!(poeira.cursor > c0)) falhas.push('SP5: o spawner não nasceu partícula em 0,5 s — poeira morta');
    else ok.push(`SP5 spawner vivo (uTime ${t0} -> ${u.uTime.value}, cursor ${c0} -> ${poeira.cursor})`);
  }
}

/* SP4 — fio no composer (nível-declaração) */
const bloomSrc = readFileSync(path.join(RAIZ, 'public/js/bloom.js'), 'utf8');
if (!/userData\.softs/.test(bloomSrc) || !/DepthPass/.test(bloomSrc))
  falhas.push('SP4: bloom.js não instala o DepthPass para scene.userData.softs');
else ok.push('SP4 fio no composer (declaração — captura 3:2 é a prova de uso)');

for (const o of ok) console.log(`  SOFT ok · ${o}`);
if (MUT) {
  if (falhas.length) { console.log(`SOFT ok · mutante '${MUT}' reprovado como esperado (${falhas.length} cláusula(s) vermelha(s))`); process.exit(0); }
  console.log(`SOFT VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
for (const f of falhas) console.log(`  SOFT VERMELHA · ${f}`);
if (falhas.length) { console.log(`SOFT VERMELHA · ${falhas.length} cláusula(s)`); process.exit(1); }
console.log('SOFT ok · partícula ambiente com depth fade, spawner vivo');

#!/usr/bin/env node
/* ============================================================================
   anims-desvio-check.mjs — QUANTIZAR CLIPE NÃO PODE MOVER O ESQUELETO
   ----------------------------------------------------------------------------
   POR QUE EXISTE (22/08/2026)
   Os 570 clipes de `models/anims` passaram a ser comprimidos com meshopt (35,6 → 13,9 MB,
   -61%). Compressão de keyframe é LOSSY: quantiza rotação e translação. O tamanho aparece no
   diff; o desvio, não — e desvio de animação some como "o boneco está meio estranho".

   ARMADILHA DE UNIDADE, paga aqui: o rig do Mixamo é autorado em CENTÍMETROS e o nó `Armature`
   carrega escala 0,01. Medir o canal cru e chamar de milímetro infla o número por 100 — a
   primeira leitura deu "42 mm" quando o desvio real era 0,42 mm. Esta régua converte pela
   escala do Armature, que é o que o jogo aplica.

   O QUE MEDE (contra o que está no git, não contra suposição)
   AD1 pior desvio de TRANSLAÇÃO <= TETO_MM no mundo real.
   AD2 pior desvio de ROTAÇÃO <= TETO_GRAUS.
   Amostra fixa de clipes (os mesclados grandes + um per-estado), para o portão não custar
   minutos: o desvio é propriedade do encoder, não de um arquivo em particular.

   Mutante `teto-frouxo` afrouxa os tetos e a régua tem de acender.
   Uso: node tools/eval/anims-desvio-check.mjs [--mutante=teto-frouxo]
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'teto-frouxo') throw new Error(`mutante desconhecido: ${MUT}`);
const TETO_MM = MUT === 'teto-frouxo' ? 0.0001 : 2;
const TETO_GRAUS = MUT === 'teto-frouxo' ? 0.0001 : 1.5;
const AMOSTRA = ['public/models/anims/adjim.glb', 'public/models/anims/mst.glb', 'public/models/anims/punk/run.glb'];

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const dir = mkdtempSync(path.join(tmpdir(), 'anims-desvio-'));

async function ler(f) {
  const doc = await io.read(f);
  /* A escala do Armature é o que transforma unidade de arquivo em metro de jogo. */
  const arm = doc.getRoot().listNodes().find((n) => /armature/i.test(n.getName() || ''));
  const escala = arm ? Math.abs(arm.getScale()[0]) || 1 : 1;
  const canais = [];
  for (const a of doc.getRoot().listAnimations()) for (const c of a.listChannels()) {
    const acc = c.getSampler()?.getOutput(); if (!acc) continue;
    const v = []; const alvo = [];
    for (let i = 0; i < acc.getCount(); i++) { acc.getElement(i, alvo); v.push([...alvo]); }
    canais.push({ tipo: c.getTargetPath(), v });
  }
  return { escala, canais };
}

let piorMm = 0, piorGraus = 0, comparados = 0;
const falhas = [];
for (const rel of AMOSTRA) {
  if (!existsSync(rel)) continue;
  const orig = path.join(dir, rel.replace(/\//g, '_'));
  try { writeFileSync(orig, execFileSync('git', ['show', `HEAD:${rel}`], { maxBuffer: 1 << 28 })); }
  catch { continue; }   // arquivo novo, sem versão anterior para comparar
  const A = await ler(orig), B = await ler(rel);
  for (let i = 0; i < Math.min(A.canais.length, B.canais.length); i++) {
    if (A.canais[i].tipo !== B.canais[i].tipo) continue;
    for (let k = 0; k < Math.min(A.canais[i].v.length, B.canais[i].v.length); k++) {
      const a = A.canais[i].v[k], b = B.canais[i].v[k]; comparados++;
      if (A.canais[i].tipo === 'rotation') {
        const dot = Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]));
        piorGraus = Math.max(piorGraus, 2 * Math.acos(dot) * 180 / Math.PI);
      } else if (A.canais[i].tipo === 'translation') {
        piorMm = Math.max(piorMm, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * A.escala * 1000);
      }
    }
  }
}

if (!comparados) falhas.push('AD não deu para medir: nenhum clipe da amostra tem versão anterior no git');
if (piorMm > TETO_MM) falhas.push(`AD1 translação desviou ${piorMm.toFixed(3)} mm (teto ${TETO_MM})`);
if (piorGraus > TETO_GRAUS) falhas.push(`AD2 rotação desviou ${piorGraus.toFixed(3)}° (teto ${TETO_GRAUS})`);

console.log(`  ${comparados} keyframes contra o git · translação ${piorMm.toFixed(3)} mm (teto ${TETO_MM}) · rotação ${piorGraus.toFixed(3)}° (teto ${TETO_GRAUS})`);
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m AD compressão de clipe dentro do desvio tolerado');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);

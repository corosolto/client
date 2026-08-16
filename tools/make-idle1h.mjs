#!/usr/bin/env node
/* ============================================================================
   make-idle1h.mjs — RECONSTRÓI o clipe `idle1h` a partir do PRÓPRIO pack
   ----------------------------------------------------------------------------
   O DEFEITO QUE ISTO CONSERTA (medido, não achado)
   O dono, 04/08: "todos personagens após o pagodeiro e os palhaços estão uma merda
   na postura". O grupo que ele reprova é EXATAMENTE o dos personagens com arma de
   uma mão (weapons.js ONE_HANDED = pistol/deagle/revolver38/knife), que é o único
   grupo que roda o clipe `idle1h` (glbchars.js: `this.oneHanded && actions.idle1h`).

   `idle1h.glb` é um AJOELHADO. Medido em `tools/eval/pose-posture.mjs`, mediana do
   elenco, altura do quadril no clipe (cm, espaço do Armature):
       idle      79,3 .. 79,5   (em pé)
       walk1h    74,0 .. 81,0   (em pé)
       crouch    37,4 .. 37,6   (agachado)
       idle1h    44,8 .. 46,5   <- entre agachado e em pé: AJOELHADO
   e queda de quadril vs bind: idle 0,038 contra idle1h 0,495; flexão de joelho
   131,8° contra 60,8°.

   A PROCEDÊNCIA EXPLICA: todo clipe do pack `models/anims/mixamo` tem 23 canais /
   22 nós (ver SOURCES.md — pack de rifle da Mixamo, retargetado por
   tools/retarget-mixamo.mjs). `idle1h.glb` tem 72 canais / 24 nós, e traz `head_end`
   e `headfront`, que são a assinatura do pack ORIGINAL do Meshy. Ou seja: ele nunca
   foi assado com o resto do pack — foi copiado de outra fonte, e a fonte é um
   ajoelhado. `walk1h.glb`, ao lado, tem 23 canais e está em pé: o pack de uma mão
   FOI feito direito; só o idle não.

   COMO ESTE SCRIPT CONSERTA
   Sem baixar asset novo e sem misturar pack: o novo `idle1h` é o `idle` do próprio
   pack (corpo em pé, com a respiração/sway que o dono já aprova nos outros 35
   personagens) com a CADEIA DOS BRAÇOS congelada na pose de uma mão tirada do
   `walk1h` do mesmo pack. Corpo e braços saem da mesma fonte e do mesmo rig, então
   não há costura de esqueleto — é uma recomposição de canais.

   O quadro do `walk1h` usado é o mais próximo da média do ciclo (a pose "neutra"):
   num porte de uma mão o braço quase não oscila, e o script IMPRIME essa oscilação
   para que a escolha do quadro seja verificável, não confiada.

   uso: node tools/make-idle1h.mjs [packDir] [saida.glb]
        node tools/make-idle1h.mjs --check     (só mede, não escreve)
   ============================================================================ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from 'node:path';

const ROOT = path.resolve(new URL('../', import.meta.url).pathname);
const PACK = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : path.join(ROOT, 'public/models/anims/mixamo');
const OUT = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3] : path.join(PACK, 'idle1h.glb');
const CHECK = process.argv.includes('--check');

// cadeia dos braços: o que vem do walk1h (pose de UMA MÃO)
const ARM = new Set(['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b.slice();
  if (d < 0) { bb = b.map((x) => -x); d = -d; }
  if (d > 0.9995) { const r = a.map((x, i) => x + (bb[i] - x) * t); const l = Math.hypot(...r) || 1; return r.map((x) => x / l); }
  const th = Math.acos(Math.max(-1, Math.min(1, d))), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((x, i) => x * wa + bb[i] * wb);
};
const qAngle = (a, b) => {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
};

// devolve, por nome de nó, a lista de quaternions do canal de rotação
function rotTracks(doc) {
  const anim = doc.getRoot().listAnimations()[0];
  const out = new Map();
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'rotation') continue;
    const node = ch.getTargetNode(); if (!node) continue;
    const arr = Array.from(ch.getSampler().getOutput().getArray());
    const qs = []; for (let i = 0; i < arr.length; i += 4) qs.push(arr.slice(i, i + 4));
    out.set(node.getName(), qs);
  }
  return out;
}

const walkDoc = await io.read(path.join(PACK, 'walk1h.glb'));
const walkRot = rotTracks(walkDoc);

// pose neutra: para cada osso do braço, o quadro cuja rotação é a MAIS PRÓXIMA da
// média do ciclo. Um único quadro comum para toda a cadeia (senão a cadeia quebra):
// escolhe o quadro que minimiza a soma dos desvios angulares em todos os ossos.
const nFrames = Math.min(...[...ARM].map((b) => (walkRot.get(b) || []).length).filter((n) => n > 0));
if (!Number.isFinite(nFrames) || nFrames === 0) throw new Error('walk1h sem canais de braço');
const mean = new Map();
for (const b of ARM) {
  const qs = walkRot.get(b); if (!qs) continue;
  let acc = qs[0];
  for (let i = 1; i < qs.length; i++) acc = slerp(acc, qs[i], 1 / (i + 1));
  mean.set(b, acc);
}
let best = 0, bestCost = Infinity;
const osc = new Map();
for (const b of ARM) {
  const qs = walkRot.get(b); if (!qs) continue;
  osc.set(b, Math.max(...qs.map((q) => qAngle(q, mean.get(b)))));
}
for (let f = 0; f < nFrames; f++) {
  let c = 0;
  for (const b of ARM) { const qs = walkRot.get(b); if (qs) c += qAngle(qs[f], mean.get(b)); }
  if (c < bestCost) { bestCost = c; best = f; }
}

console.log(`pack: ${PACK}`);
console.log(`walk1h: ${nFrames} quadros; quadro neutro escolhido = ${best} (custo ${bestCost.toFixed(2)}°)`);
console.log('oscilação do braço no ciclo (max desvio vs média) — se for pequena, congelar é fiel:');
for (const [b, v] of [...osc].sort((a, z) => z[1] - a[1])) console.log(`   ${b.padEnd(14)} ${v.toFixed(1)}°`);

if (CHECK) process.exit(0);

// ---- monta o novo idle1h a partir do idle do MESMO pack ----
const doc = await io.read(path.join(PACK, 'idle.glb'));
const anim = doc.getRoot().listAnimations()[0];
anim.setName('idle1h');
let trocados = 0;
for (const ch of anim.listChannels()) {
  const node = ch.getTargetNode(); if (!node) continue;
  const name = node.getName();
  if (!ARM.has(name)) continue;
  const q = (walkRot.get(name) || [])[best];
  if (!q) continue;
  if (ch.getTargetPath() === 'rotation') {
    const smp = ch.getSampler();
    const n = smp.getInput().getArray().length;
    const arr = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) arr.set(q, i * 4);
    smp.getOutput().setArray(arr);
    trocados++;
  }
}
await io.write(OUT, doc);
console.log(`\nidle1h reconstruído: ${trocados} canais de braço congelados na pose de uma mão`);
console.log('->', OUT);

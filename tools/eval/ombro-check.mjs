/* ombro-check.mjs — OMB1: a clavícula não pode girar para longe do repouso no idle.
   Defeito que comprou a régua (PR #773, 07/10/2026): o retarget copiava a rotação
   ABSOLUTA da clavícula do pack; nos rigs Mint novos o repouso dela tem outro eixo e a
   gola do paletó virava um "cachecol" torcido de ombro a ombro. Medido no Zero Um: o
   clipe torcido reprova, o retargetado com clavícula em delta passa.

   Mede, por personagem com clipes próprios, o maior ângulo entre a rotação local de
   LeftShoulder/RightShoulder no `idle` e a rotação de repouso do mesmo osso no GLB.

   Uso:
     node tools/eval/ombro-check.mjs [id,id,...] [--clipes <pasta>]   # padrão: elenco com clipes
     node tools/eval/ombro-check.mjs senador --clipes /tmp/torcido     # mutação: clipe antigo */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const TETO_GRAUS = 30;
const argv = process.argv.slice(2);
const iClip = argv.indexOf('--clipes');
const pastaClipes = iClip >= 0 ? argv[iClip + 1] : null;
const lista = argv.find((a, i) => !a.startsWith('--') && (iClip < 0 || i !== iClip + 1));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const ids = lista ? lista.split(',') : fs.readdirSync('public/models/anims')
  .filter((d) => fs.existsSync(`public/models/anims/${d}/idle.glb`) && fs.existsSync(`public/models/characters/${d}.glb`));

const angulo = (a, b) => {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
};

let ruins = 0;
for (const id of ids) {
  const rig = await io.read(`public/models/characters/${id}.glb`);
  const repouso = new Map(rig.getRoot().listNodes().map((n) => [n.getName(), n.getRotation()]));
  const clipe = await io.read(path.join(pastaClipes || `public/models/anims/${id}`, 'idle.glb'));
  let pior = 0;
  for (const ch of clipe.getRoot().listAnimations()[0].listChannels()) {
    const nome = ch.getTargetNode().getName();
    if (!/Shoulder$/.test(nome) || ch.getTargetPath() !== 'rotation' || !repouso.has(nome)) continue;
    const out = ch.getSampler().getOutput().getArray();
    for (let k = 0; k < out.length; k += 4) pior = Math.max(pior, angulo(Array.from(out.slice(k, k + 4)), repouso.get(nome)));
  }
  const ok = pior <= TETO_GRAUS;
  if (!ok) ruins++;
  if (!ok || lista) console.log(`${ok ? '✓' : '✗'} ${id.padEnd(22)} clavícula até ${pior.toFixed(1)}° do repouso`);
}
console.log(ruins ? `✗ OMB1 ${ruins} personagem(ns) com clavícula torcida (> ${TETO_GRAUS}°)` : `✓ OMB1 ${ids.length} personagem(ns) com clavícula até ${TETO_GRAUS}°`);
process.exit(ruins ? 1 : 0);

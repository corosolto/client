/* Finaliza o retarget com CONTATO DO PÉ: só altera o Y da raiz, quadro a quadro, nos
   clipes terrestres. Morte e salto ficam de fora de propósito — os dois saem do chão, e
   corrigir a trajetória deles é o que apagaria a queda.
   Era `ground-lobisomem-anims.mjs`, com o caminho do lobo escrito na mão; virou genérico
   quando o time Mítico inteiro precisou do mesmo passo. O pack compartilhado deixa oito
   dos nove fora do chão (cinco afundam, três flutuam) — é a CHR7 que mede.
   Uso: node tools/ground-anims.mjs <id> [pasta-dos-clipes] */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { readGLB, buildScene, worldMats, poseWith, skinVerts, bboxOf } from './eval/tp-mount-probe.mjs';

const id = process.argv[2];
if (!id) throw new Error('Uso: node tools/ground-anims.mjs <id> [pasta-dos-clipes]');
const folder = process.argv[3] || `public/models/anims/${id}`;
const modelo = `public/models/characters/${id}.glb`;
if (!fs.existsSync(modelo)) throw new Error(`sem GLB do personagem: ${modelo}`);
if (!fs.existsSync(folder)) throw new Error(`sem pasta de clipes: ${folder} (rode o retarget-glb.mjs antes)`);
const source = readGLB(modelo);
const scene = buildScene(source);
const rest = worldMats(scene);
const floor = bboxOf(skinVerts(scene, source, rest, 1))[1];
const joints = source.json.skins[0].joints.map(i => source.json.nodes[i].name);
const hips = scene.nodes.find(n => n.name === 'Hips');
const parent = scene.nodes.find(n => n.children.includes(hips.i));
const rootYScale = rest[parent.i][5];
if (!Number.isFinite(rootYScale) || Math.abs(rootYScale) < 1e-6) throw new Error('Raiz sem eixo vertical');
const io = new NodeIO();
for (const state of ['idle', 'walk', 'run', 'shoot', 'crouch', 'crouchwalk', 'idle1h', 'walk1h', 'walkfire']) {
  const file = path.join(folder, `${state}.glb`);
  const doc = await io.read(file);
  const channel = doc.getRoot().listAnimations()[0].listChannels().find(c => c.getTargetNode().getName() === 'Hips' && c.getTargetPath() === 'translation');
  if (!channel) throw new Error(`${state}: canal Hips.translation ausente`);
  const sampler = channel.getSampler(), sourceTimes = sampler.getInput().getArray();
  const original = sampler.getOutput().getArray();
  const duration = sourceTimes[sourceTimes.length - 1];
  const frames = Math.ceil(duration * 120);
  const times = Array.from({ length: frames + 1 }, (_, i) => Math.min(i / 120, duration));
  const values = new Float32Array(times.length * 3);
  for (let i = 0; i < times.length; i++) {
    let k = 0;
    while (k < sourceTimes.length - 2 && sourceTimes[k + 1] < times[i]) k++;
    const alpha = (times[i] - sourceTimes[k]) / (sourceTimes[k + 1] - sourceTimes[k]);
    for (let c = 0; c < 3; c++) values[i * 3 + c] = original[k * 3 + c] * (1 - alpha) + original[(k + 1) * 3 + c] * alpha;
  }
  const corrections = [];
  for (let frame = 0; frame < times.length; frame++) {
    const t = Math.min(times[frame], times[times.length - 1] - 1e-7);
    const verts = skinVerts(scene, source, poseWith(scene, file, t), 1);
    let min = Infinity;
    for (const v of verts) {
      let dominant = 0;
      for (let k = 1; k < 4; k++) if (v.w[k] > v.w[dominant]) dominant = k;
      if (/foot|toe|ankle|heel|shin|calf|knee|(?<!up)leg/i.test(joints[v.j[dominant]])) min = Math.min(min, v.p[1]);
    }
    if (!Number.isFinite(min)) throw new Error(`${state}: sem vértices de pata`);
    const delta = (min - floor) / rootYScale;
    values[frame * 3 + 1] -= delta;
    corrections.push(delta * rootYScale);
  }
  sampler.setInput(doc.createAccessor().setType('SCALAR').setBuffer(sampler.getInput().getBuffer()).setArray(new Float32Array(times)));
  sampler.getOutput().setArray(values);
  await io.write(file, doc);
  console.log(`${state}: ${times.length} amostras; correção Y [${Math.min(...corrections).toFixed(4)}, ${Math.max(...corrections).toFixed(4)}] unidades do GLB`);
}

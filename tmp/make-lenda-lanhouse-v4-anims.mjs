// Cria a árvore v4 preservando byte a byte nove clipes e corrigindo só death.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , sourceDir, outputDir] = process.argv;
if (!sourceDir || !outputDir) throw new Error('uso: script source-dir output-dir');
mkdirSync(outputDir, { recursive: true });
const names = ['idle','idle1h','walk','walk1h','walkfire','run','jump','shoot','crouchwalk'];
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const unchanged = [];
for (const name of names) {
  const from = `${sourceDir}/${name}.glb`, to = `${outputDir}/${name}.glb`;
  cpSync(from, to);
  unchanged.push({ name, before: sha(from), after: sha(to), identical: sha(from) === sha(to) });
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const crouch = await io.read(`${sourceDir}/crouchwalk.glb`);
// O scan Blender (v4-crouchwalk-scan.json) encontrou o cruzamento mais simétrico
// no frame 21 da timeline 24 fps: joelhos 3,3 cm e pés 0,8 cm em profundidade.
const sampleTime = 21 / 24;
const dims = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function sampleLinear(values, size, a, b, mix, rotation) {
  const left = Array.from(values.slice(a * size, a * size + size));
  const right = Array.from(values.slice(b * size, b * size + size));
  if (!rotation) return left.map((value, i) => value + (right[i] - value) * mix);
  let dot = left.reduce((sum, value, i) => sum + value * right[i], 0);
  if (dot < 0) { for (let i = 0; i < 4; i++) right[i] = -right[i]; dot = -dot; }
  if (dot > 0.9995) {
    const out = left.map((value, i) => value + (right[i] - value) * mix);
    const length = Math.hypot(...out); return out.map((value) => value / length);
  }
  const theta = Math.acos(Math.min(1, dot));
  const sin = Math.sin(theta);
  return left.map((value, i) => value * Math.sin((1 - mix) * theta) / sin + right[i] * Math.sin(mix * theta) / sin);
}
for (const animation of crouch.getRoot().listAnimations()) {
  animation.setName('crouch');
  for (const channel of animation.listChannels()) {
    const sampler = channel.getSampler();
    if (sampler.getInterpolation() === 'CUBICSPLINE') throw new Error('crouchwalk CUBICSPLINE não suportado');
    const times = sampler.getInput().getArray();
    let b = times.findIndex((time) => time >= sampleTime);
    if (b < 0) b = times.length - 1;
    const a = Math.max(0, b - 1);
    const mix = times[b] === times[a] ? 0 : (sampleTime - times[a]) / (times[b] - times[a]);
    const output = sampler.getOutput();
    const size = dims[output.getType()];
    const value = sampleLinear(output.getArray(), size, a, b, mix, channel.getTargetPath() === 'rotation');
    // Assenta o tênis mais baixo no piso: a sonda Blender mediu 5,10 cm de folga e
    // o rig usa centímetros locais sob Armature(scale=.01).
    if (channel.getTargetNode()?.getName() === 'Hips' && channel.getTargetPath() === 'translation') value[1] -= 5.1;
    sampler.getInput().setArray(new Float32Array([0, 1]));
    output.setArray(new Float32Array([...value, ...value]));
    sampler.setInterpolation('LINEAR');
  }
}
await io.write(`${outputDir}/crouch.glb`, crouch);
const death = await io.read(`${sourceDir}/death.glb`);
let edited = false;
for (const animation of death.getRoot().listAnimations()) {
  for (const channel of animation.listChannels()) {
    if (channel.getTargetNode()?.getName() !== 'Hips' || channel.getTargetPath() !== 'translation') continue;
    const sampler = channel.getSampler();
    const input = sampler.getInput().getArray();
    const output = sampler.getOutput();
    const values = new Float32Array(output.getArray());
    const start = input[0], duration = input[input.length - 1] - start;
    for (let i = 0; i < input.length; i++) values[i * 3 + 1] += 9.51 * ((input[i] - start) / duration);
    output.setArray(values);
    edited = true;
  }
}
if (!edited) throw new Error('canal Hips.translation ausente em death');
await io.write(`${outputDir}/death.glb`, death);
const changed = ['crouch', 'death'].map((name) => ({ name, before: sha(`${sourceDir}/${name}.glb`), after: sha(`${outputDir}/${name}.glb`), identical: sha(`${sourceDir}/${name}.glb`) === sha(`${outputDir}/${name}.glb`) }));
writeFileSync(`${outputDir}/v4-animation-receipt.json`, JSON.stringify({ sourceDir, outputDir, crouchSource: 'crouchwalk.glb', crouchSourceFrame: 21, crouchSourceFps: 24, crouchHipsYOffsetClipUnits: -5.1, deathHipsFinalYOffsetClipUnits: 9.51, unchanged, changed }, null, 2) + '\n');

#!/usr/bin/env node
// BUG-85: amostra o WebP servido no UV real; identidade declarada não detecta punho nu.
// Landmarks Blender de 06/09 em hand-continuity/inspection.json; UV espelhado é compartilhado.
import sharp from 'sharp';
import path from 'node:path';
import { TEAM_HANDS } from '../../public/js/vmhands.js';

const root = path.resolve(import.meta.dirname, '../..');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant && !['punho-descoberto', 'dedos-cobertos'].includes(mutant)) throw Error('mutante desconhecido');
const landmarks = [
  { layout: 'pistol', role: 'skin', part: 'wrist-r', face: 26, uv: [.908698, .753654] },
  { layout: 'pistol', role: 'skin', part: 'wrist-l', face: 976, uv: [.903908, .748036] },
  { layout: 'pistol', role: 'glove', part: 'tip-lr', face: 6569, uv: [.536971, .528138] },
  { layout: 'knife', role: 'combined', part: 'wrist-lr', face: 8718, uv: [.362979, .758996] },
  { layout: 'knife', role: 'combined', part: 'tip-r', face: 6898, uv: [.170617, .561062] },
  { layout: 'knife', role: 'combined', part: 'tip-l', face: 2672, uv: [.414327, .821607] },
];
const skin = [183, 137, 104];
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const chroma = c => [c[0] - c[1], c[1] - c[2]];
const distance = (a, b) => Math.hypot(...chroma(a).map((v, i) => v - chroma(b)[i]));
const checks = [], cache = new Map();
let mutations = 0;
for (const faction of ['F', 'U']) for (const point of landmarks) {
  const file = `public/models/viewmodels/coro/hands/${point.layout}/${point.role}-${faction}.webp`;
  if (!cache.has(file)) cache.set(file, await sharp(path.join(root, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
  const { data, info } = cache.get(file);
  if (info.width !== 512 || info.height !== 512 || info.channels !== 3) throw Error(`atlas/landmark incompatível: ${file}`);
  const x = Math.floor(point.uv[0] * info.width), y = Math.floor((1 - point.uv[1]) * info.height);
  let pixel = [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  const tip = point.part.startsWith('tip');
  if (mutant === 'punho-descoberto' && !tip) { pixel = skin; mutations++; }
  if (mutant === 'dedos-cobertos' && tip) { pixel = rgb(TEAM_HANDS[faction].glove); mutations++; }
  const skinDistance = distance(pixel, skin);
  const clothDistance = Math.min(...['glove', 'sleeve', 'accent'].map(k => distance(pixel, rgb(TEAM_HANDS[faction][k]))));
  const exposed = skinDistance < clothDistance;
  checks.push({ name: `${faction}/${point.layout}/${point.part}: ${tip ? 'dedos expostos' : 'punho coberto'}`,
    ok: exposed === tip, file, uv: point.uv, face: point.face, pixel, skinDistance, clothDistance });
}
if (mutant && !mutations) throw Error('mutação não aplicada');
const ok = checks.every(c => c.ok);
console.log(JSON.stringify({ ok, scope: 'pixels do atlas; não certifica movimento, silhueta ou toda a superfície', mutant, mutations, checks }, null, 2));
process.exitCode = ok ? 0 : 1;

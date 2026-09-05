#!/usr/bin/env node
// Acrescenta os golpes aprovados sem reexportar malha, rig, câmera ou biblioteca.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const target = 'public/models/viewmodels/coro/melee/knife-hires.glb';
const source = execFileSync('git', ['show', `8f7c7280:${target}`], { cwd: root, maxBuffer: 4000000 });
const candidatePath = path.resolve(root, process.argv[2] || 'artifacts/viewmodels/astra-series/knife-motion-candidate-d/knife-animation-only.glb');
const candidate = fs.readFileSync(candidatePath);
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
if (hash(source) !== '62119f066951cf8f98fbaa86bbe62f98800602b0ffaabfa83af45e2e61dc18b0') throw new Error('base não aprovada');
if (hash(candidate) !== 'bb349ccd19413159943fa84fe15aab82af4978f7453121699bb1239b72705ab2') throw new Error('movimento não aprovado');
function read(bytes) {
  const n = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + n)), bin: bytes.subarray(28 + n) };
}
const base = read(source), next = read(candidate);
for (const key of ['nodes', 'meshes', 'skins', 'materials', 'textures', 'images', 'cameras']) {
  if (JSON.stringify(base.json[key]) !== JSON.stringify(next.json[key])) throw new Error(`mudou ${key}`);
}
if (!next.bin.subarray(0, base.bin.length).equals(base.bin)) throw new Error('buffer original mudou');
const additions = [['Stab', 'QuickThrust'], ['Slash', 'HeavyStab']].map(([from, name]) => {
  const clip = structuredClone(next.json.animations.find((a) => a.name === from));
  if (!clip) throw new Error(`sem ${from}`);
  return { ...clip, name };
});
next.json.animations = [...base.json.animations, ...additions];
const raw = Buffer.from(JSON.stringify(next.json));
const json = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + next.bin.length, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(next.bin.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, json, binaryHeader, next.bin]);
fs.writeFileSync(path.join(root, target), output);
console.log(JSON.stringify({ source: hash(source), candidate: hash(candidate), output: hash(output), bytes: output.length,
  clips: next.json.animations.map((a) => a.name), preserved: ['geometry', 'rig', 'camera', 'materials', 'original clips'] }, null, 2));

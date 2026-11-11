#!/usr/bin/env node
// Compra: front.png do piloto (10/11/2026), 1024×1536, 353 pixels alfa na última linha.
// Sem teto estético novo: todo vértice desenhado cabe no frustum; a borda raster fica vazia.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../public/vendor/three.module.js';

const args = process.argv.slice(2);
const mediaArg = args.indexOf('--media');
if (mediaArg >= 0) {
  const dir = args[mediaArg + 1]; assert.ok(dir, '--media exige pasta do capture');
  const { default: sharp } = await import('sharp');
  const files = ['front.png', 'side.png', 'back.png', ...Array.from({ length: 48 }, (_, i) => `frames/${String(i).padStart(4, '0')}.png`)];
  for (const file of files) {
    const { data, info } = await sharp(`${dir}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let edge = 0, occupied = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha) { occupied++; if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edge++; }
    }
    assert.ok(occupied > 0, `CF4: ${file} vazio não prova enquadramento`);
    assert.equal(edge, 0, `CF4: ${file} tem ${edge} pixels alfa na borda; personagem/sola cortados`);
  }
  console.log(`CF4: ${files.length} PNGs completos, zero pixels alfa na borda`);
}
if (args.includes('--media-only')) {
  // CF4 sozinho sem captura não mede nada: verde aqui seria aceite sem prova.
  assert.ok(mediaArg >= 0, 'CF4: --media-only exige --media <pasta do capture>');
  process.exit(0);
}
const mutation = args.find(a => a.startsWith('--mutante='))?.split('=')[1];
const mutations = {
  'sem-skin': ['mesh.getVertexPosition(i, vertex);', 'vertex.fromBufferAttribute(position, i);'],
  'sem-profundidade': ['const depth = z - originZ;', 'const depth = 0;'],
  'sem-aspect': ['const tanX = tanY * aspect;', 'const tanX = tanY;'],
  'quadro-unico': ['frame <= frames', 'frame <= 0'],
};
if (args.includes('--mutate')) {
  for (const name of Object.keys(mutations)) {
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${name}`], { encoding: 'utf8' });
    assert.equal(run.status, 1, `mutante ${name} não foi rejeitado: ${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /CF[123]/, `mutante ${name} não chegou à cláusula causal: ${run.stderr}`);
    console.log(`RED causal: ${name}`);
  }
  process.exit(0);
}
let source = readFileSync(new URL('../../public/js/charvideo-frame.js', import.meta.url), 'utf8');
if (mutation) {
  assert.ok(mutations[mutation], `mutante desconhecido: ${mutation}`);
  const [before, after] = mutations[mutation];
  assert.ok(source.includes(before), `mutante ${mutation} não aplicou`);
  source = source.replace(before, after);
}
source = source.replace("'three'", JSON.stringify(new URL('../../public/vendor/three.module.js', import.meta.url).href));
const { visibleFrameBounds, sampleAnimatedEnvelope, fitPerspectiveFrame } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.4, 0, -1, 0.4, 0, -1, 0, 2, 0], 3));
geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(12).fill(0), 4));
geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
const bone = new THREE.Bone();
const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
mesh.add(bone); mesh.bind(new THREE.Skeleton([bone]));
const root = new THREE.Group(); root.add(mesh); root.updateMatrixWorld(true);
mesh.computeBoundingBox(); // Cache deliberadamente anterior ao movimento do osso.
bone.position.y = -0.5;
let bounds = visibleFrameBounds(root);
assert.equal(bounds.min.y, -0.5, 'CF1: caixa deve seguir a sola deformada, não o cache da bind pose');
const hidden = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial());
const hiddenParent = new THREE.Group(); hiddenParent.visible = false; hiddenParent.add(hidden); root.add(hiddenParent);
assert.equal(visibleFrameBounds(root).min.y, -0.5, 'CF1: ancestral invisível não entra no enquadramento');
const invisibleMaterial = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ visible: false }));
root.add(invisibleMaterial);
assert.equal(visibleFrameBounds(root).max.y, 1.5, 'CF1: material invisível não entra no enquadramento');
const weapon = new THREE.Mesh(
  new THREE.BoxGeometry(6, 0.2, 0.2),
  new THREE.MeshBasicMaterial(),
);
weapon.position.z = -1;
root.add(weapon);
let elapsed = 0;
const boxes = sampleAnimatedEnvelope(root, dt => { elapsed += dt; bone.position.y = -0.5 - elapsed; }, { seconds: 2, fps: 24 });
assert.equal(boxes.length, 49, 'CF2: medir o frame inicial e todos os 48 frames servidos em dois segundos');
assert.ok(Math.abs(boxes.at(-1).min.y + 2.5) < 1e-12, 'CF2: envelope deve incluir a sola no fim do idle');
for (const [width, height] of [[1024, 1536], [640, 854], [768, 1024], [512, 512], [1536, 640]]) {
  const fit = fitPerspectiveFrame(boxes, { fov: 34, aspect: width / height, originX: 0, originZ: 0, shot: 'corpo', fatia: 1.16 });
  const camera = new THREE.PerspectiveCamera(34, width / height, .05, 400);
  camera.position.set(0, fit.targetY, -fit.distance); camera.lookAt(0, fit.targetY, 0); camera.updateMatrixWorld(true);
  let largest = 0;
  for (const box of boxes) for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new THREE.Vector3(x, y, z).project(camera); largest = Math.max(largest, Math.abs(p.x), Math.abs(p.y));
    assert.ok(Math.abs(p.x) <= 1 / 1.16 + 1e-12 && Math.abs(p.y) <= 1 / 1.16 + 1e-12 && Math.abs(p.z) <= 1, `CF3: ${width}×${height} corta vértice animado: ${p.toArray()}`);
  }
  console.log(`CF3 ${width}×${height}: NDC máximo=${largest}, distância=${fit.distance}`);
}
console.log(`charvideo-frame: CF1–CF3 PASS; CF4 ${mediaArg >= 0 ? 'PASS' : 'NÃO MEDIDO (sem --media; este verde cobre só CF1–CF3)'} (não é aceite visual)`);

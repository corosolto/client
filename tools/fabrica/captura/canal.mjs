// Amostra um nó (TRS local) ao longo de um clipe. Uso: node canal.mjs <glb> <clipe> <nó>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, duration } from '../../../tools/viewmodels/prep/fk-gltf.mjs';
const [file, clipe, no] = process.argv.slice(2);
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file); const P = new Pose(doc);
const d = duration(P.clip(clipe)); const n = P.node(no);
console.log('repouso', n.getTranslation().map((v) => +v.toFixed(3)), n.getRotation().map((v) => +v.toFixed(3)), n.getScale().map((v) => +v.toFixed(2)));
for (let f = 0; f <= 1.0001; f += 0.125) { P.set(clipe, f * d); const t = P.trs(no);
  const q0 = new THREE.Quaternion(...n.getRotation()); const q = new THREE.Quaternion(...t.rotation);
  console.log(f.toFixed(2), t.translation.map((v) => +v.toFixed(3)), `Δrot ${(2 * Math.acos(Math.min(1, Math.abs(q.dot(q0)))) * 180 / Math.PI).toFixed(1)}°`, t.scale.map((v) => +v.toFixed(2))); }

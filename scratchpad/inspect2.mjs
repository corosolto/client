import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const b = getBounds(doc.getRoot().listScenes()[0]);
  const mn = b.min.map(v=>v.toFixed(4)), mx = b.max.map(v=>v.toFixed(4));
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) { const idx = p.getIndices(); tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount())/3; }
  console.log(f.split('/').pop(), 'bounds:', mn.join(','), '->', mx.join(','), ' tris:', Math.round(tris));
}

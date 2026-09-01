import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const f = process.argv[2];
const doc = await io.read(f);
let fixed = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const nrm = prim.getAttribute('NORMAL'); if (!nrm) continue;
  const arr = nrm.getArray();
  for (let i = 0; i < arr.length; i += 3) {
    const l = Math.hypot(arr[i], arr[i+1], arr[i+2]);
    if (l < 1e-6) { arr[i] = 0; arr[i+1] = 1; arr[i+2] = 0; fixed++; }
    else if (Math.abs(l - 1) > 1e-4) { arr[i] /= l; arr[i+1] /= l; arr[i+2] /= l; }
  }
  nrm.setArray(arr);
}
await io.write(f, doc);
console.log(`${f}: ${fixed} normais degeneradas corrigidas`);

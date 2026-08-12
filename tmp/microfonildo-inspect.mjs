import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]);
const root = doc.getRoot();
let triangles=0;
const primitives=root.listMeshes().flatMap(m=>m.listPrimitives()).map(p=>{
  triangles += (p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0)/3;
  return {material:p.getMaterial()?.getName(),triangles:Math.round((p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0)/3),vertices:p.getAttribute('POSITION')?.getCount(),color0:!!p.getAttribute('COLOR_0'),joints:!!p.getAttribute('JOINTS_0'),weights:!!p.getAttribute('WEIGHTS_0')};
});
const bounds=getBounds(root.listScenes()[0]); const span=bounds.max.map((v,i)=>v-bounds.min[i]);
console.log(JSON.stringify({meshes:root.listMeshes().length,materials:root.listMaterials().length,textures:root.listTextures().length,skins:root.listSkins().length,animations:root.listAnimations().map(a=>a.getName()),triangles:Math.round(triangles),bounds:{min:bounds.min,max:bounds.max,span},primitives}));

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';

const defaultFile = 'references/tv/microfonildo/3d/blender-v2/microfonildo-final-opt.glb';
const file = process.argv[2] || defaultFile;
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);
const root = doc.getRoot();
const bounds = getBounds(root.listScenes()[0]);
const span = bounds.max.map((value, index) => value - bounds.min[index]);
const trianglesByMaterial = {};

for (const mesh of root.listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const count = primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
    const name = primitive.getMaterial()?.getName() || '(sem material)';
    trianglesByMaterial[name] = (trianglesByMaterial[name] || 0) + Math.round(count / 3);
  }
}

// Limiares ficam entre o clean e cada mutante causal medido no mesmo exportador:
// FUR2 clean=2032 vs smooth=80; X/Y clean=.881 vs narrow=.541;
// reels clean cyan/magenta=2328/1208 vs rings=1400/280.
const metrics = {
  angularFurTriangles: trianglesByMaterial.MIC_FUR2 || 0,
  silhouetteWidthToHeight: span[0] / span[1],
  reelCyanTriangles: trianglesByMaterial.MIC_CYAN || 0,
  reelMagentaTriangles: trianglesByMaterial.MIC_MAGENTA || 0,
};
const checks = {
  continuousAngularFur: metrics.angularFurTriangles >= 1500,
  compactWideSilhouette: metrics.silhouetteWidthToHeight >= 0.72,
  recognizableReels: metrics.reelCyanTriangles >= 2000 && metrics.reelMagentaTriangles >= 1000,
};
const result = { file, defaultTarget: defaultFile, bounds: { min: bounds.min, max: bounds.max, span }, trianglesByMaterial, metrics, checks };
console.log(JSON.stringify(result, null, 2));
if (!Object.values(checks).every(Boolean)) process.exit(1);

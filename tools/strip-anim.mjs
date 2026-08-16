// Strip an animation-clip GLB down to skeleton + animation only.
// Meshy delivers each clip as a full-mesh GLB (~4MB, dominated by a 2K texture).
// The game only needs the AnimationClip tracks (targeted by bone name), so we drop
// meshes/skins/materials/textures and keep the bone nodes + animation samplers.
// These stripped clips are shared across all characters (same Meshy humanoid rig).
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: strip-anim.mjs <in.glb> <out.glb>'); process.exit(1); }

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();

// Drop geometry: dispose each primitive (frees its attribute/index accessors), then
// the mesh, skin, materials and textures. Detach mesh refs from nodes so bones remain.
root.listMeshes().forEach((m) => {
  m.listPrimitives().forEach((p) => p.dispose());
  m.dispose();
});
root.listNodes().forEach((n) => n.setMesh(null));
root.listSkins().forEach((s) => s.dispose());
root.listMaterials().forEach((m) => m.dispose());
root.listTextures().forEach((t) => t.dispose());

// Prune orphaned accessors/buffers but keep the full bone hierarchy (keepLeaves) so
// animation channels still resolve. Animation samplers are retained (still referenced).
await doc.transform(prune({ keepLeaves: true }));

await io.write(outPath, doc);
const anims = root.listAnimations().map((a) => a.getName());
console.log(`ok: ${outPath}  animations=[${anims.join(', ')}]`);

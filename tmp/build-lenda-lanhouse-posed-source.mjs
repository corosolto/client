// Junta três clipes ao SkinnedMesh apenas para render Blender de evidência.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';

const base = 'references/nerdolas/lenda-lanhouse/3d/meshy-t2-v1';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(`${base}/lenda-lanhouse-v3-final-opt.glb`);
const root = document.getRoot();
const nodesByName = new Map(root.listNodes().map((node) => [node.getName(), node]));
for (const clip of ['idle', 'walk', 'crouch']) {
  const nodesBefore = new Set(root.listNodes());
  const animationsBefore = new Set(root.listAnimations());
  mergeDocuments(document, await io.read(`${base}/anims-v2-final/${clip}.glb`));
  for (const animation of root.listAnimations()) {
    if (animationsBefore.has(animation)) continue;
    animation.setName(clip);
    for (const channel of animation.listChannels()) {
      const target = nodesByName.get(channel.getTargetNode()?.getName());
      if (target) channel.setTargetNode(target);
    }
  }
  for (const node of root.listNodes()) if (!nodesBefore.has(node)) node.dispose();
  for (const scene of root.listScenes().slice(1)) scene.dispose();
}
await document.transform(prune(), unpartition());
await io.write(`${base}/lenda-lanhouse-v3-posed-source.glb`, document);
console.log('LENDA_POSED_SOURCE=lenda-lanhouse-v3-posed-source.glb');

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const base = 'references/nerdolas/designer-ux/3d/meshy-t2-v1';
const document = await io.read(`${base}/designer-ux-v11-rigged.glb`);
const root = document.getRoot();
const nodesByName = new Map(root.listNodes().map((node) => [node.getName(), node]));
for (const clip of ['walk', 'crouch', 'idle']) {
  const nodesBefore = new Set(root.listNodes());
  const animationsBefore = new Set(root.listAnimations());
  mergeDocuments(document, await io.read(`${base}/anims-v5-meshy/${clip}.glb`));
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
await io.write(`${base}/designer-ux-v11-posed-source.glb`, document);
console.log('DESIGNER_POSED_SOURCE=designer-ux-v11-posed-source.glb');

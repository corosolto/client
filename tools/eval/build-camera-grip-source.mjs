/* Combina o GLB canônico da Câmera com idle/walk/crouch apenas para auditoria Blender.
   O arquivo resultante não é runtime: permite que o importador glTF associe os
   canais aos bones, em vez de importar o esqueleto de animação como empties. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';

const characterId = process.argv[3] || 'camera-roxa';
const output = process.argv[2] || `tools/eval/asset-evidence/${characterId}/grip/${characterId}-posed-source.glb`;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(`public/models/characters/${characterId}.glb`);
const root = document.getRoot();
const nodesByName = new Map(root.listNodes().map((node) => [node.getName(), node]));

for (const clip of ['idle', 'walk', 'crouch']) {
  const nodesBefore = new Set(root.listNodes());
  const animationsBefore = new Set(root.listAnimations());
  mergeDocuments(document, await io.read(`public/models/anims/${characterId}/${clip}.glb`));
  for (const animation of root.listAnimations()) {
    if (animationsBefore.has(animation)) continue;
    for (const channel of animation.listChannels()) {
      const target = nodesByName.get(channel.getTargetNode()?.getName());
      if (target) channel.setTargetNode(target);
    }
  }
  for (const node of root.listNodes()) if (!nodesBefore.has(node)) node.dispose();
  for (const scene of root.listScenes().slice(1)) scene.dispose();
}
await document.transform(prune(), unpartition());
await io.write(output, document);
console.log(`CAMERA_GRIP_SOURCE=${output}`);

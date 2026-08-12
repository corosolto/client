// Une modelo + crouch/death para a sonda Blender. Não altera o artefato servido.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';

const [, , modelPath, animDir, outputPath] = process.argv;
if (!modelPath || !animDir || !outputPath) throw new Error('uso: script model.glb anim-dir output.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(modelPath);
const root = document.getRoot();
const nodesByName = new Map(root.listNodes().map((node) => [node.getName(), node]));
for (const clip of ['crouch', 'death', 'shoot', 'crouchwalk']) {
  const nodesBefore = new Set(root.listNodes());
  const animationsBefore = new Set(root.listAnimations());
  mergeDocuments(document, await io.read(`${animDir}/${clip}.glb`));
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
await io.write(outputPath, document);
console.log(outputPath);

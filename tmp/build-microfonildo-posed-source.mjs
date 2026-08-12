import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';
const base=process.argv[2] || 'references/tv/microfonildo/3d/blender-v1';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document=await io.read(`${base}/microfonildo-final-opt.glb`); const root=document.getRoot();
const nodesByName=new Map(root.listNodes().map(n=>[n.getName(),n]));
for(const clip of ['idle','walk','crouch','death']){
  const nodesBefore=new Set(root.listNodes()), animationsBefore=new Set(root.listAnimations());
  mergeDocuments(document,await io.read(`${base}/anims/${clip}.glb`));
  for(const animation of root.listAnimations()) if(!animationsBefore.has(animation)){
    animation.setName(clip);
    for(const channel of animation.listChannels()){
      const target=nodesByName.get(channel.getTargetNode()?.getName()); if(target) channel.setTargetNode(target);
    }
  }
  for(const node of root.listNodes()) if(!nodesBefore.has(node)) node.dispose();
  for(const scene of root.listScenes().slice(1)) scene.dispose();
}
await document.transform(prune(),unpartition()); await io.write(`${base}/microfonildo-posed-source.glb`,document);
console.log('MICROFONILDO_POSED_SOURCE=ok');

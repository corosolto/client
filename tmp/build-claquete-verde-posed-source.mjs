import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';
const base=process.argv[2]||'references/tv/claquete-verde/3d/blender-v1'; const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document=await io.read(`${base}/claquete-verde-final-opt.glb`), root=document.getRoot(); const nodesByName=new Map(root.listNodes().map(n=>[n.getName(),n]));
for(const clip of ['idle','walk','crouch','death']){
 const beforeNodes=new Set(root.listNodes()), beforeAnimations=new Set(root.listAnimations()); mergeDocuments(document,await io.read(`${base}/anims/${clip}.glb`));
 for(const animation of root.listAnimations()) if(!beforeAnimations.has(animation)){animation.setName(clip); for(const ch of animation.listChannels()){const target=nodesByName.get(ch.getTargetNode()?.getName()); if(target) ch.setTargetNode(target)}}
 for(const node of root.listNodes()) if(!beforeNodes.has(node)) node.dispose(); for(const scene of root.listScenes().slice(1)) scene.dispose();
}
await document.transform(prune(),unpartition()); await io.write(`${base}/claquete-verde-posed-source.glb`,document); console.log('CLAQUETE_VERDE_POSED_SOURCE=ok');

/* build-claquete-v5-posed-source.mjs — funde os 11 clipes no GLB final para
   evidência visual. Cópia proposital da técnica de
   tmp/build-claquete-verde-posed-source.mjs (v1/v4), generalizada para N clipes:
   mergeDocuments + reancoragem de canal por NOME de nó. O Blender 5.x importa
   animação de GLB skinned como ação no slot da armadura; GLB de clipe solto vira
   ação por nó-EMPTY e não anima nada (medido em tmp/dbg-action.py: 25 slots
   'OBHips'... e hips congelado nos frames 0/80/160).

   uso: node tmp/build-claquete-v5-posed-source.mjs <modelo.glb> <dir-anims> <saida.glb> */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const [model, animsDir, out] = process.argv.slice(2);
if (!model || !animsDir || !out) throw new Error('uso: node tmp/build-claquete-v5-posed-source.mjs <modelo.glb> <dir-anims> <saida.glb>');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(model);
const root = document.getRoot();
const nodesByName = new Map(root.listNodes().map(n => [n.getName(), n]));
const clipFiles = fs.readdirSync(animsDir).filter(f => f.endsWith('.glb')).sort();
if (!clipFiles.length) throw new Error('nenhum clipe em ' + animsDir);
for (const cf of clipFiles) {
  const clip = cf.replace('.glb', '');
  const beforeNodes = new Set(root.listNodes());
  const beforeAnimations = new Set(root.listAnimations());
  mergeDocuments(document, await io.read(path.join(animsDir, cf)));
  for (const animation of root.listAnimations()) {
    if (beforeAnimations.has(animation)) continue;
    animation.setName(clip);
    for (const ch of animation.listChannels()) {
      const target = nodesByName.get(ch.getTargetNode()?.getName());
      if (target) ch.setTargetNode(target);
    }
  }
  for (const node of root.listNodes()) if (!beforeNodes.has(node)) node.dispose();
  for (const scene of root.listScenes().slice(1)) scene.dispose();
}
await document.transform(prune(), unpartition());
fs.mkdirSync(path.dirname(out), { recursive: true });
await io.write(out, document);
console.log('CV5_POSED_SOURCE=' + out + ' clipes=' + clipFiles.length);

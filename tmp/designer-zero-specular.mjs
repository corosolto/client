import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsSpecular } from '@gltf-transform/extensions';

const [input, output = input] = process.argv.slice(2);
if (!input) throw new Error('uso: node script input.glb [output.glb]');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const extension = document.createExtension(KHRMaterialsSpecular).setRequired(false);
for (const material of document.getRoot().listMaterials()) {
  if (!material.getName().startsWith('CS_UX_')) continue;
  const factor = material.getName() === 'CS_UX_HAIR_BLACK' ? 0.12 : 0;
  material.setExtension('KHR_materials_specular', extension.createSpecular().setSpecularFactor(factor));
}
await io.write(output, document);
console.log(`DESIGNER_ZERO_SPECULAR=${output}`);

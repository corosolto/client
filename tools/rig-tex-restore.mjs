// O auto-rig do Meshy (openapi/v1/rigging) devolve a MESMA malha com esqueleto+pesos,
// mas o material volta SÓ com o albedo: normal e metallicRoughness são descartados.
// Medido no padati em 04/08: original 3 texturas (base+normal+MR), rigado 1; malha
// idêntica (3.271 verts, mesmos UVs). Sem o normal map o toon shading expõe o facetado
// da malha — o "rosto esburacado" que o dono reportou na tela de seleção.
// Este passo devolve os mapas do GLB ORIGINAL do Mint ao GLB rigado. Ele assume o
// padrão Mint de 1 material por personagem e UVs preservados pelo rig (conferido:
// mesmo atlas de albedo). Roda ANTES do optimize-tribos.
// uso: node tools/rig-tex-restore.mjs <original.glb> <rigado.glb> <saida.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , origPath, rigPath, outPath] = process.argv;
if (!origPath || !rigPath || !outPath) {
  console.error('uso: rig-tex-restore <original.glb> <rigado.glb> <saida.glb>');
  process.exit(1);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const orig = await io.read(origPath);
const rig = await io.read(rigPath);

const oMats = orig.getRoot().listMaterials();
const rMats = rig.getRoot().listMaterials();
if (oMats.length !== 1 || rMats.length !== 1) {
  console.error(`esperado 1 material de cada lado (padrão Mint); achei orig=${oMats.length} rig=${rMats.length}`);
  process.exit(1);
}
const [oM, rM] = [oMats[0], rMats[0]];

const copyTex = (getter, setter) => {
  const t = oM[getter]();
  if (!t) return false;
  const nt = rig.createTexture(t.getName())
    .setImage(t.getImage())
    .setMimeType(t.getMimeType());
  rM[setter](nt);
  return true;
};
const temNormal = copyTex('getNormalTexture', 'setNormalTexture');
const temMR = copyTex('getMetallicRoughnessTexture', 'setMetallicRoughnessTexture');
const temOcc = copyTex('getOcclusionTexture', 'setOcclusionTexture');
const temEmis = copyTex('getEmissiveTexture', 'setEmissiveTexture');
rM.setMetallicFactor(oM.getMetallicFactor());
rM.setRoughnessFactor(oM.getRoughnessFactor());
rM.setEmissiveFactor(oM.getEmissiveFactor());

await io.write(outPath, rig);
console.log(`${outPath}: normal=${temNormal} mr=${temMR} occ=${temOcc} emis=${temEmis} metal=${oM.getMetallicFactor()} rough=${oM.getRoughnessFactor()}`);

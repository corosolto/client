// INGESTÃO DA ESTAÇÃO DO POSTO DA TRETA — conserta o export do Fab antes do pipeline
// de props do repo. Rodar assim (o arquivo cru NÃO está no git; ver public/models/props/FONTE.md):
//
//   node tools/ingest-posto-ipiranga.mjs <glb-cru> /tmp/props_raw/posto_ipiranga.glb
//   node tools/optimize-props.mjs          # dedup + WebP 1024 + prune -> public/models/props
//   npm run eval:posto                     # cobra o contrato do resultado
//
// O QUE ELE CONSERTA, e por que cada um é invisível se ninguém consertar:
//  (1) baseColorTexture aponta texCoord 0, mas o unwrap de cor está no UV1: a estação
//      entra CINZA no jogo, sem uma linha no console. (O `prune` do optimize-props
//      depois joga fora o UV que sobrou sem uso, e o arquivo final fica com um só.)
//  (2) alphaMode BLEND em material opaco: a estação entra TRANSLÚCIDA, parecendo fantasma.
//  (3) o modelo traz chão, calçada e grama próprios, que brigam em z com o asfalto do
//      mapa e fazem degrau de 1,3 m na beirada — as três malhas saem por material.
//  (4) a cena vem flutuando 3,47 m e fora da origem: pousa em y=0 e centra em x/z, que é
//      o que `placeProp` espera receber.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const FORA = new Set(['chao_calcada', 'grama_textura', 'chao_calcada_posto']);

for (const mat of root.listMaterials()) {
  const info = mat.getBaseColorTextureInfo();
  if (info) { console.log(`texCoord ${mat.getName()}: ${info.getTexCoord()} -> 1`); info.setTexCoord(1); }
  if (mat.getAlphaMode() === 'BLEND') { console.log(`alphaMode ${mat.getName()}: BLEND -> OPAQUE`); mat.setAlphaMode('OPAQUE'); }
}
let fora = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const nome = prim.getMaterial()?.getName();
    if (FORA.has(nome)) { console.log(`descarta malha do material ${nome}`); prim.dispose(); fora++; }
  }
  if (!mesh.listPrimitives().length) mesh.dispose();
}
const cena = root.listScenes()[0];
const b0 = getBounds(cena);
console.log('antes:', b0.min.map(n => n.toFixed(2)), '->', b0.max.map(n => n.toFixed(2)));
// pousa no chão e centra em x/z, mexendo só nos nós de raiz da cena
const dx = -(b0.min[0] + b0.max[0]) / 2, dy = -b0.min[1], dz = -(b0.min[2] + b0.max[2]) / 2;
for (const n of cena.listChildren()) {
  const t = n.getTranslation();
  n.setTranslation([t[0] + dx, t[1] + dy, t[2] + dz]);
}
const b1 = getBounds(cena);
console.log('depois:', b1.min.map(n => n.toFixed(2)), '->', b1.max.map(n => n.toFixed(2)));
console.log('malhas descartadas:', fora, '· malhas restantes:', root.listMeshes().length);
await io.write(process.argv[3], doc);

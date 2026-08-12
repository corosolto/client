import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log('== nodes ==');
for (const n of root.listNodes()) {
  const mesh = n.getMesh(); const skin = n.getSkin();
  const kids = n.listChildren().map(c=>c.getName());
  console.log(`node "${n.getName()}" mesh=${mesh?mesh.getName():'-'} skinned=${!!skin} children=[${kids.join(',')}] trans=${n.getTranslation().map(v=>v.toFixed(3))}`);
}
console.log('== meshes ==');
for (const m of root.listMeshes()) {
  let tris=0; for (const p of m.listPrimitives()) { const idx=p.getIndices(); tris+= (idx?idx.getCount():p.getAttribute('POSITION').getCount())/3; }
  const skinned = root.listNodes().some(n=>n.getMesh()===m && n.getSkin());
  console.log(`mesh "${m.getName()}" tris=${tris|0} skinned=${skinned} materials=${m.listPrimitives().map(p=>p.getMaterial()?.getName())}`);
}
console.log('== skins ==');
for (const s of root.listSkins()) console.log(`skin "${s.getName()}" joints=${s.listJoints().length}`);
console.log('== textures ==');
for (const t of root.listTextures()) { const img=t.getImage(); console.log(`tex "${t.getName()}" ${t.getMimeType()} ${(img.byteLength/1024)|0}KB size=${t.getSize()}`); }
console.log('== animations ==', root.listAnimations().length);
console.log('== materials ==');
for (const m of root.listMaterials()) console.log(`mat "${m.getName()}" baseTex=${!!m.getBaseColorTexture()} baseColor=${m.getBaseColorFactor().map(v=>v.toFixed(2))}`);

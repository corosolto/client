// Exporta geometria viva + GLBs reais para inspeção offline; não simula shaders WebGL.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, MAPS, initTextures, seedRandom } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';
import { registerFaunaTemplate, faunaAssetUrl } from '../../public/js/ambientlife.js';
import { MANSAO_SKY_ASSETS } from '../../public/js/mansao_ambience.js';
const out=path.resolve('artifacts/joa-recuperacao/offline');
fs.mkdirSync(out,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS), sources=[], textureJobs=[];
const textures=new Map();
async function loadImage(file) {
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const t=new THREE.DataTexture(new Uint8Array(data),info.width,info.height);
  t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}
const urls=[...fs.readFileSync('public/js/map_mansao.js','utf8').matchAll(/load\('(\/[^']+)'/g)].map(m=>m[1]);
urls.push('/img/textures/sky_joa.webp','/img/textures/faixa_aviao.webp');
for(const u of urls) textures.set(u,await loadImage(`public${u}`));
const originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(url,...args){const u=url.split('?')[0];return textures.get(u)?.clone()||originalLoad.call(this,url,...args);};
async function glb(file) {
  const data=fs.readFileSync(file);sources.push({file,sha256:crypto.createHash('sha256').update(data).digest('hex')});
  const doc=await io.read(file), mats=new Map(), tex=new Map();
  for(const t of doc.getRoot().listTextures()) if(t.getImage()) tex.set(t,await loadImage(Buffer.from(t.getImage())));
  for(const m of doc.getRoot().listMaterials()) {
    const c=m.getBaseColorFactor(), mat=new THREE.MeshStandardMaterial({color:new THREE.Color(...c.slice(0,3)),opacity:c[3],roughness:m.getRoughnessFactor(),metalness:m.getMetallicFactor(),side:m.getDoubleSided()?THREE.DoubleSide:THREE.FrontSide,transparent:m.getAlphaMode()==='BLEND',alphaTest:m.getAlphaMode()==='MASK'?m.getAlphaCutoff():0});
    mat.map=tex.get(m.getBaseColorTexture())||null;
    if(mat.map) mat.map.flipY=false;
    mats.set(m,mat);
  }
  function node(n) {
    const o=new THREE.Group();o.name=n.getName();o.position.fromArray(n.getTranslation());o.quaternion.fromArray(n.getRotation());o.scale.fromArray(n.getScale());
    for(const p of n.getMesh()?.listPrimitives()||[]) {
      if(p.getMode()!==4)throw Error(`modo GLB não triangular: ${file}`);
      const geo=new THREE.BufferGeometry();
      for(const [a,b] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['COLOR_0','color']]) {const attr=p.getAttribute(a);if(attr)geo.setAttribute(b,new THREE.BufferAttribute(attr.getArray().slice(),attr.getElementSize(),attr.getNormalized()));}
      if(p.getIndices())geo.setIndex(new THREE.BufferAttribute(p.getIndices().getArray().slice(),1));
      if(!geo.attributes.normal)geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,mats.get(p.getMaterial()));mesh.name=n.getName();o.add(mesh);
    }
    for(const c of n.listChildren())o.add(node(c));return o;
  }
  const root=new THREE.Group();for(const n of doc.getRoot().getDefaultScene().listChildren())root.add(node(n));return root;
}
for(const id of MAPS.mansao.props)registerPropTemplate(id,await glb(`public/models/props/${id}.glb`));
for(const id of MAPS.mansao.ambience)registerFaunaTemplate(id,await glb(`public/${faunaAssetUrl(id)}`));
for(const [id,url] of Object.entries(MANSAO_SKY_ASSETS))registerFaunaTemplate(id,await glb(`public/${url}`));
seedRandom(14000);const scene=new THREE.Scene(),world=MAPS.mansao.build(scene,initTextures());
world.update(.016);world.ambience.update(1/60,new THREE.Vector3(0,0,0));scene.updateMatrixWorld(true);
const geometry=new Map(),materials=new Map(),images=new Map(),objects=[];
function material(m) {
  if(materials.has(m.uuid))return m.uuid;
  let texture=null;
  if(m.map?.image?.data) {
    const t=m.map,key=t.uuid;
    if(!images.has(key)) {
      const file=`texture-${images.size}.png`;images.set(key,file);
      const raw=Buffer.from(t.image.data.buffer,t.image.data.byteOffset,t.image.data.byteLength);
      textureJobs.push(sharp(raw,{raw:{width:t.image.width,height:t.image.height,channels:4}}).png().toFile(path.join(out,file)));
    }
    texture={file:images.get(key),repeat:t.repeat.toArray(),offset:t.offset.toArray(),flipY:t.flipY,mirror:t.wrapS===THREE.MirroredRepeatWrapping};
  }
  const water=m.isShaderMaterial&&m.uniforms?.uCorRasa;
  materials.set(m.uuid,{id:m.uuid,color:(water?m.uniforms.uCorRasa.value:m.color)?.toArray()||[.5,.5,.5],roughness:m.roughness??(water?.22:1),metalness:m.metalness||0,opacity:m.opacity??1,emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity||0,texture,water:!!water});return m.uuid;
}
scene.traverseVisible(o=>{
  if(!o.isMesh||!o.geometry.attributes.position||o.material?.visible===false)return;
  const geo=o.geometry;
  if(!geometry.has(geo.uuid))geometry.set(geo.uuid,{id:geo.uuid,position:Array.from(geo.attributes.position.array),uv:geo.attributes.uv?Array.from(geo.attributes.uv.array):null,color:geo.attributes.color?Array.from(geo.attributes.color.array):null,index:geo.index?Array.from(geo.index.array):null,groups:geo.groups});
  const mats=(Array.isArray(o.material)?o.material:[o.material]).map(material);
  const push=(matrix)=>objects.push({name:o.name||o.userData.mansaoFeature||o.userData.praiaFeature||'mesh',geometry:geo.uuid,materials:mats,matrix:matrix.toArray()});
  if(o.isInstancedMesh)for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);push(o.matrixWorld.clone().multiply(m));}
  else push(o.matrixWorld);
});
await Promise.all(textureJobs);
const lights=[];scene.traverse(o=>{if(o.isLight)lights.push({type:o.type,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray()});});
fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify({source:'MAPS.mansao.build with disk GLBs; Blender translation, no WebGL shaders/postprocessing',sources,geometry:[...geometry.values()],materials:[...materials.values()],objects,lights,ambience:world.ambience.debugSnapshot()}));
console.log(JSON.stringify({out,objects:objects.length,geometry:geometry.size,materials:materials.size,textures:images.size,assets:sources.length}));

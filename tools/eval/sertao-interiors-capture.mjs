/* Exporta geometria Node/proxy e céu efetivo para inspeção offline em Blender.
   Não certifica materiais GLB, pós-processamento ou leitura WebGL. */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const out=process.argv[2] || 'artifacts/sertao-casas/after';
mkdirSync(out,{recursive:true});
const scene=new THREE.Scene();
const saved=globalThis.window; delete globalThis.window;
const world=MAPS.velho_oeste.build(scene,await initTextures()); globalThis.window=saved;
world.root.updateMatrixWorld(true);
const geometry=[];
world.root.traverseVisible(o=>{
  if(!o.isMesh || Array.isArray(o.material)) return;
  const append=matrix=>{
    const g=o.geometry.clone().applyMatrix4(matrix);g.computeBoundingBox();
    const b=g.boundingBox;
    if(b.max.x < -38 || b.min.x > 38 || b.max.z < -48 || b.min.z > 48 || b.max.y>80){g.dispose();return;}
    geometry.push({name:o.name||o.parent.name,position:Array.from(g.attributes.position.array),index:g.index?Array.from(g.index.array):null,color:o.material.color?.toArray()||[.5,.5,.5],roughness:o.material.roughness??1,metalness:o.material.metalness??0});g.dispose();
  };
  if(o.isInstancedMesh) for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);append(matrix.premultiply(o.matrixWorld));}
  else append(o.matrixWorld);
});
const sky=scene.background.image;
if(!sky?.data) throw Error('Céu procedural efetivo ausente');
await sharp(Buffer.from(sky.data),{raw:{width:sky.width,height:sky.height,channels:4}}).flip().png().toFile(`${out}/sky.png`);
writeFileSync(`${out}/geometry.json`,JSON.stringify(geometry));
const hashes=Object.fromEntries(['public/js/map_velho_oeste.js','public/js/look.js','public/js/map_sky.js'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync(`${out}/receipt.json`,JSON.stringify({scope:'Node/proxy; materiais planos; sem GLBs assíncronos ou pós-processamento WebGL',hashes,meshes:geometry.length,look:LOOK.velho_oeste},null,2));
console.log(JSON.stringify({out,meshes:geometry.length,hashes}));

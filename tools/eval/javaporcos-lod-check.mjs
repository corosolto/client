import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import * as THREE from 'three';
import {registrarGeometriaDistante,prepararPassada,selecionarDetalhePassada,atualizarPassada} from '../../public/js/javaporcos_passada.js';
import {MODELOS_JAVAPORCOS} from '../../public/js/data/javaporcos_modelos.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),mutant=process.argv.includes('--mutante=sem-lod');
const hash=b=>createHash('sha256').update(b).digest('hex');
function geometry(p){const g=new THREE.BufferGeometry();for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=p.getAttribute(semantic);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray().slice(),a.getElementSize()));}g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray().slice(),1));return g;}
for(const name of Object.values(MODELOS_JAVAPORCOS)){
 const base=`public/models/enemies/javaporcos/${name}`,a=await io.read(base+'.glb'),b=await io.read(base+'_lod.glb');
 const pa=a.getRoot().listMeshes().flatMap(m=>m.listPrimitives()),pb=b.getRoot().listMeshes().flatMap(m=>m.listPrimitives());assert.equal(pa.length,pb.length);
 const tris=p=>p.reduce((s,p)=>s+p.getIndices().getCount()/3,0);assert.ok(tris(pb)<tris(pa)*.70);
 const ba=getBounds(a.getRoot().listScenes()[0]),bb=getBounds(b.getRoot().listScenes()[0]);for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(ba[key][i]-bb[key][i])<.01);
 assert.deepEqual(a.getRoot().listTextures().map(t=>hash(t.getImage())),b.getRoot().listTextures().map(t=>hash(t.getImage())));
 assert.deepEqual(a.getRoot().listMaterials().map(m=>[m.getBaseColorFactor(),m.getRoughnessFactor(),m.getMetallicFactor()]),b.getRoot().listMaterials().map(m=>[m.getBaseColorFactor(),m.getRoughnessFactor(),m.getMetallicFactor()]));
 for(let i=0;i<pa.length;i++){const high=geometry(pa[i]),low=geometry(pb[i]);registrarGeometriaDistante(high,low);const root=new THREE.Group();root.add(new THREE.Mesh(high,new THREE.MeshBasicMaterial()));prepararPassada(root);const rig=root.userData.passada.rigs[0];assert.ok(rig);selecionarDetalhePassada(root,0);assert.ok(rig.mesh.geometry===rig.geometry);selecionarDetalhePassada(root,20,mutant?'sem-lod':'');assert.ok(rig.mesh.geometry===rig.distante,'LOD distante não ativou');assert.ok(rig.mesh.geometry.attributes.skinWeight);selecionarDetalhePassada(root,17);assert.ok(rig.mesh.geometry===rig.distante);selecionarDetalhePassada(root,15);assert.ok(rig.mesh.geometry===rig.geometry);}
 console.log(`✓ LOD ${name}: ${tris(pa)} → ${tris(pb)} tris; texturas/materiais íntegros, volume <1%, skin e histerese`);
 for(const prim of [pa[0],pb[0]]){
  const root=new THREE.Group(),geo=geometry(prim);geo.computeBoundingBox();root.position.y=-geo.boundingBox.min.y;root.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial()));prepararPassada(root);
  const rig=root.userData.passada.rigs[0],attr=rig.geometry.attributes.position,indices=rig.feet.map(foot=>{for(let i=0;i<attr.count;i++)if(new THREE.Vector3().fromBufferAttribute(attr,i).distanceToSquared(foot)<1e-12)return i;throw Error('pata ausente');});
  const pos=new THREE.Vector3(),world={groundHeightAt:()=>0};let previous=null,supported=0;
  for(let frame=0;frame<240;frame++){
   pos.z=frame*.01;root.position.z=pos.z;atualizarPassada(root,pos,world,frame/60);root.updateMatrixWorld(true);
   const feet=indices.map(i=>{const v=new THREE.Vector3().fromBufferAttribute(attr,i);rig.mesh.applyBoneTransform(i,v);return rig.mesh.localToWorld(v);});
   if(previous&&feet.filter((v,i)=>Math.abs(v.y)<1e-6&&Math.hypot(v.x-previous[i].x,v.z-previous[i].z)<1e-6).length>=2)supported++;
   previous=feet;
  }
  assert.ok(supported>225,`${name}: ${supported}/239 quadros com duas patas apoiadas e imóveis`);
 }
 console.log(`✓ Passada ${name}: duas patas apoiadas sem deslizar em >94% dos quadros, perto e LOD`);
}

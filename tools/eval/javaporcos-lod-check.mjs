import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import * as THREE from 'three';
import {registrarGeometriaDistante,prepararPassada,selecionarDetalhePassada} from '../../public/js/javaporcos_passada.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),mutant=process.argv.includes('--mutante=sem-lod');
const hash=b=>createHash('sha256').update(b).digest('hex');
function geometry(p){const g=new THREE.BufferGeometry();for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=p.getAttribute(semantic);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray().slice(),a.getElementSize()));}g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray().slice(),1));return g;}
for(const name of ['javali_jovem','javaporco_adulto','matriarca_javali','ariete_javali']){
 const base=`public/models/enemies/javaporcos/${name}`,a=await io.read(base+'.glb'),b=await io.read(base+'_lod.glb');
 const pa=a.getRoot().listMeshes().flatMap(m=>m.listPrimitives()),pb=b.getRoot().listMeshes().flatMap(m=>m.listPrimitives());assert.equal(pa.length,pb.length);
 const tris=p=>p.reduce((s,p)=>s+p.getIndices().getCount()/3,0);assert.ok(tris(pb)<tris(pa)*.65);
 const ba=getBounds(a.getRoot().listScenes()[0]),bb=getBounds(b.getRoot().listScenes()[0]);for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(ba[key][i]-bb[key][i])<.01);
 assert.deepEqual(a.getRoot().listTextures().map(t=>hash(t.getImage())),b.getRoot().listTextures().map(t=>hash(t.getImage())));
 assert.deepEqual(a.getRoot().listMaterials().map(m=>[m.getBaseColorFactor(),m.getRoughnessFactor(),m.getMetallicFactor()]),b.getRoot().listMaterials().map(m=>[m.getBaseColorFactor(),m.getRoughnessFactor(),m.getMetallicFactor()]));
 for(let i=0;i<pa.length;i++){const high=geometry(pa[i]),low=geometry(pb[i]);registrarGeometriaDistante(high,low);const root=new THREE.Group();root.add(new THREE.Mesh(high,new THREE.MeshBasicMaterial()));prepararPassada(root);const rig=root.userData.passada.rigs[0];assert.ok(rig);selecionarDetalhePassada(root,0);assert.ok(rig.mesh.geometry===rig.geometry);selecionarDetalhePassada(root,20,mutant?'sem-lod':'');assert.ok(rig.mesh.geometry===rig.distante,'LOD distante não ativou');assert.ok(rig.mesh.geometry.attributes.skinWeight);selecionarDetalhePassada(root,17);assert.ok(rig.mesh.geometry===rig.distante);selecionarDetalhePassada(root,15);assert.ok(rig.mesh.geometry===rig.geometry);}
 console.log(`✓ LOD ${name}: ${tris(pa)} → ${tris(pb)} tris; texturas/materiais íntegros, volume <1%, skin e histerese`);
}

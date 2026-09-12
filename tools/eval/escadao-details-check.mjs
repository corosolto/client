import assert from 'node:assert/strict';
import * as THREE from '../../public/vendor/three.module.js';
import { registerPropTemplate } from '../../public/js/mapprops.js';
import { buildEscadaoDetails } from '../../public/js/map_escadao_details.js';
const template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial()));
registerPropTemplate('escadao_varanda_r4',template);
const root=new THREE.Group(),occluders=[];
const addBox=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y+h/2,z);root.add(mesh);occluders.push(mesh);return mesh;};
buildEscadaoDetails({root,addBox,occluders,enabled:true});root.updateMatrixWorld(true);
if(process.argv.includes('--mutante=grupo')){occluders.length=0;occluders.push(root.getObjectByName('escadao_varanda_r4'));}
const ray=new THREE.Raycaster(new THREE.Vector3(2.55,3.25,15),new THREE.Vector3(0,0,1),0,5);
assert.ok(ray.intersectObjects(occluders,false).length>0,'Raycast de bala não recursivo encontra malha do prop');
console.log('DETAILS PASS: malha estática visível intercepta tiro');

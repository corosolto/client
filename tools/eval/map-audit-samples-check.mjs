import assert from 'node:assert/strict';
import { THREE } from './three-node.mjs';
import { amostraBaricentrica } from './map-audit-samples.mjs';

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute([-3.75,0,-3.75,3.75,0,-3.75,0,1.3,-3.75],3));
geo.setIndex([0,2,1]);
const mesh = new THREE.Mesh(geo,new THREE.MeshBasicMaterial());
mesh.position.set(9,6.6624999940395355,-26);mesh.rotation.y=.08;mesh.updateMatrixWorld(true);
const pos=geo.attributes.position,idx=geo.index;
const a=new THREE.Vector3().fromBufferAttribute(pos,idx.getX(0)).applyMatrix4(mesh.matrixWorld);
const e1=new THREE.Vector3().fromBufferAttribute(pos,idx.getX(1)).applyMatrix4(mesh.matrixWorld).sub(a);
const e2=new THREE.Vector3().fromBufferAttribute(pos,idx.getX(2)).applyMatrix4(mesh.matrixWorld).sub(a);
const normal=new THREE.Vector3().crossVectors(e1,e2).normalize();
const uv={},point=new THREE.Vector3(),ray=new THREE.Raycaster();
const medir=mutante=>{
 let falhas=0;
 for(let k=0;k<900;k++){
  amostraBaricentrica(k,uv,mutante);
  assert.ok(uv.u>0&&uv.v>0&&uv.u+uv.v<=1);
  point.copy(a).addScaledVector(e1,uv.u).addScaledVector(e2,uv.v);
  ray.set(point.clone().addScaledVector(normal,.35),normal.clone().negate());ray.far=.7;
  if(!ray.intersectObject(mesh,false).length)falhas++;
 }
 return falhas;
};
assert.equal(medir(''),0,'sonda perdeu a própria face visível');
assert.ok(medir('borda-exata')>0,'fixture não reproduziu instabilidade da aresta');
console.log('MAP4 amostras: 900 hits; mutante de aresta exata detectado');

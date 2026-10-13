import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TRETA_EYEWEAR} from '../../public/js/treta-catalog.js';
const root=new URL('../../public/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('models/items/eyewear-manifest.json',root)));
function check(data){
 assert.equal(Object.keys(data.eyewear).length,TRETA_EYEWEAR.length);
 for(const spec of TRETA_EYEWEAR){
  const entry=data.eyewear[spec.id];assert(entry,`Missing ${spec.id}`);assert.equal(entry.price,spec.price);assert.equal(spec.price,200);
  assert.match(entry.model,/^\/models\/items\/[a-z0-9-]+\.glb$/);assert.match(entry.poster,/^\/img\/items\/[a-z0-9-]+\.webp$/);
  const bytes=readFileSync(new URL(entry.model.slice(1),root));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'GLB hash mismatch');
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert(gltf.meshes?.length && gltf.materials?.length,'Real mesh/material required');
  let triangles=0;for(const mesh of gltf.meshes)for(const p of mesh.primitives){assert.equal(p.mode ?? 4,4);triangles+=gltf.accessors[p.indices ?? p.attributes.POSITION].count/3;}
  assert.equal(triangles,entry.triangles);assert(existsSync(new URL(entry.poster.slice(1),root)),'Poster missing');assert.match(entry.source,/^https:\/\/mint\.gg\/project\/[a-z0-9]+\?chat=[a-z0-9]+$/);assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);
  if(entry.approved){assert(Object.values(entry.profiles).some(p=>p.approved && [p.width,p.height,p.depth].every(Number.isFinite)),'Approved asset needs a real fit');}
 }
}
check(manifest);
for(const mutate of [m=>m.eyewear['metal-de-rua'].sha256='0'.repeat(64),m=>m.eyewear['metal-de-rua'].price=1,m=>{m.eyewear['metal-de-rua'].approved=true;m.eyewear['metal-de-rua'].profiles={};}]){const broken=structuredClone(manifest);mutate(broken);assert.throws(()=>check(broken),'asset mutation survived');}
console.log('PASS: six Mint assets, hashes, geometry, posters, 200 T$ and closed-fit gate; three mutations detected');

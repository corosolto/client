import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readGLB} from './tp-mount-probe.mjs';
const root=new URL('../../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('public/models/items/eyewear-manifest.json',root)));
let totalBytes=0;
for(const [id,entry] of Object.entries(manifest.eyewear)){
 assert(/^[a-z0-9-]+$/.test(id),'Invalid item ID');
 assert(/^\/models\/items\/[a-z0-9-]+\.glb$/.test(entry.model),'Invalid local model path');
 assert(/^\/img\/items\/[a-z0-9-]+\.webp$/.test(entry.poster),'Invalid local poster path');
 const file=new URL('public'+entry.model,root),data=fs.readFileSync(file);
 assert.equal(data.length,entry.bytes,`${id}: byte count mismatch`);
 assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,`${id}: hash mismatch`);
 assert(data.length<1500000,`${id}: exceeds existing skin GLB size budget`);
 assert(fs.statSync(new URL('public'+entry.poster,root)).size>1000,`${id}: poster missing`);
 const {json}=readGLB(file.pathname);
 assert(json.meshes?.length>0,`${id}: no geometry`);
 const triangles=json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>{
  assert.equal(p.mode??4,4,`${id}: unsupported primitive mode`);
  return n+json.accessors[p.indices??p.attributes.POSITION].count/3;
 },0);
 assert.equal(triangles,entry.triangles,`${id}: triangle provenance mismatch`);
 if(entry.approved===true)assert(Object.values(entry.profiles||{}).some(p=>p.approved===true),`${id}: approval without approved fit`);
 totalBytes+=data.length;
}
console.log(`PASS: ${Object.keys(manifest.eyewear).length} item assets, ${totalBytes} bytes; hashes, geometry, posters and approval prerequisites. No visual fit approval.`);

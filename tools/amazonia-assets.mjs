// Derivados exclusivos da Amazônia: preservam os originais e registram hashes.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const tris=d=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
const report=[];
for(const id of ['arvore_mata','palmeira_babacu','palafita_pro']){
 const source=`public/models/props/${id}.glb`,target=`public/models/props/${id}_amazonia.glb`,d=await io.read(source),before=tris(d);
 if(id==='palafita_pro'){
  for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){
   const pos=p.getAttribute('POSITION'),idx=p.getIndices(),kept=[],v=[0,0,0],ys=[];
   for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);ys.push(v[1]);}
   const minY=Math.min(...ys),scale=6/(Math.max(...ys)-minY),a=idx.getArray();
   for(let i=0;i<a.length;i+=3){
    const vs=[a[i],a[i+1],a[i+2]].map(j=>{pos.getElement(j,v);return [v[0]*scale,1.1+(v[1]-minY)*scale,v[2]*scale];});
    const stair=vs.every(([x,y,z])=>x> -1.72&&x<-.55&&z>-.32&&z<2.08&&y<4.7);
    if(!stair)kept.push(...a.slice(i,i+3));
   }
   idx.setArray(new Uint32Array(kept));
  }
  await d.transform(prune());
 }else await d.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.5,error:.015}),prune());
 await io.write(target,d);
 report.push({source,target,sourceSHA256:hash(source),sha256:hash(target),before,after:tris(d),bytes:readFileSync(target).length});
}
mkdirSync('artifacts/amazonia-visual',{recursive:true});
writeFileSync('artifacts/amazonia-visual/derived-assets.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

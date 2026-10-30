import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {writeFileSync,mkdirSync} from 'node:fs';
await MeshoptSimplifier.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),reports=[];
for(const name of ['javali_jovem','javaporco_adulto','matriarca_javali','ariete_javali']){
 const source=`public/models/enemies/javaporcos/${name}.glb`,doc=await io.read(source),tris=()=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0),before=tris(),bounds=getBounds(doc.getRoot().listScenes()[0]);
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.30,error:.01}),prune());
 const after=tris(),target=`public/models/enemies/javaporcos/${name}_lod.glb`;await io.write(target,doc);reports.push({name,before,after,bounds,afterBounds:getBounds(doc.getRoot().listScenes()[0]),target});
}
mkdirSync('artifacts/javaporcos-feedback-20261030/lod',{recursive:true});
writeFileSync('artifacts/javaporcos-feedback-20261030/lod/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));

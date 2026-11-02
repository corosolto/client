import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {writeFileSync,readFileSync,statSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MODELOS_JAVAPORCOS} from '../public/js/data/javaporcos_modelos.js';
await MeshoptSimplifier.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),reports=[];
const manifestPath='public/models/enemies/javaporcos/asset-manifest.json',manifest=JSON.parse(readFileSync(manifestPath));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const name of Object.values(MODELOS_JAVAPORCOS)){
 const source=`public/models/enemies/javaporcos/${name}.glb`,doc=await io.read(source),tris=()=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0),before=tris(),bounds=getBounds(doc.getRoot().listScenes()[0]);
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.30,error:.01}),prune());
 const after=tris(),target=`public/models/enemies/javaporcos/${name}_lod.glb`;await io.write(target,doc);reports.push({name,before,after,bounds,afterBounds:getBounds(doc.getRoot().listScenes()[0]),target});
 const id=name.replaceAll('_','-')+'-lod';manifest.assets=manifest.assets.filter(a=>a.id!==id);manifest.assets.push({id,provider:'Derivado local de Mint',source,sourceSha256:hash(source),runtime:target,bytes:statSync(target).size,sha256:hash(target),recipe:'tools/javaporcos-lod.mjs; weld + simplify ratio0.30 error0.01; texturas intactas'});
}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
mkdirSync('artifacts/javaporcos-feedback-20261030/lod',{recursive:true});
writeFileSync('artifacts/javaporcos-feedback-20261030/lod/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));

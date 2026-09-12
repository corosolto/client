import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,textureCompress,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),reports=[];
for(const [name,id,ratio,tex] of [['hen','galinha_mint_amazonia',.8,1024],['chick','pintinho_mint_amazonia',.48,512]]){
 const source=`artifacts/amazonia-visual/fauna-round2/${name}-mint.glb`,target=`public/models/props/${id}.glb`,doc=await io.read(source);
 const tris=()=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0),before=tris();
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio,error:.002}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[tex,tex]}),prune());
 await io.write(target,doc);
 const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 reports.push({id,source,target,before,after:tris(),bounds:getBounds(doc.getRoot().listScenes()[0]),sourceSHA256:hash(source),sha256:hash(target),bytes:readFileSync(target).length});
}
writeFileSync('artifacts/amazonia-visual/fauna-round2/assets.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
const boat=await io.read('public/models/props/canoa_rabeta_amazonia.glb');console.log('boat bounds',getBounds(boat.getRoot().listScenes()[0]));

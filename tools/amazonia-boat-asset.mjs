// Derivação local do GLB Mint, sem alterar o original arquivado.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';
await MeshoptSimplifier.ready;
const source='artifacts/amazonia-visual/canoa-rabeta-mint-original.glb',target='public/models/props/canoa_rabeta_amazonia.glb';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),d=await io.read(source);
const tris=()=>d.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0),before=tris();
await d.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.78,error:.004}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}),prune());
await io.write(target,d);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={source,target,sourceURL:'https://cdn.mint.gg/glb/teal-stripe-riverboat-normalized-47262040d7fd2207.glb',chat:'https://mint.gg/project/zd7cbsyxbzmf05b3w084t51ymd8c5hfr?chat=ph741qaase7ng7c5gbq3348t658dwt3n',sourceSHA256:hash(source),sha256:hash(target),before,after:tris(),bytes:readFileSync(target).length};
writeFileSync('artifacts/amazonia-visual/boat-asset.json',JSON.stringify(report,null,2));console.log(report);

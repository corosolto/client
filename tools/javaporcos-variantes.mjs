import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress,getBounds} from '@gltf-transform/functions';
import sharp from 'sharp';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const variants=[
 ['leitao-listrado','leitao_listrado','ks72s7n7xpvss3hp3vncm5xd2h8h8w2w'],
 ['velho-cicatrizado','javaporco_velho_cicatrizado','ks70t3c3mkxgtszkhd7wb1q54n8h88xn'],
 ['ruivo','javaporco_ruivo','ks7c1r9d83q0d6ekjd3m6747vx8h8qgm'],
 ['malhado','javaporco_malhado','ks77ht2fkgabbttc2mqq96p0x98h962g'],
];
const path='public/models/enemies/javaporcos/asset-manifest.json',manifest=JSON.parse(readFileSync(path));
const registryPath='mint-assets.json',registry=JSON.parse(readFileSync(registryPath));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
mkdirSync('references/glb',{recursive:true});
for(const [raw,name,id]of variants){
 const source=`references/glb/${name}.glb`,runtime=`public/models/enemies/javaporcos/${name}.glb`;
 copyFileSync(`artifacts/javaporcos-feedback-20261030/mint/${raw}-raw.glb`,source);
 const doc=await io.read(source),before=getBounds(doc.getRoot().listScenes()[0]);
 await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512],quality:90}),prune());
 const bounds=getBounds(doc.getRoot().listScenes()[0]);
 if(JSON.stringify(before)!==JSON.stringify(bounds))throw Error(`volume alterado: ${name}`);
 await io.write(runtime,doc);
 const entry={id:name.replaceAll('_','-'),provider:'Mint asset pack',pack:'th7f82d138zgbc9bzs2c3032f58h9f8g',asset:id,url:`https://mint.gg/assets?asset=${id}`,source,sourceSha256:hash(source),runtime,bytes:statSync(runtime).size,sha256:hash(runtime),recipe:'tools/javaporcos-variantes.mjs; texturas WebP 512 quality90; geometria original'};
 manifest.assets=manifest.assets.filter(a=>a.id!==entry.id);manifest.assets.push(entry);
 registry.assets[entry.id]={artifactType:'model/gltf-binary',files:[runtime,runtime.replace('.glb','_lod.glb')],source:{kind:'mint-model',assetId:id,assetPackId:entry.pack,chatUrl:'https://mint.gg/chat/ph73ry10s4j7w9gtzw6k8vqqqx8h8jmk',displayName:name,notes:'Original preservado em references/glb; WebP512/quality90 e LOD local. Procedência e hashes em public/models/enemies/javaporcos/asset-manifest.json.'},processing:{tools:['tools/javaporcos-variantes.mjs','tools/javaporcos-lod.mjs'],finalSha256:entry.sha256}};
 console.log({name,bytes:entry.bytes,primitives:doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).length,bounds});
}
manifest.generatedAt='2026-10-30';writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');

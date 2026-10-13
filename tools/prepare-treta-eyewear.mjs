import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,unpartition,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.env.TRETA_EYEWEAR_PRIVATE_ROOT;
if(!root)throw new Error('Set TRETA_EYEWEAR_PRIVATE_ROOT to the private Mint directory');
const output=resolve('public/models/items'),posters=resolve('public/img/items');mkdirSync(output,{recursive:true});mkdirSync(posters,{recursive:true});
const production=JSON.parse(readFileSync(join(root,'mint-production.json'))),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),manifest={schema:1,eyewear:{}};
const previous=existsSync(join(output,'eyewear-manifest.json'))?JSON.parse(readFileSync(join(output,'eyewear-manifest.json'))).eyewear:{};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const job of production.jobs){
 const source=readFileSync(join(root,job.file));if(sha(source)!==job.sha256)throw new Error(`Source hash changed: ${job.slug}`);
 const doc=await io.read(join(root,job.file));
 await doc.transform(dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512]}),prune(),unpartition());
 const bytes=await io.writeBinary(doc),hash=sha(bytes),filename=`${job.slug}-${hash.slice(0,12)}.glb`;
 const approved=previous[job.slug]?.sha256===hash?previous[job.slug]:null;
 writeFileSync(join(output,filename),bytes);
 await sharp(join(root,'mint-references',`${job.id}.png`)).resize({width:640,height:480,fit:'inside'}).webp({quality:85}).toFile(join(posters,`${job.slug}.webp`));
 manifest.eyewear[job.slug]={name:job.name,price:200,model:`/models/items/${filename}`,poster:`/img/items/${job.slug}.webp`,approved:approved?.approved===true,preview:true,profiles:approved?.profiles || {},sha256:hash,bytes:bytes.length,sourceSha256:job.sha256,source:job.chat,review:job.isolatedReview || 'fit pending',triangles:job.triangles};
 console.log(`${job.slug}: ${bytes.length} B, ${job.triangles} triangles, 512px textures; fit approval pending`);
}
writeFileSync(join(output,'eyewear-manifest.json'),JSON.stringify(manifest,null,2)+'\n');

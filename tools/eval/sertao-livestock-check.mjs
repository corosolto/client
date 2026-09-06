import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { runInNewContext } from 'node:vm';
const mut=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
const expected={'sem-rig':'LA2','sem-clipe':'LA2','textura-ausente':'LA3','hash-divergente':'LA1','cache-velho':'LA4'};
if(mut&&!expected[mut])throw Error('Mutante desconhecido');
const registry=JSON.parse(readFileSync('mint-assets.json','utf8')).assets;
const rows=[];
for(const [name,count] of [['cabra',2],['galinha',1],['pintinho',3]]){
 const file=`public/models/ambient/sertao_${name}.glb`;
 if(!existsSync(file)){rows.push({name,missing:true});continue;}
 const bytes=readFileSync(file),length=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
 if(name==='cabra'){
  if(mut==='sem-rig'){if(!j.skins?.length)throw Error('Mutante não aplicado');j.skins=[];}
  if(mut==='sem-clipe'){const i=j.animations.findIndex(a=>a.name==='Walk');if(i<0)throw Error('Mutante não aplicado');j.animations.splice(i,1);}
  if(mut==='textura-ausente'){if(!j.images?.length)throw Error('Mutante não aplicado');j.images=[];}
  if(mut==='hash-divergente')bytes[bytes.length-1]^=1;
 }
 const metadata=[];
 for(const image of j.images||[]){const v=j.bufferViews[image.bufferView];metadata.push(await sharp(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).metadata());}
 const primitives=j.meshes.flatMap(m=>m.primitives);
 const tris=primitives.reduce((n,p)=>n+j.accessors[p.indices??p.attributes.POSITION].count/3,0);
 const entry=registry[`sertao-${name}-animada`];
 const hash=createHash('sha256').update(bytes).digest('hex');
 const rigged=j.skins?.length===1 && j.nodes.some(n=>n.skin===0) && primitives.every(p=>p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined);
 const animated=['Walk','Idle'].every(name=>j.animations?.some(a=>a.name===name&&a.channels.length>0&&a.samplers.every(s=>j.accessors[s.input].count>1)));
 const footNodes=j.nodes.map(n=>n.name).filter(n=>n?.startsWith('Foot_'));
 rows.push({name,count,tris,bytes:bytes.length,hash,provenance:entry?.processing?.finalSha256===hash
  && entry?.source?.termsUrl==='https://docs.mint.gg/terms-of-service',rigged,animated,footNodes,
  meshCount:j.meshes.length,materialCount:j.materials.length,textures:metadata.map(m=>({width:m.width,height:m.height})),
  textured:primitives.every(p=>j.materials[p.material]?.pbrMetallicRoughness?.baseColorTexture!==undefined)});
}
const source=readFileSync('public/js/ambientlife.js','utf8'),start=source.indexOf('export async function preloadAmbientLife'),end=source.indexOf('\n}',start)+2;
if(start<0||end<2)throw Error('Preloader não encontrado');
let fn=source.slice(start,end).replace('export ','');
if(mut==='cache-velho'){const next=fn.replace('?v=${revision}','?v=${VERSION}');if(next===fn)throw Error('Mutante não aplicado');fn=next;}
const urls=[],assets={sertaoGoat:'models/ambient/sertao_cabra.glb',sertaoHen:'models/ambient/sertao_galinha.glb',sertaoChick:'models/ambient/sertao_pintinho.glb'};
const preload=runInNewContext(`(${fn})`,{ASSETS:assets,FAVELA_AMBIENCE_ASSETS:[],templates:new Map(),VERSION:'fixture',console,
 loadGLB:async url=>{urls.push(url);return {scene:{traverse(){}},animations:[]}}});
await preload(Object.keys(assets));
const checks={
 LA1:rows.length===3&&rows.every(r=>!r.missing&&r.provenance),
 LA2:rows.every(r=>r.rigged&&r.animated&&r.footNodes.length===(r.name==='cabra'?4:2)),
 LA3:rows.every(r=>r.meshCount===1&&r.materialCount===1&&r.textured&&r.textures.length===1&&r.textures.every(t=>t.width<=1024&&t.height<=1024))&&rows.reduce((s,r)=>s+r.count*r.tris,0)<=26000,
 LA4:rows.every(r=>urls.includes(`models/ambient/sertao_${r.name}.glb?v=${registry[`sertao-${r.name}-animada`]?.processing?.finalSha256.slice(0,12)}`)),
};
const failed=Object.keys(checks).filter(k=>!checks[k]);
console.log(JSON.stringify({checks,rows,urls,failed}));
process.exitCode=mut?+(failed.length!==1||failed[0]!==expected[mut]):+!!failed.length;

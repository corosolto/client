import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as published from './fixtures/protocol-v7/netcodec.mjs';
const sourceUrl=new URL('../../public/js/netcodec.js',import.meta.url);
let source=fs.readFileSync(sourceUrl,'utf8');
const mutant=process.argv.find(arg=>arg.startsWith('--mutante='))?.slice(10)||null;
const mutations={
 'objective-no-v7':['if (version >= 8) w.json(snapshot.objective);','if (version >= 7) w.json(snapshot.objective);'],
 'sem-mantle':['      if (version >= 7) {\n        const mantle = Number.isFinite(ent.mantleF) ? Math.max(0, Math.min(1, ent.mantleF)) : null;\n        w.u8(mantle == null ? 0 : 1 + Math.round(mantle * 254));\n      }',''],
 'namespace-antigo':["['coro-snapshot-v8', 'coro-snapshot-v7'","['coro-snapshot-v7'"],
 'limite-v7':["if (ents.length > (version >= 8 ? 80 : MAX_ENTITIES))", "if (ents.length > (version >= 7 ? 80 : MAX_ENTITIES))"],
 'time-j-v7':["version >= 8 && ent.team === 'J'", "version >= 7 && ent.team === 'J'"],
};
if(mutant){
 assert(Object.hasOwn(mutations,mutant),'known version mutant');
 const [before,after]=mutations[mutant];assert.equal(source.split(before).length-1,1,'unique version mutation');
 source=source.replace(before,after).replace("'./data/weapons.js'",JSON.stringify(new URL('./data/weapons.js',sourceUrl).href));
}
const current=await import(mutant?'data:text/javascript;base64,'+Buffer.from(source).toString('base64'):sourceUrl.href);
if(mutant)console.log('Mutação aplicada: '+mutant);

const rows=[];
const check=(clause,fn)=>{try{fn();rows.push({clause,pass:true});}catch(error){rows.push({clause,pass:false,type:error.name,message:error.message});}};
const entity=(id,team='E',mantleF=.5)=>({id,team,mantleF,name:'Corpo '+id,bot:true,alive:true,x:1,y:2,z:3,yaw:.4,pitch:.1,hp:87,weapon:'knife',k:2,d:1,respawnIn:0,fireN:7,voiceN:2,voice:'radio'});
const snapshot=ents=>({type:'snapshot',room:'wire-compat',tick:31,t:1.5,state:'live',owner:null,players:1,spectators:0,
 livre:{E:4,B:4},timeLeft:90,roundNum:3,scoreE:1,scoreB:1,roundKillsE:2,roundKillsB:3,
 objective:{kind:'escort',vipId:0xffffffff,checkpoint:2,label:'Embarque'},ents});
check('published v7 fixture and weapon enumeration remain byte-identical to pinned sources',()=>{
 for(const [file,sha] of [['netcodec.mjs','42e789ac8f8e5666f3781d1e59625a8f0a52324822e4a826b9629c6f47f332fc'],['data/weapons.js','5c8f07d62f9dc905fe81f32bd93072df86c0ce95bc84b513bd7bbca374f7357b']])
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/protocol-v7/'+file,import.meta.url))).digest('hex'),sha);
});
for(const version of [2,3,4,5,6,7])check('published v'+version+' preserves exact bytes and cross-codec decoding',()=>{
 for(const ents of [[],[entity(1,'E',0),entity(2,'B',.5)],[entity(65536,'E',1),entity(0xffffffff,'B',undefined)]]){
  const snap=snapshot(ents),oldFrame=published.encodeSnapshot(snap,version),newFrame=current.encodeSnapshot(snap,version);
  assert.deepEqual(newFrame,oldFrame,'same advertised version must mean the same wire format');
  assert.deepEqual(current.decodeSnapshot(oldFrame),published.decodeSnapshot(oldFrame),'new client decodes published server');
  assert.deepEqual(published.decodeSnapshot(newFrame),current.decodeSnapshot(newFrame),'published client decodes new server');
 }
});
check('objective extension has a distinct preferred v8 namespace',()=>{
 assert.deepEqual(current.SNAPSHOT_PROTOCOLS,['coro-snapshot-v8',...published.SNAPSHOT_PROTOCOLS]);
 const frame=current.encodeSnapshot(snapshot([]));assert.equal(frame[4],8);
});
check('v8 preserves objective uint32 NPC third team eighty bodies and mantle simultaneously',()=>{
 const ents=Array.from({length:80},(_,i)=>entity(i+65536,i===79?'J':i%2?'B':'E',i%3/2));
 let frame;assert.doesNotThrow(()=>{frame=current.encodeSnapshot(snapshot(ents),8);},'v8 encoder supports the mode contract');
 let out;assert.doesNotThrow(()=>{out=current.decodeSnapshot(frame);},'v8 frame must decode completely');
 assert.equal(frame[4],8);assert.deepEqual(out.objective,snapshot([]).objective);assert.equal(out.ents.length,80);
 assert.equal(out.ents[79].team,'J');
 for(let i=0;i<ents.length;i++)assert(Math.abs(out.ents[i].mantleF-ents[i].mantleF)<=1/254,'mantle byte must survive mode extension');
});
check('published v7 keeps its original team and entity limits',()=>{
 assert.throws(()=>current.encodeSnapshot(snapshot([entity(1,'J')]),7),/team/);
 assert.throws(()=>current.encodeSnapshot(snapshot(Array.from({length:65},(_,i)=>entity(i+1))),7),/too_many_entities/);
});
check('published decoder explicitly rejects a new-version frame',()=>{
 let frame;assert.doesNotThrow(()=>{frame=current.encodeSnapshot(snapshot([entity(1)]),8);},'new version is available');
 assert.throws(()=>published.decodeSnapshot(frame),/snapshot_version/);
});
const failed=rows.filter(row=>!row.pass);
console.log(JSON.stringify({mutant,cases:rows.length,rows,failed,sourcePin:'a938d3614e6b3418eaf4b125ad2806e24240a9eb'}));
process.exitCode=failed.length?1:0;

// #1160: objective/J requerem v8 distinta; v2..7 mantêm os bytes canônicos.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const current=await import(process.env.CODEC_UNDER_TEST || '../public/js/netcodec.js');

function fixture(seed=0,count=3){
 const ents=Array.from({length:count},(_,i)=>({
  id:100+i,name:`JOGADOR_${seed}_${i}`,team:i%2?'B':'E',bot:i?1:0,
  x:seed*.125+i*3.125-12,y:.2,z:40-i*4.25,yaw:i*.2,pitch:-.1,
  hp:100-i%100,alive:i%9!==8,weapon:i%2?'ak':'awp',mantleF:i%3===2?.62:null,
  fire:i%3===0?1:0,fireN:i%3,voice:i%4===0?'radio':0,voiceN:i%4,
  k:i,d:9,respawnIn:i%9===8?2.25:0,killedBy:i%9===8?'JOGADOR_1':undefined,
  ackSeq:812,mag:17,res:61,reloadIn:1.25,primary:'ak',secondary:'pistol',
 }));
 return {type:'snapshot',room:'livre',tick:123456+seed,t:87.125,state:'live',owner:null,
  players:1,spectators:2,livre:{E:4,B:5},timeLeft:72,roundNum:2,scoreE:1,scoreB:0,
  roundKillsE:7,roundKillsB:4,ctf:seed%2?{capsE:4,capsB:2,roundCapsE:2,roundCapsB:1,
   capsToWin:3,matchLeft:318.5,points:[{owner:'E',prog:1,capTeam:null,contested:false},
   {owner:null,prog:.625,capTeam:'E',contested:true}]}:null,ents};
}

const legacyHashes={"2": "b57485c9821b49dd41ac7e1b38f601afb6d3cc18dddcf247b66e0e62e4a5247b", "3": "6068891c24016d4a914d3093a40520d79f603d6b990ee69a68eab9938ea3f902", "4": "263d3177aa5304af715291ab2792786c92d563febbd72a68572106bd1c9f3026", "5": "d630473bff98fc833d9b196ec5aca6c39c216cbe7332deeccedb5944079f9eb7", "6": "2fd4fcc5dfb00778119d5ae61ed7d2a13a7d13de1a7e593e25cd38f71cf74633", "7": "b6b3eceda1986028d8a975baa84e4c2e3e74fd821dbea27b1ca9a90afb0c0e20"};
for(const [version,expected] of Object.entries(legacyHashes)) test(`legacy v${version}: canonical wire remains exact`,()=>{
 const bytes=current.encodeSnapshot(fixture(7,10),Number(version));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
});
test('unversioned producers retain v7 and refuse objective/J',()=>{
 assert.equal(current.encodeSnapshot(fixture())[4],7);
 assert.throws(()=>current.encodeSnapshot({...fixture(),objective:{mode:'javaporcos'}}),/objective_requires_v8/);
 const j=fixture();j.ents[0].team='J';assert.throws(()=>current.encodeSnapshot(j),/objective_requires_v8/);
});
test('explicit v8 transports objective, J, mantle and 80 entities together',()=>{
 const snapshot=fixture(7,80);snapshot.objective={mode:'javaporcos',phase:'wave',wave:3,targets:[1,2],message:'Proteja o sítio 🐗'};
 snapshot.ents[0].team='J';snapshot.ents[0].mantleF=.5;
 const wire=current.encodeSnapshot(snapshot,8),out=current.decodeSnapshot(wire);
 assert.equal(wire[4],8);assert.deepEqual(out.objective,snapshot.objective);assert.equal(out.ents.length,80);
 assert.equal(out.ents[0].team,'J');assert.ok(Math.abs(out.ents[0].mantleF-.5)<=1/254);
 assert.equal(out.ents[2].weapon,'awp');
});

test('v8 has a distinct advertised name and explicit name→version mapping',()=>{
 assert.equal(current.SNAPSHOT_PROTOCOLS[0],'coro-snapshot-v8');
 assert.equal(typeof current.snapshotVersionForProtocol,'function');
 for(let version=2;version<=8;version++)assert.equal(current.snapshotVersionForProtocol(`coro-snapshot-v${version}`),version);
 assert.equal(current.snapshotVersionForProtocol('coro-json-v1'),1);
 for(const input of ['coro-snapshot-v9','coro-snapshot-v07','__proto__','toString','',null,undefined])assert.equal(current.snapshotVersionForProtocol(input),null);
});

test('old versions refuse silent objective or J downgrade',()=>{
 for(let version=2;version<8;version++){
  const objective=fixture();objective.objective={mode:'javaporcos'};
  assert.throws(()=>current.encodeSnapshot(objective,version),/objective_requires_v8/);
  const j=fixture();j.ents[0].team='J';assert.throws(()=>current.encodeSnapshot(j,version),/objective_requires_v8/);
  assert.doesNotThrow(()=>current.encodeSnapshot({...fixture(),objective:null},version));
 }
});

test('entity limit remains 64 in v7 and becomes 80 only in v8',()=>{
 assert.throws(()=>current.encodeSnapshot(fixture(1,65),7),/too_many_entities/);
 assert.doesNotThrow(()=>current.encodeSnapshot(fixture(1,80),8));
 assert.throws(()=>current.encodeSnapshot(fixture(1,81),8),/too_many_entities/);
});

test('version input must be an integer in the supported range',()=>{
 for(const version of [NaN,2.5,7.5,8.5,Infinity,1,9,'8',null])assert.throws(()=>current.encodeSnapshot(fixture(),version),/snapshot_version/);
});

test('v8 objective accepts plain finite JSON values without silent loss',()=>{
 const valid={mode:'javaporcos',phase:null,active:true,wave:3,points:[0,1.25,'🐗',false,{team:'J'}]};
 assert.deepEqual(current.decodeSnapshot(current.encodeSnapshot({...fixture(),objective:valid},8)).objective,valid);
 const cyclic={};cyclic.self=cyclic;
 const customArray=Object.setPrototypeOf([1],{toJSON(){return null;}});
 for(const objective of [()=>{},Symbol('objective'),undefined,{wave:NaN},{wave:Infinity},{wave:undefined},
  {wave:()=>{}},{wave:Symbol('x')},{wave:1n},{date:new Date(0)},{list:[,1]},cyclic,customArray,{list:customArray}]){
  // Top-level undefined is the existing absent optional field, all other losses are refused.
  if(objective===undefined)assert.equal(current.decodeSnapshot(current.encodeSnapshot({...fixture(),objective},8)).objective,null);
  else assert.throws(()=>current.encodeSnapshot({...fixture(),objective},8),/objective_json/);
 }
 const snapshot={...fixture(0,0),objective:{wave:1e100}},text=JSON.stringify(snapshot.objective);
 const wire=current.encodeSnapshot(snapshot,8),start=wire.length-new TextEncoder().encode(text).length-1;
 wire.set(new TextEncoder().encode('{"wave":1e999}'.padEnd(text.length)),start);
 assert.throws(()=>current.decodeSnapshot(wire),/objective_json/);
});

test('v8 objective length, UTF8, JSON, truncation and trailing bytes are enforced',()=>{
 const tooLarge=fixture();tooLarge.objective={text:'x'.repeat(9000)};
 assert.throws(()=>current.encodeSnapshot(tooLarge,8),/objective_too_large/);
 const snapshot=fixture(0,0);snapshot.objective={mode:'javaporcos'};
 const wire=current.encodeSnapshot(snapshot,8),size=new TextEncoder().encode(JSON.stringify(snapshot.objective)).length,start=wire.length-size-1;
 const utf=wire.slice();utf[start]=255;assert.throws(()=>current.decodeSnapshot(utf));
 const json=wire.slice();json[start]=33;assert.throws(()=>current.decodeSnapshot(json),/objective_json/);
 assert.throws(()=>current.decodeSnapshot(wire.slice(0,-1)),/snapshot_truncated/);
 // v5+ treats extra bytes as the optional fixed-size private trailer; one byte
 // is rejected as a truncated trailer before Reader.finish can report trailing data.
 const trailing=new Uint8Array(wire.length+1);trailing.set(wire);assert.throws(()=>current.decodeSnapshot(trailing),/snapshot_(truncated|trailing_bytes)/);
});

test('private v5 trailer is preserved for v7 and combined v8',()=>{
 const priv={id:100,ackSeq:19,x:1.25,y:.2,z:2.5,mag:17,res:61,reloadIn:.5,primary:'ak',secondary:'pistol'};
 for(const version of [7,8]){
  const snapshot=fixture(),common=current.encodeSnapshot(snapshot,version),wire=current.juntarV5(common,current.encodeTrailerV5(priv)),out=current.decodeSnapshot(wire);
  assert.equal(out.ents[0].ackSeq,19);assert.equal(out.ents[0].mag,17);assert.equal(out.ents[0].x,1.25);
  if(version===7)assert.equal(createHash('sha256').update(wire).digest('hex'), 'ff8d2b09990dd41941b4a8b5c570d3bdd4b6551f029e9b8cbea2993ec520f672');
 }
});


const snapshot = objective => ({ type:'snapshot', room:'private-r816', tick:1, t:1,
 state:'live', owner:null, players:0, spectators:0, livre:{E:0,B:0}, timeLeft:0,
 roundNum:0, scoreE:0, scoreB:0, roundKillsE:0, roundKillsB:0, ents:[], objective });
const rejectsJSON = error => error instanceof TypeError && error.message === 'objective_json';
// Real encoder supplies the whole binary envelope. Locate its unique objective marker
// with zero entities; replace only that JSON and its existing u16 byte length.
function wireForJSON(text) {
 const marker = 'R816_UNIQUE_OBJECTIVE_MARKER', bytes = new TextEncoder().encode(JSON.stringify(marker));
 const wire = current.encodeSnapshot(snapshot(marker),8), matches = [];
 for(let i=0;i<=wire.length-bytes.length;i++) if(bytes.every((v,j)=>wire[i+j]===v)) matches.push(i);
 assert.equal(matches.length,1,'fixture objective marker must be unique');
 const start=matches[0], suffix=wire.subarray(start+bytes.length);
 assert.deepEqual([...suffix],[0],'fixture has exactly zero entity count and no trailer');
 assert.equal(new DataView(wire.buffer,wire.byteOffset,wire.byteLength).getUint16(start-2,true),bytes.length);
 const json=new TextEncoder().encode(text), out=new Uint8Array(wire.length-bytes.length+json.length);
 out.set(wire.subarray(0,start-2));new DataView(out.buffer).setUint16(start-2,json.length,true);
 out.set(json,start);out.set(suffix,start+json.length);return out;
}
const shared={zero:-0};
const encodeCases=[['root',-0],['object',{wave:-0}],['array',[-0]],
 ['nested',{route:[{value:-0}]}],['null-prototype',Object.assign(Object.create(null),{wave:-0})],
 ['shared-not-cyclic',{first:shared,second:shared}]];
for(const [i,[name,value]] of encodeCases.entries()) test(`EN${i+1} rejects negative-zero JSON ${name}`,()=>{
 assert.throws(()=>current.encodeSnapshot(snapshot(value),8),rejectsJSON,'negative-zero must reject before stringify can erase its sign');
});
const decodeCases=[['root','-0'],['object','{"wave":-0}'],['array','[-0]'],
 ['nested','{"route":[{"value":-0}]}'],['decimal','-0.0'],['exponent','-0e0']];
for(const [i,[name,text]] of decodeCases.entries()) test(`DE${i+1} rejects negative-zero JSON ${name}`,()=>{
 assert.throws(()=>current.decodeSnapshot(wireForJSON(text)),rejectsJSON,'valid JSON negative-zero must reject after parse');
});
test('CTRL1 positive zero and finite JSON values retain their values',()=>{
 for(const value of [0,-1,1.25,true,false,'0',[],{},[0,-1,{zero:0}],{zero:0,negative:-1}]){
  const out=current.decodeSnapshot(current.encodeSnapshot(snapshot(value),8)).objective;
  assert.deepEqual(out,value);if(value===0)assert.equal(Object.is(out,-0),false);
 }
});
test('CTRL2 raw-wire fixture accepts valid JSON values',()=>{
 for(const text of ['0','-1','1.25','null','false','{"zero":0,"negative":-1}','[0,-1,{"n":1.25}]'])
  assert.deepEqual(current.decodeSnapshot(wireForJSON(text)).objective,JSON.parse(text));
});
test('CTRL3 optional null and undefined remain absent optional objective',()=>{
 for(const value of [null,undefined])assert.equal(current.decodeSnapshot(current.encodeSnapshot(snapshot(value),8)).objective,null);
});
test('CTRL4 non-JSON binary negative zero is outside this guard',()=>{
 const input=snapshot(null);input.t=-0;
 assert.equal(Object.is(current.decodeSnapshot(current.encodeSnapshot(input,8)).t,-0),true);
});

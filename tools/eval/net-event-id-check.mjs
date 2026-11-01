import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THREE} from './harness.mjs';
const url=new URL('../../public/js/netgame.js',import.meta.url);
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
const edits={
 'signed-id':['return Number.isInteger(id) && id >= 0 && id <= 0xffffffff ? id : null;','return id | 0;'],
 'invalid-alias':['return Number.isInteger(id) && id >= 0 && id <= 0xffffffff ? id : null;','return Number.isInteger(id) && id >= 0 && id <= 0xffffffff ? id : 0;'],
 'signed-attacker':['this._netMap.get(aId)','this._netMap.get(aId | 0)'],
 'signed-victim':['this._netMap.get(vId)','this._netMap.get(vId | 0)'],
 'signed-hit':['vId !== meu','(vId | 0) !== meu'],
 'signed-nade':['this._netMap.get(oId) || (oId === meu ? p : null)','this._netMap.get(oId | 0) || ((oId | 0) === meu ? p : null)'],
 'signed-boom':['const dono = oId == null ? null : (this._netMap.get(oId) || null);','const dono = oId == null ? null : (this._netMap.get(oId | 0) || null);'],
};
let module;
if(mutant){
 const edit=edits[mutant];assert.ok(edit,'known event-ID mutant');
 let source=readFileSync(url,'utf8');assert.equal(source.split(edit[0]).length,2,'unique mutation anchor');
 source=source.replace(...edit).replace(/from\s+(['"])([^'"]+)\1/g,(_,q,spec)=>
  'from '+JSON.stringify(spec.startsWith('.')?new URL(spec,url).href:import.meta.resolve(spec)));
 module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 console.log('Mutação aplicada: '+mutant);
}else module=await import(url.href);
const {makeNetcode}=module;
const ids=[0,65535,65536,0x7fffffff,0x80000000,0xffffffff];
const invalid=[undefined,null,-1,0x100000000,1.5,'0',false,NaN,Infinity];
const rows=[];
const check=(clause,run)=>{try{run();rows.push({clause,pass:true});console.log('ok '+clause);}
 catch(e){rows.push({clause,pass:false,type:e.name,message:e.message});console.error('FALHA '+clause+': '+e.message);}};
function fixture(me=1){
 const calls={hit:[],arc:[],feed:[],kills:[],blood:[],tracer:[],nade:[],boom:[]};
 const body=team=>({team,def:{id:'senador'},pos:new THREE.Vector3(1,0,2),yaw:0});
 const p=body('E'),other=body('B');
 const game={player:p,el:{},settings:{quality:'high'},camera:new THREE.PerspectiveCamera(),
  scene:new THREE.Scene(),sfx:{death(){}},drops:[],_grenades:[],
  _dmgArc:(...a)=>calls.arc.push(a),_noteHit:(...a)=>calls.hit.push(a),
  _feed:(...a)=>calls.feed.push(a),_playerKillFeedback:(...a)=>calls.kills.push(a),
  _bloodPoolAt:(...a)=>calls.blood.push(a),_tracer:(...a)=>calls.tracer.push(a),
  _spawnGrenade:(...a)=>{calls.nade.push(a);game._grenades.push({v:new THREE.Vector3(),mesh:new THREE.Object3D()});},
  _explodeFrag:(...a)=>calls.boom.push(a),
 };
 const net={meta:{events:1},yourEnt:me,startPing(){},stopPing(){}};
 const mp=makeNetcode(game,net);mp._netMap.set(me,p);
 return{game,p,other,mp,calls,net};
}
function withFixture(me,run){const f=fixture(me);try{run(f);}finally{f.mp.dispose();}}
check('uint32 attacker reaches real hit feedback',()=>{
 for(const id of ids)withFixture(id===1?2:1,({mp,other,calls,net})=>{
  mp._netMap.set(id,other);mp._evento({k:'hit',a:id,v:net.yourEnt,d:12,w:'ak',h:1});
  assert.equal(calls.hit.length,1,'attacker '+id);assert.equal(calls.hit[0][0],other);assert.equal(calls.arc.length,1);
 });
});
check('uint32 local victim receives real hit feedback',()=>{
 for(const id of ids)withFixture(id,({mp,other,calls})=>{
  const attacker=id===2?3:2;mp._netMap.set(attacker,other);
  mp._evento({k:'hit',a:attacker,v:id,d:12,w:'ak'});assert.equal(calls.hit.length,1,'victim '+id);
 });
});
check('uint32 kill reaches feed and actual remote death feedback',()=>{
 for(const id of ids)withFixture(id===1?2:1,({mp,other,p,calls,net})=>{
  mp._netMap.set(id,other);mp._evento({k:'kill',a:net.yourEnt,v:id,w:'ak',h:true});
  assert.equal(calls.feed.length,1,'victim '+id);assert.deepEqual(calls.feed[0],[p,other,'ak',true]);
  assert.equal(calls.kills.length,1);assert.equal(calls.kills[0][0],p);assert.equal(calls.blood.length,1);
 });
});
check('uint32 attacker survives kill attribution and local death',()=>{
 for(const id of ids)withFixture(id===1?2:1,({mp,other,p,calls,net})=>{
  mp._netMap.set(id,other);mp._evento({k:'kill',a:id,v:net.yourEnt,w:'ak',d:75});
  assert.equal(calls.feed.length,1);assert.equal(calls.feed[0][0],other);assert.equal(calls.feed[0][1],p);
  assert.equal(calls.hit.length,1);
 });
});
check('uint32 shot reaches actual tracer consumer',()=>{
 for(const id of ids)withFixture(id===1?2:1,({mp,other,calls})=>{
  mp._netMap.set(id,other);mp._evento({k:'tiro',a:id,p:[[3,2,1]],o:[1,2,3]});
  assert.equal(calls.tracer.length,1,'attacker '+id);
 });
});
check('uint32 grenade owner reaches spawn and explosion',()=>{
 for(const id of ids)withFixture(id===1?2:1,({mp,other,calls})=>{
  mp._netMap.set(id,other);mp._evento({k:'nade',i:42,o:id,vx:1});
  assert.equal(calls.nade.length,1);assert.equal(calls.nade[0][3],other,'owner '+id);
  mp._evento({k:'boom',i:42,o:id});assert.equal(calls.boom.length,1);assert.equal(calls.boom[0][1],other);
 });
});
check('uint32 local grenade fallback preserves owner without map entry',()=>{
 for(const id of ids)withFixture(id,({mp,p,calls})=>{
  mp._netMap.clear();mp._evento({k:'nade',i:43,o:id});assert.equal(calls.nade[0][3],p,'fallback '+id);
 });
});
check('invalid IDs never alias entity zero or valid local victim',()=>{
 for(const id of invalid)withFixture(0,({mp,other,p,calls})=>{
  mp._netMap.set(2,other);
  mp._evento({k:'hit',a:id,v:0,d:12});assert.equal(calls.hit.length,0,'attacker '+String(id));
  mp._evento({k:'hit',a:2,v:id,d:12});assert.equal(calls.hit.length,0,'victim '+String(id));
  mp._evento({k:'kill',a:2,v:id});assert.equal(calls.feed.length,0,'kill victim '+String(id));
  mp._evento({k:'tiro',a:id,p:[[3,2,1]]});assert.equal(calls.tracer.length,0);
  mp._evento({k:'nade',i:44,o:id});assert.equal(calls.nade[0][3],null,'grenade '+String(id));
  mp._evento({k:'boom',i:44,o:id});assert.equal(calls.boom[0][1],null);
  mp._evento({k:'kill',a:id,v:2});assert.equal(calls.feed.length,1);
  assert.equal(calls.feed[0][0],null,'invalid attacker remains an environmental kill');
  assert.equal(mp._netMap.get(0),p);
 });
});
console.log(JSON.stringify({mutant:mutant||null,cases:rows.length,failed:rows.filter(r=>!r.pass)}));
process.exitCode=rows.some(r=>!r.pass)?1:0;

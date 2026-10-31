import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootGame,initTextures,THREE,Game} from './harness.mjs';
import {makeNetcode} from '../../public/js/netgame.js';
// Controlador real de transição; update é uma sonda de chamada, sem render/captura.
const url=new URL('../../public/js/glbchars.js',import.meta.url);
const source=readFileSync(url,'utf8').replace(/from\s+(['"])([^'"]+)\1/g,(_,q,spec)=>'from '+JSON.stringify(spec.startsWith('.')?new URL(spec,url).href:import.meta.resolve(spec)));
const {CharController}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {CharController};').toString('base64'));
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1]||null;
let netcodeFactory=makeNetcode;
if(mutant){
 const edits={
  'sem-precalculo':['game.js','if (MANTLE && !this._mAlc) this._mantleAlcance();','', '_startRound'],
  'sem-reset':['game.js','ent.mantle = null; ent.mantleF = 0;','', '_resetPositions'],
  'sem-buffers':['game.js','ent.jumpBufferedUntil = 0; ent.coyoteUntil = 0;','', '_resetPositions'],
  'sem-ar':['netgame.js','b.mesh.ctrl.setAr?.(mMantle);',''],
  'ar-no-repouso':['netgame.js','b.mesh.ctrl.setAr?.(mMantle);','b.mesh.ctrl.setAr?.(true);'],
 };
 assert(Object.hasOwn(edits,mutant),'mutante conhecido');
 const [file,old,replacement,method]=edits[mutant],u=new URL('../../public/js/'+file,import.meta.url);
 let src=readFileSync(u,'utf8');assert.equal(src.split(old).length,2,'âncora única');src=src.replace(old,replacement);
 src=src.replace(/from\s+(['"])([^'"]+)\1/g,(_,q,spec)=>'from '+JSON.stringify(spec.startsWith('.')?new URL(spec,u).href:import.meta.resolve(spec)));
 const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 if(method)Game.prototype[method]=m.Game.prototype[method];else netcodeFactory=m.makeNetcode;
 console.log('Mutação aplicada: '+mutant);
}
const rows=[];
const check=(clause,run)=>{try{run();rows.push({clause,pass:true});console.log('ok '+clause);}catch(e){rows.push({clause,pass:false,type:e.name,message:e.message});console.error('FALHA '+clause+': '+e.message);}};
const textures=initTextures();
const g=bootGame('fy_corrego',{textures,bots:4});
check('cache territorial pronto antes da primeira consulta',()=>{assert(g._mAlc,'pré-cálculo da rodada não pode depender do primeiro mantle');});
for(const who of ['player','remote'])check('reset limpa trajetória e buffers '+who,()=>{
 {
  const p=who==='player'?g.player:g.bots[0];
  p.vel ||= new THREE.Vector3();p.grounded=true;p.crouchF=0;
  p.mantle={x0:200,y0:1,z0:200,x1:201,y1:2,z1:201,t:0,dur:.4};
  Object.assign(p,{mantleF:.5,_spaceHeld:true,_mantleScanAt:99,jumpBufferedUntil:99,coyoteUntil:99,alive:false,respawnAt:0});
  if(who==='remote'){p._remote=7;g.state='roundEnd';g._updateBot(p,1/60);assert.equal(p.alive,false,'morto aguarda rodada');}
  g._resetPositions();const spawn=p.pos.clone();
  assert.equal(p.alive,true);assert.equal(p.mantle,null,'trajetória da vida antiga removida');assert.equal(p.mantleF,0);
  assert.equal(p._spaceHeld,false);assert.equal(p._mantleScanAt,0);assert.equal(p.jumpBufferedUntil,0);assert.equal(p.coyoteUntil,0);
  g._moveEntity(p,{ax:0,az:0,crouch:false,shift:false,jump:false},1/60);
  assert(p.pos.distanceTo(spawn)<1,'primeiro quadro fica junto ao spawn');
 }
});
check('consumidor remoto entra no ar e pousa antes do update',()=>{
 const ctrl=Object.create(CharController.prototype);Object.assign(ctrl,{_ar:false,_landT:0,_mantleF:null});
 const samples=[];ctrl.update=()=>samples.push({ar:ctrl._ar,land:ctrl._landT,mantle:ctrl._mantleF});
 const nc=netcodeFactory({time:0,_updateTeamMark(){}},{meta:{snapshotHz:20},startPing(){},stopPing(){}});clearInterval(nc._nsTimer);
 const p={alive:true,mesh:{isGLB:true,group:new THREE.Group(),ctrl},pos:new THREE.Vector3(),yaw:0,_netBot:false};
 try{
 for(const f of [0,.25,.75,0,-1,1,NaN,undefined]){p.mantleF=f;nc.updateRemoteBot(p,1/60);}
 assert.deepEqual(samples.map(s=>s.ar),[false,true,true,false,false,false,false,false],'ar segue mantle ativo sem prender progresso0 no ar');
 assert.equal(samples[3].land,.14,'pouso arma amortecimento real');
 for(const i of [0,3,4,5,6,7])assert.equal(samples[i].mantle,null,'progresso inativo não prende pose de pulo');
 assert.equal(samples[1].mantle,.25);assert.equal(samples[2].mantle,.75);
 }finally{nc.dispose();}
});
g.dispose();
console.log(JSON.stringify({mutant,cases:rows.length,failed:rows.filter(r=>!r.pass)}));process.exitCode=rows.some(r=>!r.pass)?1:0;

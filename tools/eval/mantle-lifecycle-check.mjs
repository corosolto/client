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
  // P2 (crítica1138): o teleporte do M conservava trajetória/buffers. Mutantes removem
  // SOMENTE as limpezas novas do _switchTeam (âncoras únicas, método extraído da fonte real).
  'sem-clear-jogador':['game.js','p.mantle = null; p.mantleF = 0; p._spaceHeld = false; p._mantleScanAt = 0;','', '_switchTeam'],
  'sem-clear-bot':['game.js','swapBot.mantle = null; swapBot.mantleF = 0; swapBot._spaceHeld = false;','', '_switchTeam'],
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
check('troca de lado limpa trajetória e mantém o spawn do jogador',()=>{
 const p=g.player;const neutro={ax:0,az:0,crouch:false,shift:false,jump:false};
 p.vel ||= new THREE.Vector3();p.grounded=true;p.crouchF=0;
 p.mantle={x0:200,y0:1,z0:200,x1:201,y1:2,z1:201,t:0,dur:.4};
 Object.assign(p,{mantleF:.5,_spaceHeld:true,_mantleScanAt:99,jumpBufferedUntil:99,coyoteUntil:99,alive:true});
 const antigo=p.pos.clone();const timeAntes=g.playerTeam;
 // guarda no-op: estado inválido não troca lado nem limpa estado
 g.state='roundEnd';g._switchTeam();
 assert.equal(g.playerTeam,timeAntes,'estado inválido não troca lado');assert.ok(p.mantle,'estado inválido não limpa trajetória');
 g.state='live';g._switchTeam();
 assert.notEqual(g.playerTeam,timeAntes,'troca efetiva de lado');assert.equal(p.team,g.playerTeam,'lado do jogador acompanha');
 assert.equal(p.mantle,null,'trajetória da vida antiga removida pela troca');assert.equal(p.mantleF,0);
 assert.equal(p._spaceHeld,false);assert.equal(p._mantleScanAt,0);assert.equal(p.jumpBufferedUntil,0);assert.equal(p.coyoteUntil,0);
 const spawn=p.pos.clone();
 assert(antigo.distanceTo(spawn)>5,'spawn novo longe da posição antiga');
 assert(g.world.spawns[g.playerTeam].some(s=>spawn.distanceTo(new THREE.Vector3(s.x,spawn.y,s.z))<1.5),'spawn no lado novo');
 g._moveEntity(p,neutro,1/60);
 assert(p.pos.distanceTo(spawn)<1,'primeiro quadro fica junto ao spawn novo, sem posição antiga');
});
check('troca de lado limpa trajetória e mantém o spawn do bot desertor',()=>{
 const neutro={ax:0,az:0,crouch:false,shift:false,jump:false};
 const timeAntes=g.playerTeam;const timeDestino=timeAntes==='E'?'B':'E';
 // semeia coletivamente os candidatos do lado de entrada e identifica quem desertou
 const antes=g.bots.map(b=>({b,team:b.team}));
 for(const {b,team} of antes) if(team===timeDestino){
  b.vel ||= new THREE.Vector3();b.grounded=true;
  b.mantle={x0:200,y0:1,z0:200,x1:201,y1:2,z1:201,t:0,dur:.4};
  Object.assign(b,{mantleF:.5,_spaceHeld:true,_mantleScanAt:99,jumpBufferedUntil:99,coyoteUntil:99,alive:true});
 }
 g.state='live';g._switchTeam();
 const desertor=antes.filter(({b,team})=>team===timeDestino&&b.team===timeAntes).map(({b})=>b);
 assert.equal(desertor.length,1,'um bot do lado novo desertou pro lado velho');
 const b=desertor[0];
 assert.equal(b.mantle,null,'trajetória da vida antiga removida do desertor');assert.equal(b.mantleF,0);
 assert.equal(b._spaceHeld,false);assert.equal(b._mantleScanAt,0);assert.equal(b.jumpBufferedUntil,0);assert.equal(b.coyoteUntil,0);
 const spawn=b.pos.clone();
 assert(spawn.distanceTo(new THREE.Vector3(200,spawn.y,200))>50,'desertor longe da trajetória antiga');
 assert(g.world.spawns[timeAntes].some(s=>spawn.distanceTo(new THREE.Vector3(s.x,spawn.y,s.z))<1.5),'desertor no spawn do lado velho');
 g._moveEntity(b,neutro,1/60);
 assert(b.pos.distanceTo(spawn)<1,'primeiro quadro do desertor junto ao spawn, sem posição antiga');
 // bots que não desertaram conservam o estado semeado (só ator teleportado é limpo)
 for(const {b:outro,team} of antes) if(outro!==b&&team===timeDestino)
  assert.ok(outro.mantle,'não desertor não é limpo');
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

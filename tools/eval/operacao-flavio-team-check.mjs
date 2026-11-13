import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootGame,initTextures,CHARACTERS} from './harness.mjs';
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1]||null;
let switchImplementation;
if(mutant){
 const url=new URL('../../public/js/game.js',import.meta.url),before='this.bots.filter(b => b.team === newTeam && !b._objectiveNpc)';
 const edits={'sem-reserva':'this.bots.filter(b => b.team === newTeam)',
  'apenas-boolean':'this.bots.filter(b => b.team === newTeam && b._objectiveNpc !== true)',
  'sem-rebalancear':'[]'};
 assert(Object.hasOwn(edits,mutant),'known team mutant');
 let source=readFileSync(url,'utf8');assert.equal(source.split(before).length,2,'unique mutation anchor');
 source=source.replace(before,edits[mutant]).replace(/from\s+(['"])([^'"]+)\1/g,(_,q,spec)=>
  'from '+JSON.stringify(spec.startsWith('.')?new URL(spec,url).href:import.meta.resolve(spec)));
 const {Game}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 switchImplementation=Game.prototype._switchTeam;console.log('Mutação aplicada: '+mutant);
}
const rows=[];
const check=(clause,run)=>{try{run();rows.push({clause,pass:true});console.log('ok '+clause);}
 catch(e){rows.push({clause,pass:false,type:e.name,message:e.message});console.error('FALHA '+clause+': '+e.message);}};
function withGame(map,run){const g=bootGame(map,{textures:initTextures(),bots:4});
 if(switchImplementation)g._switchTeam=switchImplementation;
 try{g.state='live';g.player.alive=true;run(g);}finally{g.dispose();}}
function switchSide(g){
 const target=CHARACTERS.find(c=>c.team===g.enemyFaction);assert.ok(target);
 const before=g.playerTeam,random=Math.random;Math.random=()=>0;
 try{g._switchTeam(target.id);}finally{Math.random=random;}
 assert.notEqual(g.playerTeam,before,'troca de lado continua operante');
 assert.equal(g.player.team,g.playerTeam);assert.equal(g.player.def.id,target.id);
}
function vipFirst(g){const vip=g.objective.vip;g.bots=[vip,...g.bots.filter(b=>b!==vip)];return vip;}
check('troca offline preserva identidade lado e personagem do VIP',()=>withGame('operacao_flavio',g=>{
 const vip=vipFirst(g),def=vip.def,mesh=vip.mesh,id=vip._nid,marker=vip._objectiveNpc;
 assert.ok(marker);switchSide(g);
 assert.equal(g.objective.vip,vip);assert.equal(vip.team,'B');assert.equal(vip.def,def);
 assert.equal(vip.mesh,mesh);assert.equal(vip._nid,id);assert.equal(vip._objectiveNpc,marker);
}));
check('duas trocas e prepareRound não corrompem o VIP',()=>withGame('operacao_flavio',g=>{
 const vip=vipFirst(g),def=vip.def,marker=vip._objectiveNpc;
 switchSide(g);switchSide(g);g.objective.prepareRound();
 assert.equal(g.objective.vip,vip);assert.equal(vip.team,'B');assert.equal(vip.def,def);
 assert.equal(vip._objectiveNpc,marker);
}));
check('sala sem defensor comum permite troca sem escolher o NPC',()=>withGame('operacao_flavio',g=>{
 const vip=vipFirst(g),def=vip.def;
 g.bots=g.bots.filter(b=>b===vip||b.team==='E');switchSide(g);
 assert.equal(vip.team,'B');assert.equal(vip.def,def);assert.equal(g.objective.vip,vip);
}));
check('mapa comum continua rebalanceando um combatente elegível',()=>withGame('ferro_velho',g=>{
 const previous=g.playerTeam,candidate=g.bots.find(b=>b.team===g.enemyTeam);assert.ok(candidate);
 switchSide(g);assert.equal(candidate.team,previous,'bot comum ainda muda para o time antigo');
 assert.equal(g.objective,null);
}));
check('escolta continua andando sem autoameaça após troca',()=>withGame('operacao_flavio',g=>{
 const vip=vipFirst(g);switchSide(g);g.player.pos.copy(vip.pos);
 g.combatants=[vip,g.player];const before=vip.pos.clone();
 g.objective.update(0.1);
 assert.equal(g.objective.state.threatened,false,'VIP não participa da própria lista de atacantes');
 assert.equal(g.objective.state.escortCount,1);assert(vip.pos.distanceTo(before)>0,'defensor faz a escolta avançar');
}));
console.log(JSON.stringify({mutant,cases:rows.length,failed:rows.filter(r=>!r.pass)}));
process.exitCode=rows.some(r=>!r.pass)?1:0;

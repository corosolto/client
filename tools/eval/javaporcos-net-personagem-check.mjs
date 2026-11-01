import assert from 'node:assert/strict';
import { bootGame, initTextures, PCHAR } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';
const mutante=process.argv.includes('--mutante=personagem-humano');
const g=bootGame('invasao_javaporcos',{textures:initTextures(),bots:4});
const boar=g.bots.find(b=>b._objectiveNpc),human=g.bots.find(b=>!b._objectiveNpc);
const net={yourEnt:1,meta:{roster:[{id:2,char:PCHAR,team:'J'},{id:3,char:PCHAR,team:'E'}]},startPing(){},stopPing(){}};
const trocas=[];g._trocarPersonagem=(ent)=>{trocas.push(ent);};
const nc=makeNetcode(g,net);
try{
 if(mutante)net.onPersonagem=nc._onPersonagem=m=>{const ent=nc._netMap.get(m.ent);if(ent)g._trocarPersonagem(ent);};
 nc._casar({ents:[{id:2,team:'J',bot:1,x:0,y:0,z:0,yaw:0},{id:3,team:'E',bot:1,x:1,y:0,z:0,yaw:0}]});
 assert.ok(!trocas.some(b=>b._objectiveNpc),'roster J não aplica personagem humano no javaporco');
 assert.equal(nc._netMap.get(2)._objectiveNpc,'javaporco');
 trocas.length=0;
 net.onPersonagem({ent:2,char:PCHAR});
 assert.equal(trocas.length,0,'evento sem team também preserva NPC já mapeado');
 net.onPersonagem({ent:3,char:PCHAR});
 assert.equal(trocas.length,1,'troca humana continua funcionando');
 assert.equal(trocas[0]._objectiveNpc,undefined);
 console.log('PASS rede: roster/eventos de personagem preservam J e mantêm cosméticos humanos');
 if(mutante)throw new Error('mutante sobreviveu');
}catch(e){if(mutante&&e.message.includes('roster J não aplica personagem humano'))console.log('PASS mutante personagem-humano detectado');else throw e;}finally{nc.dispose();g.dispose();}

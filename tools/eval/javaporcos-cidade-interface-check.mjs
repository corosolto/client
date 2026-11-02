// Feedback do dono: seleção só da cidade, falas políticas no modo e placar da horda ausente em coop.
import assert from 'node:assert/strict';
import {bootGame,initTextures,MAPS,Game,pickMatchRoster,CHARACTERS,PCHAR,renderer,sfx} from './harness.mjs';
import {MAP_IDS_JOGAVEIS,MAPAS_PARADOS} from '../../public/js/maps.js';
import {Sfx} from '../../public/js/audio.js';
import {equipeJavaporcos} from '../../public/js/javaporcos_equipe.js';
import {regrasDaInvasao} from '../../public/js/javaporcos_partida.js';
const mutant=process.argv.find(x=>x.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','mapas-expostos','falas-liberadas','placar-ausente'].includes(mutant));
let failed=[];
const test=(name,fn)=>{try{fn();console.log('✓ CIDADE-UI '+name);}catch(e){failed.push(name);console.log('✗ CIDADE-UI '+name+': '+e.message.slice(0,180));}};
test('solo limita elenco a quatro a oito sem alterar outros modos',()=>{
 for (const raw of [0,1,4,6,8,99,NaN]) for (const times of [2,3]) {
  const original={allyBots:0,enemyBots:7,javaporcos:{times,defensores:raw}};
  const before=structuredClone(original),s=equipeJavaporcos(original);
  assert.ok(1+s.allyBots+s.enemyBots>=4&&1+s.allyBots+s.enemyBots<=8);
  if(times===2)assert.equal(s.enemyBots,0);
  assert.deepEqual(original,before);
 }
 assert.equal(regrasDaInvasao({coop:true},true).times,2);
 assert.equal(regrasDaInvasao({},true).times,3,'multiplayer legado continua triplo');
 for (const total of [4,8]) {
  const settings=equipeJavaporcos({quality:'low',javaporcos:{defensores:total,times:2}});
  const player=CHARACTERS.find(c=>c.id===PCHAR);
  const roster=pickMatchRoster(player.team,'B',{allies:settings.allyBots,enemies:settings.enemyBots},PCHAR);
  const g=new Game({renderer,textures:initTextures(),sfx,settings,playerCharId:PCHAR,playerTeam:'E',playerFaction:player.team,enemyFaction:'B',nickname:'TESTE',mapId:'invasao_javaporcos',testMode:true,matchRoster:roster,onQuit(){},onMatchEnd(){}});
  assert.equal(g.combatants.filter(c=>!c._objectiveNpc).length,total,'corpos humanos no jogo diferem da opção');
  assert.ok(g.combatants.filter(c=>!c._objectiveNpc).every(c=>c.team==='E'));
  assert.equal(g.combatants.filter(c=>c._objectiveNpc).length,64);
  g.dispose();
 }
});
test('seleção concentra o modo na cidade',()=>{
 const ids=MAP_IDS_JOGAVEIS.filter(id=>MAPS[id].objectiveMode==='horde');
 if(mutant==='mapas-expostos')ids.push('distrito_rural');
 assert.deepEqual(ids,['invasao_javaporcos']);
 for(const id of ['distrito_rural','vila_da_mata'])assert.ok(MAPS[id]&&MAPAS_PARADOS.has(id));
});
test('vozes e vinhetas ficam mudas sem cortar efeitos',()=>{
 const s=new Sfx(),played=[];s._sample=file=>{played.push(file);return {pause(){}};};
 s.pack={voice:{P:['politico-p'],B:['politico-b']},characterVoice:{politico:{kill:['fala-propria'],select:['selecao']}},round:{P:['vinheta']},general:{kill:['locutor']},roundNumbers:{1:['round']},capture:['captura'],cs:{reload:['recarga']}};
 s.setGameMode?.('horde');s.gameMode='horde';if(mutant==='falas-liberadas')s.setGameMode?.('');
 s.voice('P',0);s.radioVoice('B');s.characterVoice('politico','kill',{fallbackFaction:'P'});s.characterSelectVoice('politico','B',['politico']);s.roundSound('P');s.general('kill');s.roundNumber(1);s.captureSound('P');
 assert.deepEqual(played,[],'falas/vinhetas tocaram no modo da horda');
 assert.equal(s.csSound('reload'),true);assert.deepEqual(played,['recarga']);
 s.setGameMode?.('');s.voice('P',0);assert.equal(played.at(-1),'politico-p','outros modos mantêm as falas');
});
test('horda mostra avatar e abates reais no coop',()=>{
 const g=bootGame('invasao_javaporcos',{textures:initTextures(),bots:3}),o=g.objective;
 if(mutant==='placar-ausente')o.placarJ=null;
 assert.ok(o.placarJ,'faltou placar da horda em dois lados');
 assert.ok(o.placarJ.children.some(c=>c.tagName==='IMG'&&c.src==='/img/javaporco-card.webp'));
 g.state='live';g.time=20;
 const enemy={team:'J',name:'Javaporco',kills:0,_objectiveNpc:true};
 g._kill(g.player,enemy,'mordida');g._kill(g.player,enemy,'mordida');
 o.atualizaHud(true);assert.equal(o.state.teamKills.J,1,'uma morte deve contar uma vez');
 assert.equal(String(o.placarJNum.textContent),'1');
 o.renderScoreboard();assert.match(g.el.sbCols.innerHTML,/Javaporcos/);assert.match(g.el.sbCols.innerHTML,/javaporco-card.webp/);
 g.dispose();
});
const expected={'mapas-expostos':'seleção concentra o modo na cidade','falas-liberadas':'vozes e vinhetas ficam mudas sem cortar efeitos','placar-ausente':'horda mostra avatar e abates reais no coop'}[mutant];
process.exitCode=mutant?(failed.length===1&&failed[0]===expected?0:1):(failed.length?1:0);

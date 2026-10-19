// BUG-TRETA-EQUIP-RELOAD-20261013: 1 equip persistido voltava ao corpo anterior
// no reload. Executa callback, navegação e seleção de boot reais em memória.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {TRETA_SKINS} from '../../public/js/treta-catalog.js';
import * as ROTAS from '../../public/js/rotas.js';
const main=fs.readFileSync('public/js/main.js','utf8');
const characters=fs.readFileSync('public/js/characters.js','utf8');
const required=(source,re,label)=>{const match=source.match(re);assert(match,`${label}: fonte real não reconhecida`);return match[0];};
const roster=required(characters,/export const CHARACTERS = \[.*?\n\];/s,'roster').replace('export ','');
const sides=required(characters,/export const ladosDe = .*?;\nexport const podeNoLado = .*?;/s,'lados').replaceAll('export ','');
const boot=required(main,/const routeChar = .*?const initialSide = .*?;/s,'boot');
const tela=required(main,/const TELA = [^\n]*;\n(?:\/\/[^\n]*\n)*const ROTA_OPCOES = [^\n]*;/,'chaves de tela');
let navigate=required(main,/function hubNavigate\(changes, replace = false\) \{.*?\n\}/s,'navegação');
let equip=required(main,/initTretaStore\(\{skipPrompt:.*?onEquipped:skin=>\{.*?\}\}\)\)?;/s,'callback');
equip=equip.replace(/\)\);$/,');');
const mutation=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
const mutations=[['sem-url','personagem da URL diverge'],['push-history','equip criou entrada de histórico'],['perde-query','contexto da URL alterado']];
if(process.argv.includes('--mutations')){
 for(const [id,message] of mutations){
  const result=spawnSync(process.execPath,[new URL(import.meta.url).pathname,`--mutante=${id}`],{encoding:'utf8'});
  assert(result.status!==0 && result.stderr.includes(message),`${id}: mutante não reprovou pela invariante esperada`);
 }
 console.log('PASS: 3/3 mutações detectadas por invariantes reais');process.exit(0);
}
if(mutation){
 const before=equip+navigate;
 if(mutation==='sem-url')equip=equip.replace(/hubNavigate\(\{personagem:currentChar\},true\);/,'');
 else if(mutation==='push-history')equip=equip.replace('hubNavigate({personagem:currentChar},true);','hubNavigate({personagem:currentChar},false);');
 else if(mutation==='perde-query')navigate=navigate.replace('urlDoEstado(estado, location.href, ROTA_OPCOES)','urlDoEstado(estado, location.origin, ROTA_OPCOES)');
 else throw new Error('Mutante desconhecido');
 assert(before!==equip+navigate,'MUTANTE NÃO APLICOU');
}
function exercise(skin,side,legacy=false){
 const previous=side==='B'?'caminhoneiro':'esquerdomacho';
 const initial=`http://localhost:4384/loja?map=piscina_treta&personagem=${previous}&sala=BR-QATEST&nav=1`+(legacy?'&home=legacy':'')+'#visual';
 const location={href:initial,search:new URL(initial).search,origin:new URL(initial).origin};
 const storage=new Map([['csbr-home-character',previous],['csbr-home-side',side]]);
 const calls=[];
 const history=Object.fromEntries(['replaceState','pushState'].map(method=>[method,(_state,_title,url)=>{calls.push(method);location.href=String(url);location.search=url.search;} ]));
 let callback,sync=0;
 const context=vm.createContext({...ROTAS,window:{},URL,URLSearchParams,location,history,HUB_ENABLED:!legacy,inspectionScreen:null,testMode:false,params:new URLSearchParams(location.search),
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  initTretaStore:options=>{callback=options.onEquipped;},syncHomeCharacter:()=>{sync++;}});
 vm.runInContext(roster+'\n'+sides+'\n'+boot+'\nlet currentChar=initialChar.id,currentTeam=initialSide,currentFaction=initialSide;\n'+tela+'\n'+navigate+'\n'+equip,context);
 assert.equal(typeof callback,'function','callback real não instalado');
 assert.equal(vm.runInContext('currentTeam',context),side,'precondição não iniciou no lado pedido');
 callback(skin);
 const selected=vm.runInContext('({currentChar,currentTeam,currentFaction,allowed:ladosDe(CHARACTERS.find(c=>c.id===currentChar))})',context);
 assert.equal(selected.currentChar,skin.character,'equip não selecionou o corpo da skin');
 assert(selected.allowed.includes(selected.currentTeam),'lado incompatível com personagem');
 assert.equal(selected.currentFaction,selected.currentTeam,'facção divergente');
 assert.equal(storage.get('csbr-home-character'),skin.character,'personagem não persistiu');
 assert.equal(storage.get('csbr-home-side'),selected.currentTeam,'lado não persistiu');
 assert.equal(sync,1,'preview não sincronizou');
 const after=new URL(location.href),prior=new URL(initial);
 if(!legacy){
  assert.equal(after.searchParams.get('personagem'),skin.character,'personagem da URL diverge do equipamento; reload volta ao corpo anterior');
  prior.searchParams.set('personagem',skin.character);
  assert.equal(after.href,prior.href,'contexto da URL alterado ao equipar');
  assert.deepEqual(calls,['replaceState'],'equip criou entrada de histórico');
  callback(skin);
  assert.equal(calls.length,1,'reequipamento criou histórico redundante');
 }else{
  assert.equal(location.href,initial,'modo legacy alterou URL');
  assert.equal(calls.length,0,'modo legacy alterou histórico');
 }
 const reload=vm.createContext({URLSearchParams,location,HUB_ENABLED:!legacy,localStorage:context.localStorage});
 vm.runInContext(roster+'\n'+sides+'\n'+boot+'\nresult={character:initialChar.id,side:initialSide};',reload);
 assert.equal(reload.result.character,skin.character,'reload perdeu o corpo equipado');
 assert.equal(reload.result.side,selected.currentTeam,'reload perdeu o lado equipado');
}
for(const skin of TRETA_SKINS)for(const side of ['E','B'])exercise(skin,side);
exercise(TRETA_SKINS[0],'B',true);
console.log(`PASS: ${TRETA_SKINS.length*2+1} cenários de equipamento/reload, URL/contexto/storage/lado/histórico; não certifica assets ou produção`);

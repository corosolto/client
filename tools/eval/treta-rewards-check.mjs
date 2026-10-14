import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {TRETA_COIN_ART} from '../../public/js/treta-catalog.js';
if(process.argv.includes('--mutations')){for(const id of ['dedup','balance','modal']){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'--mutant='+id],{encoding:'utf8'});assert.notEqual(r.status,0,`surviving mutation: ${id}`);}console.log('PASS: 3/3 reward mutations detected');process.exit(0);}
const elements=new Map(),timers=[],storage=new Map();let blocked=true;
class Node{constructor(){this.hidden=true;this.textContent='';this.children=[];}setAttribute(){}append(child){this.children.push(child);}replaceChildren(){this.children=[];}remove(){}}
const get=id=>{if(!elements.has(id))elements.set(id,new Node());return elements.get(id);};
const document={body:new Node(),hidden:false,getElementById:id=>id==='boot-splash'?null:get(id),createElement:()=>new Node(),querySelector:()=>blocked?{}:null};
const context={TRETA_COIN_ART,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setInterval:fn=>{timers.push(fn);return 1;},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},Intl,Set,Number,console};
let source=fs.readFileSync(new URL('../../public/js/treta-rewards.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/m,'').replaceAll('export function','function');
const mutation=process.argv.find(x=>x.startsWith('--mutant='))?.split('=')[1];
if(mutation==='dedup')source=source.replace('!seen.has(reward.id)','true');
if(mutation==='balance')source=source.replace('format(state.wallet.balance)','format(0)');
if(mutation==='modal')source=source.replace("document.querySelector('dialog[open]')",'false');
vm.runInNewContext(source,context,{importModuleDynamically:()=>Promise.reject(new Error('3D unavailable in this behavioral test'))});
context.initTretaRewards();
const reward={id:'reward-1',kind:'multiplayer',amount:25};
const state={authenticated:true,accountId:'account-a',wallet:{balance:225},ledger:[reward]};
context.updateTretaRewards(state);assert.equal(get('hub-treta-total').textContent,'T$ 225');assert.equal(get('treta-earned').hidden,true);
context.updateTretaRewards(state);blocked=false;document.hidden=true;timers[0]();assert.equal(get('treta-earned').hidden,true);document.hidden=false;timers[0]();assert.equal(get('treta-earned-value').textContent,'+T$ 25');assert.equal(get('treta-earned-reason').textContent,'PARTIDA MULTIPLAYER CONCLUÍDA');assert.equal(get('treta-earned').hidden,false);
get('treta-earned-close').onclick();context.updateTretaRewards(state);timers[0]();assert.equal(get('treta-earned').hidden,true,'A repeated ledger row must not display twice');
context.updateTretaRewards({...state,accountId:'account-b',ledger:[{id:'reward-2',kind:'referral',amount:100}]});assert.equal(get('treta-earned-value').textContent,'+T$ 100');assert.equal(get('treta-earned-reason').textContent,'AMIGO NA TRETA');
context.updateTretaRewards(null);assert.equal(get('treta-earned').hidden,true);assert.equal(get('hub-treta-total').textContent,'T$ · ENTRAR');
context.updateTretaRewards({...state,ledger:[reward,{id:'sp',kind:'singleplayer',amount:10}]});assert.equal(get('treta-earned-value').textContent,'+T$ 10');
get('treta-earned-close').onclick();context.updateTretaRewards({...state,ledger:[reward,{id:'sp',kind:'singleplayer',amount:10},{id:'negative',kind:'email',amount:-200},{id:'purchase',kind:'purchase',amount:800},{id:'fraction',kind:'multiplayer',amount:1.5}]});timers[0]();assert.equal(get('treta-earned').hidden,true,'Invalid, spent and already shown rows remain silent');
console.log('PASS: wallet header, modal queue, per-account reward dedup, referral/SP/MP labels and logout cleanup');

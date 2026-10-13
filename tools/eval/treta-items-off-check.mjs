import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
import {spawnSync} from 'node:child_process';
import {TRETA_SKINS} from '../../public/js/treta-catalog.js';
const mutant=process.argv.find(x=>x.startsWith('--mutant='))?.split('=')[1];
if(process.argv.includes('--mutations')){
 for(const id of ['enabled','preload','mount','equipped','navigation','unapproved-skin']){
  const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'--mutant='+id],{encoding:'utf8'});
  assert.notEqual(r.status,0,`Surviving OFF/approval mutant: ${id}`);
 }
 console.log('PASS: 6/6 OFF and skin approval mutations rejected');process.exit(0);
}
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const feature=read('public/js/treta-features.js').replace('= false',mutant==='enabled'?'= true':'= false');
let eyeSource=read('public/js/eyewear.js');
if(mutant==='preload')eyeSource=eyeSource.replace('export async function preloadEyewearAssets(ids=[]) {\n  if(!TRETA_ITEMS_ENABLED)return;','export async function preloadEyewearAssets(ids=[]) {');
if(mutant==='mount')eyeSource=eyeSource.replace('export function mountEyewear(model,def) {\n  if(!TRETA_ITEMS_ENABLED)return null;','export function mountEyewear(model,def) {return {};');
let storeSource=read('public/js/treta-store.js');
if(mutant==='equipped')storeSource=storeSource.replace('export function equippedTretaEyewear() {\n  if(!TRETA_ITEMS_ENABLED)return null;',"export function equippedTretaEyewear() {return 'metal-de-rua';");
if(mutant==='navigation')storeSource=storeSource.replace("allTabs.filter(tab=>TRETA_ITEMS_ENABLED || tab.dataset.tretaView!=='accessories')",'allTabs');
if(mutant==='unapproved-skin')storeSource=storeSource.replace('TRETA_SKINS.filter(s=>manifest.skins[s.id]?.approved===true)','TRETA_SKINS');
const strip=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/export /g,'');
let eyeFetches=0;
const eye=vm.createContext({console,THREE:{},GLTFLoader:class{},fetch:async()=>{eyeFetches++;return {ok:true,json:async()=>({eyewear:{}})};}});
vm.runInContext(strip(feature)+'\n'+strip(eyeSource),eye);
await eye.preloadEyewearAssets(['metal-de-rua']);
assert.equal(eyeFetches,0,'OFF preload must not fetch its manifest');
assert.equal(eye.mountEyewear({traverse(){throw Error('OFF traverse');}},{id:'capitao',eyewearId:'metal-de-rua'}),null);
class Element {
  constructor(id=''){this.id=id;this.children=[];this.dataset={};this.style={setProperty(){}};this.hidden=false;this.open=false;this.classList={contains(){return false;}};this.attributes={};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  addEventListener(){}
  focus(){}
  close(){this.open=false;}
  get lastChild(){return this.children.at(-1);}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const tabs=['skins','quests','accessories'].map(view=>{const el=new Element();el.dataset.tretaView=view;el.setAttribute('aria-controls',`treta-${view}-view`);return el;});
tabs[2].hidden=true;
get('treta-accessories-view').hidden=true;
let requests=[];
const fixture={authenticated:true,accountId:'review-fixture',wallet:{balance:1000},inventory:[{skin_id:'metal-de-rua',equipped:true}],catalog:[{id:'metal-de-rua',slot:'eyewear',available:true,model_path:'/models/items/test.glb'}]};
const context=vm.createContext({console,Intl,Date,URLSearchParams,URL,location:{search:'',origin:'http://fixture.invalid'},localStorage:{getItem(){return null;},setItem(){}},navigator:{},CustomEvent:class{constructor(type){this.type=type;}},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){},fetch:async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(read('public/models/skins/manifest.json'))};},loadAccount:async()=>({authenticated:false}),socialApi:async(url,body)=>{requests.push({url,body});return fixture;},initTretaRewards(){},updateTretaRewards(){},byId:id=>({id}),eyewearProfile:eye.eyewearProfile,TRETA_SKINS,TRETA_EYEWEAR:[{id:'metal-de-rua',slot:'eyewear'}],TRETA_COINS:[],TRETA_ACCESSORY_PROPOSALS:[{name:'BONÉ'}],TRETA_DEFAULT_REWARDS:{},TRETA_COIN_ART:{poster:'/img/coin.webp'},document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:selector=>selector==='[data-treta-view]'?tabs:[],querySelector(){return null;},addEventListener(){},dispatchEvent(){},body:new Element()}});
vm.runInContext(strip(feature)+'\n'+strip(storeSource),context);
context.initTretaStore({skipPrompt:true});
await new Promise(r=>setImmediate(r));
assert.equal(get('treta-grid').children.length,Object.values(JSON.parse(read('public/models/skins/manifest.json')).skins).filter(s=>s.approved===true).length,'Only approved skins appear in the store');
assert.equal(tabs[2].hidden,true,'OFF accessory tab stays hidden');
assert.equal(get('treta-accessories').children.length,0,'OFF proposals must remain empty');
assert.equal(get('treta-eyewear-grid').children.length,0,'OFF grid must remain empty');
assert.equal(tabs[2].onclick,undefined,'OFF tab must not receive click handler');
tabs[1].onkeydown({key:'ArrowRight',preventDefault(){}});
assert.equal(tabs[0].attributes['aria-selected'],'true','OFF keyboard navigation must wrap quests to skins');
assert.equal(get('treta-accessories-view').hidden,true,'OFF navigation must never reveal accessories');
assert(!requests.some(r=>typeof r==='string' && r.includes('/items/')),'OFF store must not fetch items');
assert.equal(context.equippedTretaEyewear(),null,'OFF must not expose owned/equipped server items');
vm.runInContext("eyeManifest={eyewear:{'metal-de-rua':{approved:true,model:'/models/items/test.glb',profiles:{capitao:{approved:true,width:1,height:1,depth:1}}}}};selected={id:'metal-de-rua',slot:'eyewear'};previewReady=true;",context);
vm.runInContext('state='+JSON.stringify(fixture),context);
assert.equal(context.equippedTretaEyewear(),null,'OFF blocks server equipped items even after manifest injection');
requests=[];
await vm.runInContext('buy()',context);
assert.equal(requests.length,0,'OFF malicious approved item fixture must not purchase/equip');
const entries=Object.values(JSON.parse(read('public/models/items/eyewear-manifest.json')).eyewear);
assert(entries.every(e=>e.approved===false && Object.keys(e.profiles).length===0),'All real items remain unapproved without fit profiles');
console.log('PASS default-OFF contract: mount, proposals, grid, tab handlers, keyboard wrap, store fetch, equipped exposure, purchase/equip refusal, real manifest approval state. DOM mocked; no browser or Astro rendering.');

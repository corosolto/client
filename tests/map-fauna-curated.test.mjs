import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, carregaMapa } from '../tools/eval/harness.mjs';
import { auditCuratedFauna } from '../tools/eval/map-fauna-curated.mjs';
import { ESCADAO_AMBIENCE } from '../public/js/map_escadao.js';
import { LAJES_AMBIENCE } from '../public/js/map_lajes_authored.js';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const references=JSON.parse(read('tools/eval/map-fauna-curated.json'));
const ambient=read('public/js/ambientlife.js'),main=read('public/js/main.js');
await Promise.all(['escadao','lajes'].map(carregaMapa));
const registry=JSON.parse(read('mint-assets.json')).assets;
for(const ref of references)test(`${ref.map}/${ref.type} binds the curated file and keeps its authored density`,()=>{
 const world=MAPS[ref.map].build(new THREE.Scene(),initTextures());
 const animals=world.ambience.animals.filter(a=>a.type===ref.type);
 assert.equal(animals.length,ref.count);
 assert.ok(animals.every(a=>a.root.userData.assetId===ref.assetId));
 if(ref.speed)assert.deepEqual(animals[0].speed,ref.speed);
 assert.deepEqual(MAPS[ref.map].ambience,ref.map==='escadao'?ESCADAO_AMBIENCE:LAJES_AMBIENCE);
 assert.equal(MAPS[ref.map].mobileAmbience,true);
 assert.ok(MAPS[ref.map].ambience.includes(ref.assetId));
 const record=registry[ref.registryId];assert.ok(record.files.includes('public/'+ref.path));
 assert.equal(record.processing.finalSha256,ref.sha256);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../public/'+ref.path,import.meta.url))).digest('hex'),ref.sha256);
 world.ambience.dispose();
});
function mobileCalls(map,{source=main,ambientSource=ambient,next=false,mobileAuto=true}={}){
 const calls=[],errors=[];
 const noop=()=>Promise.resolve();
 const context=vm.createContext({console:{error:(...a)=>errors.push(a),warn:(...a)=>errors.push(a)},Promise,Set,Math,
  MAPS,MAP_PROPS:[],MOBILE_AUTO:mobileAuto,POINTER_COARSE:true,_vmStartWeapon:'ak',_armasDaPartida:['ak'],navOnly:false,_charsToLoad:[],matchSkins:[],matchEyewear:[],playerWeaponSkins:{},mapaPartida:map,
  preloadAmbientLife:ids=>{calls.push([...ids]);return Promise.resolve();},
  preloadCharacterAssets:noop,preloadCosmeticAssets:noop,preloadEyewearAssets:noop,preloadWeaponSkinCandidate:noop,preloadMapProps:noop,preloadFPArms:noop,preloadAuthoredFamilies:noop,authoredBootFamilies:()=>[],sfx:{preloadWeaponSamples:noop},
  planoPreload:()=>({mapId:Object.keys(MAPS).find(id=>MAPS[id]===map),chars:[],weapons:[]}),GLB_CHARS:[],WEAPON_IDS:[],tr:x=>x,$:()=>null,LANG:'pt',textoProximo:()=>'',segundosAteVirada:()=>0,mpPararContagemProximo(){},mpContagemProximo:null,setInterval:()=>1,clearInterval(){},charWeapon:()=> 'ak',currentChar:'barbudo',comMapaCarregado:(_id,fn)=>Promise.resolve(fn(map)),defineSeedHavan:()=>Promise.resolve(map)});
 const helper=ambientSource.match(/export async function preloadMapAmbientLife\([^]*?\n}/)?.[0];
 if(helper)new vm.Script(helper.replace('export ','')).runInContext(context);
 if(!next){
  const start=source.indexOf('  const _vmBootWeapons =');assert.ok(start>=0);
  const end=source.indexOf('  if (lancamentoPerdeu',start);assert.ok(end>start);
  return new vm.Script('(async()=>{'+source.slice(start,end)+'})()').runInContext(context).then(()=>{assert.deepEqual(errors,[]);return calls;});
 }
 const start=source.indexOf('function mpPreCarregarProximo(m) {'),end=source.indexOf('/* Monta (ou remonta)',start);assert.ok(start>=0&&end>start);
 new vm.Script(source.slice(start,end)+';mpPreCarregarProximo({});').runInContext(context);
 return new Promise((resolve,reject)=>setImmediate(()=>{try{assert.deepEqual(errors,[]);resolve(calls);}catch(error){reject(error);}}));
}
for(const map of ['escadao','lajes'])for(const next of [false,true])test(`${map}: actual ${next?'MP next-map':'match launch'} preloads fauna in automatic mobile`,async()=>{
 assert.deepEqual(await mobileCalls(MAPS[map],{next}),[MAPS[map].ambience]);
});
test('mobile keeps unrelated maps out of the fauna preload',async()=>assert.deepEqual(await mobileCalls(MAPS.praca_poderes),[]));
function replaceOnce(source,old,value){assert.equal(source.split(old).length-1,1);return source.replace(old,value);}
test('control mutation restores the mobile match skip and fails the caller contract',async()=>{
 const source=replaceOnce(main,'preloadMapAmbientLife(mapaPartida, { mobileAuto: MOBILE_AUTO })','MOBILE_AUTO ? null : preloadMapAmbientLife(mapaPartida, { mobileAuto: MOBILE_AUTO })');
 await assert.rejects(async()=>assert.deepEqual(await mobileCalls(MAPS.escadao,{source}),[MAPS.escadao.ambience]));
});
test('control mutation restores the mobile next-map skip and fails the caller contract',async()=>{
 const source=replaceOnce(main,'mapaReady.then((mapa) => preloadMapAmbientLife(mapa, { mobileAuto: MOBILE_AUTO }))','MOBILE_AUTO ? null : mapaReady.then((mapa) => preloadMapAmbientLife(mapa, { mobileAuto: MOBILE_AUTO }))');
 await assert.rejects(async()=>assert.deepEqual(await mobileCalls(MAPS.lajes,{source,next:true}),[MAPS.lajes.ambience]));
});
function validSample(ref){return {map:ref.map,preload:[ref.assetId],animals:[{id:ref.type+'-0',type:ref.type,source:'gltf',assetId:ref.assetId,assetPath:ref.path,speed:ref.speed,actions:{idle:'Idle',walk:'Walk',run:'Run'},meshes:[{materials:[Object.fromEntries(Object.entries(ref.textures).map(([key,size])=>[key,{width:size[0],height:size[1],colorSpace:key==='albedo'?'srgb':''}]))]}],motion:{distance:1,localPoseChanges:1,activeClip:'Walk'}}]};}
for(const ref of references)test(`${ref.map}: runtime auditor accepts complete evidence and rejects causal corruptions`,()=>{
 const sample=validSample(ref);assert.equal(auditCuratedFauna(sample,references).pass,true);
 const mutations=[['count',s=>s.animals=[]],['source',s=>s.animals[0].source='fallback'],['identity',s=>s.animals[0].assetId='old'],['identity',s=>s.animals[0].assetPath='models/ambient/old.glb'],['preload',s=>s.preload=[]],['materials',s=>s.animals[0].meshes=[]],['texture',s=>s.animals[0].meshes[0].materials[0].albedo=null],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.width=0],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.colorSpace=''],['clips',s=>s.animals[0].actions.walk='Idle'],['motion',s=>s.animals[0].motion.localPoseChanges=0],['motion',s=>s.animals[0].motion.activeClip='Idle'],['motion',s=>s.animals[0].motion.distance=0]];
 if(ref.speed)mutations.push(['speed',s=>s.animals[0].speed={walk:1.1,flee:3.6}]);
 for(const [family,mutate] of mutations){const changed=structuredClone(sample);mutate(changed);const audit=auditCuratedFauna(changed,references);assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family===family),family);}
});
test('unknown or unmeasured map is not a visual approval',()=>assert.equal(auditCuratedFauna({map:'unknown',animals:[]},references).pass,false));

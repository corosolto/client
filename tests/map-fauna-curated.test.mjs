import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, carregaMapa } from '../tools/eval/harness.mjs';
import { auditCuratedFauna } from '../tools/eval/map-fauna-curated.mjs';
import { ESCADAO_AMBIENCE } from '../public/js/map_escadao.js';
import { LAJES_AMBIENCE } from '../public/js/map_lajes_authored.js';
import { createFavelaAmbience } from '../public/js/ambientlife.js';
import { makeContactShadow } from '../public/js/contact-shadow.js';
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
 const mutations=[['count',s=>s.animals=[]],['count',s=>s.animals.push(structuredClone(s.animals[0]))],['source',s=>s.animals[0].source='fallback'],['identity',s=>s.animals[0].assetId='old'],['identity',s=>s.animals[0].assetPath='models/ambient/old.glb'],['preload',s=>s.preload=[]],['materials',s=>s.animals[0].meshes=[]],['texture',s=>s.animals[0].meshes[0].materials[0].albedo=null],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.width=0],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.colorSpace=''],['clips',s=>s.animals[0].actions.walk='Idle'],['motion',s=>s.animals[0].motion.localPoseChanges=0],['motion',s=>s.animals[0].motion.activeClip='Idle'],['motion',s=>s.animals[0].motion.distance=0]];
 if(ref.speed)mutations.push(['speed',s=>s.animals[0].speed={walk:1.1,flee:3.6}]);
 for(const [family,mutate] of mutations){const changed=structuredClone(sample);mutate(changed);const audit=auditCuratedFauna(changed,references);assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family===family),family);}
});
test('unknown or unmeasured map is not a visual approval',()=>assert.equal(auditCuratedFauna({map:'unknown',animals:[]},references).pass,false));
for(const low of [false,true])test(`curated ground fauna keeps a non-hittable contact shadow in ${low?'low':'full'} quality`,()=>{
 const ambience=createFavelaAmbience(new THREE.Group(),{map:'contact-fixture',low,cats:[{pos:[2,3,4],to:[2,3,5],contactShadow:true}]});
 const animal=ambience.animals[0],shadow=animal.root.getObjectByName('FAUNA_CONTACT_SHADOW');
 assert.ok(shadow,'a shadow map cannot resolve contact at this animal scale');
 assert.equal(shadow.geometry.index.count,6);assert.equal(shadow.material.opacity,.45);
 assert.equal(shadow.material.depthWrite,false);assert.equal(shadow.userData.noHit,true);
 const hits=[];shadow.raycast(new THREE.Raycaster(),hits);assert.deepEqual(hits,[]);
 ambience.update(1/60,null);animal.root.updateMatrixWorld(true);
 assert.equal(shadow.getWorldPosition(new THREE.Vector3()).y,animal.root.position.y+.02);
 let disposed=false;shadow.material.addEventListener('dispose',()=>{disposed=true;});ambience.dispose();assert.equal(disposed,true);
});
for(const ref of references)test(`${ref.map}/${ref.type} actually opts into contact shading`,()=>{
 const world=MAPS[ref.map].build(new THREE.Scene(),initTextures());
 assert.ok(world.ambience.animals.filter(a=>a.type===ref.type).every(a=>a.root.getObjectByName('FAUNA_CONTACT_SHADOW')));world.ambience.dispose();
});

test('boot budget mutation still moves the actual fauna preload before props',()=>{
 const gate=read('tools/eval/boot-orcamento-check.mjs'),a=gate.indexOf('const FAUNA_ADIADA ='),b=gate.indexOf('const SPLASH_READY =',a);
 assert.ok(a>=0&&b>a);const context=vm.createContext({});new vm.Script(gate.slice(a,b)).runInContext(context);
 const changed=context.faunaCedo(main),call='preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});';
 const load=source=>source.slice(source.indexOf('async function loadMenuBackdrop()'),source.indexOf('// Rotas compartilhadas'));
 assert.ok(load(main).indexOf(call)>load(main).indexOf('return propsReady.then'));
 assert.ok(load(changed).indexOf(call)<load(changed).indexOf('return propsReady.then'));
 assert.equal(load(changed).split(call).length-1,1);
});

test('contact shadow omission and lifetime mutations fail the actual controller contract',()=>{
 for(const [old,value] of [['if (config.contactShadow) {','if (false) {'],['animal.contactShadow?.material.dispose();',';']]){
  const changed=replaceOnce(ambient,old,value).replace(/^import .+;$/gm,'').replace(/^export /gm,'');
  const context=vm.createContext({THREE,makeContactShadow,GLTFLoader:class{},skeletonClone:x=>x,assetUrl:x=>x});
  new vm.Script(changed).runInContext(context);
  assert.throws(()=>{
   const ambience=context.createFavelaAmbience(new THREE.Group(),{map:'mutant',cats:[{pos:[0,0,0],contactShadow:true}]});
   const shadow=ambience.animals[0].root.getObjectByName('FAUNA_CONTACT_SHADOW');assert.ok(shadow);
   let disposed=false;shadow.material.addEventListener('dispose',()=>{disposed=true;});ambience.dispose();assert.equal(disposed,true);
  });
 }
});

test('actual browser collector sees extra target animals; restoring find is detected',async()=>{
 const source=read('tools/eval/map-fauna-curated-capture.mjs'),start=source.indexOf('const record=await page.evaluate(')+'const record=await page.evaluate('.length,end=source.indexOf('\n },{map,type});',start);
 assert.ok(start>0&&end>start);
 const callback=source.slice(start,end+3).replace("await import('three')",'THREE_STUB').replace("await import('/js/maps.js')",'MAPS_STUB');
 const ref=references[0];
 async function collect(code){
  const root=new THREE.Group(),animals=[0,1].map(i=>{
   const a={...validSample(ref).animals[0],id:'chicken-'+i,root:new THREE.Group(),model:new THREE.Group(),action:'walk'};
   const bone=new THREE.Bone();a.model.add(bone);a.root.add(a.model);root.add(a.root);
   a.root.userData.assetId=ref.assetId;a.root.userData.assetPath=ref.path;
   a.actions={idle:{getClip:()=>({name:'Idle'})},walk:{getClip:()=>({name:'Walk'}),getEffectiveWeight:()=>1}};return a;
  });
  const world={ambience:{animals,update(){for(const a of animals){a.root.position.x+=.01;a.model.children[0].rotation.z+=.01;}},reset(){for(const a of animals)a.root.position.set(0,0,0);}}};
  const context=vm.createContext({THREE_STUB:THREE,MAPS_STUB:{MAPS},window:{__gworld:world,MAPEVAL:{cam:new THREE.PerspectiveCamera(),view(){}}}});
  return new vm.Script('('+code+')').runInContext(context)({map:ref.map,type:ref.type});
 }
 const actual=await collect(callback);assert.equal(actual.animals.length,2);assert.ok(auditCuratedFauna(actual,references).failures.some(f=>f.family==='count'));
 const mutant=replaceOnce(callback,'world.ambience.animals.filter(a=>a.type===type)','[world.ambience.animals.find(a=>a.type===type)]');
 await assert.rejects(async()=>assert.equal((await collect(mutant)).animals.length,2));
});

function assertBootOverlay(source){
 const declaration=source.match(/const JS_LOCAIS = (\[[^;]+\]);/);assert.ok(declaration);
 const local=new vm.Script(declaration[1]).runInNewContext();
 const helper=main.match(/import \{ preloadMapAmbientLife \} from '\.\/([^']+)'/);assert.ok(helper);
 assert.ok(local.includes('js/'+helper[1]),'the actual new main import must resolve to the candidate provider');
 const shadow=ambient.match(/import \{ makeContactShadow \} from '\.\/([^']+)'/);assert.ok(shadow);
 assert.ok(local.includes('js/'+shadow[1]),'the candidate provider must resolve its new shadow dependency locally');
}
test('boot budget overlays the real new helper and shadow dependency with main',()=>assertBootOverlay(read('tools/eval/boot-orcamento-check.mjs')));
test('omitting either new boot dependency is detected',()=>{
 const source=read('tools/eval/boot-orcamento-check.mjs');
 for(const rel of ['js/ambientlife.js','js/contact-shadow.js']){
  assert.ok(source.includes("'"+rel+"'"));
  assert.throws(()=>assertBootOverlay(source.replace("'"+rel+"', ",'')));
 }
});

async function bootResponse(source){
 const start=source.indexOf('    await context.route(`**/${rel}*`, async (rota) => {');
 const end=source.indexOf('\n    });',start);assert.ok(start>=0&&end>start);
 const code=source.slice(start,end+'\n    });'.length);
 const localFunctionStart=source.indexOf('function serveLocalModule(');
 const localFunctionEnd=source.indexOf('\n}',localFunctionStart)+2;
 const helper=localFunctionStart>=0?source.slice(localFunctionStart,localFunctionEnd):'';
 let fulfilled;
 const context=vm.createContext({rel:'js/contact-shadow.js',corpo:'export const shadow = true;',
  context:{route:async(_pattern,fn)=>fn({fetch:async()=>({status:()=>404}),fulfill:async options=>{fulfilled=options;}})}});
 await new vm.Script(helper+'\n(async()=>{'+code+'})()').runInContext(context);
 return fulfilled;
}
test('real boot overlay serves a new local module as JavaScript200 even when upstream is404',async()=>{
 const response=await bootResponse(read('tools/eval/boot-orcamento-check.mjs'));
 assert.equal(response.status,200);assert.equal(response.contentType,'text/javascript');assert.equal(response.body,'export const shadow = true;');
});

function bootBytes(source,corposLocais){
 const declaration=source.match(/const JS_LOCAIS = (\[[^;]+\]);/)[0];
 const start=source.indexOf('function bytesAntesDoPortao('),end=source.indexOf('\n}',start)+2;
 const helper=start>=0?source.slice(start,end):'';
 const expression=source.match(/    bytes: ([^\n]+),/)[1];
 const context=vm.createContext({Buffer,URL,corposLocais,ate:[{url:'https://fixture.invalid/js/ambientlife.js?v=hash',bytes:0},{url:'https://fixture.invalid/js/contact-shadow.js',bytes:0},{url:'https://fixture.invalid/models/props/chair.glb',bytes:17}]});
 return new vm.Script(declaration+'\n'+helper+'\nconst patchado = u => JS_LOCAIS.some(p => u.includes(p));\n'+expression).runInContext(context);
}
test('boot accounting charges local bodies and detects provider growth',()=>{
 const source=read('tools/eval/boot-orcamento-check.mjs');
 const bodies=new Map([['js/ambientlife.js','á'],['js/contact-shadow.js','shadow']]);
 const small=bootBytes(source,bodies);bodies.set('js/ambientlife.js','á'+'x'.repeat(100000));
 const large=bootBytes(source,bodies);assert.ok(large-small>=100000,'local provider growth must change ORC1');
 assert.equal(small,17+Buffer.byteLength('áshadow','utf8'));
});

test('boot response and local-byte omissions are caught causally',async()=>{
 const source=read('tools/eval/boot-orcamento-check.mjs');
 const badStatus=replaceOnce(source,'route.fulfill({ status: 200','route.fulfill({ status: 404');
 await assert.rejects(async()=>assert.equal((await bootResponse(badStatus)).status,200));
 const badCount=replaceOnce(source,"Buffer.byteLength(corposLocais.get(rel), 'utf8')","0 * Buffer.byteLength(corposLocais.get(rel), 'utf8')");
 assert.throws(()=>assert.equal(bootBytes(badCount,new Map([['js/ambientlife.js','á'],['js/contact-shadow.js','shadow']])),25));
});

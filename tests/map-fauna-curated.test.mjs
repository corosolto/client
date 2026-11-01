import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, carregaMapa } from '../tools/eval/harness.mjs';
import { auditCuratedFauna, auditCuratedFaunaCensus } from '../tools/eval/map-fauna-curated.mjs';
import { ESCADAO_AMBIENCE } from '../public/js/map_escadao.js';
import { LAJES_AMBIENCE } from '../public/js/map_lajes_authored.js';
import { createFavelaAmbience } from '../public/js/ambientlife.js';
import { makeContactShadow } from '../public/js/contact-shadow.js';
import { aguardarPreloads } from '../public/js/game.js';
import { mapPropIds } from '../public/js/mapprops.js';
import { snapshotPublicJs, startBootOrigin } from '../tools/eval/boot-network-origin.mjs';
import { somaCargas, chaveDeCarga, JS_EXCLUSOS } from '../tools/eval/boot-overlay.mjs';
import http from 'node:http';
import { gzipSync, gunzipSync } from 'node:zlib';
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
  MAPS,mapPropIds,aguardarPreloads,playerKnifeSkinId:null,MAP_PROPS:[],MOBILE_AUTO:mobileAuto,POINTER_COARSE:true,_vmStartWeapon:'ak',_armasDaPartida:['ak'],navOnly:false,_charsToLoad:[],matchSkins:[],matchEyewear:[],playerWeaponSkins:{},mapaPartida:map,
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
function validSample(ref){return {map:ref.map,declaredPreload:[ref.assetId],animals:[{id:ref.type+'-0',type:ref.type,source:'gltf',assetId:ref.assetId,assetPath:ref.path,speed:ref.speed,turnRate:ref.turnRate,actions:{idle:'Idle',walk:'Walk',run:'Run'},meshes:[{materials:[Object.fromEntries(Object.entries(ref.textures).map(([key,size])=>[key,{width:size[0],height:size[1],colorSpace:key==='albedo'?'srgb':''}]))]}],motion:{distance:1,localPoseChanges:1,activeClip:'Walk',maxYawDelta:.1},fleeSpace:ref.fleeSpace?{cases:[3,8].flatMap(warmup=>Array.from({length:8},(_,angle)=>({warmup,angle,frames:1200,dt:1/60,obstacleOverlaps:0,supportMisses:0,maxHalfExtent:.45,peakDistance:2,rejoined:true})))}:undefined}]};}
test('fauna CI requires an explicit origin before creating output or launching a browser',()=>{
 const dir=fs.mkdtempSync(join(tmpdir(),'coro-fauna-ci-no-base-')),out=join(dir,'output');
 try{
  const env={...process.env,BASE:'',FAUNA_OUT:out,CHROME_BIN:'/nonexistent-no-browser'};
  const child=spawnSync(process.execPath,[new URL('../tools/eval/map-fauna-curated-ci.mjs',import.meta.url).pathname],{env,encoding:'utf8',timeout:15000});
  assert.equal(child.status,1);assert.match(child.stderr,/BASE ausente/);assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('runtime census requires exactly one result per expected map before auditing',()=>{
 const samples=references.map(validSample);
 assert.equal(auditCuratedFaunaCensus({results:samples},references).pass,true);
 assert.equal(auditCuratedFaunaCensus({results:[...samples].reverse()},references).pass,true);
 for(const data of [null,{}, {results:null},{results:[]},{results:samples.slice(0,1)},{results:[samples[0],samples[0]]},{results:[...samples,samples[0]]},{results:[samples[0],{...samples[1],map:'unknown'}]},{results:[samples[0],null]}]){
  const audit=auditCuratedFaunaCensus(data,references);assert.equal(audit.pass,false);assert.deepEqual(audit.reports,[]);assert.ok(audit.failures.every(f=>f.family==='census'));
 }
 const duplicate=auditCuratedFaunaCensus({results:[samples[0],samples[0]]},references);
 assert.ok(duplicate.failures.some(f=>f.detail.includes('duplicado')));assert.ok(duplicate.failures.some(f=>f.detail.includes('ausente')));
 const broken=structuredClone(samples);broken[1].animals[0].source='fallback';
 assert.equal(auditCuratedFaunaCensus({results:broken},references).pass,false);
});
for(const ref of references)test(`${ref.map}: runtime auditor accepts complete evidence and rejects causal corruptions`,()=>{
 const sample=validSample(ref);assert.equal(auditCuratedFauna(sample,references).pass,true);
 const mutations=[['turn',s=>s.animals[0].turnRate=0],['turn',s=>s.animals[0].motion.maxYawDelta=Math.PI],['turn',s=>delete s.animals[0].motion.maxYawDelta],['count',s=>s.animals=[]],['count',s=>s.animals.push(structuredClone(s.animals[0]))],['source',s=>s.animals[0].source='fallback'],['identity',s=>s.animals[0].assetId='old'],['identity',s=>s.animals[0].assetPath='models/ambient/old.glb'],['declaredPreload',s=>s.declaredPreload=[]],['materials',s=>s.animals[0].meshes=[]],['texture',s=>s.animals[0].meshes[0].materials[0].albedo=null],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.width=0],['texture',s=>s.animals[0].meshes[0].materials[0].albedo.colorSpace=''],['clips',s=>s.animals[0].actions.walk='Idle'],['motion',s=>s.animals[0].motion.localPoseChanges=0],['motion',s=>s.animals[0].motion.activeClip='Idle'],['motion',s=>s.animals[0].motion.distance=0]];
 if(ref.speed)mutations.push(['speed',s=>s.animals[0].speed={walk:1.1,flee:3.6}]);
 if(ref.fleeSpace)for(const change of [s=>delete s.animals[0].fleeSpace,s=>s.animals[0].fleeSpace.cases.pop(),s=>s.animals[0].fleeSpace.cases[1]=structuredClone(s.animals[0].fleeSpace.cases[0]),
  s=>s.animals[0].fleeSpace.cases[0].obstacleOverlaps=1,s=>s.animals[0].fleeSpace.cases[0].supportMisses=1,s=>s.animals[0].fleeSpace.cases[0].maxHalfExtent=.51,
  s=>s.animals[0].fleeSpace.cases[0].peakDistance=0,s=>s.animals[0].fleeSpace.cases[0].rejoined=false,s=>s.animals[0].fleeSpace.cases[0].frames=0])mutations.push(['space',change]);
 for(const [family,mutate] of mutations){const changed=structuredClone(sample);mutate(changed);const audit=auditCuratedFauna(changed,references);assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family===family),family);}
});
test('unknown or unmeasured map is not a visual approval',()=>assert.equal(auditCuratedFauna({map:'unknown',animals:[]},references).pass,false));
test('curated map fauna reverses and flees without a one-frame half turn',()=>{
 for(const map of ['escadao','lajes']){
  const world=MAPS[map].build(new THREE.Scene(),initTextures()),ambience=world.ambience;
  const targets=ambience.animals.filter(a=>['escadaoCat','sertaoHen'].includes(a.root.userData.assetId));
  assert.ok(targets.length);assert.ok(targets.every(a=>a.turnRate===6));
  for(let frame=0;frame<1500;frame++){
   const before=targets.map(a=>a.root.rotation.y);ambience.update(1/60,null);
   for(const [i,a] of targets.entries())assert.ok(Math.abs(Math.atan2(Math.sin(a.root.rotation.y-before[i]),Math.cos(a.root.rotation.y-before[i])))<=.100000001);
  }
  const a=targets[0];ambience.onShot(a.root.position.clone().add(new THREE.Vector3(1,0,0)),a.root.position.clone());
  const before=a.root.rotation.y;ambience.update(1/60,null);
  assert.equal(a.state,'flee');assert.ok(Math.abs(Math.atan2(Math.sin(a.root.rotation.y-before),Math.cos(a.root.rotation.y-before)))<=.100000001);
  ambience.dispose();
 }
});
test('curated turning follows the shortest arc, scales with time, and preserves opt-out behavior',()=>{
 const ambience=createFavelaAmbience(new THREE.Group(),{map:'turn-contract',cats:[{pos:[0,0,0],turnRate:6}]});
 const a=ambience.animals[0];a.root.rotation.y=Math.PI-.02;
 ambience._turnQuad(a,-Math.PI+.02,1/60);assert.ok(Math.abs(a.root.rotation.y-(Math.PI+.02))<1e-12);
 for(const fps of [30,60,120]){a.root.rotation.y=0;for(let i=0;i<fps;i++)ambience._turnQuad(a,Math.PI,1/fps);assert.ok(Math.abs(a.root.rotation.y-Math.PI)<1e-12);}
 for(const dt of [0,-1,NaN,undefined]){a.root.rotation.y=.2;ambience._turnQuad(a,2,dt);assert.equal(a.root.rotation.y,.2);}
 a.root.rotation.y=0;ambience._turnQuad(a,2,1);assert.ok(Math.abs(a.root.rotation.y-.3)<1e-12);
 a.turnRate=0;ambience._turnQuad(a,2,1/60);assert.equal(a.root.rotation.y,2);
 let action;ambience._dogAction=(_a,name)=>{action=name;};
 const origin=a.root.position.clone();ambience.onShot(origin.clone().add(new THREE.Vector3(0,0,1)),origin);
 assert.equal(a.alertTurnDelay,0);ambience._updateQuad(a,0);assert.equal(action,'run');ambience.dispose();
});
test('curated route turns happen during idle and flee waits for heading alignment',()=>{
 const ambience=createFavelaAmbience(new THREE.Group(),{map:'heading-contract',cats:[{pos:[0,0,0],to:[0,0,2],phase:1.2,turnRate:6,speed:{walk:.55,flee:1.5}}]});
 const a=ambience.animals[0];let walks=0,flees=0,turns=0,pivotAction;
 const dogAction=ambience._dogAction.bind(ambience);ambience._dogAction=(animal,action)=>{pivotAction=action;dogAction(animal,action);};
 const aligned=(previous)=>{
  const displacement=a.root.position.clone().sub(previous);if(displacement.length()<1e-8)return false;
  const heading=new THREE.Vector3(Math.sin(a.root.rotation.y),0,Math.cos(a.root.rotation.y));
  assert.ok(heading.dot(displacement.normalize())>1-1e-8,'translation must follow the body heading');return true;
 };
 for(let i=0;i<1500;i++){const previous=a.root.position.clone();ambience.update(1/60,null);if(a.state==='walk'&&aligned(previous))walks++;}
 // Uma ameaça à frente exige uma meia-volta; a posição fica fixa durante o pivô.
 a.root.rotation.y=0;const origin=a.root.position.clone();ambience.onShot(origin.clone().add(new THREE.Vector3(0,0,1)),origin);
 assert.ok(Math.abs(a.alertTurnDelay-Math.PI/6)<1e-12);
 for(let i=0;i<100;i++){
  const previous=a.root.position.clone();ambience.update(1/60,null);
  if(a.state==='flee'){if(ambience.time-a.alertAt<=a.alertTurnDelay){assert.ok(a.root.position.distanceTo(origin)<1e-12);assert.equal(pivotAction,'walk');turns++;}else if(aligned(previous))flees++;}
 }
 assert.ok(walks>0&&flees>0&&turns>0);ambience.dispose();
});
test('curated recovery from a lateral threat turns before walking and rejoins the route',()=>{
 const speed={walk:.55,flee:1.5};
 const ambience=createFavelaAmbience(new THREE.Group(),{map:'recover-heading-contract',cats:[{pos:[0,0,0],to:[0,0,2],turnRate:6,speed}]});
 const a=ambience.animals[0],origin=a.root.position.clone();ambience.onShot(origin.clone().add(new THREE.Vector3(1,0,0)),origin);
 let frames=0,moving=0,sideways=0,maxStep=0,maxTurn=0,rejoined=false;
 for(let i=0;i<1800;i++){
  const previous=a.root.position.clone(),yaw=a.root.rotation.y;ambience.update(1/60,null);
  if(a.state==='recover'){
   frames++;const displacement=a.root.position.clone().sub(previous),step=displacement.length();maxStep=Math.max(maxStep,step);
   maxTurn=Math.max(maxTurn,Math.abs(Math.atan2(Math.sin(a.root.rotation.y-yaw),Math.cos(a.root.rotation.y-yaw))));
   if(step>1e-8){moving++;const heading=new THREE.Vector3(Math.sin(a.root.rotation.y),0,Math.cos(a.root.rotation.y));if(heading.dot(displacement.normalize())<1-1e-8)sideways++;}
  }
  if(frames&&a.alertUntil===0){rejoined=true;break;}
 }
 assert.ok(frames>0&&moving>0&&rejoined,'lateral recovery must complete');
 assert.equal(sideways,0,'recovery translation must follow the body heading');
 assert.ok(maxStep<=speed.walk/60+1e-9,'recovery keeps the authored walk speed');assert.ok(maxTurn<=6/60+1e-9);
 ambience.dispose();
});
function lajesFootprintBlocked(world,animal){
 const p=animal.root.position,r=.5;
 return world.colliders.some(b=>b.maxY>p.y+.02&&b.minY<p.y+.5&&p.x+r>b.minX&&p.x-r<b.maxX&&p.z+r>b.minZ&&p.z-r<b.maxZ)
  || [-r,r].some(dx=>[-r,r].some(dz=>world.groundHeightAt(p.x+dx,p.z+dz,p.y+.1)<p.y-1e-9));
}
test('Lajes cat flees and recovers inside the clear roof across threat directions and frame rates',()=>{
 const world=MAPS.lajes.build(new THREE.Scene(),initTextures()),ambience=world.ambience,a=ambience.animals.find(a=>a.type==='cat');
 assert.ok(a.fleeArea);let scenarios=0;
 for(const dt of [1/30,1/60,1/120])for(const warmup of [3,8])for(let angle=0;angle<8;angle++){
  ambience.reset();for(let time=0;time<warmup;time+=dt)ambience.update(dt,null);
  const p=a.root.position.clone(),threat=p.clone().add(new THREE.Vector3(Math.sin(angle*Math.PI/4),0,Math.cos(angle*Math.PI/4)));
  ambience.onShot(threat,p);assert.ok(a.fleeDistance>.5,'the clear route must allow a visible escape');
  let moved=false,rejoined=false;
  for(let time=0;time<30;time+=dt){
   const previous=a.root.position.clone();ambience.update(dt,null);const step=a.root.position.distanceTo(previous);
   assert.equal(lajesFootprintBlocked(world,a),false,`threat${angle}, dt${dt}, time${time}`);
   assert.ok(step<=a.speed.flee*dt+1e-8);moved ||= step>1e-8;
   if(a.alertUntil===0){rejoined=true;break;}
  }
  assert.ok(moved&&rejoined);scenarios++;
 }
 assert.equal(scenarios,48);ambience.dispose();
});
test('control mutation removing the Lajes flee area restores the tank crossing',()=>{
 const world=MAPS.lajes.build(new THREE.Scene(),initTextures()),ambience=world.ambience,a=ambience.animals.find(a=>a.type==='cat');
 a.fleeArea=null;for(let i=0;i<180;i++)ambience.update(1/60,null);
 const p=a.root.position.clone();ambience.onShot(p.clone().add(new THREE.Vector3(1,0,0)),p);
 let blocked=0;for(let i=0;i<1200;i++){ambience.update(1/60,null);if(lajesFootprintBlocked(world,a))blocked++;}
 assert.ok(blocked>0,'the collision oracle must reject the original escape');ambience.dispose();
});
test('authored flee areas reject invalid bounds or a route outside the area',()=>{
 const root=new THREE.Group(),bounds={minX:0,maxX:2,minZ:0,maxZ:2};
 for(const [fleeArea,pos,to] of [[{...bounds,minX:NaN},[1,0,1]],[{...bounds,maxX:0},[1,0,1]], [bounds,[-1,0,1]],[bounds,[1,0,1],[1,0,3]],[bounds,[NaN,0,1]]])
  assert.throws(()=>createFavelaAmbience(root,{map:'bad-area',cats:[{pos,to,fleeArea}]}),/ambient_flee_area/);
 const ambience=createFavelaAmbience(root,{map:'valid-area',cats:[{pos:[1,0,1],fleeArea:bounds}]});ambience.dispose();
});
for(const low of [false,true])test(`curated ground fauna keeps a non-hittable contact shadow in ${low?'low':'full'} quality`,()=>{
 const ambience=createFavelaAmbience(new THREE.Group(),{map:'contact-fixture',low,cats:[{pos:[2,3,4],to:[2,3,5],contactShadow:true}]});
 const animal=ambience.animals[0],shadow=animal.root.getObjectByName('FAUNA_CONTACT_SHADOW');
 assert.ok(shadow,'a shadow map cannot resolve contact at this animal scale');
 assert.equal(shadow.geometry.index.count,6);assert.equal(shadow.material.opacity,.45);
 const bare=createFavelaAmbience(new THREE.Group(),{map:'shadow-size-reference',low,cats:[{pos:[0,0,0]}]});
 assert.equal(shadow.scale.x,new THREE.Box3().setFromObject(bare.animals[0].model).getSize(new THREE.Vector3()).y);assert.equal(shadow.scale.y,shadow.scale.x);bare.dispose();
 assert.equal(typeof ambience.reset,'function');ambience.reset();
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
 for(const [old,value] of [['if (config.contactShadow) {','if (false) {'],['animal.contactShadow?.material.dispose();',';'],['makeContactShadow(height)','makeContactShadow(height*.1)'],['  reset() {','  resetRemoved() {']]){
  const changed=replaceOnce(ambient,old,value).replace(/^import .+;$/gm,'').replace(/^export /gm,'');
  const context=vm.createContext({THREE,makeContactShadow,GLTFLoader:class{},skeletonClone:x=>x,assetUrl:x=>x});
  new vm.Script(changed).runInContext(context);
  assert.throws(()=>{
   const ambience=context.createFavelaAmbience(new THREE.Group(),{map:'mutant',cats:[{pos:[0,0,0],contactShadow:true}]});
   const animal=ambience.animals[0],shadow=animal.root.getObjectByName('FAUNA_CONTACT_SHADOW');assert.ok(shadow);
   const bare=context.createFavelaAmbience(new THREE.Group(),{map:'shadow-size-reference',cats:[{pos:[0,0,0]}]});
   assert.equal(shadow.scale.x,new THREE.Box3().setFromObject(bare.animals[0].model).getSize(new THREE.Vector3()).y);assert.equal(shadow.scale.y,shadow.scale.x);bare.dispose();ambience.reset();
   let disposed=false;shadow.material.addEventListener('dispose',()=>{disposed=true;});ambience.dispose();assert.equal(disposed,true);
  });
 }
});

test('actual browser collector sees extra target animals; restoring find is detected',async()=>{
 const source=read('tools/eval/map-fauna-curated-collector.mjs'),start=source.indexOf('const record=await page.evaluate(')+'const record=await page.evaluate('.length,end=source.indexOf('\n },{map,type});',start);
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

const publicRoot=new URL('../public/',import.meta.url);
function assertFaunaSnapshot(snapshot){
 const entries=new Map(snapshot.entries.map(row=>[row.rel,row.body]));
 for(const [source,name] of [[main,'preloadMapAmbientLife'],[ambient,'makeContactShadow']]){
  const rel=source.match(new RegExp("import \\{ "+name+" \\} from '\\./([^']+)'"))?.[1];
  assert.ok(rel,`actual ${name} import absent`);
  assert.equal(entries.get('js/'+rel),read('public/js/'+rel),`candidate dependency ${rel} absent/stale`);
 }
}
const rawGet=url=>new Promise((resolve,reject)=>{
 http.get(url,response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
  response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)}));
 }).on('error',reject);
});
async function withBootOrigin(options,run){
 const errors=[],origin=await startBootOrigin({BASE:'http://127.0.0.1:1',snapshot:snapshotPublicJs(publicRoot),onError:e=>errors.push(e.message),...options});
 try {const result=await run(origin);assert.deepEqual(errors,[]);return result;}finally{await origin.close();}
}
function charged(origin,rel){
 assert.ok(!JS_EXCLUSOS.includes(rel),`${rel} must remain in ORC1`);
 const url=origin.url+'/'+rel,local=origin.lookup(url);
 return somaCargas({ate:[{url,bytes:0,fim:1,erro:null}],isentas:new Set(),sobrepostos:new Map([[chaveDeCarga(url),local.payloadBytes]])}).total;
}
test('boot snapshot includes the actual fauna provider and its new shadow dependency',()=>{
 const source=read('tools/eval/boot-orcamento-check.mjs');
 assert.match(source,/SNAPSHOT=snapshotPublicJs\(PUBLIC_ROOT\)/);
 assert.match(source,/startBootOrigin\(\{BASE,snapshot:SNAPSHOT/);
 assertFaunaSnapshot(snapshotPublicJs(publicRoot));
});
test('omitting either dependency from the real boot snapshot is detected',()=>{
 const snapshot=snapshotPublicJs(publicRoot);
 for(const rel of ['js/ambientlife.js','js/contact-shadow.js']){
  assert.ok(snapshot.entries.some(row=>row.rel===rel));
  assert.throws(()=>assertFaunaSnapshot({...snapshot,entries:snapshot.entries.filter(row=>row.rel!==rel)}),/absent\/stale/);
 }
});
test('boot origin serves local fauna JavaScript200 without consulting an upstream404',async()=>{
 let requests=0;const upstream=http.createServer((_req,res)=>{requests++;res.writeHead(404);res.end('missing');});
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const BASE='http://127.0.0.1:'+upstream.address().port;
 try{
  assert.equal((await rawGet(BASE+'/js/contact-shadow.js')).status,404);assert.equal(requests,1);
  await withBootOrigin({BASE},async origin=>{
   for(const rel of ['js/ambientlife.js','js/contact-shadow.js']){
    const response=await rawGet(origin.url+'/'+rel),local=origin.lookup(origin.url+'/'+rel);
    assert.equal(response.status,200);assert.match(response.headers['content-type'],/^text\/javascript/);
    assert.equal(response.headers['content-encoding'],'gzip');assert.equal(gunzipSync(response.body).toString(),read('public/'+rel));
    assert.equal(response.body.length,local.payloadBytes);assert.equal(charged(origin,rel),response.body.length);
   }
   assert.equal(requests,1,'local dependencies must not inherit upstream404');
  });
 }finally{await new Promise(resolve=>upstream.close(resolve));}
});
test('boot accounting charges compressed local provider growth',async()=>{
 const noise=Array.from({length:2048},(_,i)=>createHash('sha256').update(String(i)).digest('hex')).join('');
 const measure=transformJs=>withBootOrigin({transformJs},async origin=>{
  const rel='js/ambientlife.js',local=origin.lookup(origin.url+'/'+rel),response=await rawGet(origin.url+'/'+rel);
  assert.equal(response.body.length,gzipSync(Buffer.from(local.body),{level:9}).length);
  assert.equal(charged(origin,rel),response.body.length);return charged(origin,rel);
 });
 const small=await measure((_rel,body)=>body),large=await measure((rel,body)=>rel==='js/ambientlife.js'?body+'\n/*'+noise+'*/':body);
 assert.ok(large>small,`provider growth ignored: ${small}→${large}`);
});
test('missing boot dependency and omitted payload charge fail their actual runtime contracts',async()=>{
 const snapshot=snapshotPublicJs(publicRoot),entries=snapshot.entries.filter(row=>row.rel!=='js/contact-shadow.js');
 const omitted={...snapshot,entries,fingerprint:createHash('sha256').update(JSON.stringify(entries)).digest('hex')};
 await withBootOrigin({snapshot:omitted},async origin=>{
  const response=await rawGet(origin.url+'/js/contact-shadow.js');
  assert.equal(response.status,404);assert.throws(()=>assert.equal(response.status,200));
 });
 await withBootOrigin({},async origin=>{
  const rel='js/contact-shadow.js',url=origin.url+'/'+rel,expected=origin.lookup(url).payloadBytes;
  const missing=somaCargas({ate:[{url,bytes:0,fim:1,erro:null}],isentas:new Set(),sobrepostos:new Map()}).total;
  assert.ok(expected>0);assert.throws(()=>assert.equal(missing,expected));
 });
});


const menuRebuildStart=main.indexOf('function rebuildMenuBackdrop(mapa) {');
const menuRebuildEnd=main.indexOf('// Rotas compartilhadas',menuRebuildStart);
const menuLifecycleSource=main.slice(menuRebuildStart,menuRebuildEnd);
async function exerciseMenuFaunaLifecycle(production=menuLifecycleSource){
 const builds=[],loads=new Map(),sharedDisposals=[];
 const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
 const maps=Object.fromEntries(['escadao','lajes'].map(id=>[id,{...MAPS[id],build(scene,textures){
  const world=MAPS[id].build(scene,textures),shadow=world.ambience.animals.find(a=>a.type===(id==='escadao'?'chicken':'cat')).contactShadow;
  const record={id,world,shadow,disposals:0};builds.push(record);
  shadow.material.addEventListener('dispose',()=>record.disposals++);
  for(const resource of [shadow.geometry,shadow.material.map])resource.addEventListener('dispose',()=>sharedDisposals.push(resource));
  return world;
 }}]));
 const context=vm.createContext({THREE,menuScene:new THREE.Scene(),menuBackdropWorld:null,textures:initTextures(),settings:{quality:'low'},currentMap:'escadao',MAPS:maps,mapPropIds,
  renderer:{liberaPosDaCena(){}},ajustarAnisotropia(){},comMapaCarregado:(id,use)=>Promise.resolve(use(maps[id])),
  preloadMapProps:ids=>{const d=deferred();loads.set('props',d);return d.promise;},
  preloadMapAmbientLife:map=>{const d=deferred();loads.set('fauna',d);return d.promise;}
 });
 vm.runInContext(production,context);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const assertRetired=()=>{for(const record of builds)assert.equal(record.disposals,record===builds.at(-1)?0:1,'only retired backdrop shadow materials must be disposed exactly once');assert.equal(sharedDisposals.length,0,'shared shadow geometry/texture must survive rebuilds');};
 context.loadMenuBackdrop();assertRetired();
 loads.get('props').resolve();await flush();assertRetired();
 const oldFauna=loads.get('fauna');
 context.currentMap='lajes';context.loadMenuBackdrop();assertRetired();
 const current=builds.at(-1),count=builds.length;oldFauna.resolve();await flush();
 assert.equal(builds.length,count,'stale fauna cannot replace or dispose current backdrop');assert.equal(current.disposals,0);
 loads.get('props').resolve();await flush();assertRetired();
 loads.get('fauna').resolve();await flush();assertRetired();
 context.currentMap='escadao';context.loadMenuBackdrop();assertRetired();
 loads.get('props').resolve();await flush();assertRetired();
 loads.get('fauna').resolve();await flush();assertRetired();
 context.menuBackdropWorld.ambience.dispose();assert.equal(builds.at(-1).disposals,1);assert.equal(sharedDisposals.length,0);
}
test('real menu rebuilds dispose retired fauna shadow materials without touching shared resources',()=>exerciseMenuFaunaLifecycle());
for(const [name,old,replacement] of [
 ['missing-dispose','  menuBackdropWorld?.ambience?.dispose?.();','  // removed dispose'],
 ['missing-world','  menuBackdropWorld = mapa.build(menuScene, textures);','  mapa.build(menuScene, textures);']
])test(`menu lifecycle causal control catches ${name}`,async()=>{
 const changed=replaceOnce(menuLifecycleSource,old,replacement);
 await assert.rejects(exerciseMenuFaunaLifecycle(changed),/retired backdrop shadow materials/);
});

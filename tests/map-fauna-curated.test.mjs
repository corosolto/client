import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, carregaMapa } from '../tools/eval/harness.mjs';
import { auditCuratedFauna as auditFaunaActual, auditCuratedFaunaCensus as auditCensusActual } from '../tools/eval/map-fauna-curated.mjs';
import { captureCuratedFauna } from '../tools/eval/map-fauna-curated-collector.mjs';
import { assetUrl } from '../public/js/data/asseturl.js';
import { createPlaywrightFaunaObserver, createEgoFaunaObserver, faunaDocumentURL, faunaResponseError } from '../tools/eval/map-fauna-response-proof.mjs';
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
const refsFor=map=>references.filter(r=>r.map===map);
const AUDIT_BASE='https://fauna.synthetic.invalid';
const auditCuratedFauna=(sample,refs)=>auditFaunaActual(sample,refs,{base:AUDIT_BASE});
const auditCuratedFaunaCensus=(data,refs)=>auditCensusActual(data,refs,{base:AUDIT_BASE});
const ambient=read('public/js/ambientlife.js'),main=read('public/js/main.js');
// Referências agora têm mapas repetidos (campomorro/corrego: gato E galinha).
// O censo é por mapa único; uma amostra cobre todos os tipos referenciados daquele mapa.
const uniqueMaps=[...new Set(references.map(r=>r.map))];
await Promise.all(uniqueMaps.map(carregaMapa));
const registry=JSON.parse(read('mint-assets.json')).assets;
// Read-only authored facts are measured from each real map builder once. No live world
// escapes this fixture; every query gets an independent snapshot. Mutation/update tests below
// still construct and own fresh worlds, and keep all their original clauses.
const authoredFaunaSnapshots=new Map();
function authoredFaunaSnapshot(map){
 if(!authoredFaunaSnapshots.has(map)){
  const world=MAPS[map].build(new THREE.Scene(),initTextures());
  try{
   const animals=world.ambience.animals.map(a=>({id:a.id,type:a.type,assetId:a.root.userData.assetId,
    speed:a.speed,contactShadow:!!a.root.getObjectByName('FAUNA_CONTACT_SHADOW')}));
   authoredFaunaSnapshots.set(map,structuredClone(animals));
  }finally{world.ambience.dispose();}
 }
 return structuredClone(authoredFaunaSnapshots.get(map));
}
for(const ref of references)test(`${ref.map}/${ref.type} binds the curated file and keeps its authored density`,()=>{
 const animals=authoredFaunaSnapshot(ref.map).filter(a=>a.type===ref.type);
 assert.equal(animals.length,ref.count);
 assert.ok(animals.every(a=>a.assetId===ref.assetId));
 if(ref.speed)assert.deepEqual(animals[0].speed,ref.speed);
 if(ref.map==='escadao')assert.deepEqual(MAPS.escadao.ambience,ESCADAO_AMBIENCE);
 if(ref.map==='lajes')assert.deepEqual(MAPS.lajes.ambience,LAJES_AMBIENCE);
 assert.equal(MAPS[ref.map].mobileAmbience,true);
 assert.ok(MAPS[ref.map].ambience.includes(ref.assetId));
 const record=registry[ref.registryId];assert.ok(record.files.includes('public/'+ref.path));
 assert.equal(record.processing.finalSha256,ref.sha256);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../public/'+ref.path,import.meta.url))).digest('hex'),ref.sha256);
});
test('census includes every authored cat and chicken on each covered map; omitting a type is detected',()=>{
 for(const map of uniqueMaps){
  const targets=authoredFaunaSnapshot(map).filter(a=>['cat','chicken'].includes(a.type));assert.ok(targets.length);
  const check=refs=>{for(const a of targets){const ref=refs.find(r=>r.map===map&&r.type===a.type);assert.ok(ref,`${map}/${a.type} outside census`);assert.ok(ref.animalIds.includes(a.id));}};
  check(references);
  const omitted=targets[0].type;assert.throws(()=>check(references.filter(r=>r.map!==map||r.type!==omitted)));
 }
});
function mobileCalls(map,{source=main,ambientSource=ambient,next=false,mobileAuto=true}={}){
 const calls=[],errors=[];
 const noop=()=>Promise.resolve();
 const context=vm.createContext({console:{error:(...a)=>errors.push(a),warn:(...a)=>errors.push(a)},Promise,Set,Math,
  MAPS,mapPropIds,aguardarPreloads,playerKnifeSkinId:null,playerGloveId:null,MAP_PROPS:[],MOBILE_AUTO:mobileAuto,POINTER_COARSE:true,_vmStartWeapon:'ak',_armasDaPartida:['ak'],navOnly:false,_charsToLoad:[],matchSkins:[],matchEyewear:[],playerWeaponSkins:{},mapaPartida:map,
  preloadAmbientLife:ids=>{calls.push([...ids]);return Promise.resolve();},
  /* v7 da união: o bloco real pergunta `ehMapaJavaporcos(currentMap)`/`(plano.mapId)`
     antes do preload de áudio do modo; cenário aqui é mapa comum. */
  ehMapaJavaporcos:()=>false,currentMap:'praca_poderes',
  preloadCharacterAssets:noop,preloadCosmeticAssets:noop,preloadEyewearAssets:noop,preloadWeaponSkinCandidate:noop,preloadMapProps:noop,preloadFPArms:noop,preloadAuthoredFamilies:noop,authoredBootFamilies:()=>[],sfx:{preloadWeaponSamples:noop,preloadJavaporcos:()=>Promise.resolve()},
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
for(const map of uniqueMaps)for(const next of [false,true])test(`${map}: actual ${next?'MP next-map':'match launch'} preloads fauna in automatic mobile`,async()=>{
 assert.deepEqual(await mobileCalls(MAPS[map],{next}),[MAPS[map].ambience]);
});
test('mobile keeps unrelated maps out of the fauna preload',async()=>assert.deepEqual(await mobileCalls(MAPS.praca_poderes),[]));
for(const next of [false,true])test(`desktop ${next?'MP next-map':'match launch'} still preloads fauna without mobile opt-in`,async()=>{
 assert.notEqual(MAPS.praca_poderes.mobileAmbience,true);assert.ok(MAPS.praca_poderes.ambience.length);
 assert.deepEqual(await mobileCalls(MAPS.praca_poderes,{next,mobileAuto:false}),[MAPS.praca_poderes.ambience]);
});

function replaceOnce(source,old,value){assert.equal(source.split(old).length-1,1);return source.replace(old,value);}
test('control mutation restores the mobile match skip and fails the caller contract',async()=>{
 const source=replaceOnce(main,'preloadMapAmbientLife(mapaPartida, { mobileAuto: MOBILE_AUTO })','MOBILE_AUTO ? null : preloadMapAmbientLife(mapaPartida, { mobileAuto: MOBILE_AUTO })');
 await assert.rejects(async()=>assert.deepEqual(await mobileCalls(MAPS.escadao,{source}),[MAPS.escadao.ambience]));
});
test('control mutation restores the mobile next-map skip and fails the caller contract',async()=>{
 const source=replaceOnce(main,'mapaReady.then((mapa) => preloadMapAmbientLife(mapa, { mobileAuto: MOBILE_AUTO }))','MOBILE_AUTO ? null : mapaReady.then((mapa) => preloadMapAmbientLife(mapa, { mobileAuto: MOBILE_AUTO }))');
 await assert.rejects(async()=>assert.deepEqual(await mobileCalls(MAPS.lajes,{source,next:true}),[MAPS.lajes.ambience]));
});
// Amostra válida por mapa: TODOS os tipos/contagens referenciados daquele mapa, não só o alvo.
function fleeCases(ref,id){
 if(ref.fleeSpace===true)return {cases:[3,8].flatMap(warmup=>Array.from({length:8},(_,angle)=>({warmup,angle,frames:1200,dt:1/60,obstacleOverlaps:0,supportMisses:0,maxHalfExtent:.45,peakDistance:2,rejoined:true})))};
 if(ref.fleeSpace&&typeof ref.fleeSpace==='object'){
  const per=(ref.fleeSpace.animals||{})[id]||{};
  const mode=per.mode||ref.fleeSpace.mode;
  const minEscape=Number.isFinite(per.minEscapeDistance)?per.minEscapeDistance:.5;
  const roof=mode==='roof';
  return {cases:[3,8].flatMap(warmup=>Array.from({length:8},(_,angle)=>({warmup,angle,frames:1200,dt:1/60,mode,obstacleOverlaps:0,supportMisses:0,maxHalfExtent:.45,peakDistance:minEscape===0?.05:minEscape+.1,maxRenderedDelta:.05,minSlopeSpan:roof?null:.05,roofTriangles:roof?2:0,rejoined:true})))};
 }
 return undefined;
}
function validSample(ref){
 const refs=refsFor(ref.map),document={url:faunaDocumentURL(AUDIT_BASE,ref.map),requestId:'synthetic-document-'+ref.map,frameId:'synthetic-frame-'+ref.map,loaderId:'synthetic-loader-'+ref.map};
 return {map:ref.map,document,declaredPreload:[...new Set(refs.map(r=>r.assetId))],animals:refs.flatMap(r=>{const assetURL=new URL(assetUrl(r.path),document.url).href;return Array.from({length:r.count},(_,i)=>({id:r.type+'-'+i,type:r.type,source:'gltf',assetId:r.assetId,assetPath:r.path,assetURL,response:{complete:true,requestId:'synthetic-'+r.assetId,frameId:document.frameId,loaderId:document.loaderId,documentURL:document.url,url:assetURL,responseURL:assetURL,status:200,sha256:r.sha256,byteLength:123,body:{complete:true,source:'Network.getResponseBody',sha256:r.sha256,byteLength:123},transportTerminal:{kind:'finished'}},speed:r.speed,turnRate:r.turnRate,actions:{idle:'Idle',walk:'Walk',run:'Run'},meshes:[{materials:[Object.fromEntries(Object.entries(r.textures).map(([key,size])=>[key,{width:size[0],height:size[1],colorSpace:key==='albedo'?'srgb':''}]))]}],motion:{distance:1,localPoseChanges:1,activeClip:'Walk',maxYawDelta:.1},fleeSpace:fleeCases(r,r.type+'-'+i)})).flat();})};
}
test('fauna CI requires an explicit origin before creating output or launching a browser',()=>{
 const dir=fs.mkdtempSync(join(tmpdir(),'coro-fauna-ci-no-base-')),out=join(dir,'output');
 try{
  const env={...process.env,BASE:'',FAUNA_OUT:out,CHROME_BIN:'/nonexistent-no-browser'};
  const child=spawnSync(process.execPath,[new URL('../tools/eval/map-fauna-curated-ci.mjs',import.meta.url).pathname],{env,encoding:'utf8',timeout:15000});
  assert.equal(child.status,1);assert.match(child.stderr,/BASE ausente/);assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('runtime census requires exactly one result per expected map before auditing',()=>{
 const samples=uniqueMaps.map(map=>validSample(refsFor(map)[0]));
 assert.equal(auditCuratedFaunaCensus({results:samples},references).pass,true);
 assert.equal(auditCuratedFaunaCensus({results:[...samples].reverse()},references).pass,true);
 for(const data of [null,{}, {results:null},{results:[]},{results:samples.slice(0,1)},{results:[samples[0],samples[0]]},{results:[...samples,samples[0]]},{results:[...samples.slice(0,-1),{...samples.at(-1),map:'unknown'}]},{results:[samples[0],null]}]){
  const audit=auditCuratedFaunaCensus(data,references);assert.equal(audit.pass,false);assert.deepEqual(audit.reports,[]);assert.ok(audit.failures.every(f=>f.family==='census'));
 }
 const duplicate=auditCuratedFaunaCensus({results:[samples[0],samples[0]]},references);
 assert.ok(duplicate.failures.some(f=>f.detail.includes('duplicado')));assert.ok(duplicate.failures.some(f=>f.detail.includes('ausente')));
 const broken=structuredClone(samples);broken[1].animals[0].source='fallback';
 assert.equal(auditCuratedFaunaCensus({results:broken},references).pass,false);
 // Censo por mapa: remover um tipo inteiro da amostra não pode virar PASS parcial.
 const missingType=structuredClone(samples);
 const campo=missingType.find(s=>s.map==='campomorro');campo.animals=campo.animals.filter(a=>a.type!=='chicken');
 const missingAudit=auditCuratedFaunaCensus({results:missingType},references);
 assert.equal(missingAudit.pass,false);assert.ok(missingAudit.failures.length===0);assert.ok(missingAudit.reports.some(r=>!r.pass));
});
for(const ref of references)test(`${ref.map}/${ref.type}: runtime auditor accepts complete evidence and rejects causal corruptions`,()=>{
 const sample=validSample(ref);assert.equal(auditCuratedFauna(sample,references).pass,true);
 const target=s=>s.animals.find(a=>a.type===ref.type);
 const mutations=[['turn',s=>target(s).turnRate=0],['turn',s=>target(s).motion.maxYawDelta=Math.PI],['turn',s=>delete target(s).motion.maxYawDelta],['count',s=>s.animals=[]],['count',s=>s.animals=s.animals.filter(a=>a.type!==ref.type)],['count',s=>s.animals.push(structuredClone(target(s)))],['source',s=>target(s).source='fallback'],['identity',s=>target(s).assetId='old'],['identity',s=>target(s).assetPath='models/ambient/old.glb'],['declaredPreload',s=>s.declaredPreload=[]],['materials',s=>target(s).meshes=[]],['texture',s=>target(s).meshes[0].materials[0].albedo=null],['texture',s=>target(s).meshes[0].materials[0].albedo.width=0],['texture',s=>target(s).meshes[0].materials[0].albedo.colorSpace=''],['clips',s=>target(s).actions.walk='Idle'],['motion',s=>target(s).motion.localPoseChanges=0],['motion',s=>target(s).motion.activeClip='Idle'],['motion',s=>target(s).motion.distance=0],
   ...[null,{},[],false,'not-response'].map(value=>['response',s=>target(s).response=value]),
   ['response',s=>target(s).response.sha256='0'.repeat(64)],['response',s=>target(s).response.sha256='zz'],
   ['response',s=>target(s).response.byteLength=0],['response',s=>target(s).response.status=404],['response',s=>target(s).response.complete=false],
   ['response',s=>target(s).response.requestId=''],['response',s=>target(s).response.loaderId='other'],['response',s=>target(s).response.frameId='other'],
   ['response',s=>target(s).response.documentURL+='&old=1'],['response',s=>target(s).response.responseURL+='&wrong=1'],
   ['response',s=>target(s).response.url=target(s).response.url.replace('?v=','?wrong=')],
   ['response',s=>{const a=target(s);a.assetURL=a.response.url=a.response.responseURL=a.assetURL.replace(/\?v=.*/,'?v=wrong-valid-revision');}]];
 if(ref.speed)mutations.push(['speed',s=>target(s).speed={walk:1.1,flee:3.6}]);
 if(ref.fleeSpace===true)for(const change of [s=>delete target(s).fleeSpace,s=>target(s).fleeSpace.cases.pop(),s=>target(s).fleeSpace.cases[1]=structuredClone(target(s).fleeSpace.cases[0]),
  s=>target(s).fleeSpace.cases[0].obstacleOverlaps=1,s=>target(s).fleeSpace.cases[0].supportMisses=1,s=>target(s).fleeSpace.cases[0].maxHalfExtent=.51,
  s=>target(s).fleeSpace.cases[0].peakDistance=0,s=>target(s).fleeSpace.cases[0].rejoined=false,s=>target(s).fleeSpace.cases[0].frames=0])mutations.push(['space',change]);
 if(ref.fleeSpace&&typeof ref.fleeSpace==='object'){
  for(const change of [s=>delete target(s).fleeSpace,s=>target(s).fleeSpace.cases.pop(),s=>target(s).fleeSpace.cases[1]=structuredClone(target(s).fleeSpace.cases[0]),
   s=>target(s).fleeSpace.cases[0].obstacleOverlaps=1,s=>target(s).fleeSpace.cases[0].supportMisses=1,s=>target(s).fleeSpace.cases[0].maxHalfExtent=.51,
   s=>target(s).fleeSpace.cases[0].peakDistance=0,s=>target(s).fleeSpace.cases[0].rejoined=false,s=>target(s).fleeSpace.cases[0].frames=0,
   s=>target(s).fleeSpace.cases[0].mode=target(s).fleeSpace.cases[0].mode==='roof'?'ground':'roof',
   s=>target(s).fleeSpace.cases[0].maxRenderedDelta=NaN])mutations.push(['space',change]);
  // roofTriangles=0 só é mutação causal no modo roof (override do gato-0 do campomorro).
  if(Object.keys(ref.fleeSpace.animals||{}).length)mutations.push(['space',s=>target(s).fleeSpace.cases[0].roofTriangles=0]);
 }
 for(const [family,mutate] of mutations){const changed=structuredClone(sample);mutate(changed);const audit=auditCuratedFauna(changed,references);assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family===family),family);}
});
test('campomorro roof override accepts the measured short-roof escape and rejects zero-distance or ground-claimed evidence',()=>{
 const ref=references.find(r=>r.map==='campomorro'&&r.type==='cat');
 const sample=validSample(ref);assert.equal(auditCuratedFauna(sample,references).pass,true);
 const cat=sample.animals.find(a=>a.id==='cat-0');
 assert.equal(cat.fleeSpace.cases[0].mode,'roof');
 const roof0=s=>s.animals.find(a=>a.id==='cat-0');
 for(const change of [
  s=>roof0(s).fleeSpace.cases.forEach(c=>{c.peakDistance=0;}),
  s=>roof0(s).fleeSpace.cases.forEach(c=>{c.mode='ground';c.roofTriangles=0;c.minSlopeSpan=.05;}),
  s=>roof0(s).fleeSpace.cases.forEach(c=>{c.roofTriangles=0;}),
  s=>roof0(s).fleeSpace.cases.forEach(c=>{c.maxRenderedDelta=Infinity;}),
 ]){
  const changed=structuredClone(sample);change(changed);const audit=auditCuratedFauna(changed,references);
  assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family==='space'));
 }
});
test('lajes keeps the original peak > .5 rule; a .5 peak is still a rejection',()=>{
 const sample=validSample(references.find(r=>r.map==='lajes'));
 sample.animals.find(a=>a.type==='cat').fleeSpace.cases.forEach(c=>{c.peakDistance=.5;});
 const audit=auditCuratedFauna(sample,references);
 assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family==='space'));
});
test('a map census missing one animal of a multi-count type is not a visual approval',()=>{
 const sample=validSample(references.find(r=>r.map==='campomorro'&&r.type==='chicken'));
 const short=structuredClone(sample);short.animals=short.animals.filter(a=>a.id!=='chicken-1');
 const shortAudit=auditCuratedFauna(short,references);
 assert.equal(shortAudit.pass,false);assert.ok(shortAudit.failures.some(f=>f.family==='count'));
 const dup=structuredClone(sample);dup.animals.push(structuredClone(dup.animals.find(a=>a.id==='chicken-0')));
 const dupAudit=auditCuratedFauna(dup,references);
 assert.equal(dupAudit.pass,false);assert.ok(dupAudit.failures.some(f=>f.family==='identity'||f.family==='count'));
 const alien=structuredClone(sample);alien.animals[0].type='capybara';
 const alienAudit=auditCuratedFauna(alien,references);
 assert.equal(alienAudit.pass,false);assert.ok(alienAudit.failures.some(f=>f.family==='count'));
});
test('same-count substitution cannot hide an unknown or duplicated authored animal ID',()=>{
 const sample=validSample(references.find(r=>r.map==='campomorro'&&r.type==='cat'));
 for(const id of ['cat-99','cat-0']){
  const changed=structuredClone(sample);changed.animals.find(a=>a.id==='cat-1').id=id;
  const audit=auditCuratedFauna(changed,references);
  assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family==='identity'));
 }
});
test('malformed roof escape reference cannot silently inherit a permissive default',()=>{
 const sample=validSample(references.find(r=>r.map==='campomorro'&&r.type==='cat'));
 sample.animals.find(a=>a.id==='cat-0').fleeSpace.cases.forEach(c=>{c.peakDistance=1;});
 for(const value of [NaN,Infinity,-1,null,'0']){
  const changed=structuredClone(references);
  changed.find(r=>r.map==='campomorro'&&r.type==='cat').fleeSpace.animals['cat-0'].minEscapeDistance=value;
  const audit=auditCuratedFauna(sample,changed);
  assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family==='space'));
 }
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
test('bounded cat already farthest from a threat waits safely and then rejoins, rather than moving toward the threat',()=>{
 const world=MAPS.lajes.build(new THREE.Scene(),initTextures()),ambience=world.ambience,a=ambience.animals.find(a=>a.type==='cat'),area=a.fleeArea;
 a.root.position.set(area.maxX,a.origin.y,area.maxZ);const corner=a.root.position.clone();
 ambience.onShot(new THREE.Vector3(area.minX,a.origin.y,area.minZ),corner);assert.equal(a.fleeDistance,0);
 let waited=0,rejoined=false;for(let i=0;i<2400;i++){
  ambience.update(1/60,null);
  if(ambience.time<a.alertUntil){assert.equal(a.root.position.distanceTo(corner),0);waited++;}
  assert.equal(lajesFootprintBlocked(world,a),false);
  if(a.alertUntil===0){rejoined=true;break;}
 }
 assert.ok(waited>0&&rejoined,'bounded waiting must end and recovery must complete');ambience.dispose();
});
test('quad turn rates cannot consume the entire species alert before escape',()=>{
 for(const [key,window] of [['cats',2.4],['chickens',2.8]]){
  for(const turnRate of [1,Math.PI/window])assert.throws(()=>createFavelaAmbience(new THREE.Group(),{map:'slow-pivot', [key]:[{pos:[0,0,0],turnRate}]}),/ambient_turn_rate/);
  const ambience=createFavelaAmbience(new THREE.Group(),{map:'curated-pivot',[key]:[{pos:[0,0,0],turnRate:6}]});assert.equal(ambience.animals[0].turnRate,6);ambience.dispose();
 }
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
 assert.ok(authoredFaunaSnapshot(ref.map).filter(a=>a.type===ref.type).every(a=>a.contactShadow));
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

for(const map of ['escadao','campomorro'])test(`${map}: actual collector includes all target types and instances; restoring find is detected`,async()=>{
 const source=read('tools/eval/map-fauna-curated-collector.mjs'),start=source.indexOf('const record=await page.evaluate(')+'const record=await page.evaluate('.length,end=source.indexOf('\n },{map,types:[...types.keys()]});',start);
 assert.ok(start>0&&end>start);
 const callback=source.slice(start,end+3).replace("await import('three')",'THREE_STUB').replace("await import('/js/maps.js')",'MAPS_STUB').replace("await import('/js/data/asseturl.js')",'ASSET_URL_STUB');
 const specs=validSample(refsFor(map)[0]).animals;
 if(map==='escadao')specs.push({...specs.find(a=>a.type==='chicken'),id:'chicken-99'});
 const expected=specs.map(a=>a.id).sort();
 async function collect(code){
  const root=new THREE.Group(),animals=[...specs,{...specs[0],type:'rat',id:'rat-0'}].map(spec=>{
   const a={...spec,root:new THREE.Group(),model:new THREE.Group(),action:'walk'};
   const bone=new THREE.Bone();a.model.add(bone);a.root.add(a.model);root.add(a.root);
   a.root.userData.assetId=spec.assetId;a.root.userData.assetPath=spec.assetPath;
   a.actions={idle:{getClip:()=>({name:'Idle'})},walk:{getClip:()=>({name:'Walk'}),getEffectiveWeight:()=>1}};return a;
  });
  const world={ambience:{animals,update(){for(const a of animals){a.root.position.x+=.01;a.model.children[0].rotation.z+=.01;}},reset(){for(const a of animals)a.root.position.set(0,0,0);}}};
  const context=vm.createContext({THREE_STUB:THREE,MAPS_STUB:{MAPS},ASSET_URL_STUB:{assetUrl},URL,location:{href:faunaDocumentURL(AUDIT_BASE,map)},window:{__gworld:world,MAPEVAL:{cam:new THREE.PerspectiveCamera(),view(){}}}});
  return new vm.Script('('+code+')').runInContext(context)({map,types:refsFor(map).map(r=>r.type)});
 }
 const actual=await collect(callback);assert.deepEqual(Array.from(actual.animals,a=>a.id).sort(),expected);
 if(map==='escadao')assert.ok(auditCuratedFauna(actual,references).failures.some(f=>f.family==='count'));
 const mutant=replaceOnce(callback,'world.ambience.animals.filter(a=>wanted.has(a.type))','[world.ambience.animals.find(a=>wanted.has(a.type))]');
 await assert.rejects(async()=>assert.deepEqual(Array.from((await collect(mutant)).animals,a=>a.id).sort(),expected));
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

// Transportes explicitamente sintéticos; executam os mesmos adapters/observer, sem browser nem alegação runtime.
function fakeBodyTransport(kind, options={}){
 const calls=[],listeners=new Map(),queue=[],docs=new Set(),order=[];let drains=0,maxDrains=0,stamp=0;
 const fake={map:'one',frame:{id:'frame-A',loaderId:'loader-A',url:faunaDocumentURL(AUDIT_BASE,'one')},body:Buffer.from('synthetic original GLB body'),calls};
 const send=async(method,params={})=>{
  calls.push({method,...params});order.push('send:'+method+':'+(params.requestId||''));
  if(method==='Network.disable'&&options.disableError)throw Error('synthetic disable failure');
  if(method==='Network.disable'&&options.onDisable)options.onDisable(fake);
  if(method==='Page.getFrameTree')return {frameTree:{frame:{...structuredClone(fake.frame),...(options.currentDocumentChanged&&calls.filter(c=>c.method===method).length>1?{loaderId:'changed-during-proof'}:{})}}};
  if(method==='Network.streamResourceContent'){
   if(options.streamUnsupported)throw Error('synthetic stream unsupported');
   if(options.streamPending)return new Promise(resolve=>{fake.resolveACK=resolve;});if(options.streamACK)return options.streamACK;
   return {bufferedData:fake.body.subarray(0,options.prefixBytes||0).toString('base64')};
  }
  if(method==='Network.getResponseBody'){
   if(options.bodyError)throw Error('synthetic body unavailable');
   return options.malformedBody?{body:'@@@@',base64Encoded:true}:{body:fake.body.toString('base64'),base64Encoded:true};
  }
  return {};
 };
 const cdp={send,on(method,fn){if(!listeners.has(method))listeners.set(method,new Set());listeners.get(method).add(fn);},off(method,fn){listeners.get(method)?.delete(fn);}};
 const page={cdp:send,async events(){drains++;maxDrains=Math.max(maxDrains,drains);try{await Promise.resolve();return queue.splice(0);}finally{drains--;}}};
 const observer=(kind==='PW'?createPlaywrightFaunaObserver(cdp,options.paths||['models/fake.glb'],{base:AUDIT_BASE,...options}):createEgoFaunaObserver(page,options.paths||['models/fake.glb'],{base:AUDIT_BASE,...options}));
 fake.observer=observer;fake.order=order;fake.listenerCount=()=>[...listeners.values()].reduce((n,set)=>n+set.size,0);fake.maxDrains=()=>maxDrains;
 fake.emit=(method,params)=>{order.push('event:'+method+':'+(params.requestId||''));if(kind==='PW'){for(const fn of listeners.get(method)||[])fn(params);}else queue.push({method,params});};
 fake.requirement=()=>({url:'https://fauna.synthetic.invalid/models/fake.glb?v=synthetic',path:'models/fake.glb',assetId:'synthetic',sha256:createHash('sha256').update(fake.body).digest('hex')});

 fake.documentLoad=()=>{
  if(docs.has(fake.frame.loaderId))return;docs.add(fake.frame.loaderId);
  const meta={requestId:'doc-'+fake.frame.loaderId,frameId:fake.frame.id,loaderId:fake.frame.loaderId,sessionId:options.sessionId};
  fake.emit('Network.requestWillBeSent',{...meta,type:'Document',request:{url:fake.frame.url,method:'GET'},...(options.documentRedirect?{redirectResponse:{status:302}}:{})});
  fake.emit('Network.responseReceived',{...meta,response:{url:fake.frame.url,status:200}});fake.emit('Network.loadingFinished',meta);
 };
 fake.load=(changes={})=>{
  fake.documentLoad();
  const request={requestId:'req-'+fake.frame.loaderId,frameId:fake.frame.id,loaderId:fake.frame.loaderId,sessionId:options.sessionId,documentURL:fake.frame.url,request:{url:fake.requirement().url,method:'GET'},...changes.request};
  const response={requestId:request.requestId,frameId:request.frameId,loaderId:request.loaderId,sessionId:request.sessionId,response:{url:request.request.url,status:200},...changes.response};
  fake.emit('Network.requestWillBeSent',request);fake.emit('Network.responseReceived',response);
  const prefix=options.prefixBytes||0;
  if(prefix)fake.emit('Network.dataReceived',{requestId:request.requestId,timestamp:++stamp,dataLength:prefix,encodedDataLength:prefix});
  const chunk=options.partial?fake.body.subarray(prefix,-1):fake.body.subarray(prefix);
  const data={requestId:request.requestId,timestamp:++stamp,dataLength:chunk.length,encodedDataLength:chunk.length,data:chunk.toString('base64'),...options.chunkEvent};if(!options.noChunks)fake.emit('Network.dataReceived',data);if(options.duplicateChunk)fake.emit('Network.dataReceived',data);
  if(options.gap)fake.emit('Network.dataReceived',{requestId:request.requestId,timestamp:++stamp,dataLength:1,encodedDataLength:1});
  fake.emit(changes.failed?'Network.loadingFailed':'Network.loadingFinished',{requestId:changes.terminalId||request.requestId,errorText:'synthetic failure',...changes.terminal});
 };
 fake.persistRecord=()=>{
  const dir=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'coro-fauna-body-preproof-'))),path=join(dir,'map-fauna-preproof-'+fake.map+'.json'),ref=fake.requirement();
  const record={map:fake.map,documentURL:fake.frame.url,declaredPreload:[ref.assetId],animals:[{id:'synthetic-0',source:'gltf',assetId:ref.assetId,assetPath:ref.path,assetURL:ref.url}]};
  const text=JSON.stringify({scope:'GLTF record before network proof; not acceptance',record})+'\n';fs.writeFileSync(path,text,{flag:'wx'});
  fake.preproof={dir,path,sha256:createHash('sha256').update(text).digest('hex'),byteLength:Buffer.byteLength(text)};return fake.preproof;
 };
 fake.removePreproof=()=>{if(fake.preproof)fs.rmSync(fake.preproof.dir,{recursive:true,force:true});};
 fake.prove=(req=fake.requirement())=>observer.prove({map:fake.map,documentURL:fake.frame.url,requirements:[req],preproof:fake.preproof});
 return fake;
}
for(const kind of ['PW','Ego']){
 test(`${kind}: original body observer binds current document and measures bytes once, across two documents`,async()=>{
  const f=fakeBodyTransport(kind);await f.observer.start();
  try{
   f.load();const first=await f.prove();assert.equal(first.proofs[f.requirement().url].byteLength,f.body.length);assert.equal(first.proofs[f.requirement().url].sha256,f.requirement().sha256);
   f.map='two';f.frame={...f.frame,loaderId:'loader-B',url:faunaDocumentURL(AUDIT_BASE,'two')};f.load();
   const second=await f.prove();assert.equal(second.proofs[f.requirement().url].requestId,'req-loader-B');assert.notEqual(second.document.loaderId,first.document.loaderId);
  }finally{await f.observer.close();}
  assert.equal(f.calls.filter(c=>c.method==='Network.getResponseBody').length,2);assert.equal(f.calls.filter(c=>c.method==='Network.disable').length,1);
  assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().closed,true);assert.ok(f.maxDrains()<=1);
 });
 for(const [name,changes,expected] of [
  ['wrong request terminal',{terminalId:'alien'},/pendente/],['wrong request document',{request:{documentURL:'https://fauna.synthetic.invalid/old'}},/documentURL/],
  ['wrong frame',{request:{frameId:'alien'}},/pendente/],['wrong loader',{request:{loaderId:'alien'}},/pendente/],
  ['wrong response loader',{response:{loaderId:'alien'}},/loader/],['HTTPbad',{response:{response:{url:'https://fauna.synthetic.invalid/models/fake.glb?v=synthetic',status:404}}},/falhou/],
  ['query wrong',{request:{request:{url:'https://fauna.synthetic.invalid/models/fake.glb?v=wrong',method:'GET'}}},/URL\/status/],
  ['failed original',{failed:true},/loadingFailed/],
 ])test(`${kind}: real observer rejects ${name}`,async()=>{
  const f=fakeBodyTransport(kind,{deadlineMs:12});await f.observer.start();
  try{f.load(changes);await assert.rejects(f.prove(),expected);}
  finally{
   if(name==='wrong request document'){
    try{await f.observer.close();}catch(error){assert.equal(error.constructor,Error);assert.equal(error.message,'fauna body cleanup: pending body/ACK work at close');}
   }else await f.observer.close();
  }
  if(name==='wrong request document'){
   assert.equal(f.observer.diagnostics().closed,true);assert.equal(f.calls.at(-1).method,'Network.disable');assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
  }
 });
 for(const [name,options,pattern] of [['body unavailable',{bodyError:true},/body unavailable/],['malformed body',{malformedBody:true},/base64/],['digest failure',{digest:()=>{throw Error('synthetic digest failure');}},/digest failure/],['digest pending',{digest:()=>new Promise(()=>{})},/deadline/]])test(`${kind}: ${name} stays closed/red`,async()=>{
  const f=fakeBodyTransport(kind,{deadlineMs:12,...options});await f.observer.start();try{f.load();await assert.rejects(f.prove(),pattern);}finally{await f.observer.close();}
  assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.listenerCount(),0);
 });
 test(`${kind}: valid-shaped but wrong SHA and ambiguous original requests are rejected`,async()=>{
  for(const mode of ['sha','duplicate']){
   const f=fakeBodyTransport(kind);await f.observer.start();try{
    f.load();if(mode==='duplicate')f.load({request:{requestId:'req-duplicate'}});
    const req=f.requirement();if(mode==='sha')req.sha256='0'.repeat(64);
    await assert.rejects(f.prove(req),mode==='sha'?/SHA256/:/ambígua/);
   }finally{
    if(mode==='duplicate'){
     try{await f.observer.close();}catch(error){assert.equal(error.constructor,Error);assert.equal(error.message,'fauna body cleanup: pending body/ACK work at close');}
    }else await f.observer.close();
   }
   assert.equal(f.observer.diagnostics().closed,true);assert.equal(f.calls.at(-1).method,'Network.disable');assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
  }
 });
 test(`${kind}: cleanup runs after boot failure and cleanup failure cannot become success`,async()=>{
  const f=fakeBodyTransport(kind);await f.observer.start();let primary;
  try{throw Error('synthetic boot failure');}catch(error){primary=error;}finally{await f.observer.close();}
  assert.match(primary.message,/boot failure/);assert.equal(f.listenerCount(),0);assert.equal(f.calls.at(-1).method,'Network.disable');
  const broken=fakeBodyTransport(kind,{disableError:true});await broken.observer.start();await assert.rejects(broken.observer.close(),/disable failure/);assert.equal(broken.listenerCount(),0);assert.equal(broken.observer.diagnostics().closed,true);
 });
 test(`${kind}: failure arriving before cleanup invalidates an already selected body`,async()=>{
  const f=fakeBodyTransport(kind);await f.observer.start();f.load();await f.prove();
  f.emit('Network.loadingFailed',{requestId:'req-loader-A',errorText:'synthetic late failure'});
  await assert.rejects(f.observer.close(),/late failure/);assert.equal(f.listenerCount(),0);
 });
}

for(const kind of ['PW','Ego'])test(`${kind}: closing pending body work still disables observation and removes owned timers`,async()=>{
 const f=fakeBodyTransport(kind,{deadlineMs:30,digest:()=>new Promise(()=>{})});await f.observer.start();f.load();
 await assert.rejects(f.observer.close(),/pending body|observer closed/);assert.equal(f.calls.at(-1).method,'Network.disable');assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);
});


for(const kind of ['PW','Ego'])test(`${kind}: closing after digest entry refuses actual pending body work`,async()=>{
 let markEntered;const entered=new Promise(resolve=>{markEntered=resolve;});
 const f=fakeBodyTransport(kind,{deadlineMs:30,digest:()=>{markEntered();return new Promise(()=>{});}});await f.observer.start();f.load();
 const observedProof=f.prove().then(value=>({value}),error=>({error}));
 try{
  await Promise.race([entered,observedProof.then(()=>{throw Error('proof settled before pending digest entry');})]);
  assert.ok(f.observer.diagnostics().pending>0);
  await assert.rejects(f.observer.close(),error=>{assert.equal(error.message,'fauna body cleanup: pending body/ACK work at close');return true;});
  const outcome=await observedProof;assert.ok(outcome.error instanceof Error);assert.ok(['Observador não está ativo','Page.getFrameTree: observer closed','preproof: observer closed','event drain: observer closed'].includes(outcome.error.message),outcome.error.message);
 }finally{if(!f.observer.diagnostics().closed)await assert.rejects(f.observer.close(),error=>{assert.equal(error.message,'fauna body cleanup: pending body/ACK work at close');return true;});}
 assert.equal(f.calls.at(-1).method,'Network.disable');assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const kind of ['PW','Ego'])test(`${kind}: reused request ID and navigation during proof are rejected`,async()=>{
 for(const mode of ['reused','navigation']){
  const f=fakeBodyTransport(kind,{currentDocumentChanged:mode==='navigation'});await f.observer.start();
  try{f.load();if(mode==='reused')f.load();await assert.rejects(f.prove(),mode==='reused'?/requestId/:/Documento mudou/);}
  finally{if(mode==='reused'&&kind==='PW')await assert.rejects(f.observer.close(),error=>{assert.match(error.message,/^fauna body cleanup: (?:pending body\/ACK work at close; )?fauna body: requestId reutilizado\/redirect$/);return true;});else await f.observer.close();}
  assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
 }
});

for(const kind of ['PW','Ego'])for(const timing of ['before-close','disable-ack'])for(const state of ['pending','404'])test(`${kind}: late second request (${timing}/${state}) invalidates all proved bindings`,async()=>{
 const second=f=>{
  const meta={requestId:'late-second',frameId:f.frame.id,loaderId:f.frame.loaderId};
  f.emit('Network.requestWillBeSent',{...meta,documentURL:f.frame.url,request:{url:f.requirement().url,method:'GET'}});
  if(state==='404'){f.emit('Network.responseReceived',{...meta,response:{url:f.requirement().url,status:404}});f.emit('Network.loadingFinished',meta);}
 };
 const f=fakeBodyTransport(kind,timing==='disable-ack'?{onDisable:second}:{});await f.observer.start();f.load();await f.prove();
 if(timing==='before-close')second(f);
 await assert.rejects(f.observer.close(),/tardia ambígua/);assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().closed,true);
});
for(const kind of ['PW','Ego'])for(const mode of ['nominal','other-map','other-origin','redirect-same-final','preproof-exists','preproof-cap','preproof-fs'])test(`${kind}: actual collector/proof/auditor bind requested BASE/path/map (${mode})`,async()=>{
  const options={paths:refsFor('escadao').map(r=>r.path),documentRedirect:mode==='redirect-same-final'};
  const f=fakeBodyTransport(kind,options);f.map='escadao';
  const expected=faunaDocumentURL(AUDIT_BASE,'escadao'),dir=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'coro-fauna-collector-preproof-')));let requested,proveCalls=0;
  const refs=structuredClone(refsFor('escadao')).map(r=>({...r,sha256:createHash('sha256').update(f.body).digest('hex')}));
  const page={
   async goto(url){
    requested=url;f.frame.url=mode==='other-map'?faunaDocumentURL(AUDIT_BASE,'corrego'):mode==='other-origin'?faunaDocumentURL('https://wrong.synthetic.invalid','escadao'):url;
    f.documentLoad();
    for(const [i,ref] of refs.entries()){
     const meta={requestId:'asset-'+i,frameId:f.frame.id,loaderId:f.frame.loaderId},assetURL=new URL(assetUrl(ref.path),f.frame.url).href;
     f.emit('Network.requestWillBeSent',{...meta,documentURL:f.frame.url,request:{url:assetURL,method:'GET'}});
     f.emit('Network.responseReceived',{...meta,response:{url:assetURL,status:200}});f.emit('Network.dataReceived',{requestId:meta.requestId,timestamp:i+1,dataLength:f.body.length,encodedDataLength:f.body.length,data:f.body.toString('base64')});f.emit('Network.loadingFinished',meta);
    }
   },
   async waitForFunction(){},
   // Synthetic scene-data transport only; the actual outercollector/proof/audit are executed.
   async evaluate(){const result=validSample(refs[0]);delete result.document;result.documentURL=f.frame.url;for(const a of result.animals){delete a.response;a.assetURL=new URL(assetUrl(a.assetPath),f.frame.url).href;}
    if(mode==='preproof-exists')fs.writeFileSync(join(dir,'map-fauna-preproof-escadao.json'),'existing',{flag:'wx'});
    if(mode==='preproof-cap')result.padding='x'.repeat(2*1024*1024);
    if(mode==='preproof-fs')fs.rmSync(dir,{recursive:true,force:true});return result;},
  };
  await f.observer.start();
  try{
   const capture=()=>captureCuratedFauna(page,{base:AUDIT_BASE,dir,fotos:0,references:refs,network:{...f.observer,prove:async value=>{proveCalls++;const saved=JSON.parse(fs.readFileSync(value.preproof.path,'utf8'));assert.equal(saved.record.documentURL,f.frame.url);assert.equal(saved.record.animals.length,validSample(refs[0]).animals.length);assert.ok(saved.record.animals.every(a=>a.response===undefined));return f.observer.prove(value);},navigationURL:map=>faunaDocumentURL(AUDIT_BASE,map)}});
   if(mode==='nominal'){
    const data=await capture();assert.equal(auditCensusActual(data,refs,{base:AUDIT_BASE}).pass,true);const saved=JSON.parse(fs.readFileSync(join(dir,'map-fauna-preproof-escadao.json'),'utf8'));assert.equal(saved.scope,'GLTF record before network proof; not acceptance');assert.equal(saved.record.map,'escadao');assert.equal(saved.record.documentURL,expected);assert.equal(saved.record.document,undefined);assert.equal(proveCalls,1);
   }else{await assert.rejects(capture(),mode==='redirect-same-final'?/redirect/:mode==='preproof-exists'?/EEXIST/:mode==='preproof-cap'?/2MiB/:mode==='preproof-fs'?/ENOENT/:/navegação esperada/);if(mode.startsWith('preproof-'))assert.equal(proveCalls,0);}
   assert.equal(requested,expected);
  }finally{
   try{
    if(['other-map','other-origin','preproof-exists','preproof-cap','preproof-fs'].includes(mode)){
     await f.observer.close().then(()=>{},error=>assert.match(error.message,/^fauna body cleanup: pending body\/ACK work at close$/));
    }else await f.observer.close();
   }finally{fs.rmSync(dir,{recursive:true,force:true});}
  }
  assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().closed,true);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});
test('actual auditor requires trusted BASE',()=>{
 const sample=validSample(refsFor('escadao')[0]);assert.equal(auditFaunaActual(sample,references,{base:AUDIT_BASE}).pass,true);assert.equal(auditFaunaActual(sample,references).pass,false);
});
for(const [name,target] of [['other-map',faunaDocumentURL(AUDIT_BASE,'corrego')],['other-origin',faunaDocumentURL('https://wrong.synthetic.invalid','escadao')],['wrong-path',AUDIT_BASE+'/other.html?map=escadao&hud=0&capture']])test(`actual auditor rejects bound bodies from ${name}`,()=>{
 const sample=validSample(refsFor('escadao')[0]);assert.equal(auditFaunaActual(sample,references,{base:AUDIT_BASE}).pass,true);
 const wrong=structuredClone(sample);wrong.document.url=target;
 for(const a of wrong.animals){a.assetURL=new URL(assetUrl(a.assetPath),target).href;a.response.documentURL=target;a.response.url=a.response.responseURL=a.assetURL;}
 const audit=auditFaunaActual(wrong,references,{base:AUDIT_BASE});assert.equal(audit.pass,false);assert.ok(audit.failures.some(f=>f.family==='response'));
});

const syntheticAbort={errorText:'net::ERR_ABORTED',canceled:true};
for(const prefixBytes of [0,5,27])test(`PW: original stream prefix${prefixBytes} and queued chunks prove BODY, not EOF`,async()=>{
 const f=fakeBodyTransport('PW',{prefixBytes,streamPending:true,deadlineMs:1000});await f.observer.start();
 try{
  f.persistRecord();f.load({failed:true,terminal:syntheticAbort});
  const armIndex=f.order.indexOf('send:Network.streamResourceContent:req-loader-A'),responseIndex=f.order.indexOf('event:Network.responseReceived:req-loader-A');
  assert.ok(armIndex>=0&&responseIndex>armIndex);
  assert.equal(f.calls.filter(c=>c.method==='Network.streamResourceContent').length,1);
  f.resolveACK({bufferedData:f.body.subarray(0,prefixBytes).toString('base64')});
  const result=await f.prove(),ref=f.requirement(),proof=result.proofs[ref.url];
  assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().heldBytes,0);
  assert.equal(proof.body.complete,true);assert.equal(proof.body.source,'Network.streamResourceContent');assert.equal(proof.sha256,ref.sha256);assert.equal(proof.byteLength,f.body.length);
  assert.deepEqual(proof.transportTerminal,{kind:'failed',...syntheticAbort,blockedReason:null,corsErrorStatus:null});
  assert.equal(proof.body.accounting.prefixBytes,Math.min(prefixBytes,f.body.length));assert.equal(proof.body.accounting.decodedDataLength,f.body.length);
  assert.equal(proof.gltfRecord.sha256,f.preproof.sha256);assert.equal(proof.gltfRecord.documentURL,f.frame.url);assert.equal(proof.gltfRecord.path,f.preproof.path);
  assert.equal(faunaResponseError(proof,ref,{source:'gltf',assetId:ref.assetId,assetPath:ref.path,assetURL:ref.url},result.document,ref.url,f.frame.url),'');
  for(const change of [p=>delete p.body,p=>p.body.accounting.ackComplete=false,p=>p.body.accounting.prefixBytes++,p=>p.transportTerminal.canceled=false,p=>p.transportTerminal.blockedReason='inspector',p=>p.transportTerminal.corsErrorStatus={},p=>delete p.gltfRecord]){
   const wrong=structuredClone(proof);change(wrong);assert.notEqual(faunaResponseError(wrong,ref,{source:'gltf',assetId:ref.assetId,assetPath:ref.path,assetURL:ref.url},result.document,ref.url,f.frame.url),'');
  }
  assert.equal(f.calls.filter(c=>c.method==='Network.getResponseBody').length,0);
 }finally{try{await f.observer.close();}finally{f.removePreproof();}}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const [name,options,changes,pattern,cleanupError] of [
 ['no GLTF preproof',{}, {},/preproof|registro GLTF/,false],
 ['partial body',{partial:true},{},/SHA256/,false],
 ['gap after stream data',{gap:true},{},/contabilidade|gap/,false],
 ['no decoded bytes',{noChunks:true},{},/contabilidade|gap/,false],
 ['unsupported early command',{streamUnsupported:true},{},/unsupported/,false],
 ['ACK missing',{streamPending:true},{},/deadline/,false],
 ['ACK malformed',{streamACK:{bufferedData:'@@@@'}},{},/base64/,false],
 ['ACK prefix not covered',{streamACK:{bufferedData:'YQ=='}},{},/contabilidade|gap/,false],
 ['forged digest',{partial:true,digest:()=>createHash('sha256').update(Buffer.from('synthetic original GLB body')).digest('hex')},{},/SHA256 real/,false],
 ['chunk malformed',{chunkEvent:{data:'@@@@'}},{},/base64/,true],
 ['chunk length mismatch',{chunkEvent:{dataLength:1}},{},/dataLength/,true],
 ['chunk timestamp reversed',{prefixBytes:5,chunkEvent:{timestamp:0}},{},/ordem/,true],
 ['duplicate chunk',{duplicateChunk:true},{},/duplicado/,true],
 ['decoded8MiB cap',{chunkEvent:{dataLength:8*1024*1024+1}},{},/cap/,true],
 ['unsafe encoded count',{chunkEvent:{encodedDataLength:Number.MAX_SAFE_INTEGER+1}},{},/contadores/,true],
 ['abort canceled false',{}, {terminal:{...syntheticAbort,canceled:false}},/loadingFailed/,false],
 ['abort missing canceled',{}, {terminal:{errorText:'net::ERR_ABORTED'}},/loadingFailed/,false],
 ['CORS',{}, {terminal:{...syntheticAbort,corsErrorStatus:{corsError:'DisallowedByMode'}}},/loadingFailed/,false],
 ['blocked',{}, {terminal:{...syntheticAbort,blockedReason:'inspector'}},/loadingFailed/,false],
 ['another failure',{}, {terminal:{errorText:'net::ERR_FAILED',canceled:true}},/loadingFailed/,false],
])test(`PW: stream rejects ${name}`,async()=>{
 const f=fakeBodyTransport('PW',{deadlineMs:15,...options});await f.observer.start();
 try{
  if(name!=='no GLTF preproof')f.persistRecord();f.load({failed:true,terminal:syntheticAbort,...changes});await assert.rejects(f.prove(),pattern);
 }finally{
  try{if(cleanupError)await assert.rejects(f.observer.close(),pattern);else await f.observer.close();}
  finally{f.removePreproof();}
 }
 assert.equal(f.listenerCount(),0);const d=f.observer.diagnostics();assert.equal(d.pending,0);assert.equal(d.timers,0);assert.equal(d.heldBytes,0);
 assert.equal(f.calls.filter(c=>c.method==='Network.getResponseBody').length,0);
});

for(const terminal of ['finished','failed'])for(const next of ['Network.loadingFinished','Network.loadingFailed','Network.dataReceived'])test(`PW: late ${next} cannot revive ${terminal}`,async()=>{
 const f=fakeBodyTransport('PW');await f.observer.start();
 try{
  f.persistRecord();f.load(terminal==='failed'?{failed:true,terminal:syntheticAbort}:{});const result=await f.prove(),proof=result.proofs[f.requirement().url];
  f.emit(next,{requestId:'req-loader-A',timestamp:99,dataLength:1,encodedDataLength:1,data:'YQ==',errorText:'synthetic late failure'});
  assert.equal(proof.transportTerminal.kind,terminal);
  await assert.rejects(f.observer.close(),next==='Network.dataReceived'?/chunk após terminal/:/terminal duplicado/);
 }finally{if(!f.observer.diagnostics().closed)await f.observer.close();f.removePreproof();}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const kind of ['PW','Ego'])test(`${kind}: SHA injection cannot turn another original body into curated bytes`,async()=>{
 const f=fakeBodyTransport(kind,{digest:()=> '1'.repeat(64)});await f.observer.start();
 try{f.load();const req={...f.requirement(),sha256:'1'.repeat(64)};await assert.rejects(f.prove(req),/SHA256 real/);}finally{await f.observer.close();}
 assert.equal(f.observer.diagnostics().heldBytes,0);
});

test('Ego: batched aborted body never starts a late stream fallback',async()=>{
 const f=fakeBodyTransport('Ego');await f.observer.start();
 try{f.persistRecord();f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/loadingFailed/);}finally{try{await f.observer.close();}finally{f.removePreproof();}}
 assert.equal(f.calls.filter(c=>c.method==='Network.streamResourceContent'||c.method==='Network.getResponseBody').length,0);
});

test('PW: ACK timeout is sticky; late RPC cannot recreate a completed proof or retain bytes',async()=>{
 const f=fakeBodyTransport('PW',{streamPending:true,deadlineMs:12});await f.observer.start();
 try{
  f.persistRecord();f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/deadline/);
  f.resolveACK({bufferedData:f.body.toString('base64')});await Promise.resolve();await assert.rejects(f.prove(),/deadline/);
 }finally{try{await f.observer.close();}finally{f.removePreproof();}}
 assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

test('PW: closing pending ACK cancels owned work, disables observation, and refuses acceptance',async()=>{
 const f=fakeBodyTransport('PW',{streamPending:true,deadlineMs:30});await f.observer.start();f.load({failed:true,terminal:syntheticAbort});
 await assert.rejects(f.observer.close(),/pending body\/ACK/);f.resolveACK({bufferedData:''});await Promise.resolve();
 assert.equal(f.calls.at(-1).method,'Network.disable');assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

test('PW:16MiB includes all original chunk queues before ACK',async()=>{
 const f=fakeBodyTransport('PW',{streamPending:true,deadlineMs:100});f.body=Buffer.alloc(8*1024*1024,7);await f.observer.start();
 try{
  for(let i=0;i<3;i++)f.load({request:{requestId:'cap-'+i},terminalId:'absent-'+i});
  await assert.rejects(f.prove(),/16MiB total/);await assert.rejects(f.observer.close(),/16MiB total/);
 }finally{if(!f.observer.diagnostics().closed)await f.observer.close();}
 assert.equal(f.observer.diagnostics().heldBytes,0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);
});

test('PW: target request census caps early stream arms at16',async()=>{
 const f=fakeBodyTransport('PW',{deadlineMs:100});await f.observer.start();
 try{for(let i=0;i<17;i++)f.load({request:{requestId:'request-'+i},terminalId:'absent-'+i});await assert.rejects(f.prove(),/censo16/);await assert.rejects(f.observer.close(),/censo16/);}
 finally{if(!f.observer.diagnostics().closed)await f.observer.close();}
 assert.equal(f.calls.filter(c=>c.method==='Network.streamResourceContent').length,16);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const mode of ['wrong-map','wrong-document','wrong-source','missing-preload','wrong-hash','symlink','late-tamper'])test(`PW: persisted GLTF preproof refuses ${mode}`,async()=>{
 const f=fakeBodyTransport('PW');await f.observer.start();
 try{
  f.persistRecord();f.load({failed:true,terminal:syntheticAbort});
  if(mode==='late-tamper'){await f.prove();fs.appendFileSync(f.preproof.path,' ');await assert.rejects(f.observer.close(),/preproof/);}
  else{
   if(mode==='symlink'){fs.renameSync(f.preproof.path,f.preproof.path+'.original');fs.symlinkSync(f.preproof.path+'.original',f.preproof.path);}
   else if(mode==='wrong-hash')f.preproof.sha256='0'.repeat(64);
   else{
    const value=JSON.parse(fs.readFileSync(f.preproof.path,'utf8'));
    if(mode==='wrong-map')value.record.map='another';if(mode==='wrong-document')value.record.documentURL+='&old=1';
    if(mode==='wrong-source')value.record.animals[0].source='fallback';if(mode==='missing-preload')value.record.declaredPreload=[];
    const text=JSON.stringify(value);fs.writeFileSync(f.preproof.path,text);f.preproof.sha256=createHash('sha256').update(text).digest('hex');f.preproof.byteLength=Buffer.byteLength(text);
   }
   await assert.rejects(f.prove(),mode==='symlink'?/ELOOP/:/preproof/);await f.observer.close();
  }
 }finally{if(!f.observer.diagnostics().closed)await f.observer.close();f.removePreproof();}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const changed of [false,true])test(`PW: session identity when exposed remains bound (${changed?'mismatch':'nominal'})`,async()=>{
 const f=fakeBodyTransport('PW',{sessionId:'synthetic-session'});await f.observer.start();
 try{f.load(changed?{response:{sessionId:'another-session'}}:{});if(changed)await assert.rejects(f.prove(),/session/);else{const r=await f.prove();assert.equal(r.document.sessionId,'synthetic-session');assert.equal(r.proofs[f.requirement().url].sessionId,r.document.sessionId);}}finally{await f.observer.close();}
});


for(const [payload,dataLength]of [['AB==',1],['AAB=',2],['AA=A',3]])test(`PW: noncanonical base64 ${payload} is refused before signature hashing`,async()=>{
 const proto=Object.getPrototypeOf(createHash('sha256')),descriptor=Object.getOwnPropertyDescriptor(proto,'update');let payloadHashes=0;
 Object.defineProperty(proto,'update',{...descriptor,value:function(value,...args){if(value===payload)payloadHashes++;return Reflect.apply(descriptor.value,this,[value,...args]);}});
 const f=fakeBodyTransport('PW',{chunkEvent:{data:payload,dataLength},deadlineMs:1000});
 try{
  await f.observer.start();f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/base64/);assert.equal(payloadHashes,0);await assert.rejects(f.observer.close(),/base64/);
 }finally{try{if(!f.observer.diagnostics().closed)await f.observer.close();}finally{Object.defineProperty(proto,'update',descriptor);}}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

test('PW: a canonical original 8MiB body reaches SHA/proof with constant-stack base64 validation',async()=>{
 const f=fakeBodyTransport('PW',{deadlineMs:1000});f.body=Buffer.alloc(8*1024*1024,7);f.persistRecord();await f.observer.start();
 try{
  f.load({failed:true,terminal:syntheticAbort});const result=await f.prove(),proof=result.proofs[f.requirement().url];
  assert.equal(proof.byteLength,8*1024*1024);assert.equal(proof.sha256,f.requirement().sha256);assert.equal(proof.body.complete,true);assert.equal(proof.transportTerminal.kind,'failed');
  assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().heldBytes,0);assert.equal(f.calls.filter(c=>c.method==='Network.getResponseBody').length,0);
 }finally{try{await f.observer.close();}finally{f.removePreproof();}}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

for(const kind of ['wrong-type','oversized'])test(`PW: chunk ${kind} is rejected before any signature hash`,async()=>{
 const payload=kind==='wrong-type'?{unexpected:true}:'A'.repeat(Math.ceil(8*1024*1024/3)*4+4),proto=Object.getPrototypeOf(createHash('sha256')),descriptor=Object.getOwnPropertyDescriptor(proto,'update');let payloadHashes=0;
 assert.equal(typeof descriptor.value,'function');
 Object.defineProperty(proto,'update',{...descriptor,value:function(value,...args){if(value===payload)payloadHashes++;return Reflect.apply(descriptor.value,this,[value,...args]);}});
 const f=fakeBodyTransport('PW',{chunkEvent:{data:payload},deadlineMs:1000});
 try{
  await f.observer.start();f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/base64 inválido\/excessivo/);assert.equal(payloadHashes,0);
  await assert.rejects(f.observer.close(),/base64 inválido\/excessivo/);
 }finally{try{if(!f.observer.diagnostics().closed)await f.observer.close();}finally{Object.defineProperty(proto,'update',descriptor);}}
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().heldBytes,0);assert.equal(f.observer.diagnostics().pending,0);
});

test('PW: preproof growth after stat never invokes unbounded readFile or reads beyond expected+1',async()=>{
 const f=fakeBodyTransport('PW',{deadlineMs:1000});f.persistRecord();await f.observer.start();
 const probe=await fs.promises.open(f.preproof.path,'r'),proto=Object.getPrototypeOf(probe);await probe.close();
 const original=Object.fromEntries(['stat','read','readFile'].map(key=>[key,Object.getOwnPropertyDescriptor(proto,key)])),identity=fs.statSync(f.preproof.path),fds=new Set();let grew=false,reads=0,unbounded=0,maxRequested=0;
 try{
  Object.defineProperty(proto,'stat',{...original.stat,value:async function(...args){const value=await Reflect.apply(original.stat.value,this,args);if(value.dev===identity.dev&&value.ino===identity.ino){fds.add(this.fd);if(!grew){grew=true;fs.appendFileSync(f.preproof.path,Buffer.alloc(2*1024*1024+1,120));}}return value;}});
  Object.defineProperty(proto,'read',{...original.read,value:function(buffer,offset,length,position){if(fds.has(this.fd)){reads++;maxRequested=Math.max(maxRequested,buffer.length,length);assert.ok(buffer.length<=f.preproof.byteLength+1&&length<=f.preproof.byteLength+1);}return Reflect.apply(original.read.value,this,[buffer,offset,length,position]);}});
  Object.defineProperty(proto,'readFile',{...original.readFile,value:function(...args){if(fds.has(this.fd)){unbounded++;throw Error('synthetic unbounded preproof readFile forbidden');}return Reflect.apply(original.readFile.value,this,args);}});
  f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/preproof alterado\/SHA divergente/);
  assert.equal(grew,true);assert.ok(reads>0);assert.equal(unbounded,0);assert.ok(maxRequested<=f.preproof.byteLength+1);
 }finally{
  for(const [key,descriptor]of Object.entries(original))Object.defineProperty(proto,key,descriptor);
  try{await f.observer.close();}finally{f.removePreproof();}
 }
 assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});

test('PW: a FIFO without a writer is rejected as nonregular without a pending blocking open',async()=>{
 const f=fakeBodyTransport('PW',{deadlineMs:1000});f.persistRecord();fs.unlinkSync(f.preproof.path);
 const created=spawnSync('mkfifo',[f.preproof.path],{encoding:'utf8',timeout:1000});assert.equal(created.status,0,created.stderr);assert.equal(fs.lstatSync(f.preproof.path).isFIFO(),true);
 let rescueWriter=false;await f.observer.start();
 try{f.load({failed:true,terminal:syntheticAbort});await assert.rejects(f.prove(),/preproof tamanho inválido/);}
 finally{
  try{let fd;try{fd=fs.openSync(f.preproof.path,fs.constants.O_WRONLY|fs.constants.O_NONBLOCK);rescueWriter=true;}catch(error){if(error.code!=='ENXIO')throw error;}finally{if(fd!==undefined)fs.closeSync(fd);}}
  finally{try{await f.observer.close();}finally{f.removePreproof();}}
 }
 assert.equal(rescueWriter,false);assert.equal(f.listenerCount(),0);assert.equal(f.observer.diagnostics().pending,0);assert.equal(f.observer.diagnostics().timers,0);assert.equal(f.observer.diagnostics().heldBytes,0);
});



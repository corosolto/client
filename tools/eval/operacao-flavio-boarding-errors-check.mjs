// GLM248 STEP TEST-ONLY: RED proof of real FlavioBoarding failure lifecycle. No product edits.
// SINTÉTICO: fake nas fronteiras externas de I/O (GLTF/preload/assetUrl); sem render, sem browser, sem jogo humano.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const rows=[],failed=[];let infra=false;
let sourceSHA=null,setupStage='start';
const deadline=Date.now()+30000;
let keeper;const setupDeadline=new Promise((_,reject)=>{keeper=setTimeout(()=>reject(new Error('setup deadline exceeded (30s internal)')),30000)});
try{
 // SETUP-FRONTIER: preparo dinâmico (harness/fonte/âncoras/new Function) dentro do contrato infra2/JSON único.
 setupStage='harness import';
 const {THREE}=await Promise.race([import('./harness.mjs'),setupDeadline]);
 setupStage='source read';
 const sourceBytes=readFileSync(new URL('../../public/js/flavio-boarding.js',import.meta.url));
const sourceText=sourceBytes.toString();
sourceSHA=createHash('sha256').update(sourceBytes).digest('hex');
// Classe REAL extraída: remove exatamente os 5 imports literais únicos e o único export class.
const literals=[
 "import * as THREE from 'three';",
 "import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';",
 "import {assetUrl} from './data/asseturl.js';",
 "import {buildCharacterModel,preloadCharacterAssets} from './glbchars.js';",
 "import {solveCCDIK} from './handik.js';",
];
let classText=sourceText;
for(const literal of literals){assert.equal(classText.split(literal).length-1,1,'unique import literal');classText=classText.replace(literal,'');}
assert.equal(classText.split('export class FlavioBoarding').length-1,1,'single export class');
classText=classText.replace('export class FlavioBoarding','class FlavioBoarding');
setupStage='fixtures';
// solveCCDIK é visual/IK fora de escopo: guarda declarada, nunca invocada por _load/start/stop.
const solveGuard=()=>{throw new Error('solveCCDIK out of scope');};
const fixture={loadMode:'valid',withDoor:true,loads:0,stages:[],watchers:[],actors:[],preloadMode:'auto',rejectPreload:null};
const watch=resource=>{let count=0;resource.addEventListener('dispose',()=>count++);return()=>count;};
function buildStage(withDoor){
 const stage=new THREE.Group(),content=new THREE.Group();content.name='boarding-stage';stage.add(content);
 const mesh=name=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());m.name=name;return m;};
 if(withDoor)content.add(mesh('boarding-door-pivot'));
 content.add(mesh('GEO-boarding-stairs'),mesh('GEO-boarding-entry'),mesh('GEO-boarding-cabin-floor'));
 const watchers=[];stage.traverse(object=>{if(object.isMesh)watchers.push(watch(object.geometry),watch(object.material));});
 fixture.stages.push(stage);fixture.watchers.push(watchers);return stage;
}
class FakeGLTFLoader{loadAsync(){fixture.loads++;return fixture.loadMode==='reject'?Promise.reject(new Error('fixture gltf reject')):Promise.resolve({scene:buildStage(fixture.withDoor)});}}
const fakeBuild=(def,options)=>{const owned=options.ownedResources,actor={group:new THREE.Group(),ctrl:{model:new THREE.Group(),update(){},shadow:null},mixer:{stopAllAction(){},uncacheRoot(){}},parts:{},fixtureOwned:[]};
 for(let i=0;i<2;i++){const r={disposed:0};r.dispose=()=>{r.disposed++;};owned.add(r);actor.fixtureOwned.push(r);}
 fixture.actors.push(actor);return actor;};
const fakePreload=()=>fixture.preloadMode==='defer'?new Promise((_,reject)=>{fixture.rejectPreload=reject;}):Promise.resolve();
const FlavioBoarding=new Function('THREE','GLTFLoader','assetUrl','buildCharacterModel','preloadCharacterAssets','solveCCDIK',classText+'\nreturn FlavioBoarding;')(THREE,FakeGLTFLoader,()=>'models/cinematics/operacao_flavio_boarding.glb',fakeBuild,fakePreload,solveGuard);
function makeWorld(){
 const root=new THREE.Group(),plane=new THREE.Group(),stairs=new THREE.Group();
 plane.name='aviao_executivo';stairs.name='escada_embarque';root.add(plane,stairs);
 const vip={mesh:{group:new THREE.Group()},def:{id:'senador'},alive:true};root.add(vip.mesh.group);
 return {root,plane,stairs,vip,game:{world:{root,objectivePlane:plane,groundHeightAt:()=>0}}};
}
async function check(clause,fn,cleanup){
 let timer=0;
 const timeoutPromise=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('deadline exceeded (30s internal)')),Math.max(0,deadline-Date.now()));});
 try{
  if(Date.now()>=deadline)throw new Error('deadline exceeded before case');
  await Promise.race([fn(),timeoutPromise]);
  rows.push({clause,pass:true});
 }catch(error){
  rows.push({clause,pass:false});
  failed.push({clause,type:error.name,message:String(error.message).slice(0,160)});
  if(error.name!=='AssertionError')infra=true;
 }finally{
  clearTimeout(timer);
  try{cleanup&&cleanup();}catch(error){
   infra=true;const row=rows.at(-1);if(row&&row.clause===clause)row.pass=false;
   failed.push({clause:clause+':cleanup',type:error.name,message:String(error.message).slice(0,160)});
  }
  const last=failed.at(-1);
  if(last&&last.type!=='AssertionError'&&fixture.rejectPreload){try{fixture.rejectPreload(new Error('fixture preload canceled'));}catch{}}
 }
 if(infra)throw new Error('abort remaining cases after infrastructure or cleanup failure');
}
const fresh=()=>{fixture.loadMode='valid';fixture.withDoor=true;fixture.preloadMode='auto';fixture.loads=0;fixture.stages.length=0;fixture.watchers.length=0;fixture.actors.length=0;fixture.rejectPreload=null;};
setupStage='cases';
async function run(){
 { // positive control on current product.
  fresh();const w=makeWorld(),board=new FlavioBoarding(w.game);board._prepareFeet=()=>true;
  await check('happy start succeeds with live stage and hidden originals',async()=>{
   assert.equal(await board.start(w.vip,w.vip.def),true,'happy start true');
   assert(board.stage.visible && board.stage.parent===w.root,'happy stage live in world');
   assert(!w.plane.visible && !w.stairs.visible && !w.vip.mesh.group.visible,'happy hides plane stairs and VIP');
  },()=>board.dispose());
 }
 { // BERR_ROLLBACK: _buildProfile lança APÓS stage/actor anexados; _hideVip ainda não rodou.
  fresh();const w=makeWorld(),board=new FlavioBoarding(w.game);
  board._buildProfile=()=>{throw new Error('fixture profile failure');};board._prepareFeet=()=>true;
  await check('BERR_ROLLBACK restores world and releases actor once',async()=>{
   assert.equal(await board.start(w.vip,w.vip.def),false,'rollback start returns false');
   assert.equal(board.session,null,'rollback clears session');
   assert(!board.stage.parent && !board.stage.visible,'rollback stage detached and invisible');
   assert(w.plane.visible && w.stairs.visible,'rollback restores plane and stairs visibility');
   assert.equal(w.vip.mesh.group.visible,true,'rollback keeps VIP visible (hideVip not reached)');
   const actor=fixture.actors.at(-1);
   assert(!actor.group.parent,'rollback removes attached actor');
   assert(actor.fixtureOwned.every(r=>r.disposed===1),'rollback disposes owned resources exactly once');
  },()=>board.dispose());
 }
 { // BERR_RETRY_REJECT: 1º loadAsync rejeita; cache negativo de ready deve permitir reattempt.
  fresh();fixture.loadMode='reject';const w=makeWorld(),board=new FlavioBoarding(w.game);board._prepareFeet=()=>true;
  await check('BERR_RETRY_REJECT second start reattempts loader',async()=>{
   assert.equal(await board.start(w.vip,w.vip.def),false,'first rejected start false');
   fixture.loadMode='valid';
   assert.equal(fixture.loads,1,'first attempt consumed loader once');
   assert.equal(await board.start(w.vip,w.vip.def),true,'retry after reject must reattempt loader');
   assert.equal(fixture.loads,2,'loader reattempted for second start');
  },()=>board.dispose());
 }
 { // BERR_RETRY_NULL: 1º stage sem boarding-door-pivot -> null; retry válido deve reattempt.
  fresh();fixture.withDoor=false;const w=makeWorld(),board=new FlavioBoarding(w.game);board._prepareFeet=()=>true;
  await check('BERR_RETRY_NULL releases first stage once and retries independently',async()=>{
   assert.equal(await board.start(w.vip,w.vip.def),false,'doorless start false');
   assert(fixture.watchers[0].every(count=>count()===1),'first stage resources released exactly once');
   fixture.withDoor=true;
   assert.equal(await board.start(w.vip,w.vip.def),true,'retry after null stage must reattempt loader');
   assert(fixture.stages[0]!==fixture.stages[1],'second stage is an independent instance');
  },()=>board.dispose());
 }
 { // BERR_STALE_REJECT: MESMA instância FlavioBoarding (this._boarding reutilizado); _load promise compartilhada do mesmo stage.
  fresh();const w=makeWorld(),board=new FlavioBoarding(w.game);board._prepareFeet=()=>true;
  await check('BERR_STALE_REJECT old failure cannot tear down new session',async()=>{
   fixture.preloadMode='defer';const pendingA=board.start(w.vip,w.vip.def); // defer captura reject ANTES de qualquer mudança de flag.
   fixture.preloadMode='auto';
   assert.equal(await board.start(w.vip,w.vip.def),true,'new session B completes on same board');
   const sessionB=board.session,actorB=sessionB.actor,stageB=board.stage;
   fixture.rejectPreload(new Error('fixture preload reject'));
   assert.equal(await pendingA,false,'stale start A resolves false');
   assert(board.session===sessionB,'same board keeps session B identity');
   assert(sessionB.actor===actorB && actorB.group.parent,'session B actor alive and attached');
   assert(board.stage===stageB && board.stage.visible && board.stage.parent===w.root,'stage B unchanged and live');
   assert(!w.plane.visible && !w.stairs.visible,'plane still hidden by session B');
   assert(actorB.fixtureOwned.every(r=>r.disposed===0),'B assets not disposed by stale failure');
  },()=>board.dispose());
 }
}
await run();
}catch(error){
 failed.push({clause:'setup:'+setupStage,type:error.name,message:String(error.message).slice(0,160)});
 infra=true;
}finally{
 clearTimeout(keeper);
}
console.log(JSON.stringify({tool:'operacao-flavio-boarding-errors-check',sourceSHA,synthetic:true,setupStage,cases:rows,failed}));
process.exitCode=failed.length===0?0:(infra?2:1);

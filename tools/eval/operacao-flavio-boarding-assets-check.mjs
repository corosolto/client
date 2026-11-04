import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root=process.cwd(),inputs={};
const output=process.argv.find(arg=>arg.startsWith('--out='))?.slice(6);
if(output)assert(!fs.existsSync(output),'preserve existing output');
const read=file=>{const bytes=fs.readFileSync(file);inputs[path.relative(root,file)]=createHash('sha256').update(bytes).digest('hex');return bytes;};
const assetPath=url=>{
 const file=path.resolve(root,'public',String(url).split('?')[0].replace(/^\//,''));
 assert(file.startsWith(path.join(root,'public')+path.sep),'local asset boundary');return file;
};
const localFetch=async url=>{const file=assetPath(url);return fs.existsSync(file)?new Response(read(file)):new Response('',{status:404});};
Object.defineProperty(globalThis,'fetch',{configurable:true,get:()=>localFetch,set(){}});
const {THREE,CHARACTERS}=await import('./harness.mjs');
const {GLTFLoader}=await import(pathToFileURL(path.join(root,'public/vendor/addons/loaders/GLTFLoader.js')));
Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:localFetch});
let deferStage=false,resolveStage=null,failStage=false;
const stageResources=[];
const watch=resource=>{let count=0;resource.addEventListener('dispose',()=>count++);return()=>count;};
GLTFLoader.prototype.load=function(url,done,progress,fail){
 const load=async()=>{
  try {
   if(String(url).includes('operacao_flavio_boarding.glb') && failStage)throw new Error('fixture load failure');
   const loader=new GLTFLoader();loader.register(()=>({name:'EXT_texture_webp',async loadTexture(){return new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);}}));
   const bytes=read(assetPath(url)),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
   if(String(url).includes('operacao_flavio_boarding.glb')){
    const bag=new Set();gltf.scene.traverse(object=>{if(object.isMesh){bag.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){bag.add(material);for(const value of Object.values(material))if(value?.isTexture)bag.add(value);}}});
    stageResources.push([...bag].map(resource=>watch(resource)));
   }
   done(gltf);
  }catch(error){fail?.(error);}
 };
 if(deferStage && String(url).includes('operacao_flavio_boarding.glb'))resolveStage=load;
 else void load();
};
const {buildCharacterModel,preloadCharacterAssets}=await import('../../public/js/glbchars.js');
const {FlavioBoarding}=await import('../../public/js/flavio-boarding.js');
await preloadCharacterAssets(['senador'],{weapons:[]});
const def=CHARACTERS.find(item=>item.id==='senador');
const scene=new THREE.Scene(),worldRoot=new THREE.Group();scene.add(worldRoot);
const plane=new THREE.Group(),stairs=new THREE.Group();plane.name='aviao_executivo';stairs.name='escada_embarque';plane.position.set(0,2.8,55);worldRoot.add(plane,stairs);
const live=buildCharacterModel(def,{weapon:false});scene.add(live.group);
const vip={mesh:live,pos:new THREE.Vector3(3,.08,51),hp:87,alive:true,def,team:'B'};
live.group.userData.botOwner=vip;
const colliders=[{x:1}],occluders=[plane],shots=[stairs],combatants=[vip];
const game={scene,world:{root:worldRoot,objectivePlane:plane,groundHeightAt:()=>.08,colliders,occluders,shot_surfaces:shots},combatants};
const before={mesh:vip.mesh,pos:vip.pos.clone(),hp:vip.hp,alive:vip.alive,def:vip.def,colliders:JSON.stringify(colliders)};
const rows=[],failed=[],feet=[],surfaceProbe=[];
const check=(clause,fn)=>{try{fn();rows.push({clause,pass:true});}catch(error){rows.push({clause,pass:false});failed.push({clause,type:error.name,message:error.message});}};
const board=new FlavioBoarding(game);
const worldPosition=object=>object.getWorldPosition(new THREE.Vector3());
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,5);
function rayFloorAt(x,z,meshes){
 ray.ray.origin.set(x,4.5,z);
 for(const hit of ray.intersectObjects(meshes,false))if(hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.5)return hit.point.y;
 return .08;
}
// Static walk interval only. Independent column index over actual world triangles.
const floorGrids=new WeakMap(),cell=.1;
function floorAt(x,z,meshes){
 let grid=floorGrids.get(meshes);
 if(!grid){
  grid=new Map();floorGrids.set(meshes,grid);
  for(const mesh of meshes){
   const geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index;
   const count=index?index.count:position.count;
   for(let i=0;i<count;i+=3){
    const vertices=[0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+offset):i+offset).applyMatrix4(mesh.matrixWorld));
    const [a,b,c]=vertices,normal=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());
    if(normal.y<=.5)continue;
    const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(denominator)<1e-12)continue;
    const triangle={a,b,c,denominator};
    for(let ix=Math.floor(Math.min(...vertices.map(v=>v.x))/cell);ix<=Math.floor(Math.max(...vertices.map(v=>v.x))/cell);ix++)
     for(let iz=Math.floor(Math.min(...vertices.map(v=>v.z))/cell);iz<=Math.floor(Math.max(...vertices.map(v=>v.z))/cell);iz++){
      const key=ix+','+iz;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(triangle);
     }
   }
  }
 }
 let highest=-Infinity;
 for(const {a,b,c,denominator} of grid.get(Math.floor(x/cell)+','+Math.floor(z/cell)) || []){
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/denominator;
  const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/denominator,w=1-u-v;
  if(u< -1e-9 || v< -1e-9 || w< -1e-9)continue;
  const y=u*a.y+v*b.y+w*c.y;if(y<=4.5 && y>=-.5)highest=Math.max(highest,y);
 }
 return highest===-Infinity?.08:highest;
}
function footSamples(actor){
 const samples=[];
 actor.ctrl.model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
  for(const side of ['Left','Right']){
   const selected=[];
   for(let i=0;i<indices.count;i++){
    let total=0;for(const method of ['getX','getY','getZ','getW'])if([side+'Foot',side+'ToeBase'].includes(mesh.skeleton.bones[indices[method](i)]?.name))total+=weights[method](i);
    if(total>=.5)selected.push(i);
   }
   if(selected.length)samples.push({mesh,side,selected});
  }
 });
 assert(samples.some(item=>item.side==='Left') && samples.some(item=>item.side==='Right'),'real weighted shoe vertices');
 return samples;
}
try {
 assert(await board.start(vip,def),'actual stage and actual character load');
 const stage=worldRoot.getObjectByName('flavio-boarding-stage'),actor=board.session.actor;
 const actorHeadCount=watch(actor.parts.head.geometry),sharedCount=watch(actor.ctrl.model.getObjectByProperty('isSkinnedMesh',true).geometry);
 const door=stage.getObjectByName('boarding-door-pivot'),open=door.quaternion.clone(),physicalPlane=stage.getObjectByName('GEO-boarding-plane'),physicalStairs=stage.getObjectByName('GEO-boarding-stairs');
 board.update(0);stage.updateMatrixWorld(true);
 const planeStart=worldPosition(physicalPlane),stairsStart=worldPosition(physicalStairs),start=worldPosition(actor.group);
 check('presentation replaces only visible originals',()=>assert(stage.parent===worldRoot && stage.visible && !plane.visible && !stairs.visible && !live.group.visible));
 check('actor has clean independent animated skeleton',()=>{
  const original=live.ctrl.model.getObjectByProperty('isSkinnedMesh',true),copy=actor.ctrl.model.getObjectByProperty('isSkinnedMesh',true);
  assert(copy && copy.skeleton!==original.skeleton && copy.geometry===original.geometry);
  assert.notEqual(actor.mixer,live.mixer);assert.equal(actor.group.userData.botOwner,undefined);
 });
 const weighted=footSamples(actor),surfaces=[];
 stage.traverse(object=>{if(object.isMesh && ['GEO-boarding-stairs','GEO-boarding-entry','GEO-boarding-threshold','GEO-boarding-cabin-floor'].includes(object.name))surfaces.push(object);});
 for(const x of [3.5,2.8,2.5,2.1,1.9,1.5,.35]){
  ray.ray.origin.set(x,4.5,52);surfaceProbe.push({x,hits:ray.intersectObjects(surfaces,false).map(hit=>({mesh:hit.object.name,y:hit.point.y,normal:hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y}))});
 }
 check('independent column index agrees with Three raycaster',()=>{
  for(let i=0;i<=100;i++)for(const z of [51.6,51.8,52,52.2,52.4]){
   const x=4.3-i*4.8/100,reference=rayFloorAt(x,z,surfaces);
   assert(Math.abs(floorAt(x,z,surfaces)-reference)<1e-6,'actual triangle/ray agreement');
   assert(Math.abs(board._floorAt(x,z,.5)-reference)<1e-6,'production index/actual ray agreement');
  }
 });
 const staticMatrices=new Map([...surfaces,physicalPlane,door].map(object=>[object,object.matrixWorld.clone()]));
 const effectiveVisible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
 const invisibleFrames=[],movingFrames=[];
 const skeletons=[...new Set(weighted.map(item=>item.mesh.skeleton))];
 let poseQueries=false,skeletonRefreshes=0;
 const refreshMethods=skeletons.map(skeleton=>{
  const update=skeleton.update;skeleton.update=function(){if(poseQueries)skeletonRefreshes++;return update.call(this);};
  return [skeleton,update];
 });
 for(let frame=1;frame<=324;frame++){
  const elapsed=frame/60;poseQueries=true;board.update(elapsed);poseQueries=false;stage.updateMatrixWorld(true);
  if(!weighted.every(({mesh})=>effectiveVisible(mesh)))invisibleFrames.push(frame);
  if(![...staticMatrices].every(([object,matrix])=>object.matrixWorld.equals(matrix))){movingFrames.push(frame);continue;}
  const gaps=[];
  for(const {mesh,side,selected} of weighted){
   mesh.skeleton.update();const points=selected.map(index=>mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
   const lowest=points.reduce((a,b)=>a.y<b.y?a:b),values=points.map(point=>point.y-floorAt(point.x,point.z,surfaces));
   gaps.push({side,minimum:Math.min(...values),maximum:Math.max(...values),vertices:points.length,soleY:lowest.y,floorY:floorAt(lowest.x,lowest.z,surfaces)});
  }
  feet.push({elapsed,x:worldPosition(actor.group).x,y:worldPosition(actor.group).y,gaps});
 }
 for(const [skeleton,update] of refreshMethods)skeleton.update=update;
 check('actor stays effectively visible throughout the walk',()=>assert.deepEqual(invisibleFrames,[]));
 check('walk surfaces plane and door stay static before each contact query',()=>assert.deepEqual(movingFrames,[]));
 check('pose queries avoid skeleton refresh per sampled vertex',()=>assert(skeletonRefreshes<=324*skeletons.length*6,'redundant skeleton refreshes: '+skeletonRefreshes));
 check('walk enters cabin before door moves or taxi starts',()=>{
  assert(worldPosition(actor.group).x<.8 && worldPosition(actor.group).x<start.x-2.5);
  assert(door.quaternion.equals(open));assert(worldPosition(physicalPlane).distanceTo(planeStart)<1e-6);
 });
 check('entire visible body clears the closing door into cabin',()=>{
  const body=new THREE.Box3();
  actor.group.traverse(mesh=>{
   if(!mesh.isMesh || mesh===actor.ctrl.shadow)return;
   const positions=mesh.geometry.getAttribute('position');
   for(let i=0;i<positions.count;i++)body.expandByPoint(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
  });
  const cabin=new THREE.Box3().setFromObject(stage.getObjectByName('GEO-boarding-cabin-floor'),true);
  const bulkhead=new THREE.Box3().setFromObject(stage.getObjectByName('GEO-boarding-cabin-bulkhead'),true);
  const doorX=worldPosition(door).x;
  assert(!body.isEmpty() && body.max.x<doorX-.01 && body.min.x>bulkhead.max.x+.01,'body must be inside door and ahead of bulkhead');
  assert(body.min.z>cabin.min.z && body.max.z<cabin.max.z,'body fits actual cabin width');
  assert(body.min.y>=cabin.max.y-.01,'body above actual cabin floor');
 });
 const penetrations=feet.flatMap(row=>row.gaps.map(gap=>gap.minimum));
 const planted=feet.map(row=>Math.min(...row.gaps.map(gap=>gap.minimum)));
 check('weighted soles avoid tread penetration and keep a planted foot',()=>{
  assert.equal(feet.length,324,'every static walk frame is measured');
  assert(Math.min(...penetrations)>=-.01,'shoe penetration exceeds 1cm: '+Math.min(...penetrations));
  assert(Math.max(...planted)<=.03,'both feet hover over 3cm: '+Math.max(...planted));
 });
 board.update(6);
 check('door closes while plane still waits',()=>assert(door.quaternion.angleTo(open)>.1 && door.quaternion.angleTo(new THREE.Quaternion())>.1 && worldPosition(physicalPlane).distanceTo(planeStart)<1e-6));
 board.update(6.8);
 check('door is fully shut before taxi',()=>assert(door.quaternion.angleTo(new THREE.Quaternion())<1e-6 && worldPosition(physicalPlane).distanceTo(planeStart)<1e-6));
 board.update(8.5);stage.updateMatrixWorld(true);
 check('taxi moves plane and leaves stairs on apron',()=>assert(worldPosition(physicalPlane).z>planeStart.z+1 && worldPosition(physicalStairs).distanceTo(stairsStart)<1e-6));
 check('presentation preserves authoritative entity and collision registries',()=>{
  assert.equal(vip.mesh,before.mesh);assert(vip.pos.equals(before.pos));assert.equal(vip.hp,before.hp);assert.equal(vip.alive,before.alive);assert.equal(vip.def,before.def);
  assert.equal(game.combatants,combatants);assert.equal(game.world.colliders,colliders);assert.equal(JSON.stringify(colliders),before.colliders);
  assert.equal(game.world.occluders,occluders);assert.equal(game.world.shot_surfaces,shots);assert.equal(plane.position.z,55);
 });
 const replacement=new THREE.Group();replacement.visible=false;vip.mesh={...live,group:replacement};board.update(8.6);board.stop();board.stop();
 check('stop restores remounted VIP and disposes only actor resources once',()=>assert(replacement.visible && live.group.visible && plane.visible && stairs.visible && !stage.parent && actorHeadCount()===1 && sharedCount()===0));
 board.dispose();board.dispose();
 check('final disposal releases unique stage resources exactly once',()=>assert(stageResources[0].every(count=>count()===1)));
 for(const action of ['stop','dispose']){
  deferStage=true;resolveStage=null;
  const late=new FlavioBoarding(game),pending=late.start(vip,def);
  assert(resolveStage,'stage load is deferred');late[action]();await resolveStage();assert.equal(await pending,false);
  check('late load after '+action+' never resurrects presentation',()=>assert(!worldRoot.getObjectByName('flavio-boarding-stage') && plane.visible && stairs.visible && replacement.visible));
  late.dispose();
  check('late load after '+action+' still releases its own resources',()=>assert(stageResources.at(-1).every(count=>count()===1)));
 }
 deferStage=true;resolveStage=null;
 let current=true,stalePreparations=0;
 const stale=new FlavioBoarding(game),prepareStale=stale._prepareFeet;
 stale._prepareFeet=function(...args){stalePreparations++;return prepareStale.apply(this,args);};
 const stalePending=stale.start(vip,def,()=>current);
 current=false;await resolveStage();const staleResult=await stalePending;
 check('stale predicate before ready never allocates actor or hides originals',()=>assert(staleResult===false && stalePreparations===0 && !stale.session?.actor && !worldRoot.getObjectByName('flavio-boarding-stage') && plane.visible && stairs.visible && replacement.visible));
 stale.dispose();
 deferStage=false;current=true;
 const expired=new FlavioBoarding(game),prepareExpiry=expired._prepareFeet;
 expired._prepareFeet=function(...args){const result=prepareExpiry.apply(this,args);current=false;return result;};
 const expiredResult=await expired.start(vip,def,()=>current);
 check('deadline expiring during real pose preparation restores presentation immediately',()=>assert(expiredResult===false && !expired.session && plane.visible && stairs.visible && replacement.visible && !worldRoot.getObjectByName('flavio-boarding-stage')));
 expired.dispose();
 deferStage=false;current=true;
 const invalidated=new FlavioBoarding(game);assert(await invalidated.start(vip,def,()=>current));current=false;
 check('predicate invalidation during update stops and restores presentation',()=>assert(invalidated.update(1)===false && !invalidated.session && plane.visible && stairs.visible && replacement.visible && !worldRoot.getObjectByName('flavio-boarding-stage')));
 invalidated.dispose();
 deferStage=true;resolveStage=null;
 const restarting=new FlavioBoarding(game),secondGroup=new THREE.Group(),secondVip={...vip,mesh:{...live,group:secondGroup}};
 const first=restarting.start(vip,def),second=restarting.start(secondVip,def);
 await resolveStage();const results=await Promise.all([first,second]);
 check('restart while loading creates only the current actor and restores current VIP',()=>{
  assert.deepEqual(results,[false,true]);assert.equal(restarting.session.vip,secondVip);
  assert(restarting.session.actor && !secondGroup.visible && replacement.visible);
  restarting.stop();assert(secondGroup.visible && plane.visible && stairs.visible);
 });
 restarting.dispose();
 deferStage=false;failStage=true;
 const missing=new FlavioBoarding(game);assert.equal(await missing.start(vip,def),false);missing.update(8);missing.dispose();
 check('failed asset keeps originals and authoritative VIP visible',()=>assert(plane.visible && stairs.visible && replacement.visible && !worldRoot.getObjectByName('flavio-boarding-stage')));
}finally{board.dispose();live.mixer.stopAllAction();live.mixer.uncacheRoot(live.ctrl.model);}
const report={purpose:'Real stage, character, skeleton and weighted shoe vertices. CPU webp decoder substitutes pixels only; no visual/human gait approval.',cases:rows.length,rows,failed,feet,surfaceProbe,inputs};
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,feet:{samples:feet.length,minimum:Math.min(...feet.flatMap(row=>row.gaps.map(gap=>gap.minimum))),maxPlantedGap:Math.max(...feet.map(row=>Math.min(...row.gaps.map(gap=>gap.minimum))))}}));
if(failed.length)process.exitCode=1;

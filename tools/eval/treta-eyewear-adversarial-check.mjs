import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const repo=resolve(new URL('../..',import.meta.url).pathname);
const THREE=await import(pathToFileURL(resolve(repo,'public/vendor/three.module.js')));
const read=p=>fs.readFileSync(resolve(repo,p),'utf8');
const rawEye="const TRETA_ITEMS_ENABLED = true;\n"+read('public/js/eyewear.js').replace(/^import .*$/mg,'').replace(/export /g,'');
const rawNet=read('public/js/netgame.js').replace(/^import .*$/mg,'').replace('export function makeNetcode','function makeNetcode');
const rawGame=read('public/js/game.js');
const {Game}=await import('./harness.mjs');
function method(name,next){const s=rawGame.slice(rawGame.indexOf(`  ${name}(`),rawGame.indexOf(`  ${next}(`));return new Function(`return function ${s.trim().replace(new RegExp('^'+name+'\\('),'(')}`)();}
const fire=method('_fireHitscan','_targetFromHit'),target=method('_targetFromHit','_penetrationExit'),change=method('_trocarPersonagem','_syncRemoteWeapon');
function eyeModule(source,fetch,Loader){return new Function('fetch','GLTFLoader','THREE',source+';return {preloadEyewearAssets,mountEyewear};')(fetch,Loader,THREE);}
const bodySha='a'.repeat(64),profileId='character:capitao@aaaaaaaaaaaa';
const entry={approved:true,model:'/models/items/test.glb',profiles:{capitao:{bodyId:'character:capitao',profileId,bodySha256:bodySha,status:'certified',classification:'certified',certified:true,source:'gpt-pilot+human-candidate',width:1,height:.5,depth:.2,lensY:.5,templeScale:1,templeSpreadL:0,templeSpreadR:0,templeLift:0}}},landmark={bodyId:'character:capitao',profileId,bodySha256:bodySha,origin:'gpt-pilot+human-candidate',eyewear:{status:'measured',eyeLineY:0,ears:{left:{frontZ:0,topY:0,backZ:0},right:{frontZ:0,topY:0,backZ:0}}}},response=url=>({ok:true,json:async()=>String(url).includes('face-landmarks')?{bodies:{capitao:landmark}}:{eyewear:{test:entry}}});
async function headshot(source){
 const accessory=new THREE.Group();accessory.add(new THREE.Mesh(new THREE.BoxGeometry(.5,.15,.1),new THREE.MeshBasicMaterial()));
 const mod=eyeModule(source,async url=>response(url),class{async loadAsync(){return {scene:accessory};}});
 await mod.preloadEyewearAssets(['test']);
 const model=new THREE.Group(),bone=new THREE.Bone();bone.name='Head';model.add(bone);
 const geometry=new THREE.BoxGeometry(.26,.3,.26),count=geometry.attributes.position.count,weights=new Float32Array(count*4);
 for(let i=0;i<count;i++)weights[i*4]=1;
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const body=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());model.add(body);body.bind(new THREE.Skeleton([bone]));
 const anchor=mod.mountEyewear(model,{id:'capitao',eyewearId:'test'});assert(anchor);model.remove(body);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.26,.3,.26),new THREE.MeshBasicMaterial());model.add(head);model.updateMatrixWorld(true);
 const bot={alive:true,team:'B',mesh:{group:model,parts:{head}},pos:new THREE.Vector3(0,-1.6,0)};model.traverse(o=>o.userData.botOwner=bot);
 let last;const game={ray:new THREE.Raycaster(),bots:[bot],playerTeam:'E',world:{occluders:[]},_consultarTiro:Game.prototype._consultarTiro,_perfilCabeca:Game.prototype._perfilCabeca,_participanteHumano:Game.prototype._participanteHumano,_penetrationExit:Game.prototype._penetrationExit,_targetFromHit:target,_shotDamage:(d,w,dist,h)=>h?100:d,_damage:(b,d,s,w,h)=>{last={damage:d,head:h};},_fleshImpact(){},_armoredTarget(){return false;}};
 const from=new THREE.Vector3(0,0,3),dir=new THREE.Vector3(0,0,-1);
 game.ray.set(from,dir);assert.equal(game.ray.intersectObjects([model],true)[0]?.object,head,'cosmetic raycast must remain disabled');
 fire.call(game,{team:'E'},from,dir,25,false,'AWP',null,false);
 const withEye=last;model.remove(bone);model.updateMatrixWorld(true);fire.call(game,{team:'E'},from,dir,25,false,'AWP',null,false);
 assert.deepEqual(withEye,last,'eyewear must preserve same real hitscan result');assert.deepEqual(last,{damage:100,head:true});
}
async function cacheRetry(source){let calls=0,loads=0;const mod=eyeModule(source,async url=>{calls++;if(calls===1)throw Error('transient');return response(url);},class{async loadAsync(){loads++;return {scene:new THREE.Group()};}});await mod.preloadEyewearAssets(['test']);await mod.preloadEyewearAssets(['test']);assert.equal(calls,4);assert.equal(loads,1);}
function netModule(source,pending){return new Function('THREE','byId','preloadCosmeticAssets','preloadEyewearAssets','setInterval',source+';return Netcode;')(THREE,id=>({id,name:id}),async()=>{},()=>pending,()=>0);}
async function remap(source){
 let release;const pending=new Promise(r=>release=r),Netcode=netModule(source,pending);
 const bot={team:'B',def:{id:'capitao'},pos:new THREE.Vector3(),alive:true},applied=[];
 const game={playerTeam:'E',player:{team:'E'},bots:[bot],_trocarPersonagem(b,d){b.def=d;applied.push({ent:b._netId,id:d.id,eyewear:d.eyewearId});}};
 const net={yourEnt:0,startPing(){},meta:{roster:[{id:1,char:'capitao',team:'B'}]}},code=new Netcode(game,net);
 code._netMap.set(1,bot);net.onPersonagem({ent:1,char:'capitao',eyewearId:'test'});net.onSlot({yourTeam:'E'});net.meta.roster=[{id:2,char:'doutora',team:'B'}];
 code._casar({ents:[{id:2,team:'B',name:'replacement',x:0,y:0,z:0,yaw:0}]});release();await new Promise(r=>setImmediate(r));assert.equal(bot._netId,2);assert.equal(bot.def.id,'doutora');assert.equal(bot.def.eyewearId,null);
}
async function remapSameEntity(source){
 let release,loaded=false;const pending=new Promise(r=>release=r),Netcode=netModule(source,pending);
 const bot={team:'B',def:{id:'capitao'},pos:new THREE.Vector3(),mesh:{},alive:true},builds=[];
 const game={playerTeam:'E',player:{team:'E'},bots:[bot],_trocarPersonagem:change,_syncRemoteWeapon(b){builds.push({id:b._netId,eyewear:b.def.eyewearId,loaded});}};
 const net={yourEnt:0,startPing(){},meta:{roster:[{id:1,char:'capitao',eyewearId:'test',team:'B'}]}},code=new Netcode(game,net);
 code._netMap.set(1,bot);net.onPersonagem({ent:1,char:'capitao',eyewearId:'test'});net.onSlot({yourTeam:'E'});
 code._casar({ents:[{id:1,team:'B',name:'same',x:0,y:0,z:0,yaw:0}]});loaded=true;release();await new Promise(r=>setImmediate(r));
 assert(builds.every(b=>b.loaded),'must not build cosmetics before preload: '+JSON.stringify(builds));
 assert(builds.some(b=>b.loaded),'same-entity remap must rebuild after eyewear arrives: '+JSON.stringify(builds));
}
const oldNet=rawNet.replace('if (row) this._onPersonagem({...row,ent:e.id},false);','if (row) game._trocarPersonagem(bot,{...byId(row.char),skinId:row.skinId || null,eyewearId:row.eyewearId || null});').replace(/      const revision = \(this\._cosmeticRevisions[\s\S]*?      (?:if \(notify\) )?this\._prevOnPersonagem\?\.\(m\);/,`      const alvo = m.ent === net.yourEnt && !this.espectador ? this.game.player : this._netMap.get(m.ent);
      if (def && alvo) {
        const revision = (alvo._cosmeticRevision || 0) + 1; alvo._cosmeticRevision = revision;
        const apply = () => { if (alvo._cosmeticRevision === revision && net.onPersonagem === this._onPersonagem) this.game._trocarPersonagem(alvo, {...def,skinId:m.skinId || null,eyewearId:m.eyewearId || null}); };
        if (m.skinId || m.eyewearId) void Promise.all([preloadCosmeticAssets([m.skinId]),preloadEyewearAssets([m.eyewearId])]).then(apply); else apply();
      }
      this._prevOnPersonagem?.(m);`);
for(const [name,test,current,mutant] of [
 ['same hitscan/headshot',headshot,rawEye,rawEye.replace('object.raycast=()=>{};','')],
 ['transient manifest retry',cacheRetry,rawEye,rawEye.replace('fitRequest=null;console.warn','console.warn')],
 ['entity remap after preload',remap,rawNet,oldNet],
]){await test(current);let failed=false;try{await test(mutant);}catch(e){failed=true;console.log('RED mutation:',name,'=>',e.message.split('\n')[0]);}assert(failed,'mutation not detected: '+name);console.log('GREEN current:',name);}
await remapSameEntity(rawNet);
const eager=rawNet.replace('if (row) this._onPersonagem({...row,ent:e.id},false);', 'if (row) game._trocarPersonagem(bot,{...byId(row.char),skinId:row.skinId || null,eyewearId:row.eyewearId || null});');
assert.notEqual(eager,rawNet,'eager mutation must apply');
let killed=false;try{await remapSameEntity(eager);}catch(e){killed=true;console.log('RED mutation: eager materialization =>',e.message);}
assert(killed,'eager cosmetics mutation survived');console.log('GREEN same entity remap materialization');

async function recoveredSameIds(source){
 let loaded=false;const Netcode=netModule(source,Promise.resolve());
 const bot={team:'B',def:{id:'capitao'},pos:new THREE.Vector3(),mesh:{},alive:true},builds=[];
 const game={player:{},bots:[bot],_trocarPersonagem:change,_syncRemoteWeapon(b){builds.push({eyewear:b.def.eyewearId,loaded});}};
 const net={yourEnt:0,startPing(){},meta:{roster:[]}},code=new Netcode(game,net);code._netMap.set(1,bot);
 net.onPersonagem({ent:1,char:'capitao',eyewearId:'test'});await new Promise(r=>setImmediate(r));
 loaded=true;net.onPersonagem({ent:1,char:'capitao',eyewearId:'test'});await new Promise(r=>setImmediate(r));
 assert(builds.some(b=>b.loaded),'same IDs must rematerialize after recovered asset: '+JSON.stringify(builds));
}
await recoveredSameIds(rawNet);console.log('GREEN recovered asset with same IDs');
const noReload=rawNet.replace('.then(()=>apply(true))','.then(()=>apply(false))');assert.notEqual(noReload,rawNet);
let recoveryKilled=false;try{await recoveredSameIds(noReload);}catch(e){recoveryKilled=true;console.log('RED mutation: recovered asset =>',e.message);}
assert(recoveryKilled,'asset recovery mutation survived');

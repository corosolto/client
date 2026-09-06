// Browser real, perfil efêmero próprio. Requer servidor de tools/eval/serve.mjs.
import { chromium } from 'playwright';
import { measureLajesVisual } from './lajes-visual-measure.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const out=option('out','artifacts/lajes-visual/browser');const base=option('base','http://127.0.0.1:8147');const photos=Number(option('fotos','9'));if(!Number.isInteger(photos)||photos<0||photos>13)throw Error('--fotos deve ser0–13');mkdirSync(out,{recursive:true});
const quality=option('quality','med');if(!['low','med','high'].includes(quality))throw Error('quality inválida');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try {
const context=await browser.newContext({viewport:{width:1536,height:1024},deviceScaleFactor:1});
const page=await context.newPage();const errors=[],failed=[],glbs=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400) failed.push([r.status(),r.url()]);if(r.url().includes('.glb')&&r.status()===200)glbs.push(r.url());});
await page.addInitScript(quality=>localStorage.setItem('awpbr_settings',JSON.stringify({quality,bots:4,vol:0,speech:false})),quality);
await page.goto(`${base}/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1`,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:180000});
await page.waitForTimeout(2000);
console.log('game live');if(!glbs.length)throw Error('Sem GLBs HTTP200: não sei medir visual real');
const info=await page.evaluate(()=>{const g=window.__game;if(g._mapId!=='lajes')throw Error('wrong map');g.paused=true;g.player.hp=1e9;for(const b of g.bots){b.hp=1e9;b.mesh.group.visible=false;}return {initialSpawn:g.player.pos.toArray(),map:g._mapId,bots:g.bots.length,keys:Object.keys(g).filter(k=>/render|camera|scene/.test(k)),worldKeys:Object.keys(g.world),settings:g.settings,fov:g.camera.fov,render:{memory:g.renderer.info.memory,programs:g.renderer.info.programs.length},renderer:g.renderer?.__csWebgl};});
const visual=await page.evaluate(async source=>{const THREE=await import('/vendor/three.module.js');const g=window.__game;g.scene.updateMatrixWorld(true);return eval(`(${source})`)(THREE,g);},measureLajesVisual.toString());
writeFileSync(`${out}/visual-browser.json`,JSON.stringify(visual,null,2));
if(info.initialSpawn[1] !== 0) throw Error('Respawn real fora do térreo');
if(Object.values(visual).some(v=>v?.valid===false))process.exitCode=1;
console.log('visual-browser',Object.fromEntries(Object.entries(visual).filter(([k,v])=>v?.valid!==undefined).map(([k,v])=>[k,v.valid])));
writeFileSync(`${out}/boot.json`,JSON.stringify({info,errors,failed,glbs},null,2));
const poses=[['spawn-norte',-3,0,-27,-Math.PI/2,0],['spawn-sul',3,0,27,Math.PI/2,0],['praca-sul',0,0,-6,Math.PI,0],['praca-norte',0,0,5,0,0],['fachada-oeste',-1.7,0,-4.5,Math.PI/2,0],['beco-oeste',-13.8,0,-16,Math.PI,-.02],['escada-norte',-9,0,-26.5,Math.PI,.1],['laje-oeste',-9,3.1,-12,Math.PI,-.1],['praca-da-laje',-6.3,3.1,-4,-Math.PI/2,-.25],['rua-central',0,0,-18,Math.PI,0],['beco-leste',13.8,0,16,0,0],['travessa-sob-ponte',-11,0,0,-Math.PI/2,0],['esquina-respawn',-13.8,0,-27,-Math.PI/2,0]];
for(const [name,x,y,z,yaw,pitch] of poses.slice(0,photos)){await page.evaluate(([x,y,z,yaw,pitch])=>{const g=window.__game;g.player.pos.set(x,y,z);const probe=g.player.pos.clone();g._collide(probe,.38);if(probe.distanceTo(g.player.pos)>.001)throw Error(`Câmera dentro de sólido: ${x},${y},${z}`);g.player.hp=100;g.player.yaw=yaw;g.player.pitch=pitch;g.player.vel.set(0,0,0);g.camera.position.set(x,y+1.62,z);g.camera.rotation.set(pitch,yaw,0,'YXZ');g.camera.updateMatrixWorld(true);g.el.pause.classList.add('hidden');g.el.banner.classList.add('hidden');g.renderer.info.autoReset=false;g.renderer.info.reset();g.paused=false;g.update(1/60,true);g.paused=true;const passes={...g.renderer.info.render};for(const b of g.bots)b.mesh.group.visible=false;g.camera.position.set(x,y+1.62,z);g.camera.rotation.set(pitch,yaw,0,'YXZ');g.camera.updateMatrixWorld(true);g.renderer.render(g.scene,g.camera);return passes;},[x,y,z,yaw,pitch]).then(passes=>writeFileSync(`${out}/${name}-passes.json`,JSON.stringify(passes,null,2)));await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}.png`});console.log(name);}
writeFileSync(`${out}/cameras.json`,JSON.stringify({viewport:[1536,1024],fov:info.fov,quality:info.settings?.quality,poses},null,2));
const sky = await page.evaluate(async () => {
 const THREE = await import('/vendor/three.module.js'), g = window.__game, a = g.world.ambience;
 const before = a.lajesSky?.snapshot(), pipas = a.pipaSky?.snapshot(), santosBefore = a.lajesSantosDumont?.snapshot();
 const model = g.world.root.getObjectByName('LAJES_HELICOPTER'); let meshes = 0, triangles = 0;
 model?.traverse(m => { if(m.isMesh){ meshes++; triangles += (m.geometry.index?.count || m.geometry.attributes.position.count)/3; } });
 const pbr=[];g.world.root.traverse(m=>{for(const mat of [].concat(m.material||[]))if(mat.userData.tile&&mat.normalMap)pbr.push({normalURL:mat.normalMap.image?.src,normal:mat.normalMap.image?.width||0,rough:mat.roughnessMap?.image?.width||0});});
 a.paused=false;for(let i=0;i<60;i++)a.update(1/60,g.player.pos);
 const after=a.lajesSky?.snapshot(), santosAfter=a.lajesSantosDumont?.snapshot(); a.paused=true; a.update(.05,g.player.pos);
 const paused=a.lajesSky?.snapshot(), santosPaused=a.lajesSantosDumont?.snapshot(); a.paused=false;
 const dome=g.world.root.getObjectByName('LAJES_SKY_DOME'),bounds=g.world.bounds;
 dome?.geometry.computeBoundingSphere();
 const farthestView=Math.hypot(Math.max(Math.abs(bounds.minX),Math.abs(bounds.maxX)),Math.max(Math.abs(bounds.minZ),Math.abs(bounds.maxZ)),g.world.design.roofHeight+1.62);
 const domeExtent=(dome?.geometry.boundingSphere.radius||Infinity)+farthestView;
 const farSafe=domeExtent<g.camera.far;

 return {before,after,paused,santosBefore,santosAfter,santosPaused,pipas,meshes,triangles,pbr,domeExtent,cameraFar:g.camera.far,farSafe,valid:!!santosBefore&&santosBefore.elapsed!==santosAfter.elapsed&&JSON.stringify(santosAfter)===JSON.stringify(santosPaused)&&farSafe&&before?.source==='gltf'&&meshes>0&&before.rotorMain&&before.rotorTail&&pipas?.length===(g.settings.quality==='low'?4:8)&&pipas.every(p=>p.fonte==='gltf')&&JSON.stringify(before.position)!==JSON.stringify(after.position)&&before.rotorAngles.every((angle,i)=>angle!==after.rotorAngles[i])&&JSON.stringify(after)===JSON.stringify(paused)&&new Set(pbr.map(m=>m.normalURL)).size===3&&pbr.every(m=>m.normal>0)};
});
writeFileSync(`${out}/sky-runtime.json`,JSON.stringify(sky,null,2));if(!sky.valid)process.exitCode=1;
if(photos||process.argv.includes('--sky-only')){
 for(const [name,x,y,z,yaw,pitch] of [['horizonte-norte',9,3.1,10,-.28,.16],['horizonte-sul',-9,3.1,-10,Math.PI,.12]]){
  const projected=await page.evaluate(async([x,y,z,yaw,pitch])=>{
   const THREE=await import('/vendor/three.module.js'),g=window.__game;
   g.camera.position.set(x,y+1.62,z);g.camera.rotation.set(pitch,yaw,0,'YXZ');g.camera.updateMatrixWorld(true);g.scene.updateMatrixWorld(true);
   const samples=[];g.world.root.traverse(o=>{if(o.name==='LAJES_HELICOPTER'||o.name==='LAJES_SANTOS_DUMONT'||o.parent?.name==='PIPA_SKY'&&o.userData.skyLife==='pipa'){
    const box=new THREE.Box3().setFromObject(o),points=[];
    for(const xx of [box.min.x,box.max.x])for(const yy of [box.min.y,box.max.y])for(const zz of [box.min.z,box.max.z])points.push(new THREE.Vector3(xx,yy,zz).project(g.camera));
    samples.push({name:o.name||'pipa',min:points.reduce((v,p)=>v.min(p),new THREE.Vector3(Infinity,Infinity,Infinity)).toArray(),max:points.reduce((v,p)=>v.max(p),new THREE.Vector3(-Infinity,-Infinity,-Infinity)).toArray()});
   }});g.renderer.render(g.scene,g.camera);return samples;
  },[x,y,z,yaw,pitch]);
  await page.screenshot({path:`${out}/${name}.png`});writeFileSync(`${out}/${name}-projection.json`,JSON.stringify({camera:[x,y,z,yaw,pitch],projected},null,2));
 }
}

if(process.argv.includes('--movement')){
const plans=await page.evaluate(()=>{
 const w=window.__game.world, h=w.design.roofHeight;
 const plans=w.design.routes.map(r=>({name:r.name,nodes:r.points.map(([x,z])=>({x,y:0,z}))}));
 for(const side of [-1,1]){
   const north=w.design.stairs.find(s=>s.x===side*9&&s.z<0),south=w.design.stairs.find(s=>s.x===side*9&&s.z>0);
   const ascend=Array.from({length:18},(_,i)=>({x:north.x,y:(i+1)*h/18,z:north.z+(i+.5)*.3}));
   const descend=Array.from({length:18},(_,i)=>({x:south.x,y:(18-i)*h/18,z:20+(i+.5)*.3}));
   plans.push({name:side<0?'circuito-superior-oeste':'circuito-superior-leste',nodes:[{x:side*9,y:0,z:-26},...ascend,
     {x:side*9,y:h,z:-19},{x:side*9,y:h,z:-1},{x:side*9,y:h,z:1},{x:side*9,y:h,z:19},...descend,{x:side*9,y:0,z:26}]});
 }
 return plans;
});
writeFileSync(`${out}/movement-plans.json`,JSON.stringify(plans,null,2));
const results=[];
for(const plan of plans){
 await page.evaluate(p=>{const g=window.__game,n=p.nodes[0];g.player.pos.set(n.x,n.y,n.z);g.player.vel.set(0,0,0);g.player.grounded=true;g.player.alive=true;g.player.hp=1e9;g.player.mantle=null;g.player.scoped=false;g.keys={};g._spaceHeld=false;g._movementTrace=[];g._movementCollisions=0;g._originalCollide=g._collide;g._collide=function(...a){this._movementCollisions++;return this._originalCollide(...a);};},plan);
 let failure=null;
 for(let i=1;i<plan.nodes.length;i++){
  const result=await page.evaluate(target=>{const g=window.__game,p=g.player;let steps=0;g.paused=false;
   for(;steps<900;steps++){const dx=target.x-p.pos.x,dz=target.z-p.pos.z,d=Math.hypot(dx,dz);if(d<.16&&Math.abs(target.y-p.pos.y)<.4)break;p.yaw=Math.atan2(-dx,-dz);p.pitch=-.10;g.keys={KeyW:true,ShiftLeft:d<.6};g.time+=1/60;g._updatePlayer(1/60);if(steps%6===0)g._movementTrace.push({t:g.time,p:p.pos.toArray(),ground:p.grounded,mantle:!!p.mantle});}
   g.keys={};g.paused=true;g.renderer.render(g.scene,g.camera);return {ok:steps<900,steps,position:p.pos.toArray(),target};},plan.nodes[i]);
  if(i%8===0||i===plan.nodes.length-1||!result.ok)await page.screenshot({path:`${out}/${plan.name}-${String(i).padStart(3,'0')}.png`});
  if(!result.ok){failure=result;break;}
 }
 const measurement=await page.evaluate(()=>{const g=window.__game;g._collide=g._originalCollide;return {trace:g._movementTrace,collideCalls:g._movementCollisions,final:g.player.pos.toArray()};});
 if(failure)process.exitCode=1;results.push({name:plan.name,ok:!failure,failure,...measurement});console.log('movement',plan.name,!failure,measurement.collideCalls,failure?.position);
 writeFileSync(`${out}/movement.json`,JSON.stringify(results,null,2));
}

}
}finally{await browser.close();}

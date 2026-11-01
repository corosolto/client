// Um único coletor para Ego local e Chromium de CI; dados vêm dos modelos instanciados.
export async function captureCuratedFauna(page,{base,dir,fotos=2}) {
const results=[];
for(const [map,type] of [['escadao','chicken'],['lajes','cat']]){
 await page.goto(base+'/mapview.html?map='+map+'&hud=0&capture');await page.waitForFunction(()=>window.MAPEVAL?.ready,undefined,{timeout:90000});
 const record=await page.evaluate(async({map,type})=>{
  const THREE=await import('three'),{MAPS}=await import('/js/maps.js'),world=window.__gworld,targets=world.ambience.animals.filter(a=>a.type===type),animals=[];
  for(const a of targets){
  const texture=t=>t?{width:t.image?.naturalWidth||t.image?.videoWidth||t.image?.width||0,height:t.image?.naturalHeight||t.image?.videoHeight||t.image?.height||0,colorSpace:t.colorSpace||''}:null;
  const meshes=[];a.model.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,skinned:!!o.isSkinnedMesh,triangles:(o.geometry.index?.count||o.geometry.attributes.position.count)/3,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>({name:m.name,albedo:texture(m.map),normal:texture(m.normalMap),roughness:texture(m.roughnessMap)}))});});
  const pose=()=>{const values=[];a.model.traverse(o=>{if(o.isBone)values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray());});return values;};
  let previousPose=pose(),previousPosition=a.root.position.clone(),previousYaw=a.root.rotation.y,maxYawDelta=0,distance=0,localPoseChanges=0,walkFrames=0,activeClip='';
  for(let i=0;i<600;i++){
   world.ambience.update(1/60,null);const current=pose();
   const yaw=a.root.rotation.y;maxYawDelta=Math.max(maxYawDelta,Math.abs(Math.atan2(Math.sin(yaw-previousYaw),Math.cos(yaw-previousYaw))));previousYaw=yaw;
   if(a.action==='walk'&&a.actions.walk.getEffectiveWeight()>0){walkFrames++;distance+=a.root.position.distanceTo(previousPosition);if(current.length&&current.some((n,j)=>n!==previousPose[j]))localPoseChanges++;activeClip=a.actions.walk.getClip().name;}
   previousPose=current;previousPosition.copy(a.root.position);
  }
  world.ambience.reset();a.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(a.root),p=a.root.position.toArray(),center=box.getCenter(new THREE.Vector3()).toArray();window.MAPEVAL.view([p[0]+1.5,p[1]+1.62,p[2]+2.7],center);
  animals.push({id:a.id,type:a.type,source:a.source,assetId:a.root.userData.assetId,assetPath:a.root.userData.assetPath,speed:a.speed,turnRate:a.turnRate,position:p,bounds:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()},actions:Object.fromEntries(Object.entries(a.actions).map(([k,v])=>[k,v.getClip().name])),meshes,motion:{distance,localPoseChanges,walkFrames,activeClip,maxYawDelta,steps:600,dt:1/60,method:'actual controller+mixer deterministic virtual ticks, not normal-speed video'},camera:{from:window.MAPEVAL.cam.position.toArray(),look:center,fov:window.MAPEVAL.cam.fov}});
  }return{map,declaredPreload:MAPS[map].ambience,animals};
 },{map,type});
 const animal=record.animals[0];if(animal&&results.length<fotos){await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+type+'-player.png'});await page.evaluate(({p,look})=>window.MAPEVAL.view([p[0]+.8,p[1]+.75,p[2]+1.2],look),{p:animal.position,look:animal.camera.look});await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+type+'-close.png'});}results.push(record);
}
return {utc:new Date().toISOString(),kind:'actual mapview GLBs/materials+controller/mixer; deterministic ticks and frozen rest screenshots; real mobile match separate',results};
}

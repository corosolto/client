const fs=await import('node:fs/promises'),{dir,space,base,pageId,fotos}=FAUNA_CAPTURE_CONFIG;
const task=await taskSpace(space),page=task.page(pageId),results=[];
await page.cdp('Emulation.setDeviceMetricsOverride',{width:960,height:640,deviceScaleFactor:1,mobile:false});await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
for(const [map,type] of [['escadao','chicken'],['lajes','cat']]){
 await page.goto(base+'/mapview.html?map='+map+'&hud=0&capture');await page.waitForFunction(()=>window.MAPEVAL?.ready,undefined,{timeout:30000});
 const record=await page.evaluate(async({map,type})=>{
  const THREE=await import('three'),{MAPS}=await import('/js/maps.js'),world=window.__gworld,a=world.ambience.animals.find(a=>a.type===type);if(!a)throw Error('Missing curated animal');
  const texture=t=>t?{width:t.image?.naturalWidth||t.image?.videoWidth||t.image?.width||0,height:t.image?.naturalHeight||t.image?.videoHeight||t.image?.height||0,colorSpace:t.colorSpace||''}:null;
  const meshes=[];a.model.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,skinned:!!o.isSkinnedMesh,triangles:(o.geometry.index?.count||o.geometry.attributes.position.count)/3,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>({name:m.name,albedo:texture(m.map),normal:texture(m.normalMap),roughness:texture(m.roughnessMap)}))});});
  const pose=()=>{const values=[];a.model.traverse(o=>{if(o.isBone)values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray());});return values;};
  let previousPose=pose(),previousPosition=a.root.position.clone(),distance=0,localPoseChanges=0,walkFrames=0,activeClip='';
  for(let i=0;i<600;i++){
   world.ambience.update(1/60,null);const current=pose();
   if(a.action==='walk'&&a.actions.walk.getEffectiveWeight()>0){walkFrames++;distance+=a.root.position.distanceTo(previousPosition);if(current.length&&current.some((n,j)=>n!==previousPose[j]))localPoseChanges++;activeClip=a.actions.walk.getClip().name;}
   previousPose=current;previousPosition.copy(a.root.position);
  }
  world.ambience.reset();a.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(a.root),p=a.root.position.toArray(),center=box.getCenter(new THREE.Vector3()).toArray();window.MAPEVAL.view([p[0]+1.5,p[1]+1.62,p[2]+2.7],center);
  return{map,preload:MAPS[map].ambience,animals:[{id:a.id,type:a.type,source:a.source,assetId:a.root.userData.assetId,assetPath:a.root.userData.assetPath,speed:a.speed,position:p,bounds:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()},actions:Object.fromEntries(Object.entries(a.actions).map(([k,v])=>[k,v.getClip().name])),meshes,motion:{distance,localPoseChanges,walkFrames,activeClip,steps:600,dt:1/60,method:'actual controller+mixer deterministic virtual ticks, not normal-speed video'},camera:{from:window.MAPEVAL.cam.position.toArray(),look:center,fov:window.MAPEVAL.cam.fov}}]};
 },{map,type});
 const animal=record.animals[0];if(results.length<fotos){await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+type+'-player.png'});await page.evaluate(({p,look})=>window.MAPEVAL.view([p[0]+.8,p[1]+.75,p[2]+1.2],look),{p:animal.position,look:animal.camera.look});await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+type+'-close.png'});}results.push(record);
}
await fs.writeFile(dir+'/map-fauna-curated-runtime.json',JSON.stringify({utc:new Date().toISOString(),kind:'actual mapview GLBs/materials+controller/mixer; deterministic ticks and frozen rest screenshots; real mobile match separate',results},null,2)+'\n');console.log(JSON.stringify(results.map(r=>({map:r.map,animals:r.animals.map(a=>({id:a.id,path:a.assetPath,meshes:a.meshes,motion:a.motion}))}))));

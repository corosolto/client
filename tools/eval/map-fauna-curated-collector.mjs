// Um único coletor para Ego local e Chromium de CI; dados vêm dos modelos instanciados.
// Mapas e tipos vêm das referências curadas (passadas via config pelos wrappers): o
// coletor não escolhe mapa por conta própria. Por mapa, coleta TODOS os animais de
// todos os tipos referenciados (filter, nunca find).
export async function captureCuratedFauna(page,{base,dir,fotos,references,network}) {
if(!Array.isArray(references)||!references.length)throw Error('Referências curadas ausentes: sem elas o coletor não sabe o que medir.');
const preproofFS=await import('node:fs/promises'),preproofPath=await import('node:path'),preproofCrypto=await import('node:crypto');
if(typeof dir!=='string'||!preproofPath.isAbsolute(dir)||await preproofFS.realpath(dir)!==dir||(await preproofFS.readdir(dir)).length)throw Error('Preproof exige diretório autorizado físico e novo/vazio.');
if(!network||typeof network.prove!=='function'||typeof network.navigationURL!=='function')throw Error('Observador de corpo original obrigatório antes do goto.');
const byMap=new Map();
for(const ref of references){
 if(!byMap.has(ref.map))byMap.set(ref.map,new Map());
 if(byMap.get(ref.map).has(ref.type))throw Error(`Referência duplicada ${ref.map}/${ref.type}.`);
 byMap.get(ref.map).set(ref.type,ref);
}
const photoMaps=fotos??byMap.size;
const results=[];
for(const [mapIndex,[map,types]] of [...byMap].entries()){
 const expectedDocumentURL=network.navigationURL(map);
 await page.goto(expectedDocumentURL);await page.waitForFunction(()=>window.MAPEVAL?.ready,undefined,{timeout:90000});
 const record=await page.evaluate(async({map,types})=>{
  const THREE=await import('three'),{MAPS}=await import('/js/maps.js'),{assetUrl}=await import('/js/data/asseturl.js'),world=window.__gworld,wanted=new Set(types),targets=world.ambience.animals.filter(a=>wanted.has(a.type)),animals=[];
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
  animals.push({id:a.id,type:a.type,source:a.source,assetId:a.root.userData.assetId,assetPath:a.root.userData.assetPath,assetURL:new URL(assetUrl(a.root.userData.assetPath),location.href).href,speed:a.speed,turnRate:a.turnRate,position:p,bounds:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()},actions:Object.fromEntries(Object.entries(a.actions).map(([k,v])=>[k,v.getClip().name])),meshes,motion:{distance,localPoseChanges,walkFrames,activeClip,maxYawDelta,steps:600,dt:1/60,method:'actual controller+mixer deterministic virtual ticks, not normal-speed video'},camera:{from:window.MAPEVAL.cam.position.toArray(),look:center,fov:window.MAPEVAL.cam.fov}});
  }return{map,documentURL:location.href,declaredPreload:MAPS[map].ambience,animals};
 },{map,types:[...types.keys()]});
  const requirements=new Map();
  for(const animal of record.animals){
   const ref=types.get(animal.type);
   if(!ref||animal.source!=='gltf'||animal.assetId!==ref.assetId||animal.assetPath!==ref.path)throw Error('Animal real não corresponde à referência curada');
   requirements.set(animal.assetURL,{url:animal.assetURL,path:ref.path,assetId:ref.assetId,sha256:ref.sha256});
  }
  if(!/^[a-z][a-z0-9_]*$/.test(map))throw Error('Mapa inválido para preproof.');
  const preproofLimit=2*1024*1024;let preproofBudget=1,preproofRoot=true;const members=new WeakMap();
  const add=bytes=>{preproofBudget+=bytes;if(preproofBudget>preproofLimit)throw Error('Preproof excede2MiB de serialização bounded.');};
  const stringBytes=value=>{add(2);for(let i=0;i<value.length;i++){
   const c=value.charCodeAt(i);if(c===34||c===92)add(2);else if(c<32)add([8,9,10,12,13].includes(c)?2:6);
   else if(c>=0xd800&&c<=0xdbff&&value.charCodeAt(i+1)>=0xdc00&&value.charCodeAt(i+1)<=0xdfff){add(4);i++;}
   else add(c>=0xd800&&c<=0xdfff?6:c<128?1:c<2048?2:3);
  }};
  const preproofText=JSON.stringify({scope:'GLTF record before network proof; not acceptance',record},function(key,value){
   const omitted=value===undefined||typeof value==='function'||typeof value==='symbol';
   if(omitted&&!Array.isArray(this))return value;
   if(!preproofRoot){const n=members.get(this)||0;members.set(this,n+1);if(n)add(1);if(!Array.isArray(this)){stringBytes(key);add(1);}}else preproofRoot=false;
   if(typeof value==='string')stringBytes(value);else if(value&&typeof value==='object'){const proto=Object.getPrototypeOf(value);if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)throw Error('Preproof exige registro JSON simples.');members.set(value,0);add(2);}
   else add(value===null||omitted||typeof value==='number'&&!Number.isFinite(value)?4:String(value).length);
   return value;
  })+'\n';
  const preproofBytes=Buffer.byteLength(preproofText);if(preproofBytes>preproofLimit)throw Error('Preproof excede2MiB.');
  const preproof={dir,path:preproofPath.join(dir,'map-fauna-preproof-'+map+'.json'),byteLength:preproofBytes,sha256:preproofCrypto.createHash('sha256').update(preproofText).digest('hex')};
  await preproofFS.writeFile(preproof.path,preproofText,{flag:'wx'});
  const measured=await network.prove({map,documentURL:record.documentURL,requirements:[...requirements.values()],preproof});
  record.document=measured.document;delete record.documentURL;
  for(const animal of record.animals){
   if(!measured.proofs[animal.assetURL])throw Error('Corpo original não comprovado para '+map+'/'+animal.id);
   animal.response={...measured.proofs[animal.assetURL]};
  }
 for(const animal of record.animals){
  const ref=types.get(animal.type);
  if(ref?.fleeSpace===true&&map==='lajes'&&animal.type==='cat')animal.fleeSpace=await captureLajesCatEscapeSpace(page);
  else if(ref?.fleeSpace&&typeof ref.fleeSpace==='object'){
   const per=ref.fleeSpace.animals?.[animal.id]||{};
   animal.fleeSpace=await captureCuratedEscapeSpace(page,{map,id:animal.id,spec:{...ref.fleeSpace,...per}});
  }
 }
 // Compatibilidade CLI: fotos limita quantos mapas recebem duas vistas por animal.
 if(mapIndex<photoMaps)for(const animal of record.animals){
  await page.evaluate(({p,look})=>window.MAPEVAL.view([p[0]+1.5,p[1]+1.62,p[2]+2.7],look),{p:animal.position,look:animal.camera.look});
  await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+animal.id+'-player.png'});
  await page.evaluate(({p,look})=>window.MAPEVAL.view([p[0]+.8,p[1]+.75,p[2]+1.2],look),{p:animal.position,look:animal.camera.look});
  await page.screenshot({path:dir+'/map-fauna-curated-'+map+'-'+animal.id+'-close.png'});
 }
 results.push(record);
}
async function captureLajesCatEscapeSpace(page){
 const cases=[];
 // Um cenário por evaluate mantém cada chamada limitada, inclusive no browser de CI.
 for(const warmup of [3,8])for(let angle=0;angle<8;angle++)cases.push(await page.evaluate(async({warmup,angle})=>{
  const THREE=await import('three'),world=window.__gworld,ambience=world.ambience,a=ambience.animals.find(a=>a.type==='cat');
  if(!a)throw Error('Lajes cat absent during spatial capture');
  ambience.reset();for(let i=0;i<warmup*60;i++)ambience.update(1/60,null);
  const p=a.root.position.clone(),threat=p.clone().add(new THREE.Vector3(Math.sin(angle*Math.PI/4),0,Math.cos(angle*Math.PI/4)));
  ambience.onShot(threat,p);
  let obstacleOverlaps=0,supportMisses=0,maxHalfExtent=0,peakDistance=0,rejoined=false;
  const firstFailures=[],box=new THREE.Box3();
  for(let frame=0;frame<1200;frame++){
   ambience.update(1/60,null);a.root.updateMatrixWorld(true);a.model.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});box.setFromObject(a.model);
   const position=a.root.position;
   maxHalfExtent=Math.max(maxHalfExtent,Math.abs(box.min.x-position.x),Math.abs(box.max.x-position.x),Math.abs(box.min.z-position.z),Math.abs(box.max.z-position.z));
   peakDistance=Math.max(peakDistance,position.distanceTo(p));rejoined ||= a.alertUntil===0;
   const blocked=world.colliders.some(b=>b.maxY>position.y+.02&&b.minY<box.max.y&&box.max.x>b.minX&&box.min.x<b.maxX&&box.max.z>b.minZ&&box.min.z<b.maxZ);
   const unsupported=[box.min.x,box.max.x].some(x=>[box.min.z,box.max.z].some(z=>Math.abs(world.groundHeightAt(x,z,position.y+.1)-position.y)>1e-6));
   if(blocked)obstacleOverlaps++;if(unsupported)supportMisses++;
   if((blocked||unsupported)&&firstFailures.length<3)firstFailures.push({frame,blocked,unsupported,position:position.toArray(),bounds:{min:box.min.toArray(),max:box.max.toArray()}});
  }
  return{warmup,angle,frames:1200,dt:1/60,obstacleOverlaps,supportMisses,maxHalfExtent,peakDistance,rejoined,firstFailures};
 },{warmup,angle}));
 await page.evaluate(()=>window.__gworld.ambience.reset());
 return{method:'actual animated GLB bounds vs authored tall colliders and roof support; deterministic ticks, not triangle collision or normal-speed video',cases};
}
// Protocolo do diagnóstico espacial R1/R2, com nomes de campo normalizados.
// O delta de apoio roof também é medido nos quatro raios já exigidos por quadro.
async function captureCuratedEscapeSpace(page,{map,id,spec}){
 const cases=[];
 for(const warmup of [3,8])for(let angle=0;angle<8;angle++)cases.push(await page.evaluate(async({map,id,spec,warmup,angle})=>{
  const THREE=await import('three'),world=window.__gworld,ambience=world.ambience,a=ambience.animals.find(x=>x.id===id);
  if(!a)throw Error(`${map}/${id} absent during spatial capture`);
  const roof=spec.mode==='roof',proxy=spec.excludeSupportProxy||null,house=roof&&spec.house?world.root.getObjectByName(spec.house):null;
  ambience.reset();for(let i=0;i<warmup*60;i++)ambience.update(1/60,null);
  const initial=a.root.position.clone();ambience.onShot(initial.clone().add(new THREE.Vector3(Math.sin(angle*Math.PI/4),0,Math.cos(angle*Math.PI/4))),initial);
  const box=new THREE.Box3(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),triangles=[];
  if(house){house.updateMatrixWorld(true);house.traverse(o=>{if(!o.isMesh)return;const attr=o.geometry.attributes.position,ix=o.geometry.index;for(let i=0;i<(ix?.count||attr.count);i+=3){const vs=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(attr,ix?ix.getX(i+k):i+k).applyMatrix4(o.matrixWorld));if(Math.max(...vs.map(v=>v.y))<=initial.y+.02)continue;triangles.push(new THREE.Triangle(...vs));}});}
  let obstacleOverlaps=0,supportMisses=0,maxHalfExtent=0,peakDistance=0,rejoined=false,maxRenderedDelta=0,minSlopeSpan=Infinity,maxSlopeSpan=0;
  const firstFailures=[],excluded=c=>proxy&&Math.abs(c.minX-proxy.minX)<1e-6&&Math.abs(c.maxX-proxy.maxX)<1e-6&&Math.abs(c.minZ-proxy.minZ)<1e-6&&Math.abs(c.maxZ-proxy.maxZ)<1e-6;
  if(!['ground','roof'].includes(spec.mode))throw Error('Unknown curated support mode');
  if(roof&&(!house||!triangles.length||!proxy||world.colliders.filter(excluded).length!==1))throw Error('Missing or ambiguous authored roof support/obstacle proxy');
  for(let frame=0;frame<1200;frame++){
   ambience.update(1/60,null);a.root.updateMatrixWorld(true);a.model.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});box.setFromObject(a.model);
   const position=a.root.position;
   maxHalfExtent=Math.max(maxHalfExtent,Math.abs(box.min.x-position.x),Math.abs(box.max.x-position.x),Math.abs(box.min.z-position.z),Math.abs(box.max.z-position.z));
   peakDistance=Math.max(peakDistance,position.distanceTo(initial));rejoined ||= a.alertUntil===0;
   let blocked=world.colliders.some(c=>!excluded(c)&&c.maxY>position.y+.02&&c.minY<box.max.y&&box.max.x>c.minX&&box.min.x<c.maxX&&box.max.z>c.minZ&&box.min.z<c.maxZ);
   if(roof)blocked ||= triangles.some(tri=>box.intersectsTriangle(tri));
   let unsupported=!roof&&Math.abs(position.y-world.groundHeightAt(position.x,position.z))>1e-8;
   if(roof)for(const x of[box.min.x,box.max.x])for(const z of[box.min.z,box.max.z]){ray.set(new THREE.Vector3(x,position.y+.01,z),down);ray.far=.02;const hit=ray.intersectObject(house,true)[0];if(!hit)unsupported=true;else{const delta=Math.abs(hit.point.y-position.y);maxRenderedDelta=Math.max(maxRenderedDelta,delta);if(delta>1e-6)unsupported=true;}}
   if(frame%60===0&&!roof){
    const heights=[box.min.x,box.max.x].flatMap(x=>[box.min.z,box.max.z].map(z=>world.groundHeightAt(x,z)));const span=Math.max(...heights)-Math.min(...heights);minSlopeSpan=Math.min(minSlopeSpan,span);maxSlopeSpan=Math.max(maxSlopeSpan,span);
    ray.set(new THREE.Vector3(position.x,position.y+.05,position.z),down);ray.far=.1;const hit=ray.intersectObject(world.root,true).find(h=>{let n=h.object;for(;n;n=n.parent)if(!n.visible||n===ambience.group)return false;return true;});
    if(hit)maxRenderedDelta=Math.max(maxRenderedDelta,Math.abs(hit.point.y-position.y));else unsupported=true;
   }
   if(blocked)obstacleOverlaps++;if(unsupported)supportMisses++;
   if((blocked||unsupported)&&firstFailures.length<3)firstFailures.push({frame,blocked,unsupported,position:position.toArray(),bounds:{min:box.min.toArray(),max:box.max.toArray()}});
  }
  return{warmup,angle,frames:1200,dt:1/60,mode:spec.mode,obstacleOverlaps,supportMisses,maxHalfExtent,peakDistance,maxRenderedDelta,minSlopeSpan:roof?null:(Number.isFinite(minSlopeSpan)?minSlopeSpan:null),maxSlopeSpan,rejoined,roofTriangles:triangles.length,firstFailures};
 },{map,id,spec,warmup,angle}));
 await page.evaluate(()=>window.__gworld.ambience.reset());
 return{method:'actual animated GLB bounds vs authored colliders; deterministic 1/60 ticks, not triangle-accurate collision or normal-speed video. Ground support: analytic groundHeightAt at root plus a sampled (every 60 frames) rendered-root ray; corner slope span is DESCRIPTIVE, not physical foot-contact proof. Roof support: exact house triangles above support level plus corner rays every frame (maxRenderedDelta records their actual maximum height delta); only the exact named support proxy collider is excluded, no broad collider skip.',cases};
}
return {utc:new Date().toISOString(),kind:'actual mapview GLBs/materials+controller/mixer; deterministic ticks and frozen rest screenshots; real mobile match separate',results};
}

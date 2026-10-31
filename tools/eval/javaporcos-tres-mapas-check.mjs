// Três ambientes devem existir no registro e produzir layouts distintos, com a mesma mecânica.
import assert from 'node:assert/strict';
import {bootGame,initTextures,MAPS,THREE} from './harness.mjs';
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','layout-copiado','sem-horda','silo-transparente','via-obstruida','terreno-deslocado','spawn-desnivelado'].includes(mutant));
const ids=['invasao_javaporcos','distrito_rural','vila_da_mata'],assinaturas=new Set();
let falha='';
try {
 for(const id of ids){
  assert.ok(MAPS[id],`${id}: mapa ausente`);
  if(mutant==='sem-horda'&&id==='vila_da_mata')MAPS[id].objectiveMode='';
  assert.equal(MAPS[id].objectiveMode,'horde',`${id}: mecânica errada`);
  if(mutant==='layout-copiado'&&id!=='invasao_javaporcos')MAPS[id].build=MAPS.invasao_javaporcos.build;
  const g=bootGame(id,{textures:initTextures(),seed:77}),w=g.world;
  assert.ok(g.objective,'modo não iniciou');assert.equal(w.horda.frentes.length,6);
  assert.ok(w.hordeRefuges.length>=4);assert.ok(w.pickups.length>=12);
  g.scene.updateMatrixWorld(true);
  for(const r of w.hordeRefuges){
   const alturas=[];
   for(const d of r.degraus){const z=(d.z0+d.z1)/2,raio=new THREE.Raycaster(new THREE.Vector3(r.x,d.y+.1,z),new THREE.Vector3(0,-1,0),0,.3),hit=raio.intersectObject(w.root,true).find(h=>h.object.name==='escada-refugio');assert.ok(hit&&Math.abs(hit.point.y-d.y)<.005,'degrau físico diverge da malha');alturas.push(hit.point.y);}
   for(let i=1;i<alturas.length;i++){const espelho=alturas[i]-alturas[i-1],piso=r.degraus[i].z1-r.degraus[i].z0;assert.ok(espelho>=.16&&espelho<=.19&&2*espelho+piso>=.62&&2*espelho+piso<=.66,`${id}: proporção inválida no refúgio ${r.team}`);}
  }
  assert.ok(w.root.userData.interiores?.length>=2,'sem abrigos interiores');
  assert.ok(w.foodSpots.length>=8,'comida concentrada em poucos destinos');
  for(const s of w.foodSpots){const n=w.waypoints.nodes[w.nearestWaypoint(s.x,s.z)];if(s.id.startsWith('alimento-'))assert.ok(Math.hypot(n.x-s.x,n.z-s.z)<=s.r,`${id}/${s.id}: alimento inalcançável`);}
  if(id!=='invasao_javaporcos')assert.equal(w.root.userData.vias?.length,2,'vias não registradas');
  if(mutant==='via-obstruida'&&id==='distrito_rural')w.colliders.push({minX:-31,maxX:-29,minZ:-13,maxZ:-11,minY:0,maxY:5});
  for(const via of w.root.userData.vias||[])for(let i=1;i<via.pts.length;i++){
   const a=via.pts[i-1],b=via.pts[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
   for(let j=0;j<=n;j++){
    const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n,y=w.groundHeightAt(x,z,0);
    assert.ok(!w.colliders.some(c=>c.maxY>y+1.5&&c.minY<y+1.5&&x>c.minX+.05&&x<c.maxX-.05&&z>c.minZ+.05&&z<c.maxZ-.05),`${id}: via bloqueada em ${x.toFixed(1)},${z.toFixed(1)}`);
   }
  }
  if(id==='vila_da_mata'){
   if(mutant==='spawn-desnivelado')w.spawns.E.at(-1).z=17;
   for(const slots of Object.values(w.spawns)){
    const heights=slots.map(s=>w.groundHeightAt(s.x,s.z,0));
    assert.ok(Math.max(...heights)-Math.min(...heights)<=.3,'slots do mesmo time em alturas diferentes');
   }
   const terrenos=w.root.children.filter(m=>m.name==='chao-terreno');
   if(mutant==='terreno-deslocado'){for(const m of terrenos)m.position.y+=.5;g.scene.updateMatrixWorld(true);}
   for(const [x,z] of [...Array.from({length:8},(_,i)=>[22+i,-11]),[7,-8],[7,-7]]){
    const y=w.groundHeightAt(x,z,0),ray=new THREE.Raycaster(new THREE.Vector3(x,y+1.5,z),new THREE.Vector3(0,-1,0),0,3),h=ray.intersectObjects(terrenos,false)[0];
    assert.ok(h&&Math.abs(h.point.y-y)<.05,`relevo visível diverge do chão em ${x},${z}`);
   }
  }
  if(id==='distrito_rural'){
   const silos=[];w.root.traverse(m=>{if(m.name==='telhado-silo')silos.push(m);});assert.equal(silos.length,2);
   g.scene.updateMatrixWorld(true);
   if(mutant==='silo-transparente')for(const t of silos)w.occluders.splice(w.occluders.indexOf(t),1);
   for(const teto of silos){assert.ok(w.occluders.includes(teto),'tiro atravessa telhado do silo');for(const dx of [0,1,2]){
    const p=teto.getWorldPosition(new THREE.Vector3()),raio=new THREE.Raycaster(new THREE.Vector3(p.x+dx,p.y+3,p.z),new THREE.Vector3(0,-1,0));
    const hit=raio.intersectObject(teto)[0];assert.ok(hit);assert.ok(Math.abs(w.groundHeightAt(p.x+dx,p.z,hit.point.y+.1)-hit.point.y)<.03,'piso não acompanha telhado do silo');
   }}
  }
  const layout=w.root.userData.layoutAmbiente||'cidade-quarteiroes';
  const ocupacao=[];
  for(let x=-32;x<=32;x+=2)for(let z=-32;z<=32;z+=2)ocupacao.push(w.colliders.some(c=>{if(c.maxY-c.minY<1)return false;if(!c.ry)return x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ;const dx=x-c.cx,dz=z-c.cz;return Math.abs(dx*c.cos-dz*c.sin)<c.hx&&Math.abs(dx*c.sin+dz*c.cos)<c.hz;}));
  assinaturas.add(ocupacao.join(''));
  console.log(`✓ MAPA ${id}: ${w.waypoints.nodes.length} nós, ${w.foodSpots.length} alimentos, layout ${layout}`);
 }
 assert.equal(assinaturas.size,3,'layouts não diferem');
}catch(e){falha=e.message;console.log('✗ TRES-MAPAS: '+e.message);}
const esperado={'layout-copiado':'layouts não diferem','sem-horda':'mecânica errada','silo-transparente':'tiro atravessa telhado','via-obstruida':'via bloqueada','terreno-deslocado':'relevo visível diverge do chão','spawn-desnivelado':'slots do mesmo time em alturas diferentes'}[mutant];
process.exitCode=mutant?(falha.includes(esperado)?0:1):(falha?1:0);

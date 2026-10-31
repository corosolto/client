// Três ambientes devem existir no registro e produzir layouts distintos, com a mesma mecânica.
import assert from 'node:assert/strict';
import {bootGame,initTextures,MAPS} from './harness.mjs';
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','layout-copiado','sem-horda'].includes(mutant));
const ids=['invasao_javaporcos','distrito_rural','vila_da_mata'],assinaturas=new Set();
let falha=false;
try {
 for(const id of ids){
  assert.ok(MAPS[id],`${id}: mapa ausente`);
  if(mutant==='sem-horda'&&id==='vila_da_mata')MAPS[id].objectiveMode='';
  assert.equal(MAPS[id].objectiveMode,'horde',`${id}: mecânica errada`);
  if(mutant==='layout-copiado'&&id!=='invasao_javaporcos')MAPS[id].build=MAPS.invasao_javaporcos.build;
  const g=bootGame(id,{textures:initTextures(),seed:77}),w=g.world;
  assert.ok(g.objective,'modo não iniciou');assert.equal(w.horda.frentes.length,6);
  assert.ok(w.hordeRefuges.length>=4);assert.ok(w.pickups.length>=12);
  assert.ok(w.root.userData.interiores?.length>=2,'sem abrigos interiores');
  assert.ok(w.foodSpots.length>=8,'comida concentrada em poucos destinos');
  for(const s of w.foodSpots){const n=w.waypoints.nodes[w.nearestWaypoint(s.x,s.z)];if(s.id.startsWith('alimento-'))assert.ok(Math.hypot(n.x-s.x,n.z-s.z)<=s.r,`${id}/${s.id}: alimento inalcançável`);}
  const layout=w.root.userData.layoutAmbiente||'cidade-quarteiroes';
  const ocupacao=[];
  for(let x=-32;x<=32;x+=2)for(let z=-32;z<=32;z+=2)ocupacao.push(w.colliders.some(c=>{if(c.maxY-c.minY<1)return false;if(!c.ry)return x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ;const dx=x-c.cx,dz=z-c.cz;return Math.abs(dx*c.cos-dz*c.sin)<c.hx&&Math.abs(dx*c.sin+dz*c.cos)<c.hz;}));
  assinaturas.add(ocupacao.join(''));
  console.log(`✓ MAPA ${id}: ${w.waypoints.nodes.length} nós, ${w.foodSpots.length} alimentos, layout ${layout}`);
 }
 assert.equal(assinaturas.size,3,'layouts não diferem');
}catch(e){falha=true;console.log('✗ TRES-MAPAS: '+e.message);}
process.exitCode=mutant?(falha?0:1):(falha?1:0);

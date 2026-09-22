// O objetivo no mezanino não pode ser capturado, contestado ou guardado pelo térreo.
import assert from 'node:assert/strict';
import { bootGame, initTextures, THREE } from './harness.mjs';
const g=bootGame('mansao',{ctf:true,textures:initTextures()});
const p=g.ctfPts.find(p=>p.id==='P');
assert(p);
for(const c of g.combatants)c.alive=false;
g.player.alive=true;g.player.pos.set(p.x,0,p.z);
const mutant=process.argv.includes('--mutante=sem-camada');
const mutantPatamar=process.argv.includes('--mutante=salta-patamar');
if(mutant){assert(g.world.ctfLayerContains);g.world.ctfLayerContains=undefined;}
g._updateCTF(3);
assert.equal(p.owner,null,'térreo capturou mezanino');
g.player.pos.y=4.5;g._updateCTF(3);
assert.equal(p.owner,'E','mezanino não captura');
const bot=g.bots.find(b=>b.team==='B');assert(bot);
bot.alive=true;bot.pos.set(p.x,0,p.z);bot.ctfPt=g.ctfPts.indexOf(p);bot.ctfRepick=Infinity;
g._updateCTF(.1);assert.equal(p.contested,false,'térreo contesta mezanino');
g._botCtf(bot,.05);assert.equal(bot._ctfMoving,0,'bot guarda no andar errado');
bot.pos.y=4.5;g._updateCTF(.1);assert.equal(p.contested,true,'mesmo andar não contesta');
g.scene.updateMatrixWorld(true);
for(const point of g.ctfPts)for(const mesh of [point.zone,point.ring]){
 const a=mesh.geometry.attributes.position,ix=mesh.geometry.index;
 for(let i=0;i<(ix?.count||a.count);i+=3){const c=new THREE.Vector3();for(let j=0;j<3;j++)c.add(new THREE.Vector3().fromBufferAttribute(a,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));c.multiplyScalar(1/3);assert(Math.abs(g.world.groundHeightAt(c.x,c.z,mesh.position.y)-mesh.position.y)<.1,`${point.id}: pintura CTF fora do piso`);}
 assert.equal(point.r,4.5,'raio mecânico mudou');
}

// Reproduz diretamente o defeito que motivou a trava de camada: um bot no térreo pode
// coincidir em X/Z com um waypoint do mezanino. Esse nó só pode ser consumido depois que
// os pés chegarem à mesma altura; comparar apenas a distância horizontal pula o patamar.
{
 const probe=bootGame('mansao',{ctf:true,textures:initTextures()});
 const alvo=probe.ctfPts.find(point=>point.id==='P');
 const corredor=probe.bots.find(candidate=>candidate.team==='B');assert(corredor&&alvo);
 for(const combatant of probe.combatants)combatant.alive=false;
 corredor.alive=true;corredor.ctfPt=probe.ctfPts.indexOf(alvo);corredor.ctfRepick=Infinity;
 const nodes=probe.world.waypoints.nodes,adj=probe.world.waypoints.adj;
 const alto=nodes.findIndex((node,i)=>node.y>4&&Math.hypot(node.x-alvo.x,node.z-alvo.z)>8&&adj[i].some(j=>nodes[j].y>4));
 const seguinte=adj[alto].find(i=>nodes[i].y>4);assert(alto>=0&&seguinte!==undefined);
 corredor.pos.set(nodes[alto].x,0,nodes[alto].z);corredor.path=[alto,alto,seguinte];corredor.pathIdx=1;corredor.repathAt=Infinity;
 if(mutantPatamar)probe.world.botLayeredNavigation=false;
 probe._botCtf(corredor,1/60);
 assert.equal(corredor.pathIdx,1,'bot no térreo pulou waypoint coincidente do mezanino');
}

const percorreAteMezanino=(start)=>{
 const sim=bootGame('mansao',{ctf:true,textures:initTextures()});
 const alvo=sim.ctfPts.find(point=>point.id==='P');
 const corredor=sim.bots.find(candidate=>candidate.team==='B');assert(corredor);
 for(const combatant of sim.combatants)combatant.alive=false;
 corredor.alive=true;corredor.pos.set(...start);corredor.ctfPt=sim.ctfPts.indexOf(alvo);
 corredor.ctfRepick=Infinity;corredor.repathAt=0;corredor.path=null;corredor._banNodes=new Set();
 if(mutantPatamar)sim.world.botLayeredNavigation=false;
 const dt=1/60;
 for(let frame=0;frame<120/dt;frame++){
  sim.time+=dt;sim._botCtf(corredor,dt);
  corredor.pos.y=sim.world.groundHeightAt(corredor.pos.x,corredor.pos.z,corredor.pos.y);
  const dentro=Math.hypot(alvo.x-corredor.pos.x,alvo.z-corredor.pos.z)<alvo.r*.7;
  if(dentro&&sim.world.ctfLayerContains(alvo,corredor.pos))return {segundos:(frame*dt).toFixed(2),maxY:corredor.pos.y};
 }
 assert.fail(`bot não chegou ao MEZZO partindo de ${start.join(',')} em 120 s; fim=${corredor.pos.toArray().map(n=>n.toFixed(2)).join(',')}`);
};
const percursoServico=percorreAteMezanino([13.5,0,-5]);
const percursoSpawn=percorreAteMezanino([0,0,32]);
console.log(`JOA CTF: camadas, contestação, pintura e subida contínua ao MEZZO OK · serviço ${percursoServico.segundos}s · spawn ${percursoSpawn.segundos}s`);

// O objetivo no mezanino não pode ser capturado, contestado ou guardado pelo térreo.
import assert from 'node:assert/strict';
import { bootGame, initTextures, THREE } from './harness.mjs';
const g=bootGame('mansao',{ctf:true,textures:initTextures()});
const p=g.ctfPts.find(p=>p.id==='P');
assert(p);
for(const c of g.combatants)c.alive=false;
g.player.alive=true;g.player.pos.set(p.x,0,p.z);
const mutant=process.argv.includes('--mutante=sem-camada');
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
console.log('JOA CTF: camadas, contestação, bot e pintura apoiada OK');

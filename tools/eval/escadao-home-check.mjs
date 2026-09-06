import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const mut = process.argv.includes('--mutante=porta-fechada');
if (process.argv.includes('--mutante=piso-duplo')) { const duplicate=new THREE.Mesh(new THREE.BoxGeometry(7,.4,2.6),new THREE.MeshBasicMaterial()); duplicate.position.set(4.95,2.55,15.5);W.root.add(duplicate);W.occluders.push(duplicate); }
if (mut) W.colliders.push({ minX: 8.3, maxX: 8.8, minY: 2.75, maxY: 5.5, minZ: 15, maxZ: 17 });
const points = [[9.2,23],[9.2,22.5],[9.2,20],[9.2,17.5],[9.2,16],[8,16],[7,16],[6.2,15]];
assert.equal(W.groundHeightAt(7,16), 2.75, 'Casa tem piso alcançável no andar superior');
for (let i=1;i<points.length;i++) {
  assert.ok(game._retaAndavel(...points[i-1],...points[i],.38,.55), `Entrada livre ${i}`);
  assert.ok(game._retaAndavel(...points[i],...points[i-1],.38,.55), `Saída livre ${i}`);
}
for (const [a,b] of [[[0,26],[0,18]],[[12,20],[12,11]],[[-12,20],[-12,11]]])
  assert.ok(game._retaAndavel(...a,...b,.38,.55), 'Rotas existentes livres');
W.root.updateMatrixWorld(true);
const floorRay=new THREE.Raycaster(new THREE.Vector3(3.1,3.2,16.1),new THREE.Vector3(0,-1,0),0,1);
const floorSurfaces=new Set(floorRay.intersectObjects(W.occluders,true).filter(h=>Math.abs(h.point.y-2.75)<.001).map(h=>h.object.uuid));
assert.equal(floorSurfaces.size,1,'Piso interior sem superfícies coplanares sobrepostas');
const ray = new THREE.Raycaster(new THREE.Vector3(6.2,4.37,15.5),new THREE.Vector3(0,0,-1),0,2);
assert.equal(ray.intersectObjects(W.occluders,true).length,0,'Janela aberta permite tiro');
const windowEye = new THREE.Vector3(6.15,4.37,15.5), target = new THREE.Vector3(6.15,W.groundHeightAt(6.15,9)+1.5,9);
ray.set(windowEye,target.clone().sub(windowEye).normalize()); ray.far=windowEye.distanceTo(target);
assert.equal(ray.intersectObjects(W.occluders,true).length,0,'Janela enxerga alvo em área jogável no patamar');
const targetFeet = target.clone(); targetFeet.y=W.groundHeightAt(target.x,target.z);
const beforeFeet=targetFeet.clone(); game._collide(targetFeet,.38);
assert.ok(targetFeet.distanceTo(beforeFeet)<1e-6,'Área do alvo cabe o jogador');
ray.set(new THREE.Vector3(6.2,3.3,15.5),new THREE.Vector3(0,0,-1)); ray.far=2;
assert.ok(ray.intersectObjects(W.occluders,true).length>0,'Peitoril continua sólido');
const rearEye = new THREE.Vector3(5.85,4.37,17.2), rearTarget = new THREE.Vector3(8,W.groundHeightAt(8,21)+1.5,21);
ray.set(rearEye,rearTarget.clone().sub(rearEye).normalize()); ray.far=rearEye.distanceTo(rearTarget);
assert.equal(ray.intersectObjects(W.occluders,true).length,0,'Janela traseira enxerga a rua/respawn');
const upper = [[.2,10.12],[.9,10.12],[.9,12],[.9,14.7],[1.6,14.9],[3.2,15.5]];
const elevated=game.player;
elevated.pos.set(-.3,W.groundHeightAt(-.3,10.12),10.12);elevated.vel.set(0,0,0);elevated.grounded=true;elevated.mantle=null;
for(const [x,z] of [...upper, ...upper.slice().reverse()]) {
  let frames=0;
  while(Math.hypot(x-elevated.pos.x,z-elevated.pos.z)>.15&&frames++<300) {
    elevated.yaw=Math.atan2(elevated.pos.x-x,elevated.pos.z-z);game.time+=1/60;
    game._moveEntity(elevated,{ax:0,az:-1,jump:false,crouch:false,shift:false},1/60);
  }
  assert.ok(frames<300,`Acesso alto/retorno travou rumo a ${x},${z}`);
}
assert.ok(elevated.pos.y>=2.5,'Passarela alta mantém a cota da casa e retorna ao patamar');
assert.ok(!game._walkReach({pos:{x:11,y:0,z:19}}, {x:9.3,z:19}, .45), 'Lateral elevada não pode teleportar bots');
const start=W.nearestWaypoint(9.2,23), end=W.nearestWaypoint(7,16);
for (const source of [start,W.nearestWaypoint(12,20),W.nearestWaypoint(0,26)]) {
  const path=W.findPath(source,end); assert.ok(path.length>1,'Bots alcançam interior pelo grafo');
  for(let i=1;i<path.length;i++) { const a=W.waypoints.nodes[path[i-1]],b=W.waypoints.nodes[path[i]];
    assert.ok(game._retaAndavel(a.x,a.z,b.x,b.z,.42,.3),`Aresta real ${JSON.stringify([a,b])}`);
  }
}
const p=game.player;
game._updateBot=()=>{};game._checkCtfAlvo=()=>{};game._checkPace=()=>{};
p.pos.set(9.2,0,23.2);p.vel.set(0,0,0);p.alive=true;p.hp=100;p.grounded=true;
p.mantle=null;p.crouchF=0;p.scoped=false;p.jumpBufferedUntil=0;p.coyoteUntil=0;
game.state='live';game.roundTime=1e6;game.touchMove=null;game.mouseDown0=false;
const trace=[];
for(const [x,z] of [[9.2,20],[9.2,17.5],[9.2,16],[7,16],[6.2,15],[7,16],[9.2,16],[9.2,20],[9.2,23.2]]) {
  let frames=0;
  while(Math.hypot(x-p.pos.x,z-p.pos.z)>.15 && frames++<300) {
    p.yaw=Math.atan2(p.pos.x-x,p.pos.z-z);p.pitch=0;game.keys={KeyW:true};
    game.time+=1/60;game._updatePlayer(1/60);trace.push(p.pos.toArray());
  }
  assert.ok(frames<300,`Movimento travou rumo a ${x},${z}: ${p.pos.toArray()}`);
}
assert.ok(trace.every(v=>v.every(Number.isFinite)));
assert.ok(Math.max(...trace.map(v=>v[1]))>=2.75 && p.pos.y<.1,'Subiu e voltou ao chão');
console.log(`HOME movimento: ${trace.length} posições finitas`);
console.log('HOME PASS: acesso/retorno, becos, janela de tiro e peitoril, grafo');

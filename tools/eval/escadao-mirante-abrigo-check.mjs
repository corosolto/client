import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
assert.ok(!mutant || ['saidas-seladas', 'sem-ombreiras', 'fundo-aberto'].includes(mutant), 'Mutante conhecido');
const abrigo = [];
W.root.traverse(object => { if (object.userData.escadaoMiranteAbrigo) abrigo.push(object); });
assert.ok(abrigo.length > 0, 'Mirante precisa de abrigo central acessível, não vazio sem disputa');

if (process.argv.includes('--mutante=saidas-seladas')) {
  for (const [x, z, w, d] of [[2.1, -21.5, .3, 1.2], [-2.1, -21.5, .3, 1.2]]) {
    const sealed = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), new THREE.MeshBasicMaterial());
    sealed.position.set(x, W.groundHeightAt(x, z) + 1.2, z);
    W.root.add(sealed); W.occluders.push(sealed);
    W.colliders.push({ minX: x-w/2, maxX: x+w/2, minY: W.groundHeightAt(x,z), maxY: W.groundHeightAt(x,z)+2.4, minZ: z-d/2, maxZ: z+d/2 });
  }
}

const source = W.nearestWaypoint(0, 26), interior = W.nearestWaypoint(0, -21.5);
const path = W.findPath(source, interior);
assert.ok(path.length > 1, 'Time da rua alcança o abrigo central do mirante');
for (let i = 1; i < path.length; i++) {
  const a = W.waypoints.nodes[path[i - 1]], b = W.waypoints.nodes[path[i]];
  assert.ok(game._retaAndavel(a.x, a.z, b.x, b.z, .42, .3), 'Grafo do abrigo contém apenas arestas caminháveis');
}
for (const [from, to] of [[[2.55,-21.5],[0,-21.5]],[[-2.55,-21.5],[0,-21.5]]])
  assert.ok(game._retaAndavel(...from, ...to, .38, .3), 'Abrigo mantém duas entradas independentes');

if (mutant === 'sem-ombreiras' || mutant === 'fundo-aberto') {
  const before = W.occluders.length;
  W.occluders = W.occluders.filter(o => !(o.userData.escadaoMiranteAbrigo &&
    (mutant === 'sem-ombreiras' ? Math.abs(Math.abs(o.position.x)-1.4)<.001 : o.position.z < -23)));
  assert.ok(W.occluders.length < before, 'Mutante deve remover a parede física');
}
W.root.updateMatrixWorld(true);
const windowRay = new THREE.Raycaster(new THREE.Vector3(1.4, W.groundHeightAt(0,-21.5)+1.62, -21.5), new THREE.Vector3(0,0,1), 0, 3);
assert.ok(windowRay.intersectObjects(W.occluders,true).length > 0, 'Janela tem ombreiras na altura do jogador, não fachada toda vazada');
const eye = new THREE.Vector3(0, W.groundHeightAt(0,-21.5) + 1.62, -20.5);
const target = new THREE.Vector3(0, W.groundHeightAt(0,-15) + 1.62, -15);
const ray = new THREE.Raycaster(eye, target.clone().sub(eye).normalize(), 0, eye.distanceTo(target));
assert.equal(ray.intersectObjects(W.occluders, true).length, 0, 'Janela do abrigo lê a descida central');

const eyeFeet = new THREE.Vector3(eye.x, W.groundHeightAt(eye.x,eye.z), eye.z), resolvedEye = eyeFeet.clone();
game._collide(resolvedEye, .42);
assert.ok(resolvedEye.distanceTo(eyeFeet)<1e-6, 'Olho do abrigo deve partir de corpo ocupável');
const targetFeet = new THREE.Vector3(target.x,W.groundHeightAt(target.x,target.z),target.z), resolvedTarget = targetFeet.clone();
game._collide(resolvedTarget,.42);
assert.ok(resolvedTarget.distanceTo(targetFeet)<1e-6, 'Alvo da descida deve caber no mapa');
ray.set(target,eye.clone().sub(target).normalize());ray.far=target.distanceTo(eye);
assert.equal(ray.intersectObjects(W.occluders,true).length,0,'Descida consegue revidar contra a janela');

let spawnRays=0, positions=0;
for(let x=-1.65;x<=1.65;x+=.2) for(let z=-22.63;z<=-20.37;z+=.2) {
  const feet=new THREE.Vector3(x,W.groundHeightAt(x,z),z), resolved=feet.clone();
  game._collide(resolved,.42);
  if(resolved.distanceTo(feet)>1e-6) continue;
  positions++;
  for(const h of [1.05,1.62]) for(const slot of W.spawns.B) for(const targetHeight of [.5,1.05,1.62]) {
    const from=feet.clone().add(new THREE.Vector3(0,h,0));
    const to=new THREE.Vector3(slot.x,W.groundHeightAt(slot.x,slot.z)+targetHeight,slot.z);
    ray.set(from,to.clone().sub(from).normalize());ray.far=from.distanceTo(to);
    assert.ok(ray.intersectObjects(W.occluders,true).length>0,`Abrigo não lê spawn superior: ${x},${z} -> ${slot.x}`);
    spawnRays++;
  }
}
assert.ok(positions>0,'Varredura do abrigo mede posições reais');
for(const from of [W.nearestWaypoint(-4.5,-34),W.nearestWaypoint(4.5,-34)]) {
  const flank=W.findPath(from,interior);
  assert.ok(flank.length>1,'Time superior consegue contestar o abrigo pelo grafo');
  for(let i=1;i<flank.length;i++) {
    const a=W.waypoints.nodes[flank[i-1]],b=W.waypoints.nodes[flank[i]];
    assert.ok(game._retaAndavel(a.x,a.z,b.x,b.z,.42,.3),'Aresta de contestação caminhável');
  }
}
const player=game.player;
player.pos.set(-3,W.groundHeightAt(-3,-21.5),-21.5);player.vel.set(0,0,0);player.grounded=true;player.mantle=null;
let movementFrames=0;
for(const [x,z] of [[0,-21.5],[3,-21.5],[0,-21.5],[-3,-21.5]]) {
  let frames=0;
  while(Math.hypot(x-player.pos.x,z-player.pos.z)>.15 && frames++<300) {
    player.yaw=Math.atan2(player.pos.x-x,player.pos.z-z);game.time+=1/60;
    game._moveEntity(player,{ax:0,az:-1,jump:false,crouch:false,shift:false},1/60);movementFrames++;
  }
  assert.ok(frames<300,`Movimento físico preso na porta: ${x},${z}`);
}
console.log(`Mirante: ${positions} posições, ${spawnRays} raios de spawn bloqueados, ${movementFrames} frames pelas portas`);
if(mutant) throw Error('Mutante escapou das cláusulas');
console.log(`ESCADAO MIRANTE ABRIGO PASS: ${path.length} nós até o interior, janela e duas entradas reais`);

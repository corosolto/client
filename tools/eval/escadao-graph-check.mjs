import assert from 'node:assert/strict';
import { rotasSeparadas } from './rotas-separadas.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const world = game.world, { nodes, adj } = world.waypoints;
const west=[[-12,6.22],[-6,6.22],[-6,8.52],[-1.8,8.52]];
for(let i=1;i<west.length;i++)assert.ok(game._retaAndavel(...west[i-1],...west[i],.38,.3),'Beco oeste tem retorno direto ao patamar');
const out = process.env.OUT || 'artifacts/escadao-visual/main-sync/graph';
mkdirSync(out, { recursive: true });
function measure() {
  const reachable = new Set([0]), queue = [0];
  for (const i of queue) for (const next of adj[i]) if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
  const target = world.nearestWaypoint(-10, 38);
  const routes = Object.values(world.spawns).flat().map(spawn => {
    const from = world.nearestWaypoint(spawn.x, spawn.z), route = world.findPath(from, target);
    return { from, target, route, reaches: route.at(-1) === target };
  });
  return { nodes: nodes.length, reached: reachable.size, isolated: nodes.filter((_, i) => !reachable.has(i)), routes,
    passed: reachable.size === nodes.length && routes.every(r => r.reaches) };
}
const before = measure();
for(const x of [-12,12]) {
  const a=world.nearestWaypoint(x,8.6),b=world.nearestWaypoint(x,7.52);
  assert.ok(adj[a].includes(b)&&adj[b].includes(a),'Chegada dos becos tem ligação nos dois sentidos');
}
const separated=[];
for(const [team,spawns] of Object.entries(world.spawns))for(const point of world.ctfPoints) {
  const count=rotasSeparadas(nodes,adj,world.nearestWaypoint(spawns[0].x,spawns[0].z),world.nearestWaypoint(point.x,point.z)).length;
  separated.push({team,point:point.id,count});
  assert.ok(count>=2,`CTF2 ${team}→${point.id}: ${count} rotas separadas`);
}
writeFileSync(`${out}/separated-routes.json`,JSON.stringify(separated,null,2));
if (process.argv.includes('--mutante=parede')) {
  const a=world.nearestWaypoint(-16,-4),b=world.nearestWaypoint(-12.6,-4);
  assert.notEqual(a,b);adj[a].push(b);
}
const impossible=[];
for(let i=0;i<nodes.length;i++)for(const j of adj[i]) {
  const a=nodes[i],b=nodes[j];
  if(!game._retaAndavel(a.x,a.z,b.x,b.z,.38,.3))impossible.push({from:a,to:b});
}
writeFileSync(`${out}/physical-edges.json`,JSON.stringify({edges:adj.flat().length,impossible},null,2));
assert.equal(impossible.length,0,'Todas as arestas do grafo precisam caber no corpo e limite de passo reais');
writeFileSync(`${out}/graph.json`, JSON.stringify(before, null, 2));
assert.ok(before.passed, 'Grafo precisa conectar todos os nós e a Deagle a todos os spawns');
const objectives=world.ctfPoints.map(point=>{
  const feet=new THREE.Vector3(point.x,world.groundHeightAt(point.x,point.z),point.z),corrected=feet.clone();game._collide(corrected,.38);
  const target=world.nearestWaypoint(point.x,point.z),node=nodes[target],radius=game.ctfPts.find(p=>p.id===point.id).r;
  assert.ok(Math.hypot(node.x-point.x,node.z-point.z)<radius,`CTF ${point.id} tem destino dentro da zona`);
  const arrival=new THREE.Vector3(node.x,world.groundHeightAt(node.x,node.z),node.z),resolved=arrival.clone();game._collide(resolved,.38);
  assert.ok(arrival.distanceTo(resolved)<.001,`Destino CTF ${point.id} cabe no corpo`);
  if(point.id==='E') {
    assert.ok(feet.distanceTo(corrected)<.001,'Centro do novo piso PATAMAR 2 não pode ficar enterrado');
    assert.ok(game._retaAndavel(node.x,node.z,point.x,point.z,.38,.3),'Ligação física ao centro PATAMAR 2');
  }
  for(const spawn of Object.values(world.spawns).flat())assert.equal(world.findPath(world.nearestWaypoint(spawn.x,spawn.z),target).at(-1),target);
  return {id:point.id,feet:feet.toArray(),target,radius};
});
writeFileSync(`${out}/objectives.json`,JSON.stringify(objectives,null,2));
const p=game.player,patamar=objectives.find(p=>p.id==='E').feet;
if(process.argv.includes('--mutante=sem-guarda-p2'))world.colliders=world.colliders.filter(c=>!(Math.abs(c.minY-patamar[1])<.001&&Math.abs(c.maxZ-3.04)<.001&&c.minX<-10&&c.maxX>-2));
p.pos.fromArray(patamar);p.vel.set(0,0,0);p.grounded=true;p.yaw=Math.PI;p.crouchF=0;p.mantle=null;p.jumpBufferedUntil=0;
for(let i=0;i<180;i++){game.time+=1/60;game._moveEntity(p,{ax:0,az:-1,jump:false,crouch:false,shift:false},1/60);}
assert.ok(p.pos.y>=patamar[1]-.01&&p.pos.z<3,'Guarda impede caminhada cair no bolsão sem saída do PATAMAR 2');
if (process.argv.includes('--mutante=sem-conexao-rua')) {
  const removed = new Set(nodes.flatMap((n, i) => Math.abs(n.x + 8.5) < 1e-6 && n.z >= 26 && n.z <= 38 ? [i] : []));
  assert.ok(removed.size > 0, 'Mutação precisa remover conexão existente');
  for (let i = 0; i < adj.length; i++) adj[i] = removed.has(i) ? [] : adj[i].filter(j => !removed.has(j));
  const after = measure();
  writeFileSync(`${out}/mutation.json`, JSON.stringify({ removed: removed.size, after }, null, 2));
  assert.ok(!after.passed && after.routes.some(r => !r.reaches), 'Mutação deve isolar a Deagle');
  console.log('GRAPH PASS: mutação detectada na rota para a Deagle');
} else console.log(`GRAPH PASS: ${before.reached}/${before.nodes} nós, ${before.routes.length} rotas para Deagle`);

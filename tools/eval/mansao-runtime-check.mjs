// Contrato de Joá no Game real: corpo, camadas, rotas CTF e assets com origem.
// Raio .38 e altura 1.5/.3 vêm de Game._collide; tolerância só cobre ponto flutuante.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { resolveMapId, ALIAS_MAPA } from '../../public/js/maps.js';
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
assert.equal(resolveMapId(Object.keys(ALIAS_MAPA).find(id => ALIAS_MAPA[id] === 'mansao')), 'mansao');
assert.equal(MAPS.mansao?.build.name, 'buildMansao');
const g = bootGame('mansao', { ctf: true, bots: 0, textures: initTextures(), seed: 14000 });
const w = g.world, { nodes, adj } = w.waypoints;
if (mutant === 'spawn-solido') w.spawns.E[0] = { x: 4, z: 0, yaw: 0 };
else if (mutant === 'grafo-partido') adj.forEach(a => a.splice(0));
else if (mutant === 'camada') w.groundHeightAt = () => 4.5;
else if (mutant && !['parede-ausente','teto-baixo'].includes(mutant)) throw Error(`mutante desconhecido: ${mutant}`);
const failures = [], occupied = [], edges = [];
const free = (p) => {
  const q = new THREE.Vector3(p.x, p.y, p.z); g._collide(q, .38);
  return Math.hypot(q.x - p.x, q.z - p.z) < 1e-3;
};
for (const [team, points] of Object.entries(w.spawns)) for (const p of points) {
  if (!free({ ...p, y: w.groundHeightAt(p.x, p.z, 0) })) failures.push(`spawn ${team} ${p.x},${p.z} ocupado`);
}
for (let i = 0; i < nodes.length; i++) if (!free(nodes[i])) occupied.push(i);
for (let i = 0; i < nodes.length; i++) for (const j of adj[i]) {
  if (j < i) continue;
  const a = nodes[i], b = nodes[j], n = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
  for (let k = 0; k <= n; k++) {
    const t = k/n, x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t;
    if (!free({x,z,y:w.groundHeightAt(x,z,a.y+(b.y-a.y)*t)})) {edges.push([i,j]);break;}
  }
}
if (occupied.length) failures.push(`${occupied.length} nós em sólido`);
if (edges.length) failures.push(`${edges.length} arestas atravessam sólido`);
assert.equal(w.groundHeightAt(8,-11,0),0,'hall térreo');
assert.equal(w.groundHeightAt(8,-11,4.5),4.5,'mezanino');
assert.equal(w.botLayeredNavigation,true);
const anchors = [...Object.values(w.spawns).flat().map(p=>({...p,y:0})), ...w.ctfPoints.map(p=>({...p,y:w.groundHeightAt(p.x,p.z)}))];
for (const p of anchors) {
  if (!free(p)) failures.push(`âncora ${p.id||'spawn'} ocupada`);
  const start = w.nearestWaypoint(p.x,p.z,p.y);
  for (const q of anchors) {
    const end=w.nearestWaypoint(q.x,q.z,q.y),route=w.findPath(start,end);
    if (route.at(-1)!==end) failures.push(`rota ${start}->${end} ausente`);
  }
}
for (const a of JSON.parse(fs.readFileSync('docs/maps/MANSAO-RECOVERY-ASSETS.json')).assets) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(a.path)).digest('hex'),a.sha256,a.path);
}
const ray=new THREE.Raycaster();
const shoot=(pos,dir,far)=>{ray.set(new THREE.Vector3(...pos),new THREE.Vector3(...dir));ray.far=far;return ray.intersectObjects(w.occluders,false);};
if(mutant==='parede-ausente') {
 const hit=shoot([-10,1.5,9],[0,0,-1],2)[0];assert(hit,'mutante não aplicou');
 w.occluders.splice(w.occluders.indexOf(hit.object),1);
}
for(const x of [-10,10])for(const [z,dz] of [[9,-1],[-16,1]])assert(shoot([x,1.5,z],[0,0,dz],2).length,'parede exterior ausente');
const ceiling=shoot([8,6.15,-11],[0,1,0],5)[0];assert(ceiling);
if(mutant==='teto-baixo'){ceiling.object.position.y-=1.52;g.scene.updateMatrixWorld(true);}
// Olho 1.62 + ápice de pulo v=5/g=20.6 + folga .10 (Game._moveEntity/_updatePlayer).
assert(shoot([8,6.15,-11],[0,1,0],5)[0].distance>1.62+25/41.2+.1,'teto invade olho durante pulo');
const result={ok:!failures.length,nodes:nodes.length,edges:adj.reduce((n,a)=>n+a.length,0),occupied,blockedEdges:edges,failures};
fs.mkdirSync('artifacts/joa-recuperacao',{recursive:true});
fs.writeFileSync(`artifacts/joa-recuperacao/runtime${mutant?'-'+mutant:''}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,occupied:occupied.slice(0,8),blockedEdges:edges.slice(0,8),failures:failures.slice(0,12)}));
process.exitCode=result.ok?0:1;

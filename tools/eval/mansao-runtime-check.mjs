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
else if (mutant === 'spawn-invertido') for (const spawn of Object.values(w.spawns).flat()) spawn.yaw += Math.PI;
else if (mutant === 'sem-suporte-cobertura') w.root.traverse((object) => { if (object.userData?.mansaoFeature === 'cobertura-suporte') object.visible = false; });
else if (mutant === 'poste-no-spawn') w.colliders.push({ minX: 2.12, maxX: 2.48, minY: 0, maxY: 2.4, minZ: 32.42, maxZ: 32.78 });
else if (mutant === 'sem-flanco-leste') {
  const flanco = new Set(nodes.map((node, i) => node.x >= 19.5 && node.z >= -18.1 && node.z <= 14.1 ? i : -1).filter(i => i >= 0));
  for (let i = 0; i < adj.length; i++) adj[i] = adj[i].filter(j => !flanco.has(i) && !flanco.has(j));
}
else if (mutant && !['parede-ausente','teto-baixo'].includes(mutant)) throw Error(`mutante desconhecido: ${mutant}`);
const failures = [], occupied = [], edges = [];
const free = (p) => {
  const q = new THREE.Vector3(p.x, p.y, p.z); g._collide(q, .38);
  return Math.hypot(q.x - p.x, q.z - p.z) < 1e-3;
};
for (const [team, points] of Object.entries(w.spawns)) for (const p of points) {
  if (!free({ ...p, y: w.groundHeightAt(p.x, p.z, 0) })) failures.push(`spawn ${team} ${p.x},${p.z} ocupado`);
  const yawJogador = g._spawnYaw(p, team, false), yawBot = g._spawnYaw(p, team, true);
  const cx = -p.x, cz = -p.z, clen = Math.hypot(cx, cz) || 1;
  const frenteJogador = (-Math.sin(yawJogador) * cx - Math.cos(yawJogador) * cz) / clen;
  const frenteBot = (Math.sin(yawBot) * cx + Math.cos(yawBot) * cz) / clen;
  if (frenteJogador < .7 || frenteBot < .7) failures.push(`spawn ${team} ${p.x},${p.z} olha para fora (jogador ${frenteJogador.toFixed(2)}, bot ${frenteBot.toFixed(2)})`);
}
// MAP2B causal: cada slot precisa permitir uma esquiva além do raio do corpo. O poste
// do jardim em (2,3;32,6) deixava o slot E(1,5;32) com só 0,8 m, embora o ponto exato
// ainda passasse no teste binário de ocupação acima.
const spawnClearance = [];
for (const [team, points] of Object.entries(w.spawns)) for (const p of points) {
  const y0 = w.groundHeightAt(p.x, p.z, 0);
  let clearance = Infinity;
  for (let a = 0; a < 64; a++) {
    const angle = a / 64 * Math.PI * 2, dx = Math.cos(angle), dz = Math.sin(angle);
    let distance = 0;
    for (; distance < 12; distance += .05) {
      const x = p.x + dx * distance, z = p.z + dz * distance;
      let hit = Math.abs(w.groundHeightAt(x, z, y0) - y0) > .3;
      if (!hit) for (const c of w.colliders) {
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY < y0 + 1.5 && c.maxY > y0 + .3) { hit = true; break; }
      }
      if (hit) break;
    }
    clearance = Math.min(clearance, distance);
  }
  spawnClearance.push({ team, x: p.x, z: p.z, clearance: +clearance.toFixed(2) });
  if (clearance < 1.2) failures.push(`spawn ${team} ${p.x},${p.z} sem folga lateral: ${clearance.toFixed(2)} m`);
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
let suportesCobertura = 0;
w.root.traverse((object) => { if (object.visible && object.userData?.mansaoFeature === 'cobertura-suporte') suportesCobertura++; });
if (suportesCobertura < 4) failures.push(`cobertura do mezanino sem apoios: ${suportesCobertura}/4`);
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
// CTF2 causal: duas escadas só contam como alternativas quando o trajeto completo do
// jardim ao mezanino preserva um miolo separado por 6 m. O eixo externo em x=20 evita
// que as duas opções voltem a convergir na entrada oeste da casa.
const separatedRoutes = (from, to) => {
  const shortest = (blocked) => {
    const dist = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), seen = new Uint8Array(nodes.length);
    if (blocked[from] || blocked[to]) return null;
    dist[from] = 0;
    for (;;) {
      let cur = -1, best = Infinity;
      for (let i = 0; i < nodes.length; i++) if (!seen[i] && dist[i] < best) { best = dist[i]; cur = i; }
      if (cur < 0 || cur === to) break;
      seen[cur] = 1;
      for (const next of adj[cur]) {
        if (blocked[next]) continue;
        const candidate = dist[cur] + Math.hypot(nodes[cur].x - nodes[next].x, nodes[cur].z - nodes[next].z);
        if (candidate < dist[next]) { dist[next] = candidate; prev[next] = cur; }
      }
    }
    if (!Number.isFinite(dist[to])) return null;
    const route = [to]; for (let cursor = prev[to]; cursor >= 0; cursor = prev[cursor]) route.unshift(cursor);
    return route;
  };
  const blocked = new Uint8Array(nodes.length), routes = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const route = shortest(blocked); if (!route) break; routes.push(route);
    const start = nodes[from], end = nodes[to];
    for (let i = 0; i < nodes.length; i++) {
      if (i === from || i === to) continue;
      if (Math.hypot(nodes[i].x - start.x, nodes[i].z - start.z) <= 9.4) continue;
      if (Math.hypot(nodes[i].x - end.x, nodes[i].z - end.z) <= 9.4) continue;
      if (route.some(j => Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z) <= 6)) blocked[i] = 1;
    }
  }
  return routes.length;
};
const ctfMezzo = w.ctfPoints.find(point => point.id === 'P');
assert(ctfMezzo, 'bandeira MEZZO ausente');
const routeCount = separatedRoutes(w.nearestWaypoint(w.spawns.E[0].x, w.spawns.E[0].z), w.nearestWaypoint(ctfMezzo.x, ctfMezzo.z));
if (routeCount < 2) failures.push(`jardim→MEZZO converge: ${routeCount}/2 rotas separadas`);
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
const result={ok:!failures.length,nodes:nodes.length,edges:adj.reduce((n,a)=>n+a.length,0),spawnClearance,routeCount,occupied,blockedEdges:edges,failures};
fs.mkdirSync('artifacts/joa-recuperacao',{recursive:true});
fs.writeFileSync(`artifacts/joa-recuperacao/runtime${mutant?'-'+mutant:''}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,occupied:occupied.slice(0,8),blockedEdges:edges.slice(0,8),failures:failures.slice(0,12)}));
process.exitCode=result.ok?0:1;

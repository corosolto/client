/* V4: spawns e percurso principal no chão, três rotas simples e quatro escadas
   retas. Aposentadoria explícita de LS1–5 roof-first: LAJES-V4-CONTRATOS-PLANO.md.
   Mede Game, colisão e apoio; LS6 conserva integralmente o pulo local. */
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'spawn-alto', 'rota-unica', 'rota-bloqueada', 'escada-bloqueada', 'pulo-global']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const textures = initTextures();
const game = bootGame('lajes', { textures, bots: 0, seed: 16082026 });
const W = game.world;
const { nodes = [], adj = [] } = W.waypoints || {};

const livre = (x, z, y) => {
  const p = new THREE.Vector3(x, y, z);
  game._collide(p, 0.38);
  return Math.hypot(p.x - x, p.z - z) < 1e-3;
};

if(mutante==='spawn-alto') {
  const n=nodes.find(n=>n.y>1&&livre(n.x,n.z,n.y));
  if(!n)throw Error('MUTANTE NÃO APLICOU: laje livre ausente');
  for(const spawn of W.spawns.E){spawn.x=n.x;spawn.z=n.z;}
}

const spawnY = Object.fromEntries(Object.entries(W.spawns || {}).map(([time, lista]) => [time,
  lista.map((s) => game._spawnY(s.x, s.z))]));

const nearest = (spawn, onlyGround = false) => {
  const sy = game._spawnY(spawn.x, spawn.z);
  let best = -1, dist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    if (onlyGround && Math.abs(nodes[i].y)>1e-3) continue;
    const d = Math.hypot(nodes[i].x - spawn.x, nodes[i].z - spawn.z, nodes[i].y - sy);
    if (d < dist) { best = i; dist = d; }
  }
  return { index: best, dist };
};

const startSpawn = W.spawns.E?.[0], endSpawn = W.spawns.B?.[0];
const start = startSpawn ? nearest(startSpawn).index : -1;
const end = endSpawn ? nearest(endSpawn).index : -1;
const groundStart = startSpawn ? nearest(startSpawn, true) : { index: -1, dist: Infinity };
const groundEnd = endSpawn ? nearest(endSpawn, true) : { index: -1, dist: Infinity };

if (mutante === 'rota-unica' && groundStart.index >= 0) {
  const vizinhos = adj[groundStart.index].filter((n) => Math.abs(nodes[n]?.y)<1e-3);
  if (vizinhos.length < 2) throw new Error('mutante rota-unica não encontrou duas saídas para cortar');
  for (const vizinho of vizinhos.slice(1)) {
    adj[groundStart.index] = adj[groundStart.index].filter((n) => n !== vizinho);
    adj[vizinho] = adj[vizinho].filter((n) => n !== groundStart.index);
  }
}

function shortestPath(a, b) {
  if (a < 0 || b < 0) return [];
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const used = new Uint8Array(nodes.length);
  dist[a] = 0;
  for (;;) {
    let cur = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!used[i] && dist[i] < best) { cur = i; best = dist[i]; }
    if (cur < 0 || cur === b) break;
    used[cur] = 1;
    for (const next of adj[cur] || []) {
      const A = nodes[cur], B = nodes[next];
      const d = Math.hypot(B.x - A.x, B.z - A.z, B.y - A.y);
      if (dist[cur] + d < dist[next]) { dist[next] = dist[cur] + d; prev[next] = cur; }
    }
  }
  if (!Number.isFinite(dist[b])) return [];
  const path = [b];
  for (let cur = prev[b]; cur >= 0; cur = prev[cur]) path.unshift(cur);
  return path;
}

function groundNodeDisjointRoutes(source, sink) {
  if (source < 0 || sink < 0) return 0;
  const high = new Set(nodes.map((n, i) => Math.abs(n.y)<1e-3 ? i : -1).filter((i) => i >= 0));
  if (!high.has(source) || !high.has(sink)) return 0;
  const N = nodes.length * 2;
  const cap = Array.from({ length: N }, () => new Int8Array(N));
  for (const i of high) cap[i * 2][i * 2 + 1] = (i === source || i === sink) ? 2 : 1;
  for (const i of high) for (const j of adj[i] || []) if (high.has(j)) cap[i * 2 + 1][j * 2] = 2;
  const s = source * 2 + 1, t = sink * 2;
  let flow = 0;
  while (flow < 2) {
    const prev = new Int32Array(N).fill(-1), q = [s]; prev[s] = s;
    for (let h = 0; h < q.length && prev[t] < 0; h++) {
      const u = q[h];
      for (let v = 0; v < N; v++) if (prev[v] < 0 && cap[u][v] > 0) { prev[v] = u; q.push(v); }
    }
    if (prev[t] < 0) break;
    for (let v = t; v !== s; v = prev[v]) { cap[prev[v]][v]--; cap[v][prev[v]]++; }
    flow++;
  }
  return flow;
}

const path = shortestPath(start, end);
let total = 0, groundLength = 0;
for (let i = 1; i < path.length; i++) {
  const A = nodes[path[i - 1]], B = nodes[path[i]];
  const d = Math.hypot(B.x - A.x, B.z - A.z, B.y - A.y);
  total += d;
  if (Math.abs(A.y)<1e-3 && Math.abs(B.y)<1e-3) groundLength += d;
}
const groundShare = total ? groundLength / total : 0;

if(mutante==='rota-bloqueada') {
  const r=W.design.routes.find(r=>r.name==='beco-oeste');
  if(!r)throw Error('MUTANTE NÃO APLICOU: rota oeste ausente');
  W.colliders.push({minX:-16,maxX:-14,minZ:-.3,maxZ:.3,minY:0,maxY:2});
}
const routeEvidence=W.design.routes.map(r=>{
  const blocked=[];
  for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],b=r.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.19));
    for(let k=0;k<=steps;k++){
      const t=k/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      if(!livre(x,z,0)||Math.abs(W.groundHeightAt(x,z,0))>1e-3){blocked.push({x,z});break;}
    }
  }
  return {name:r.name,blocked};
});
const probeWall=(x,z,y,sign)=>{
  for(let d=.025;d<=3;d+=.025)if(!livre(x+d*sign,z,y))return d;
  return 3;
};
if(mutante==='escada-bloqueada'){
  const s=W.design.stairs[0],z=s.z+s.dirZ*s.run/2;
  if(!s)throw Error('MUTANTE NÃO APLICOU: escada ausente');
  W.colliders.push({minX:s.x-s.width/2,maxX:s.x+s.width/2,minZ:z-.3,maxZ:z+.3,minY:s.height/2,maxY:s.height+1.5});
}
const stairEvidence=W.design.stairs.map(s=>{
  let supported=true,bodyFree=true;const heights=[];
  for(let i=0;i<s.steps;i++){
    const z=s.z+s.dirZ*(i+.5)*s.run/s.steps,y=W.groundHeightAt(s.x,z,100);
    heights.push(y);if(Math.abs(y-(i+1)*s.height/s.steps)>1e-3)supported=false;
    if(!livre(s.x,z,y))bodyFree=false;
  }
  const z=s.z+s.dirZ*(Math.floor(s.steps/2)+.5)*s.run/s.steps,y=W.groundHeightAt(s.x,z,100);
  const width=probeWall(s.x,z,y,-1)+probeWall(s.x,z,y,1)+.76;
  return {name:s.name,width,steps:heights.length,supported,bodyFree};
});

function jumpApex(g) {
  const p = g.player, spawn = g.world.spawns.E[0];
  p.pos.set(spawn.x, g.world.groundHeightAt(spawn.x, spawn.z, 100), spawn.z);
  const floor = p.pos.y;
  p.vel.set(0, 0, 0); p.grounded = true; p.alive = true; p.mantle = null;
  p.coyoteUntil = g.time + 0.09; p.jumpBufferedUntil = 0; g._spaceHeld = false;
  const oldKeys = g.keys; g.keys = { Space: true };
  let apex = floor;
  for (let i = 0; i < 120; i++) {
    if (i === 1) g.keys.Space = false;
    g.time += 1 / 120;
    g._updatePlayer(1 / 120);
    apex = Math.max(apex, p.pos.y);
  }
  g.keys = oldKeys;
  return apex - floor;
}

const control = bootGame('praca_poderes', { textures, bots: 0, seed: 16082026 });
if (mutante === 'pulo-global') {
  if (!(W.jumpImpulse > 5)) throw new Error('mutante pulo-global sem impulso local para copiar');
  control.world.jumpImpulse = W.jumpImpulse;
}
const lajesApex = jumpApex(game), controlApex = jumpApex(control);

const groundRoutes = groundNodeDisjointRoutes(groundStart.index, groundEnd.index);
const stairsOk=stairEvidence.length===4&&stairEvidence.every(s=>s.steps===18&&s.width>=2.2&&s.supported&&s.bodyFree);
const checks = [
  ['LS1','os dois times nascem no chão',Object.keys(spawnY).length===2&&Object.values(spawnY).flat().length===8&&Object.values(spawnY).flat().every(y=>Math.abs(y)<1e-3),JSON.stringify(spawnY)],
  ['LS2','duas rotas térreas independentes ligam os spawns',groundRoutes>=2&&groundStart.dist<=3&&groundEnd.dist<=3,`${groundRoutes}/2 rotas · encaixe ${groundStart.dist.toFixed(2)}/${groundEnd.dist.toFixed(2)}m`],
  ['LS3','travessia curta pelo térreo',groundShare>=.70,`${(groundShare*100).toFixed(1)}% de ${total.toFixed(1)}m no chão`],
  ['LS4','três percursos autorados apoiados e livres para o corpo',routeEvidence.length===3&&routeEvidence.every(r=>!r.blocked.length),JSON.stringify(routeEvidence)],
  ['LS5','quatro escadas retas com pisos apoiados e largura útil≥2,2m',stairsOk,JSON.stringify(stairEvidence)],
  ['LS6','pulo maior existe só em Lajes',lajesApex>=.75&&lajesApex<=.90&&controlApex>=.58&&controlApex<=.64,`Lajes ${lajesApex.toFixed(3)}m · controle ${controlApex.toFixed(3)}m`],
];
let falhas = 0;
for (const [id, desc, ok, evidence] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${evidence}`);
}
if (falhas) { console.error(`LAJES-SPATIAL FALHA: ${falhas}/${checks.length}`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-SPATIAL OK');

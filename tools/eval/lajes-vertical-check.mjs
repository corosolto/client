/* V4: circuito térreo principal, acesso a todas as quatro lajes, praça com
   cover e visadas das suas bordas. LV1/2 roof-first aposentadas explicitamente
   em LAJES-V4-CONTRATOS-PLANO.md; LV3–6 conservam seus limiares físicos. */
import { THREE, bootGame, initTextures } from './harness.mjs';
import { rotasSeparadas, caminhoBloqueado, RAIO_PONTA } from './rotas-separadas.mjs';
import { QUAD_ESPAC } from './limiares-mapa.mjs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'so-por-cima', 'sem-acesso-alto', 'terreo-partido', 'praca-cheia', 'laje-cega', 'aresta-fantasma']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 25082026 });
const W = game.world;

const Y_TERREO = .06;          // chão puro; degraus são acesso vertical
const FATOR_DETOUR = 1.5;      // térreo não custa mais que 1,5× a rota irrestrita
void RAIO_PONTA;
const PRACA_AREA = 90;          // m² mínimos da sala livre do meio
const PRACA_LARG = 7.0;         // m de largura útil mínima nos dois eixos
/* Raio do disco que define "sala" e não "corredor". O beco mais largo do mapa tem 1,76 m
   (addAlleySegment, width 1,76/1,62), meia-largura 0,88 — nenhuma célula de beco cabe num
   disco de 1,20 m, com folga. Acima disso (1,9 m) a régua passava a reprovar praça MOBILIADA,
   que é o que ela deveria premiar: dois bancos a 2,5 m um do outro quebravam a sala inteira. */
const R_SALA = 1.20;
const PRACA_RAIO = 9.0;         // m: distância máxima do centro da praça ao meio do mapa
const PRACA_COVER = 6;          // peças de cobertura mínimas dentro da praça
const VISADA_MIN = 0.55;        // fração mínima de amostras do miolo visíveis das bordas

if (mutante === 'so-por-cima' || mutante === 'sem-acesso-alto') {
  // Corta as ligações reais entre térreo e escadas; LV2 deve reprovar.
  let cortados = 0;
  for (let a = 0; a < W.waypoints.nodes.length; a++) {
    if (W.waypoints.nodes[a].y >= .06) continue;
    for (const b of [...W.waypoints.adj[a]]) {
      if (W.waypoints.nodes[b].y < .06) continue;
      W.waypoints.adj[a] = W.waypoints.adj[a].filter((i) => i !== b);
      W.waypoints.adj[b] = W.waypoints.adj[b].filter((i) => i !== a);
      cortados++;
    }
  }
  if (!cortados) throw new Error('MUTANTE NÃO APLICOU: o térreo já não sobe — o defeito já está posto');
}
if(mutante==='terreo-partido'){
  let cut=0;const {nodes,adj}=W.waypoints;
  for(let a=0;a<nodes.length;a++)for(const b of [...adj[a]])if(b>a&&nodes[a].y<Y_TERREO&&nodes[b].y<Y_TERREO&&nodes[a].z*nodes[b].z<=0){
    adj[a]=adj[a].filter(i=>i!==b);adj[b]=adj[b].filter(i=>i!==a);cut++;
  }
  if(!cut)throw Error('MUTANTE NÃO APLICOU: nenhuma ligação térrea cortada');
}
if (mutante === 'praca-cheia') {
  for (let x = -7; x <= 7; x += 1.2) for (let z = -8; z <= 9; z += 1.2)
    W.colliders.push({ minX: x - .55, maxX: x + .55, minY: 0, maxY: 3, minZ: z - .55, maxZ: z + .55 });
}
if (mutante === 'laje-cega') {
  const before=W.colliders.length;
  for(const p of W.design.platforms){const x=p.x0>0?p.x0:p.x1;
    W.colliders.push({minX:x-.15,maxX:x+.15,minY:p.y,maxY:p.y+2.4,minZ:p.z0,maxZ:p.z1});}
  if(W.colliders.length===before)throw Error('MUTANTE NÃO APLICOU');
}

if (mutante === 'aresta-fantasma') {
  /* Liga dois nós de térreo separados por um muro de beco. É o defeito que o vaoLivre do
     map_lajes_authored corrigiu: a aresta era aceita testando SÓ o ponto médio, então com nós
     a 2,0 m e muro de 0,26 m o médio caía fora da parede e o grafo jurava passagem. */
  const N = W.waypoints.nodes;
  let ligou = 0;
  for (let a = 0; a < N.length && !ligou; a++) {
    if (N[a].y >= 1.6) continue;
    for (let b = 0; b < N.length; b++) {
      if (b === a || N[b].y >= 1.6) continue;
      const d = Math.hypot(N[b].x - N[a].x, N[b].z - N[a].z);
      if (d < 1.5 || d > 3.5) continue;
      if (W.waypoints.adj[a].includes(b)) continue;
      /* As DUAS pontas têm que ser andáveis e o MEIO bloqueado — é a assinatura exata do
         defeito. Primeira versão só exigia o meio bloqueado, pegava par com ponta dentro de
         sólido, e a LV6 (que pula ponta em sólido, isso é a LC5) não mordia: o mutante
         sobreviveu parecendo que a régua não servia. */
      const solido = (x, z) => {
        const p = new THREE.Vector3(x, 0, z); game._collide(p, .38);
        return Math.hypot(p.x - x, p.z - z) >= 1e-3;
      };
      if (solido(N[a].x, N[a].z) || solido(N[b].x, N[b].z)) continue;
      if (!solido((N[a].x + N[b].x) / 2, (N[a].z + N[b].z) / 2)) continue;
      W.waypoints.adj[a].push(b); W.waypoints.adj[b].push(a); ligou = 1; break;
    }
  }
  if (!ligou) throw new Error('MUTANTE NÃO APLICOU: não achei par de nós de térreo separados por sólido');
}

/* LV1: desde os spawns no chão; LV2: cada plataforma continua acessível. */
const {nodes,adj}=W.waypoints;
const comprimento=cam=>cam.slice(1).reduce((sum,id,i)=>sum+Math.hypot(nodes[id].x-nodes[cam[i]].x,nodes[id].z-nodes[cam[i]].z),0);
const groundBlocked=Uint8Array.from(nodes,n=>n.y>=Y_TERREO?1:0);
const a=W.spawns.E[0],b=W.spawns.B[0],from=W.nearestWaypoint(a.x,a.z,0),to=W.nearestWaypoint(b.x,b.z,0);
const direct=W.findPath(from,to),ground=caminhoBloqueado(nodes,adj,from,to,groundBlocked);
const ratio=ground&&direct.length>1?comprimento(ground)/comprimento(direct):Infinity;
const lv1=!!ground&&ground.length>1&&ratio<=FATOR_DETOUR;
const pares=[`spawn→spawn térreo ${ground?comprimento(ground).toFixed(1):'ausente'}m, ${ratio.toFixed(2)}× rota irrestrita`];
const falhouTerrea=lv1?[]:pares;
const falhouSuperior=[];
for(const p of W.design.platforms){
  const target=W.nearestWaypoint((p.x0+p.x1)/2,(p.z0+p.z1)/2,p.y),route=W.findPath(from,target);
  if(route.length<2||Math.abs(nodes[target].y-p.y)>.001||!W.findPath(target,from).length)falhouSuperior.push(p.name);
}
const lv2=W.design.platforms.length===4&&!falhouSuperior.length;
void rotasSeparadas;

/* ===================== LV3 / LV4 — a praça ===================== */
const B = W.bounds, STEP = 0.30;
const nx = Math.ceil((B.maxX - B.minX) / STEP), nz = Math.ceil((B.maxZ - B.minZ) / STEP);
const p3 = new THREE.Vector3();
const livreEm = (x, z) => {
  if (W.groundHeightAt(x, z, 0) > 0.55) return false;
  p3.set(x, 0, z); game._collide(p3, 0.38);
  return Math.abs(p3.x - x) < 1e-3 && Math.abs(p3.z - z) < 1e-3;
};
/* Sala do miolo: flood restrito à janela central do mapa e SEM tocar os becos estreitos —
   uma praça é uma sala, e um corredor de 1,8 m que atravessa o mapa não é praça. O flood
   só entra em célula cujo disco de R_SALA de raio esteja livre (o "miolo largo"). */
const JAN = { ...W.praca };
const jx = Math.ceil((JAN.x1 - JAN.x0) / STEP), jz = Math.ceil((JAN.z1 - JAN.z0) / STEP);
const cel = (i, k) => [JAN.x0 + (i + .5) * STEP, JAN.z0 + (k + .5) * STEP];
const livreCache = new Uint8Array(jx * jz);
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  const [x, z] = cel(i, k);
  if (livreEm(x, z)) livreCache[i * jz + k] = 1;
}
/* Miolo LARGO: célula cujo disco de R_SALA está livre. É o que separa sala de corredor. */
const largo = new Uint8Array(jx * jz);
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  if (!livreCache[i * jz + k]) continue;
  const [x, z] = cel(i, k);
  let ok = true;
  for (let a = 0; a < 12 && ok; a++) {
    const ang = a * Math.PI / 6;
    if (!livreEm(x + Math.cos(ang) * R_SALA, z + Math.sin(ang) * R_SALA)) ok = false;
  }
  if (ok) largo[i * jz + k] = 1;
}
const comp = new Int32Array(jx * jz).fill(-1);
const salas = [];
for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
  if (!largo[i * jz + k] || comp[i * jz + k] >= 0) continue;
  const cid = salas.length, fila = [i * jz + k]; comp[i * jz + k] = cid;
  for (let h = 0; h < fila.length; h++) {
    const c = fila[h], ci = (c / jz) | 0, ck = c % jz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= jx || l < 0 || l >= jz) continue;
      const d = j * jz + l;
      if (largo[d] && comp[d] < 0) { comp[d] = cid; fila.push(d); }
    }
  }
  salas.push({ cid, cel: fila });
}
/* A sala real = as células LIVRES a até R_SALA do miolo largo (dilatação exata). A célula do
   flood é o CENTRO de um disco que cabe, então sem dilatar a praça mediria só o esqueleto. */
salas.sort((a, b) => b.cel.length - a.cel.length);
const sala = salas[0] || null;
let praca = null;
if (sala) {
  const raioCel = Math.ceil(R_SALA / STEP);
  const dil = new Uint8Array(jx * jz);
  for (const c of sala.cel) {
    const ci = (c / jz) | 0, ck = c % jz;
    for (let di = -raioCel; di <= raioCel; di++) for (let dk = -raioCel; dk <= raioCel; dk++) {
      if (Math.hypot(di, dk) * STEP > R_SALA) continue;
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= jx || l < 0 || l >= jz) continue;
      if (livreCache[j * jz + l]) dil[j * jz + l] = 1;
    }
  }
  let n = 0, minI = jx, maxI = -1, minK = jz, maxK = -1;
  for (let i = 0; i < jx; i++) for (let k = 0; k < jz; k++) {
    if (!dil[i * jz + k]) continue;
    n++; minI = Math.min(minI, i); maxI = Math.max(maxI, i); minK = Math.min(minK, k); maxK = Math.max(maxK, k);
  }
  praca = { area: n * STEP * STEP,
    largX: (maxI - minI + 1) * STEP, largZ: (maxK - minK + 1) * STEP,
    cx: JAN.x0 + (minI + maxI + 1) / 2 * STEP, cz: JAN.z0 + (minK + maxK + 1) / 2 * STEP };
}
const lv3 = !!praca && praca.area >= PRACA_AREA && praca.largX >= PRACA_LARG && praca.largZ >= PRACA_LARG
  && Math.hypot(praca.cx, praca.cz) <= PRACA_RAIO;

/* Cover: colisor de peça (não parede, não laje) com o topo entre 0,4 e 2,2 m dentro da praça. */
const dentroPraca = (x, z) => praca && Math.abs(x - praca.cx) <= praca.largX / 2 && Math.abs(z - praca.cz) <= praca.largZ / 2;
const covers = (W.colliders || []).filter((c) => {
  const alt = c.maxY - c.minY;
  if (c.minY > 0.3 || alt < 0.4 || alt > 2.2) return false;
  const larg = Math.max(c.maxX - c.minX, c.maxZ - c.minZ);
  if (larg > 4.5) return false;                      // parede corrida não é cover de praça
  return dentroPraca((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2);
});
const areaPraca = praca ? praca.largX * praca.largZ : 0;
const espacCover = covers.length ? Math.sqrt(areaPraca / covers.length) : Infinity;
const lv4 = covers.length >= PRACA_COVER && espacCover <= QUAD_ESPAC;

/* ===================== LV5 — becos visíveis de cima ===================== */
/* Ray-march contra os COLLIDERS (idênticos nos dois mundos — ver LIMITE CONHECIDO). */
const cols = W.colliders || [];
const visivel = (ax, ay, az, bx, by, bz) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  const passos = Math.ceil(len / 0.25);
  for (let s = 1; s < passos; s++) {
    const t = s / passos, x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    for (const c of cols) {
      if (x > c.minX && x < c.maxX && y > c.minY && y < c.maxY && z > c.minZ && z < c.maxZ) return false;
    }
  }
  return true;
};
/* Olhos nas bordas de laje que dão para o miolo (altura do olho 1,6 m sobre a laje). */
const OLHOS=W.design.platforms.flatMap(p=>{
  const x=p.x0>0?p.x0+.45:p.x1-.45,z0=Math.max(p.z0,W.praca.z0),z1=Math.min(p.z1,W.praca.z1);
  return [1/3,2/3].map(t=>[x,z0+(z1-z0)*t]);
});
const alvos = [];
for (let x = W.praca.x0+.75; x <= W.praca.x1; x += 1.5) for (let z = W.praca.z0+.75; z <= W.praca.z1; z += 1.5) if (livreEm(x, z)) alvos.push([x, z]);
let vistos = 0, testes = 0;
for (const [ox, oz] of OLHOS) {
  const oy = W.groundHeightAt(ox, oz, 1e3) + 1.6;
  for (const [tx, tz] of alvos) { testes++; if (visivel(ox, oy, oz, tx, 1.2, tz)) vistos++; }
}
const fracVisada = testes ? vistos / testes : 0;
const lv5 = fracVisada >= VISADA_MIN;

/* ===================== LV6 — aresta atravessável ===================== */
/* Usa o _collide de PRODUÇÃO com o raio do jogador (0,38), não a caixa do gerador: a régua e
   o jogo têm que rodar no mesmo mundo (lição 3). Amostra a 0,3 m — menor que a parede mais
   fina que colide no mapa (0,14 m de guarda-corpo / 0,18 m de poço de escada). */
const pLV6 = new THREE.Vector3();
const andavel = (x, z) => {
  pLV6.set(x, 0, z); game._collide(pLV6, .38);
  return Math.hypot(pLV6.x - x, pLV6.z - z) < 1e-3;
};
const arestasRuins = [];
let arestasTerreo = 0;
for (let a = 0; a < nodes.length; a++) {
  if (nodes[a].y >= Y_TERREO) continue;
  for (const b of adj[a]) {
    if (b <= a || nodes[b].y >= Y_TERREO) continue;
    arestasTerreo++;
    const A = nodes[a], B = nodes[b], d = Math.hypot(B.x - A.x, B.z - A.z);
    const passos = Math.max(1, Math.ceil(d / .19));
    for (let s2 = 0; s2 <= passos; s2++) {
      const t = s2 / passos;
      if (andavel(A.x + (B.x - A.x) * t, A.z + (B.z - A.z) * t)) continue;
      arestasRuins.push(`(${A.x.toFixed(1)},${A.z.toFixed(1)})→(${B.x.toFixed(1)},${B.z.toFixed(1)})`);
      break;
    }
  }
}
const lv6 = arestasRuins.length === 0;

const checks = [
  ['LV1', 'travessia térrea entre spawns custa≤1,5× a rota irrestrita', lv1,
    falhouTerrea.length ? `reprova: ${falhouTerrea.join(' · ')}` : pares.join(' · ')],
  ['LV2', 'quatro lajes opcionais acessíveis com ida e volta', lv2,
    falhouSuperior.length ? `reprova: ${falhouSuperior.join(', ')}` : `${W.design.platforms.length} plataformas ok`],
  ['LV3', 'praça no térreo, no meio do mapa', lv3, praca
    ? `${praca.area.toFixed(0)} m² (min ${PRACA_AREA}) · ${praca.largX.toFixed(1)}×${praca.largZ.toFixed(1)} m (min ${PRACA_LARG}) · centro (${praca.cx.toFixed(1)},${praca.cz.toFixed(1)}) a ${Math.hypot(praca.cx, praca.cz).toFixed(1)} m do meio (max ${PRACA_RAIO})`
    : 'nenhuma sala larga no miolo'],
  ['LV4', 'a praça tem cover (não é corredor morto)', lv4,
    `${covers.length} peças (min ${PRACA_COVER}) · espaçamento ${espacCover === Infinity ? '∞' : espacCover.toFixed(1)} m (max ${QUAD_ESPAC})`],
  ['LV6', 'toda aresta de térreo é andável de ponta a ponta', lv6,
    `${arestasTerreo} arestas de térreo · ${arestasRuins.length} atravessam sólido${arestasRuins.length ? `: ${arestasRuins.slice(0, 6).join(' · ')}` : ''}`],
  ['LV5', 'os becos do miolo são visíveis das bordas de laje', lv5,
    `${(fracVisada * 100).toFixed(1)}% de ${testes} visadas limpas (min ${(VISADA_MIN * 100).toFixed(0)}%)`],
];
let falhas = 0;
for (const [id, desc, ok, ev] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${ev}`);
}
if (falhas) { console.error(`LAJES-VERTICAL FALHA: ${falhas}/${checks.length}`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-VERTICAL OK');

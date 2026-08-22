/* ESCADÃO-ROTA — duas cláusulas para o relato do dono sobre o fy_escadao:
     "tem 3 escadas, 2 não levam pra lugar nenhum, e dá pra ver o andar do respawn de cima".

   As duas medem o MOTOR, não a declaração do mapa:

   1) CONECTIVIDADE. Os lances NÃO são lidos de `world.stairs` (a declaração omite as duas
      escadas de beco, que são justamente as que o dono conta). São DESCOBERTOS varrendo o
      campo `groundHeightAt` atrás de células em rampa e agrupando-as. Para cada lance a régua
      ANDA o caminho de verdade com `Game._retaAndavel` (raio 0,42 m, degrau 0,30 m — os mesmos
      defaults do jogo, que por baixo chamam `Game._collide` contra os colisores REAIS). Um
      lance só passa se: tem boca embaixo, tem boca em cima, e a região alcançável a partir da
      boca de cima — COM as células do próprio lance removidas, para que descer de volta não
      conte como saída — tem área ≥ MIN_AREA e contém pelo menos um destino de jogo (spawn,
      bandeira de CTF ou a boca de outro lance). Sem boca em cima = "termina em parede";
      região pequena/sem destino = "plataforma sem saída".

   2) OCLUSÃO DO SPAWN. O defeito relatado é VERTICAL: quem está no alto lê o andar onde o
      inimigo nasce. Então a cláusula varre as células navegáveis que estão ALTO m acima do
      piso do spawn e a FORA m de distância, e exige `Game._losClear` FECHADO (é a mesma função
      que decide se um bot enxerga e atira, raycast contra `world.occluders`). Tolerância zero.
      A visada rasante pela rua plana não entra aqui de propósito: essa é a linha de tiro que o
      mapa quer ter, e quem a mede é o MAP2 do `map-check.mjs`.

   MUTANTES (têm que acender a cláusula certa):
     --mutante=escada-morta   tampa a boca de cima do lance superior → cláusula 1 vermelha
     --mutante=sem-abrigo     apaga os occluders marcados `userData.escadaoAbrigo` (a geometria
                              que fecha a visada do spawn) → cláusula 2 vermelha. Se nada estiver
                              marcado, o mutante REPROVA avisando: o abrigo sumiu do mapa.
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;

const GRID = 0.5;          // passo da malha navegável (menor que o diâmetro do corpo)
const GRID_LOS = 1.0;      // passo da varredura de linha de visão (raycast é caro)
const R = 0.42;            // raio do corpo — default de Game._retaAndavel/_collide
const DEGRAU = 0.30;       // degrau que se sobe andando — default do jogo
const MIN_AREA = 18;       // m² mínimos da área de chegada de um lance
const ALTO = 1.5;          // altura acima do piso do spawn a partir da qual "se olha de cima"
const FORA = 6.0;          // distância horizontal a partir da qual já não é a zona de spawn
const OLHO = 1.62;         // altura dos olhos (mesma de map-check.mjs)

const game = bootGame('fy_escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
game.scene.updateMatrixWorld(true);

const gh = (x, z) => W.groundHeightAt(x, z);

/* ---------------------------------------------------------------- malha navegável */
const B = W.bounds;
const x0 = Math.ceil((B.minX + R + 0.1) / GRID) * GRID;
const x1 = Math.floor((B.maxX - R - 0.1) / GRID) * GRID;
const z0 = Math.ceil((B.minZ + R + 0.1) / GRID) * GRID;
const z1 = Math.floor((B.maxZ - R - 0.1) / GRID) * GRID;
const NX = Math.round((x1 - x0) / GRID) + 1;
const NZ = Math.round((z1 - z0) / GRID) + 1;
const cx = (i) => x0 + i * GRID;
const cz = (k) => z0 + k * GRID;
const id = (i, k) => i * NZ + k;

const _p = new THREE.Vector3();
function navegavel(x, z) {
  const g = gh(x, z);
  _p.set(x, g, z);
  game._collide(_p, R);
  return Math.abs(_p.x - x) < 1e-3 && Math.abs(_p.z - z) < 1e-3;
}

const nav = new Uint8Array(NX * NZ);
const alt = new Float32Array(NX * NZ);
for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
  const x = cx(i), z = cz(k);
  alt[id(i, k)] = gh(x, z);
  if (navegavel(x, z)) nav[id(i, k)] = 1;
}

// Aresta = o jogo consegue ANDAR de uma célula à vizinha (degrau + colisores reais).
const passo = (i, k, j, l) => game._retaAndavel(cx(i), cz(k), cx(j), cz(l), R, DEGRAU);
const VIZ4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* ------------------------------------------------- descoberta dos lances (rampas) */
// Declividade central por eixo. Rampa fica entre RAMPA_MIN e RAMPA_MAX; acima disso é
// despenhadeiro (borda de laje), que NÃO é lance.
const RAMPA_MIN = 0.25, RAMPA_MAX = 1.2;
function declive(x, z) {
  const sx = Math.abs(gh(x + GRID, z) - gh(x - GRID, z)) / (2 * GRID);
  const sz = Math.abs(gh(x, z + GRID) - gh(x, z - GRID)) / (2 * GRID);
  return Math.max(sx, sz);
}
const rampa = new Int32Array(NX * NZ).fill(-1);
const ehRampa = new Uint8Array(NX * NZ);
for (let i = 1; i < NX - 1; i++) for (let k = 1; k < NZ - 1; k++) {
  if (!nav[id(i, k)]) continue;
  const d = declive(cx(i), cz(k));
  if (d >= RAMPA_MIN && d <= RAMPA_MAX) ehRampa[id(i, k)] = 1;
}
const lances = [];
for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
  if (!ehRampa[id(i, k)] || rampa[id(i, k)] >= 0) continue;
  const idx = lances.length, cels = [];
  const fila = [[i, k]]; rampa[id(i, k)] = idx;
  while (fila.length) {
    const [a, b] = fila.pop(); cels.push([a, b]);
    for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) {
      const na = a + da, nb = b + db;
      if (na < 0 || nb < 0 || na >= NX || nb >= NZ) continue;
      if (!ehRampa[id(na, nb)] || rampa[id(na, nb)] >= 0) continue;
      // só agrupa o que dá pra ANDAR: dois lances encostados mas separados por muro
      // não podem virar um lance só.
      if (!passo(a, b, na, nb)) continue;
      rampa[id(na, nb)] = idx; fila.push([na, nb]);
    }
  }
  const ys = cels.map(([a, b]) => alt[id(a, b)]);
  const baixo = Math.min(...ys), cima = Math.max(...ys);
  if (cels.length < 8 || cima - baixo < 0.8) { for (const [a, b] of cels) rampa[id(a, b)] = -1; continue; }
  lances.push({ cels, baixo, cima, cx: cels.reduce((s, c) => s + cx(c[0]), 0) / cels.length, cz: cels.reduce((s, c) => s + cz(c[1]), 0) / cels.length });
}
// reindexa (clusters descartados deixaram buracos)
rampa.fill(-1);
lances.forEach((L, n) => { for (const [a, b] of L.cels) rampa[id(a, b)] = n; });

// nome legível: casa com a declaração `world.stairs` quando ela cobre o centroide;
// senão descreve pela posição, que é como o dono fala ("a escada do beco leste").
function nomeLance(L) {
  for (const st of (W.stairs || [])) {
    if (L.cx >= st.x0 - 0.6 && L.cx <= st.x1 + 0.6 && L.cz >= st.z0 - 0.6 && L.cz <= st.z1 + 0.6) return st.nome;
  }
  const lado = L.cx < -6 ? 'beco oeste' : L.cx > 6 ? 'beco leste' : 'centro';
  return `escada ${lado} (x=${L.cx.toFixed(1)} z=${L.cz.toFixed(1)})`;
}

/* -------------------------------------------------------------------- mutante 1 */
if (MUT === 'escada-morta') {
  // tampa a boca de cima do lance mais alto: o mapa continua tendo a escada, mas ela
  // passa a terminar em parede.
  let alvo = null; for (const L of lances) if (!alvo || L.cima > alvo.cima) alvo = L;
  const zs = alvo.cels.map(([, b]) => cz(b)), xs = alvo.cels.map(([a]) => cx(a));
  const topoZ = Math.min(...zs) - GRID;   // z diminui subindo neste mapa
  W.colliders.push({
    minX: Math.min(...xs) - 1.5, maxX: Math.max(...xs) + 1.5,
    minY: alvo.cima - 0.2, maxY: alvo.cima + 2.6,
    minZ: topoZ - 1.2, maxZ: topoZ + 0.4,
  });
}

/* -------------------------------------------------------------------- mutante 2 */
if (MUT === 'sem-abrigo') {
  const antes = W.occluders.length;
  W.occluders = W.occluders.filter((o) => !(o.userData && o.userData.escadaoAbrigo));
  const tirados = antes - W.occluders.length;
  if (!tirados) {
    console.error('✗ MUTANTE sem-abrigo: nenhum occluder marcado `userData.escadaoAbrigo` — '
      + 'a geometria que fecha a visada do spawn não existe (ou perdeu a marca).');
    process.exit(1);
  }
  console.log(`[mutante] sem-abrigo: ${tirados} occluder(s) de abrigo removidos`);
}

/* ================================ CLÁUSULA 1 ================================== */
const destinos = [];
for (const [time, slots] of Object.entries(W.spawns)) slots.forEach((s, n) => destinos.push({ nome: `spawn ${time}#${n}`, x: s.x, z: s.z }));
for (const p of (W.ctfPoints || [])) destinos.push({ nome: `bandeira ${p.label || p.id}`, x: p.x, z: p.z });

// bocas de um lance: células navegáveis FORA do lance, encostadas nele, na altura pedida
function bocas(n, y) {
  const out = [];
  for (const [a, b] of lances[n].cels) {
    if (Math.abs(alt[id(a, b)] - y) > 0.45) continue;
    for (const [da, db] of VIZ4) {
      const na = a + da, nb = b + db;
      if (na < 0 || nb < 0 || na >= NX || nb >= NZ) continue;
      if (!nav[id(na, nb)] || rampa[id(na, nb)] === n) continue;
      if (Math.abs(alt[id(na, nb)] - y) > 0.45) continue;
      if (!passo(a, b, na, nb)) continue;
      out.push([na, nb]);
    }
  }
  return out;
}

// alcançável a partir de um conjunto de sementes, PROIBIDO pisar no lance `banido`
function alcance(sementes, banido) {
  const vis = new Uint8Array(NX * NZ); const fila = [];
  for (const [a, b] of sementes) if (!vis[id(a, b)]) { vis[id(a, b)] = 1; fila.push([a, b]); }
  while (fila.length) {
    const [a, b] = fila.pop();
    for (const [da, db] of VIZ4) {
      const na = a + da, nb = b + db;
      if (na < 0 || nb < 0 || na >= NX || nb >= NZ) continue;
      if (vis[id(na, nb)] || !nav[id(na, nb)] || rampa[id(na, nb)] === banido) continue;
      if (!passo(a, b, na, nb)) continue;
      vis[id(na, nb)] = 1; fila.push([na, nb]);
    }
  }
  return vis;
}

function destinosEm(vis, n) {
  const achados = [];
  for (const d of destinos) {
    const i = Math.round((d.x - x0) / GRID), k = Math.round((d.z - z0) / GRID);
    for (let di = -2; di <= 2 && !achados.includes(d.nome); di++) for (let dk = -2; dk <= 2; dk++) {
      const a = i + di, b = k + dk;
      if (a < 0 || b < 0 || a >= NX || b >= NZ || !vis[id(a, b)]) continue;
      if (Math.hypot(cx(a) - d.x, cz(b) - d.z) <= 1.4) { achados.push(d.nome); break; }
    }
  }
  for (let m = 0; m < lances.length; m++) {
    if (m === n) continue;
    if (lances[m].cels.some(([a, b]) => {
      for (const [da, db] of VIZ4) { const na = a + da, nb = b + db; if (na >= 0 && nb >= 0 && na < NX && nb < NZ && vis[id(na, nb)]) return true; }
      return false;
    })) achados.push(`lance «${nomeLance(lances[m])}»`);
  }
  return achados;
}

console.log(`\n== CLÁUSULA 1 · CONECTIVIDADE (${lances.length} lance(s) achado(s) na geometria) ==`);
let mortos = 0;
for (let n = 0; n < lances.length; n++) {
  const L = lances[n], nome = nomeLance(L);
  const bCima = bocas(n, L.cima), bBaixo = bocas(n, L.baixo);
  const linha = `${nome.padEnd(38)} y ${L.baixo.toFixed(2)}→${L.cima.toFixed(2)}`;
  if (!bCima.length) { console.log(`  ✗ ${linha}  TERMINA EM PAREDE (sem boca em cima)`); mortos++; continue; }
  if (!bBaixo.length) { console.log(`  ✗ ${linha}  SEM PÉ (sem boca embaixo)`); mortos++; continue; }
  const vis = alcance(bCima, n);
  let cels = 0; for (let q = 0; q < vis.length; q++) if (vis[q]) cels++;
  const area = cels * GRID * GRID;
  const dst = destinosEm(vis, n);
  const ok = area >= MIN_AREA && dst.length > 0;
  console.log(`  ${ok ? '✓' : '✗'} ${linha}  chegada ${area.toFixed(0)} m²  destinos: ${dst.length ? dst.join(', ') : '—'}`);
  if (!ok) { mortos++; if (area < MIN_AREA) console.log(`      PLATAFORMA SEM SAÍDA: ${area.toFixed(0)} m² < ${MIN_AREA} m²`); if (!dst.length) console.log('      NÃO LEVA A LUGAR NENHUM: nenhum spawn, bandeira ou outro lance alcançável'); }
}

/* ================================ CLÁUSULA 2 ================================== */
console.log('\n== CLÁUSULA 2 · OCLUSÃO DO SPAWN (quem está no alto não pode ler o spawn) ==');
let expostos = 0, totalAltos = 0;
const detalhe = [];
for (const [time, slots] of Object.entries(W.spawns)) {
  const piso = Math.min(...slots.map((s) => gh(s.x, s.z)));
  const alvos = slots.map((s) => new THREE.Vector3(s.x, gh(s.x, s.z) + OLHO, s.z));
  let vistos = 0, altos = 0, pior = 0, piorPt = null;
  const passoLOS = Math.round(GRID_LOS / GRID);
  for (let i = 0; i < NX; i += passoLOS) for (let k = 0; k < NZ; k += passoLOS) {
    if (!nav[id(i, k)]) continue;
    const g = alt[id(i, k)];
    if (g < piso + ALTO) continue;
    const x = cx(i), z = cz(k);
    if (slots.every((s) => Math.hypot(x - s.x, z - s.z) < FORA)) continue;
    altos++;
    const olho = new THREE.Vector3(x, g + OLHO, z);
    let ve = false, d = 0;
    for (let q = 0; q < alvos.length; q++) {
      if (Math.hypot(x - slots[q].x, z - slots[q].z) < FORA) continue;
      if (game._losClear(olho, alvos[q].clone())) { ve = true; d = Math.max(d, olho.distanceTo(alvos[q])); }
    }
    if (ve) { vistos++; if (d > pior) { pior = d; piorPt = [x, g, z]; } }
  }
  totalAltos += altos; expostos += vistos;
  const pct = altos ? (100 * vistos / altos).toFixed(0) : '0';
  console.log(`  spawn ${time} (piso y=${piso.toFixed(2)}): ${vistos}/${altos} pontos altos com linha de visão (${pct}%)`
    + (piorPt ? `  pior: (${piorPt[0].toFixed(1)}, y ${piorPt[1].toFixed(2)}, ${piorPt[2].toFixed(1)}) a ${pior.toFixed(1)} m` : ''));
  if (vistos) detalhe.push({ time, vistos, altos });
}

/* ------------------------------------------------------------------ veredicto */
console.log('');
const falhas = [];
if (mortos) falhas.push(`${mortos} lance(s) sem destino`);
if (expostos) falhas.push(`${expostos} ponto(s) alto(s) enxergando spawn inimigo`);
if (falhas.length) { console.error(`✗ ESCADÃO-ROTA: ${falhas.join(' · ')}`); process.exit(1); }
console.log(`✓ ESCADÃO-ROTA: ${lances.length}/${lances.length} lances levam a algum lugar · 0/${totalAltos} pontos altos leem o spawn`);

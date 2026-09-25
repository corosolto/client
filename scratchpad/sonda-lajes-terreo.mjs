// SONDA EXPLORATÓRIA (não é régua): estado real do térreo de fy_lajes.
import { bootGame, initTextures, THREE } from '../tools/eval/harness.mjs';

const g = bootGame('fy_lajes', { textures: initTextures(), bots: 0 });
const W = g.world;
console.log('colliders:', W.colliders.length, 'occluders:', W.occluders.length);

const inSolid = (x, y, z) => W.colliders.some((c) =>
  x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y + 1.5 > c.minY && y + 0.3 < c.maxY);

// 1. O beco principal passa POR BAIXO dos mirantes? Pontos da MAIN_BECO sob MN/MS:
for (const [x, z, nome] of [
  [-3, -11.5, 'beco sob MIRANTE NORTE'], [-3, -9.5, 'beco borda MN'], [-2, -13, 'MN oeste'],
  [0, 25, 'beco sob MIRANTE SUL'], [1.5, 24.5, 'MS centro'], [0, -25, 'beco norte livre'],
  [-10.3, -5.2, 'sob tábua WN-WS'], [10.3, 7, 'sob tábua ES-SE'],
]) {
  const g0 = W.groundHeightAt(x, z, 0), g5 = W.groundHeightAt(x, z, 5.2), gSem = W.groundHeightAt(x, z);
  console.log(`${nome} (${x},${z}): yRef=0 -> ${g0} · yRef=5.2 -> ${g5} · sem yRef -> ${gSem} · sólido corpo y=0: ${inSolid(x, 0, z)}`);
}

// 2. Flood fill do térreo com o _collide REAL (raio 0.38), grade 0.30 m.
const B = W.bounds, STEP = 0.30;
const nx = Math.ceil((B.maxX - B.minX) / STEP), nz = Math.ceil((B.maxZ - B.minZ) / STEP);
const livre = new Uint8Array(nx * nz);
const p = new THREE.Vector3();
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  const x = B.minX + (i + 0.5) * STEP, z = B.minZ + (k + 0.5) * STEP;
  const y = W.groundHeightAt(x, z, 0);
  if (y > 0.55) continue;                     // não é camada térrea
  p.set(x, 0, z); g._collide(p, 0.38);
  if (Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3) livre[i * nz + k] = 1;
}
// componentes 4-conexos
const comp = new Int32Array(nx * nz).fill(-1);
let nComp = 0; const sizes = [];
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  if (!livre[i * nz + k] || comp[i * nz + k] >= 0) continue;
  let size = 0; const fila = [i * nz + k]; comp[i * nz + k] = nComp;
  for (let h = 0; h < fila.length; h++) {
    size++; const c = fila[h], ci = (c / nz) | 0, ck = c % nz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= nx || l < 0 || l >= nz) continue;
      const d = j * nz + l;
      if (livre[d] && comp[d] < 0) { comp[d] = nComp; fila.push(d); }
    }
  }
  sizes.push(size); nComp++;
}
sizes.sort((a, b) => b - a);
const total = sizes.reduce((a, b) => a + b, 0);
console.log(`térreo: ${total} células livres em ${nComp} componentes — tamanhos: ${sizes.slice(0, 12).join(', ')}`);

// 3. As três escadas têm o pé no MESMO componente? E os ramos do beco?
const pontos = {
  'pé ESCADARIA': [4.6, -10], 'pé BECO DO VARAL': [-4.6, 2], 'pé ACESSO SUL': [4.6, 22],
  'beco norte [0,-23]': [0, -23], 'beco meio [-3,-6]': [-3, -6], 'beco sul [-2,16]': [-2, 16],
  'ramal1 leste [2,-10]': [2, -10], 'ramal2 oeste [-2,2]': [-2, 2], 'ramal3 leste [2,22]': [2, 22],
};
for (const [nome, [x, z]] of Object.entries(pontos)) {
  p.set(x, 0, z); g._collide(p, 0.38);
  const moved = Math.hypot(p.x - x, p.z - z);
  const i = Math.min(nx - 1, Math.max(0, Math.floor((p.x - B.minX) / STEP)));
  const k = Math.min(nz - 1, Math.max(0, Math.floor((p.z - B.minZ) / STEP)));
  const c = comp[i * nz + k];
  console.log(`${nome}: _collide moveu ${moved.toFixed(2)} m · componente ${c} (tamanho ${c >= 0 ? sizes[c] ?? '?' : 0})`);
}

// Grade XZ dos colisores para o `_collide`: devolve, em ordem crescente de índice, só quem
// pode encostar num círculo de raio R. Mesma chave de invalidação do javaporcos_direcao.js.
const CELULA = 4;
const grades = new WeakMap();

function montar(lista) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const c of lista) {
    if (c.minX < minX) minX = c.minX; if (c.maxX > maxX) maxX = c.maxX;
    if (c.minZ < minZ) minZ = c.minZ; if (c.maxZ > maxZ) maxZ = c.maxZ;
  }
  // Colisor com limite não finito não cabe em célula: a grade se recusa e o chamador varre linear.
  if (!(Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minZ) && Number.isFinite(maxZ))) return { total: lista.length, nula: true };
  const nx = Math.max(1, Math.floor((maxX - minX) / CELULA) + 1), nz = Math.max(1, Math.floor((maxZ - minZ) / CELULA) + 1);
  if (nx * nz > 262144) return { total: lista.length, nula: true };   // mapa absurdo: não vale a memória
  const celulas = Array.from({ length: nx * nz }, () => []);
  for (let i = 0; i < lista.length; i++) {
    const c = lista[i];
    const x0 = Math.floor((c.minX - minX) / CELULA), x1 = Math.floor((c.maxX - minX) / CELULA);
    const z0 = Math.floor((c.minZ - minZ) / CELULA), z1 = Math.floor((c.maxZ - minZ) / CELULA);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) celulas[x * nz + z].push(i);
  }
  return { lista, total: lista.length, minX, minZ, nx, nz, celulas, visto: new Uint32Array(lista.length), selo: 0, ids: new Int32Array(lista.length) };
}

export function gradeColisores(lista) {
  let g = grades.get(lista);
  if (!g || g.total !== lista.length) { g = montar(lista); grades.set(lista, g); }
  return g.nula ? null : g;
}

// Preenche g.ids[0..n) com os índices candidatos em ordem crescente; devolve n.
export function candidatosColisao(g, x, z, R) {
  const cx0 = Math.max(0, Math.floor((x - R - g.minX) / CELULA)), cx1 = Math.min(g.nx - 1, Math.floor((x + R - g.minX) / CELULA));
  const cz0 = Math.max(0, Math.floor((z - R - g.minZ) / CELULA)), cz1 = Math.min(g.nz - 1, Math.floor((z + R - g.minZ) / CELULA));
  if (cx0 > cx1 || cz0 > cz1) return 0;
  const ids = g.ids;
  if (cx0 === cx1 && cz0 === cz1) {
    const cel = g.celulas[cx0 * g.nz + cz0];
    for (let k = 0; k < cel.length; k++) ids[k] = cel[k];
    return cel.length;
  }
  const selo = g.selo = (g.selo + 1) >>> 0 || 1, visto = g.visto;
  if (selo === 1) visto.fill(0);
  let n = 0;
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const cel = g.celulas[cx * g.nz + cz];
    for (let k = 0; k < cel.length; k++) { const i = cel[k]; if (visto[i] !== selo) { visto[i] = selo; ids[n++] = i; } }
  }
  if (n > 1) ids.subarray(0, n).sort();
  return n;
}

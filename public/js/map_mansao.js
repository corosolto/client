// MANSAO JOÁ (fy_mansao) — spec plans/14-MANSAO_JOA.md: mansão de ultra-luxo no Joá, RJ.
// cs_mansion brasileiro: um time invade pelo jardim (Burle Marx); o outro defende do
// terraço/piscina com vista pro oceano. Interior modernista jogável: hall de pé-direito
// duplo, sala, cozinha gourmet, mezanino com escada. Piscina infinita na borda do penhasco.
//
// PLANTA (eixo longo = z; norte = -z = terraço/mar, sul = +z = portão/jardim):
//   PORTÃO/JARDIM  z ∈ [15, 35]  spawn A (invasor)
//   GARAGEM        z ∈ [8, 15]   3 vagas abertas, carros
//   CASA           z ∈ [-15, 8]  hall + sala + cozinha + mezanino
//   TERRAÇO/PISCINA z ∈ [-35, -15] spawn B (defensor), vista pro mar
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
export const HALF_X = 22, HALF_Z = 36;
const LAJE_H = 4.5;  // pé-direito duplo

export const MANSAO_PROPS = ['fusca', 'saveiro', 'mesa_guardasol', 'guarda_sol'];

export function buildMansao(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) { if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); } if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap; }
    return m;
  };
  let TEX = { concrete: lam({ map: T.concrete }), grass: lam({ map: T.grass }), dirt: lam({ map: T.dirt }) };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 3, ry = 3) => { const t = new THREE.TextureLoader().load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
    TEX.marble = lam({ map: load('/img/textures/marble.webp', 4, 4), roughness: 0.15, metalness: 0.05 });
    TEX.garden = lam({ map: load('/img/textures/garden.webp', 5, 5), roughness: 1.0 });
    TEX.deck = lam({ map: load('/img/textures/deck.webp', 3, 6), roughness: 0.7 });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 2, 2) });
  }
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING }) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
    return m;
  }
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const PB = new PropBatch({ bucket: 24 });

  /* CÉU */
  if (typeof document !== 'undefined') scene.background = new THREE.TextureLoader().load('/img/textures/sky_joa.webp');
  else scene.background = T.sky || new THREE.Color(0xf0d4a8);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_mansao');
  const hemi = new THREE.HemisphereLight(0xfff0d0, 0x5a4a3a, 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd080, 1.8); sun.position.set(15, 30, -15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 150; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* CHÃO */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, TEX.garden || lam({ map: T.grass }), -0.01);

  /* ===================== CASA (interior jogável) =====================
     Planta: retângulo de 30×16 m. Paredes externas com vãos de porta/janela.
     Mezanino parcial (escritório) a y=4,5. Piso de mármore. */
  const CASA = { x0: -15, x1: 15, z0: -15, z1: 8 };
  // piso de mármore
  addFloor(CASA.x1 - CASA.x0, CASA.z1 - CASA.z0, (CASA.x0 + CASA.x1) / 2, (CASA.z0 + CASA.z1) / 2, TEX.marble || lam({ color: 0xe8e8e0, roughness: 0.2 }), 0.02);
  // contrapiso sólido (bala não atravessa)
  addBox(CASA.x1 - CASA.x0, 0.12, CASA.z1 - CASA.z0, lam({ color: 0x909088 }), (CASA.x0 + CASA.x1) / 2, 0, (CASA.z0 + CASA.z1) / 2);

  // paredes externas (com vãos de porta)
  const MAT_WALL = lam({ color: 0xf5f0e8, roughness: 0.9 });  // branco modernista
  function paredeComVao(x, z, w, d, h, vaoCentro, vaoLarg) {
    if (vaoLarg >= w) return;
    const antes = vaoCentro - w/2 + vaoLarg/2;
    const depois = w/2 + w/2 - (vaoCentro + vaoLarg/2);
    if (antes > 0.5) addBox(antes, h, d, MAT_WALL, x - w/2 + antes/2, 0, z);
    if (depois > 0.5) addBox(depois, h, d, MAT_WALL, x + vaoCentro + vaoLarg/2 + depois/2, 0, z);
    // sólido das paredes (não do vão)
    if (antes > 0.5) solids.push({ x0: x - w/2, x1: x - w/2 + antes, z0: z - d/2, z1: z + d/2 });
    if (depois > 0.5) solids.push({ x0: x + vaoCentro + vaoLarg/2, x1: x + vaoCentro + vaoLarg/2 + depois, z0: z - d/2, z1: z + d/2 });
  }
  // parede sul (frente — porta central de 4 m)
  paredeComVao(0, CASA.z1, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 4.0);
  // parede norte (fundo — porta pro terraço de 6 m)
  paredeComVao(0, CASA.z0, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 6.0);
  // parede leste (janela grande — vão de 5 m no centro)
  paredeComVao(CASA.x1, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 0, 5.0);
  // parede oeste (porta da garagem — vão de 3 m)
  paredeComVao(CASA.x0, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 2.0, 3.0);
  // vidro nas janelas (decorativo, transparente)
  for (const [vx, vz, vw, vd] of [[CASA.x1 - 0.02, 0, 0.06, 5.0]]) {
    addBox(vw, 3.5, vd, lam({ color: 0xa0c8e0, transparent: true, opacity: 0.2 }), vx, 0.3, vz, { collide: false });
  }

  // MEZANINO parcial (escritório — z ∈ [-15, -8])
  {
    const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
    addFloor(MZ.x1 - MZ.x0, MZ.z1 - MZ.z0, (MZ.x0 + MZ.x1) / 2, (MZ.z0 + MZ.z1) / 2, TEX.marble || lam({ color: 0xe8e8e0 }), LAJE_H + 0.02);
    addBox(MZ.x1 - MZ.x0, 0.12, MZ.z1 - MZ.z0, lam({ color: 0xa0a098 }), (MZ.x0 + MZ.x1) / 2, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    // guarda-corpo do mezanino (vão da escada no centro)
    for (const sx of [MZ.x0, MZ.x1]) addBox(0.2, 1.0, MZ.z1 - MZ.z0, lam({ color: 0x333333, metalness: 0.6 }), sx, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    addBox(MZ.x1 - MZ.x0, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), (MZ.x0 + MZ.x1) / 2, LAJE_H, MZ.z0);
    // vão da escada: guarda-corpo com gap no centro
    addBox(5.0, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), (MZ.x0 + MZ.x1) / 2 - 8, LAJE_H, MZ.z1);
    addBox(5.0, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), (MZ.x0 + MZ.x1) / 2 + 8, LAJE_H, MZ.z1);
    // colunas de apoio
    for (const cx of [-8, 8]) addBox(0.4, LAJE_H, 0.4, lam({ color: 0xe0e0d8 }), cx, 0, MZ.z0 + 0.5);
  }

  /* ESCADA (NBR 9077) subindo pro mezanino */
  {
    const ESC = { espelho: 0.17, piso: 0.29, n: Math.round(LAJE_H / 0.17) };
    const sx = -3, sz0 = -7.5, sz1 = sz0 - ESC.n * ESC.piso;
    for (let i = 0; i < ESC.n; i++) { const z = sz0 - i * ESC.piso; const y = i * ESC.espelho; addBox(2.5, 0.04, ESC.piso + 0.02, TEX.marble || lam({ color: 0xe0e0d8 }), sx, y, z); }
    // muros laterais
    for (const lx of [sx - 1.25, sx + 1.25]) addBox(0.15, LAJE_H, ESC.n * ESC.piso + 0.3, MAT_WALL, lx, 0, (sz0 + sz1) / 2);
  }

  /* COVER INTERIOR: móveis de luxo */
  // sofá (sala)
  addBox(4.0, 0.8, 1.5, lam({ color: 0x4a4a5a, roughness: 0.6 }), 4, 0, 0); solids.push({ x0: 2, x1: 6, z0: -0.75, z1: 0.75 });
  addBox(2.0, 0.8, 1.5, lam({ color: 0x4a4a5a, roughness: 0.6 }), 0, 0, 4); solids.push({ x0: -1, x1: 1, z0: 3.25, z1: 4.75 });
  // ilha de cozinha (mármore)
  addBox(3.0, 1.0, 1.2, TEX.marble || lam({ color: 0xe8e8e0, roughness: 0.15 }), -8, 0, -10); solids.push({ x0: -9.5, x1: -6.5, z0: -10.6, z1: -9.4 });
  // poltronas (home theater)
  for (const [px, pz] of [[8, -10], [10, -10], [8, -12], [10, -12]]) { addBox(1.2, 1.0, 1.2, lam({ color: 0x2a2a3a }), px, 0, pz); solids.push({ x0: px - 0.6, x1: px + 0.6, z0: pz - 0.6, z1: pz + 0.6 }); }
  // mesa de jantar
  addBox(3.0, 0.9, 1.5, lam({ color: 0x4a3a2a, roughness: 0.3 }), 8, 0, 4); solids.push({ x0: 6.5, x1: 9.5, z0: 3.25, z1: 4.75 });
  // escultura modernista (cover alto)
  addBox(0.6, 2.5, 0.6, lam({ color: 0x8a7a6a, metalness: 0.3 }), 0, 0, -12); solids.push({ x0: -0.3, x1: 0.3, z0: -12.3, z1: -11.7 });

  /* ===================== GARAGEM (aberta) ===================== */
  // piso diferente (cimento queimado)
  addFloor(20, 7, 0, 11.5, TEX.concrete || lam({ map: T.concrete }), 0.03);
  // carros esportivos (cover)
  for (const [cx, cz, cor] of [[-6, 11, 0xdd2222], [0, 11, 0x2222cc], [6, 11, 0xf0f0f0]])
    addBox(2.0, 1.3, 4.5, lam({ color: cor, roughness: 0.2, metalness: 0.6 }), cx, 0, cz, { ry: 0.05 });

  /* ===================== JARDIM BURLE MARX ===================== */
  // caminhos de pedra (padrão geométrico)
  for (const [px, pz] of [[0, 20], [-3, 22], [3, 22], [0, 24], [-3, 26], [3, 26], [0, 28], [0, 32]])
    addBox(2.5, 0.08, 2.5, lam({ color: 0x9a9a8a, roughness: 0.9 }), px, 0, pz, { collide: false });
  // espelho d'água (retangular, raso)
  addFloor(6, 4, -8, 25, lam({ color: 0x2a4a6a, roughness: 0.05, metalness: 0.3 }), 0.02);
  col(-11, -5, -0.5, 0.0, 23, 27);  // colisor da água (não entrável)
  // árvores (cover alto)
  for (const [tx, tz] of [[-12, 20], [12, 20], [-14, 28], [14, 28], [-10, 32], [10, 32]]) {
    addBox(0.6, 4.0, 0.6, lam({ color: 0x4a3a2a }), tx, 0, tz);   // tronco
    addBox(3.0, 2.5, 3.0, lam({ color: 0x2a5a2a, roughness: 0.9 }), tx, 3.5, tz, { collide: false });  // copa
    solids.push({ x0: tx - 0.3, x1: tx + 0.3, z0: tz - 0.3, z1: tz + 0.3 });
  }
  // muretas dos canteiros (cover agachado)
  for (const [mx, mz] of [[5, 24], [-5, 24], [5, 30], [-5, 30]]) { addBox(3.0, 0.6, 0.4, lam({ color: 0x8a8a7a }), mx, 0, mz); solids.push({ x0: mx - 1.5, x1: mx + 1.5, z0: mz - 0.2, z1: mz + 0.2 }); }
  // portão da frente
  addBox(8.0, 3.0, 0.3, lam({ color: 0x2a2a2a, metalness: 0.5 }), 0, 0, 34);

  /* ===================== TERRAÇO + PISCINA INFINITA ===================== */
  // deck de madeira
  addFloor(HALF_X * 2 - 2, 20, 0, -25, TEX.deck || lam({ color: 0x8a6a4a }), 0.03);
  // piscina (não entrável — colisor)
  addFloor(12, 8, 0, -28, lam({ color: 0x1a8acc, roughness: 0.05, metalness: 0.4 }), 0.02);
  col(-6, 6, -0.5, 0.0, -32, -24);
  // espreguiçadeiras
  for (const [ex, ez] of [[-12, -22], [12, -22], [-12, -28], [12, -28]]) { addBox(0.8, 0.4, 2.0, lam({ color: 0xf0e8d0 }), ex, 0, ez); }
  // mesa externa
  addBox(2.0, 0.9, 1.0, lam({ color: 0xe0d0b0 }), 0, 0, -20); solids.push({ x0: -1, x1: 1, z0: -20.5, z1: -19.5 });
  // heliponto (H) — decoração
  addBox(0.3, 0.05, 8.0, lam({ color: 0xffffff }), -15, 0, -30, { collide: false });
  addBox(8.0, 0.05, 0.3, lam({ color: 0xffffff }), -15, 0, -30, { collide: false });

  /* MUROS */
  for (const sx of [-HALF_X, HALF_X]) addBox(0.5, 2.5, HALF_Z * 2, lam({ color: 0xe0e0d8 }), sx, 0, 0);
  addBox(HALF_X * 2, 2.5, 0.5, lam({ color: 0xe0e0d8 }), 0, 0, HALF_Z);
  // fundo (lado mar): sem muro — é o penhasco (barreira invisível)
  addBox(HALF_X * 2, 2.0, 0.3, lam({ color: 0x3a3a3a }), 0, 0, -HALF_Z, { collide: false });

  /* GROUND HEIGHT (multinível: mezanino) */
  const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
  function groundHeightAt(x, z) {
    if (x >= MZ.x0 && x <= MZ.x1 && z >= MZ.z0 && z <= MZ.z1) return LAJE_H;
    return 0;
  }

  /* WAYPOINTS */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    const g = groundHeightAt(x, z);
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); } };
  // escada (passo apertado)
  linha(-3, -7.5, -3, -13.5, 0.9);
  // mezanino
  for (const mz of [-12, -9]) linha(-11, mz, 11, mz, 3.0);
  // interior
  for (const iz of [-12, -6, 0, 6]) linha(-14, iz, 14, iz, 3.0);
  // jardim
  for (const jz of [18, 24, 30]) linha(-20, jz, 20, jz, 3.0);
  // terraço
  for (const tz of [-20, -25, -30]) linha(-18, tz, 18, tz, 3.0);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) { if (fromIdx === toIdx) return [toIdx]; const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n); g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1; while (oc > 0) { let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break; if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; } open[cur] = 0; oc--; for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } } } return [fromIdx]; }

  /* SPAWNS: A no PORTÃO (jardim), B no TERRAÇO (piscina) */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 32, yaw: Math.PI })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -22, yaw: 0 })),
  };

  /* CTF */
  const ctfPoints = [
    { id: 'R', label: 'JARDIM',   x: 10,  z: 28 },
    { id: 'E', label: 'SALA',     x: -10, z: 2 },
    { id: 'P', label: 'MEZZO',    x: 8,   z: -11 },
    { id: 'B', label: 'PISCINA',  x: -10, z: -25 },
  ];

  /* ARSENAL */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', 5, 0);       place('m4', -5, -5);
  place('awp', 0, -11);    place('shotgun', 8, -10);
  place('mp5', -10, 25);   place('deagle', 10, 28);
  place('m400', 0, -25);   place('mp5', -12, -22);
  place('deagle', 4, 4);   place('ak', -8, 11);
  place('shotgun', 0, 32); place('m4', 6, -20);

  PB.build(root);
  SKIRT.build(root);

  const D_PIXO = decalIds(T, ['folha-pixaca-01.png']);  // minimal — mansão não tem pixação
  grafitar({ id: 'fy_mansao', root, T, waypoints: nodes, seed: 14000, passo: 1.0, alcance: 4, cobre: 0.01, minLarg: 0.3, bandas: [{ y0: 0.3, y1: 1.5, larg: 1.5, alturas: [0.8], chance: 5, pool: D_PIXO }] });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}

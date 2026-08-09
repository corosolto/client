// CAMPO DO MORRO (fy_campomorro) — spec plans/11-CAMPO-DO-MORRO.md: campo de várzea
// central com BECOS RADIANDO EM TODAS AS DIREÇÕES como uma rosa dos ventos / estrela.
// O pedido do dono: "becos de todos os lados como uma estrela rosa dos ventos".
//
// PLANTA (grid 5×5, cada célula 10 m). H = casa, . = corredor, F = campo:
//   H . . . H       beco NW <──    beco NE ──>
//   . H . H .       
//   . . F . .       ← beco W    CAMPO    beco E →
//   . H . H .       
//   H . . . H       beco SW <──    beco SE ──>
//
// Os vãos formam 4 corredores cardeais (N, S, E, W) + 4 diagonais (zig-zag
// pelas celulas vazias). 8 direções de ataque convergindo no campo central.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 26, HALF_Z = 26;
const CELL = 10;        // cada célula do grid
const GRID = [-2, -1, 0, 1, 2];  // centros: -20, -10, 0, 10, 20
// padrao da estrela: H=casa, .=vão (corredor). Centro = campo.
const STAR = [
  ['H', '.', '.', '.', 'H'],   // z=-20
  ['.', 'H', '.', 'H', '.'],   // z=-10
  ['.', '.', 'F', '.', '.'],   // z=0 (campo)
  ['.', 'H', '.', 'H', '.'],   // z=10
  ['H', '.', '.', '.', 'H'],   // z=20
];

export const CAMPOMORRO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som', 'arquibancada'];

export function buildCampoMorro(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };

  // Override de texturas no browser
  let TEX = { dirt: lam({ map: T.dirt }), concrete: lam({ map: T.concrete }),
    grass: lam({ map: T.grass }), asphalt: lam({ map: T.asphalt }),
    concreteDark: lam({ map: T.concreteDark }) };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 4, ry = 4) => {
      const t = new THREE.TextureLoader().load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    TEX.dirt = lam({ map: load('/img/textures/dirt_field.webp', 6, 6), roughness: 1.0 });
    TEX.wall = lam({ map: load('/img/textures/favela_wall.webp', 2, 2) });
    TEX.asphalt = lam({ map: load('/img/textures/asphalt_br.webp', 6, 6) });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 4, 4) });
  }

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(m);
    }
    return m;
  }
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };

  function paredeTex(pint, crua, seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = pint; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {
      if (rnd() > crua) continue;
      const px = rnd() * S, py = rnd() * S, w = 40 + rnd() * 90, h = 30 + rnd() * 80;
      x.save(); x.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, r = 0.5 + rnd() * 0.6; const fx = px + Math.cos(a) * w * r, fy = py + Math.sin(a) * h * r; k ? x.lineTo(fx, fy) : x.moveTo(fx, fy); }
      x.closePath(); x.clip();
      x.fillStyle = '#8d8377'; x.fillRect(px - w, py - h, w * 2, h * 2);
      for (let r2 = -3; r2 < 4; r2++) for (let k = -2; k < 3; k++) {
        const bx = px + k * 60 + (r2 % 2 ? 30 : 0), by = py + r2 * 30, v = rnd();
        x.fillStyle = `rgb(${146 + v * 44 | 0},${84 + v * 32 | 0},${56 + v * 24 | 0})`; x.fillRect(bx, by, 54, 24);
        x.fillStyle = 'rgba(40,26,20,0.5)'; for (let h2 = 0; h2 < 3; h2++) x.fillRect(bx + 6 + h2 * 15, by + 6, 9, 12);
      }
      x.restore();
    }
    for (let i = 0; i < 14; i++) { const px = rnd() * S; const g = x.createLinearGradient(0, 0, 0, 60 + rnd() * 150); g.addColorStop(0, 'rgba(48,44,38,0.42)'); g.addColorStop(1, 'rgba(48,44,38,0)'); x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 8, 60 + rnd() * 150); }
    const g2 = x.createLinearGradient(0, S * 0.72, 0, S); g2.addColorStop(0, 'rgba(40,50,30,0)'); g2.addColorStop(1, 'rgba(40,50,30,0.25)'); x.fillStyle = g2; x.fillRect(0, S * 0.72, S, S * 0.28);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  const PAREDES = [
    paredeTex('#c4a87a', 0.3, 301), paredeTex('#a89d8a', 0.4, 502),
    paredeTex('#8d6e5a', 0.5, 703), paredeTex('#b0a06a', 0.35, 904),
  ];

  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  if (typeof document !== 'undefined') {
    scene.background = new THREE.TextureLoader().load('/img/textures/sky_rj.webp');
  } else {
    scene.background = T.sky || new THREE.Color(0xb9c6d2);
  }
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_campomorro');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5); sun.position.set(30, 40, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO ===================== */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, TEX.dirt, -0.01);

  /* ===================== GRID DA ESTRELA ===================== */
  for (let gi = 0; gi < 5; gi++) for (let gj = 0; gj < 5; gj++) {
    const cell = STAR[gj][gi];
    if (cell === 'H') {
      const cx = GRID[gi] * CELL / 2, cz = GRID[gj] * CELL / 2;   // -20, -10, 0, 10, 20
      // bloco de casas (2-3 casas por célula, não uma caixa gigante)
      const mi = (gi * 3 + gj * 7) & 3;
      const h = 3.5 + ((gi + gj * 3) % 3) * 0.5;
      const matMat = TEX.wall || PAREDES[mi];
      // casa principal
      addBox(7, h, 7, matMat, cx, 0, cz);
      solids.push({ x0: cx - 3.5, x1: cx + 3.5, z0: cz - 3.5, z1: cz + 3.5 });
      // telhado/laje
      addBox(7.3, 0.12, 7.3, TEX.concreteDark, cx, h, cz, { collide: false });
      // caixa d'água em algumas
      if ((gi + gj) % 2 === 0) addBox(1.8, 1.8, 1.8, lam({ color: 0x1a1a1a }), cx, h, cz, { collide: false });
    } else if (cell === 'F') {
      // campo central — piso de várzea + traves + alambrado
      addFloor(CELL + 6, CELL + 6, GRID[gi] * CELL / 2, GRID[gj] * CELL / 2, TEX.dirt, 0.03);
      const fx = GRID[gi] * CELL / 2, fz = GRID[gj] * CELL / 2;
      // traves
      for (const [gx, gy] of [[fx - 4, fz], [fx + 4, fz]]) {
        addBox(0.1, 2.4, 0.1, lam({ color: 0xffffff }), gx, 0, gy - 3, { collide: false });
        addBox(0.1, 2.4, 0.1, lam({ color: 0xffffff }), gx, 0, gy + 3, { collide: false });
        addBox(0.1, 0.1, 6.2, lam({ color: 0xffffff }), gx, 2.4, gy, { collide: false });
      }
      // container (cover)
      addBox(5, 2.5, 2.5, lam({ color: 0x4a6a4a }), fx + 3, 0, fz + 3);
      solids.push({ x0: fx + 0.5, x1: fx + 5.5, z0: fz + 1.75, z1: fz + 4.25 });
      // banco
      addBox(2.5, 0.5, 0.6, lam({ color: 0x8a6a3a }), fx - 3, 0, fz + 3);
    }
  }

  /* ===================== GALPÃO DO BAILE (num canto, como cover, não como spawn) ===================== */
  {
    const gx = -20, gz = -20;
    addBox(8, 4, 6, TEX.wall || PAREDES[2], gx, 0, gz);
    solids.push({ x0: gx - 4, x1: gx + 4, z0: gz - 3, z1: gz + 3 });
    addBox(8.2, 0.2, 6.2, lam({ color: 0x3a3a3a }), gx, 4, gz, { collide: false });
    addBox(4.0, 2.5, 0.8, lam({ color: 0x1a1a1a }), gx + 2, 0, gz, { collide: false });   // paredão
  }

  /* ===================== COVER nos corredores ===================== */
  // carros nos corredores diagonais
  addBox(1.8, 1.4, 4.0, lam({ color: 0x8a2020, roughness: 0.3, metalness: 0.5 }), -10, 0, 10, { ry: 0.6 });
  addBox(1.8, 1.4, 4.0, lam({ color: 0x202060, roughness: 0.3, metalness: 0.5 }), 10, 0, -10, { ry: 0.6 });
  // caçambas
  addBox(2.0, 1.2, 1.5, lam({ color: 0x2a5a4a }), 0, 0, -10);
  addBox(2.0, 1.2, 1.5, lam({ color: 0x2a5a4a }), 0, 0, 10);

  /* ===================== MUROS EXTERNOS ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, 3, HALF_Z * 2, TEX.concrete, sx, 0, 0);
  for (const sz of [-HALF_Z, HALF_Z])
    addBox(HALF_X * 2, 3, 0.5, TEX.concrete, 0, 0, sz);

  /* ===================== GROUND HEIGHT ===================== */
  const groundHeightAt = () => 0;

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < 1.6 && c.maxY > 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // 4 corredores cardeais (vão de ponta a ponta pelo centro)
  linha(0, -HALF_Z + 2, 0, HALF_Z - 2, 2.0);   // N-S
  linha(-HALF_X + 2, 0, HALF_X - 2, 0, 2.0);   // W-E
  // 4 corredores diagonais (zig-zag pelas celulas vazias)
  linha(-20, -20, -10, -10, 2.0);   linha(-10, -10, 0, 0, 2.0);   linha(0, 0, 10, 10, 2.0);   linha(10, 10, 20, 20, 2.0);   // NW→SE
  linha(20, -20, 10, -10, 2.0);   linha(10, -10, 0, 0, 2.0);   linha(0, 0, -10, 10, 2.0);   linha(-10, 10, -20, 20, 2.0);   // NE→SW
  // corredores secundários (conectando os cardeais)
  for (const z of [-10, 10]) { linha(-20, z, 20, z, 3.0); linha(-10, z, 10, z, 3.0); }
  for (const x of [-10, 10]) { linha(x, -20, x, 20, 3.0); linha(x, -10, x, 10, 3.0); }
  // bordas
  for (const z of [-23, 23]) linha(-23, z, 23, z, 3.0);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n);
    g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1;
    while (oc > 0) {
      let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break;
      if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; }
      open[cur] = 0; oc--;
      for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } }
    }
    return [fromIdx];
  }

  /* ===================== SPAWNS =====================
     E no extremo do corredor SE (z+), B no extremo do corredor NW (z-). */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 22, yaw: Math.PI })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -22, yaw: 0 })),
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'N',     x: 10,  z: -15 },
    { id: 'E', label: 'W',     x: -10, z: -2 },
    { id: 'P', label: 'SE',    x: 10,  z: 10 },
    { id: 'B', label: 'S',     x: -10, z: 15 },
  ];

  /* ===================== ARSENAL ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', -5, 0);     place('m4', 5, 3);
  place('shotgun', 0, 5); place('mp5', -4, -4);
  place('awp', -10, -10); place('m400', 10, 10);
  place('deagle', 0, -10); place('mp5', 0, 10);
  place('ak', 10, 0);     place('shotgun', -10, 0);
  place('mp5', -20, 0);   place('m4', 20, 0);
  place('deagle', 0, -20); place('deagle', 0, 20);

  PB.build(root);
  SKIRT.build(root);

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png', 'personagens-graffiti-02.png', 'personagens-graffiti-03.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-02.png', 'folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'fy_campomorro',
    root, T, waypoints: nodes, seed: 5077, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 71, separacao: 15 },
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6],
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0],
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}

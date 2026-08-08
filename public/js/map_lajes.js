// LAJES (fy_lajes) — spec plans/10-LAJES.md: comunidade carioca em DUAS CAMADAS — lajes
// em cima, becos embaixo. Um time nasce nas lajes e se move pulando de telhado em telhado;
// o outro nos becos e domina o nível da rua. O mapa é a luta pela VERTICAL: quem está em
// cima vê longe mas se expõe; quem está embaixo tem cover mas não vê nada.
//
// PLANTA (eixo longo = z; norte = -z). Duas fileiras de prédios com becos estreitos:
//   ROW N   z ∈ [-35, -10]  lajes a y=3,5 (spawn A no topo)
//   BECO C  z ∈ [-10, 10]   y=0 (corredor central largo, conecta todos os becos)
//   ROW S   z ∈ [10, 35]    lajes a y=3,5 (spawn B embaixo)
//
// O MULTINÍVEL funciona como no havan: cada prédio é SÓLIDO (caixa de y=0 a y=3,5), o topo
// é a laje andável, e os becos correm ENTRE os prédios a y=0. Escadas em 4 pontos conectam
// as camadas. groundHeightAt retorna 3,5 sobre prédios e 0 nos becos.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 22, HALF_Z = 38;
const LAJE_H = 3.5;     // altura da laje (topo do prédio)

// parâmetros de escada (NBR 9077)
const ESC = { espelho: 0.17, piso: 0.29 };
const N_STAIR = Math.round(LAJE_H / ESC.espelho);  // ~21 degraus
const STAIR_RUN = N_STAIR * ESC.piso;               // ~6,1 m

// grid de prédios: cada entrada = { x, z, w, d, h } — footprint + altura
const EDIFICIOS = [];
function predio(x, z, w, d, h = LAJE_H) { EDIFICIOS.push({ x, z, w, d, h }); }

// FILEIRA NORTE (lajes onde o spawn A nasce):
// prédio central LARGO (segura os 4 slots de spawn a 1,5 m da borda) + 2 laterais
predio(-14, -22, 8, 18, LAJE_H);             // NW
predio(0, -22, 12, 18, LAJE_H + 1.5);        // centro (mais alto, spawn A no topo)
predio(14, -22, 8, 18, LAJE_H);              // NE
// FILEIRA SUL (lajes):
predio(-14, 20, 8, 14, LAJE_H);              // SW
predio(0, 20, 8, 14, LAJE_H);               // centro-sul
predio(14, 20, 8, 14, LAJE_H);               // SE
// ilha no beco central (cover)
predio(0, 0, 3, 3, LAJE_H);

export const LAJES_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas'];

export function buildLajes(scene, T) {
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
  const MAT = {
    asphalt: lam({ map: T.asphalt }),
    concrete: lam({ map: T.concrete }),
    concreteDark: lam({ map: T.concreteDark }),
    dirt: lam({ map: T.dirt }),
    grass: lam({ map: T.grass }),
  };

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
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };

  // ---- textura de parede ----
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
    paredeTex('#c4a87a', 0.3, 401), paredeTex('#a89d8a', 0.4, 602),
    paredeTex('#8d6e5a', 0.5, 803), paredeTex('#b0a06a', 0.35, 1004),
  ];

  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  scene.background = T.sky || new THREE.Color(0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_lajes');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5); sun.position.set(25, 45, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X - 5; sun.shadow.camera.right = HALF_X + 5;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO ===================== */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt, -0.01);
  // asfalto no beco central
  addFloor(HALF_X * 2, 20, 0, 0, MAT.asphalt, 0.01);

  /* ===================== PRÉDIOS (caixas sólidas + lajes no topo) ===================== */
  // tabela de footprints para groundHeightAt
  const footprints = [];
  for (let i = 0; i < EDIFICIOS.length; i++) {
    const e = EDIFICIOS[i];
    const mat = PAREDES[i % PAREDES.length];
    // caixa sólida do prédio (colisor + occluder)
    addBox(e.w, e.h, e.d, mat, e.x, 0, e.z);
    solids.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2 });
    // laje no topo (piso andável)
    addFloor(e.w, e.d, e.x, e.z, MAT.concrete, e.h + 0.02);
    // contrapiso da laje (para que a bala não atravesse)
    addBox(e.w, 0.12, e.d, lam({ color: 0x909088 }), e.x, e.h, e.z);
    // mureta de proteção da laje (cover agachado) — 1 m de altura
    for (const [fx, fz, fw, fd] of [
      [e.x, e.z - e.d / 2, e.w, 0.3],
      [e.x, e.z + e.d / 2, e.w, 0.3],
    ]) addBox(fw, 1.0, fd, MAT.concreteDark, fx, e.h, fz);
    footprints.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2, h: e.h });
  }

  /* ===================== COBERTURA NAS LAJES ===================== */
  // caixas d'água (cover alto) — uma em cada laje norte
  for (const ex of [-15, 0, 15]) {
    addBox(2.0, 2.5, 2.0, lam({ color: 0x1a1a1a, roughness: 0.8 }), ex, LAJE_H, -25);
  }
  // antenas (decoração)
  for (const ex of [-7, 7]) addBox(0.08, 3.0, 0.08, lam({ color: 0x2a2a2a, metalness: 0.5 }), ex, LAJE_H, -30, { collide: false });
  // varal (decoração)
  for (const ex of [-15, 0]) { addBox(0.04, 0.04, 4.0, lam({ color: 0x8a8a8a }), ex, LAJE_H + 1.5, -20, { collide: false }); }
  // barraco de obra numa laje sul
  addBox(3.0, 2.0, 3.0, PAREDES[2], 7, LAJE_H, 25);
  solids.push({ x0: 5.5, x1: 8.5, z0: 23.5, z1: 26.5, h: LAJE_H + 2.0 });

  /* ===================== ESCADAS (4 conexões entre camadas) =====================
     Cada escada sobe de y=0 a y=LAJE_H. São o ponto de estrangulamento — posições
     contestáveis dos dois lados. A CTF2 pede ≥ 2 rotas separadas entre cada spawn
     e cada bandeira; as escadas nas pontas leste/oeste dão essa separação. */
  const ESCADAS = [
    { x: -18, z: -10, dir: 1 },   // NW: sobe do beco central pra laje norte
    { x: 18, z: -10, dir: -1 },   // NE
    { x: -18, z: 10, dir: 1 },    // SW
    { x: 18, z: 10, dir: -1 },    // SE
  ];
  function buildStair(sx, sz) {
    const w = 2.5;
    for (let i = 0; i < N_STAIR; i++) {
      const z = sz - i * ESC.piso;
      const y = i * ESC.espelho;
      addBox(w, 0.04, ESC.piso + 0.02, MAT.concrete, sx, y, z);
    }
    // muro lateral da escada
    addBox(0.2, LAJE_H, STAIR_RUN, MAT.concrete, sx - w / 2, 0, sz - STAIR_RUN / 2);
    addBox(0.2, LAJE_H, STAIR_RUN, MAT.concrete, sx + w / 2, 0, sz - STAIR_RUN / 2);
  }
  for (const es of ESCADAS) buildStair(es.x, es.z);

  // registrar zonas de escada para groundHeightAt
  const stairZones = ESCADAS.map((es) => ({
    x0: es.x - 1.25, x1: es.x + 1.25,
    z0: es.z - STAIR_RUN, z1: es.z,
  }));

  /* ===================== MUROS EXTERNOS ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, 4, HALF_Z * 2, MAT.concrete, sx, 0, 0);
  addBox(HALF_X * 2 + 1, 4, 0.5, MAT.concrete, 0, 0, -HALF_Z);
  addBox(HALF_X * 2 + 1, 4, 0.5, MAT.concrete, 0, 0, HALF_Z);

  /* ===================== COVER NOS BECOS ===================== */
  // helper de casa sólida (mesma do quebrada: nenhum interior acessível)
  function casa(x, z, w, d, h, matIdx) {
    const mat = PAREDES[matIdx % PAREDES.length];
    addBox(w, h, d, mat, x, 0, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, h, z, { collide: false });
  }
  // carro velho no beco central
  for (const [cx, cz, cry] of [[-5, 0, 0.1], [6, 2, -0.05]])
    addBox(1.8, 1.4, 4.0, lam({ color: cry > 0 ? 0x8a2020 : 0x202060, roughness: 0.3, metalness: 0.5 }), cx, 0, cz, { ry: cry });
  // caçamba
  addBox(2.0, 1.2, 1.5, lam({ color: 0x2a5a4a }), 0, 0, 5);
  // barraca de camelô
  addBox(2.0, 2.0, 2.0, PAREDES[1], -10, 0, -3);
  solids.push({ x0: -11, x1: -9, z0: -4, z1: -2 });
  // motos encostadas
  for (const [mx, mz] of [[12, -5], [-12, 5]]) addBox(0.8, 1.2, 2.0, lam({ color: 0x1a1a1a }), mx, 0, mz);
  // COVER DO BECO SUL (protege spawn B contra tiros das lajes e do beco central)
  casa(-9, 29, 4, 4, 3.5, 0);
  casa(9, 29, 4, 4, 3.5, 2);
  addBox(6.0, 2.0, 0.5, MAT.concrete, 0, 0, 28);   // mureta divisória entre beco sul e prédios

  /* ===================== GROUND HEIGHT (multinível) ===================== */
  function inFootprint(x, z) {
    for (const f of footprints) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return f.h;
    return 0;
  }
  function inStair(x, z) {
    for (const s of stairZones) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return s;
    return null;
  }
  function groundHeightAt(x, z, yRef) {
    // escada: rampa
    const sz = inStair(x, z);
    if (sz) {
      const t = Math.max(0, Math.min(1, (sz.z1 - z) / (sz.z1 - sz.z0)));
      return LAJE_H * t;
    }
    // laje (topo de prédio)
    const fh = inFootprint(x, z);
    if (fh > 0) return fh;
    // beco (chão)
    return 0;
  }

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    const g = groundHeightAt(x, z);
    // sólidos só bloqueiam no NÍVEL DO CHÃO (g < 1 m). Nas lajes (g = 3,5+), o próprio
    // prédio NÃO é obstáculo — é o chão. Sem isto, todos os waypoints das lajes somem.
    if (g < 1.0) {
      for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true;
    }
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    return false;
  };
  // grade principal (pega becos e lajes)
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // adensamento: becos estreitos entre prédios (não pegam nós da grade 3,4 m)
  // becos z-running entre fileira norte
  for (const bx of [-11, -3.5, 3.5, 11]) linha(bx, -31, bx, -13, 2.0);
  // becos z-running entre fileira sul
  for (const bx of [-11, -3.5, 3.5, 11]) linha(bx, 13, bx, 31, 2.0);
  // beco central (largo)
  for (const bz of [-8, -4, 0, 4, 8]) linha(-20, bz, 20, bz, 3.0);
  // lajes (topos de prédios) — adensamento para cobertura de waypoints
  for (const e of EDIFICIOS) {
    const N = 3;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const lx = e.x - e.w / 2 + (i + 0.5) * e.w / N;
      const lz = e.z - e.d / 2 + (j + 0.5) * e.d / N;
      if (!blocked(lx, lz, 0.3)) nodes.push({ x: lx, z: lz });
    }
  }
  // escadas: passo apertado
  for (const es of ESCADAS) linha(es.x, es.z, es.x, es.z - STAIR_RUN, 0.9);
  // bordas e cantos
  linha(-HALF_X + 1, -HALF_Z + 1, -HALF_X + 1, HALF_Z - 1, 3.0);
  linha(HALF_X - 1, -HALF_Z + 1, HALF_X - 1, HALF_Z - 1, 3.0);
  linha(-HALF_X + 1, HALF_Z - 1, HALF_X - 1, HALF_Z - 1, 3.0);
  // corredores laterais (entre prédios e muro externo) — rotas alternativas para CTF2
  for (const ex of [-HALF_X + 2.5, HALF_X - 2.5]) {
    linha(ex, -35, ex, 35, 3.0);
  }
  // conexões dos corredores laterais com o beco central e beco sul
  for (const ex of [-HALF_X + 2.5, HALF_X - 2.5]) {
    linha(ex, 0, ex - Math.sign(ex) * 3, 0, 2.0);
    linha(ex, 13, ex, 17, 2.0);
    linha(ex, 28, ex - Math.sign(ex) * 3, 28, 2.0);
  }

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
     Time A (E) nas LAJES (norte, alto) — no prédio central largo (x ∈ [-6, 6])
     Time B (B) nos BECOS (sul, baixo) — na área aberta entre os prédios sul e o muro */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -22, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 32, yaw: Math.PI })),
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'LAJE NORTE',  x: 7,   z: -22 },
    { id: 'E', label: 'BECO CENTRAL',x: -7,  z: 0 },
    { id: 'P', label: 'BECO SUL',    x: 7,   z: 15 },
    { id: 'B', label: 'FUNDO SUL',   x: -7,  z: 32 },
  ];

  /* ===================== ARSENAL NO CHÃO ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // lajes norte
  place('ak', -15, -22);   place('m4', 0, -22);
  place('awp', 15, -25);   place('mp5', -7, -28);
  // beco central
  place('shotgun', -5, 0); place('mp5', 6, 2);
  place('deagle', 0, 5);   place('m4', -10, -3);
  // lajes sul
  place('ak', 7, 22);      place('shotgun', -15, 25);
  place('m400', 15, 22);   place('mp5', 0, 28);
  // escadas
  place('deagle', -18, -13); place('deagle', 18, -13);

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
    id: 'fy_lajes',
    root, T, waypoints: nodes, seed: 6088, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
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

// Mapas JSON usam o mesmo contrato de mundo dos mapas autorados.
// Formato, relevo e validação: docs/docs/construtor-de-mapas.md.
import * as THREE from 'three';
import { aplicaSombraSol } from './mapquality.js';
import { hasProp, placeProp } from './mapprops.js';

const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// Degrau que o corpo sobe andando (game.js `_collide`/STEP_H) — o MESMO número que a
// régua de mapa usa (map-check.mjs DEGRAU). É o critério de continuidade da navegação.
const DEGRAU = 0.30;
// Teto de inclinação de rampa: abaixo disto o corpo sobe sem engasgar E o grafo conecta
// com amostragem de 0,45 m (0,55·0,45 = 0,25 < DEGRAU). Acima, a rampa vira parede.
const RAMPA_GRADE_MAX = 0.55;
const DIRS = new Set(['+x', '-x', '+z', '-z']);
// Limita pares da grade e amostras vizinhas; ver SDK-INTEGRATION-2026-10-25.md.
const NAV_WORK_BUDGET = 2 ** 24;

/* Altura da superfície de UMA rampa em (x,z) local-world, ou null fora do footprint. */
function rampYAt(r, x, z) {
  if (x < r.x - r.w / 2 || x > r.x + r.w / 2 || z < r.z - r.d / 2 || z > r.z + r.d / 2) return null;
  let t;
  if (r.dir === '+x') t = (x - (r.x - r.w / 2)) / r.w;
  else if (r.dir === '-x') t = ((r.x + r.w / 2) - x) / r.w;
  else if (r.dir === '+z') t = (z - (r.z - r.d / 2)) / r.d;
  else t = ((r.z + r.d / 2) - z) / r.d;
  return r.rise * clamp01(t);
}

/* O plano puro é compartilhado entre a régua e o builder, incluindo o campo de altura. */
export function planFromJSON(spec) {
  if (!spec || !spec.bounds) throw new Error('spec de mapa JSON sem `bounds`');
  const hx = spec.bounds.x, hz = spec.bounds.z;
  if (![hx, hz, 2 * hx, 2 * hz].every(Number.isFinite) || hx <= 0 || hz <= 0)
    throw new Error('`bounds` precisa de x e z finitos e positivos');
  const wp = spec.waypoints || {};
  const STEP = wp.step === undefined ? 3.4 : wp.step;
  const inset = wp.inset === undefined ? 2 : wp.inset;
  if (!Number.isFinite(STEP) || STEP <= 0) throw new Error('`waypoints.step` precisa ser finito e positivo');
  if (!Number.isFinite(inset) || inset < 0 || inset > Math.min(hx, hz))
    throw new Error('`waypoints.inset` precisa ser finito e ficar dentro dos bounds');
  const spanX = 2 * (hx - inset), spanZ = 2 * (hz - inset);
  const columns = Math.ceil(spanX / STEP) + 1, rows = Math.ceil(spanZ / STEP) + 1;
  const cells = columns * rows;
  const edgeSamples = Math.max(6, Math.ceil(Math.min(STEP * Math.SQRT2, Math.hypot(spanX, spanZ)) / 0.45));
  if (!Number.isSafeInteger(cells) || cells * cells + cells * 8 * edgeSamples > NAV_WORK_BUDGET)
    throw new Error('grade excede o orçamento de navegação; reduza bounds ou ajuste waypoints.step');

  const wall = spec.walls || {};
  const wallH = num(wall.height, 4), wallT = num(wall.thickness, 0.5);
  const wallColor = wall.color || '#5b6169';
  const floor = { color: (spec.floor && spec.floor.color) || '#3a3f45' };

  const colliders = [];
  const navColliders = [];   // só o que bloqueia navegação horizontal: muros + caixas NÃO-walkable
  const boxes = [];
  const addBox = (w, h, d, x, z, color, walkable) => {
    const c = { minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - d / 2, maxZ: z + d / 2 };
    colliders.push(c);
    if (!walkable) navColliders.push(c);
    boxes.push({ w, h, d, x, z, color, walkable: !!walkable });
  };

  // muro perimetral fechado (4 lados) — occluder do mapa por construção, nunca walkable
  addBox(hx * 2 + wallT * 2, wallH, wallT, 0, hz + wallT / 2, wallColor, false);
  addBox(hx * 2 + wallT * 2, wallH, wallT, 0, -hz - wallT / 2, wallColor, false);
  addBox(wallT, wallH, hz * 2, -hx - wallT / 2, 0, wallColor, false);
  addBox(wallT, wallH, hz * 2, hx + wallT / 2, 0, wallColor, false);

  for (const b of spec.boxes || [])
    addBox(num(b.w, 1), num(b.h, 1), num(b.d, 1), num(b.x, 0), num(b.z, 0), b.color || '#7a8089', !!b.walkable);

  // rampas: superfície andável inclinada (NÃO entra em colisor; o campo de altura resolve).
  const ramps = (spec.ramps || []).map((r) => ({
    x: num(r.x, 0), z: num(r.z, 0), w: num(r.w, 2), d: num(r.d, 2),
    rise: num(r.rise, 1), dir: DIRS.has(r.dir) ? r.dir : '+x', color: r.color || '#6b7179',
  }));
  const walkBoxes = boxes.filter((b) => b.walkable);
  const hasElevation = ramps.length > 0 || walkBoxes.length > 0;

  // CAMPO DE ALTURA single-valued: max(piso 0, rampas cobrindo, topo das caixas walkable).
  const heightAt = (x, z) => {
    let h = 0;
    for (const r of ramps) { const y = rampYAt(r, x, z); if (y != null && y > h) h = y; }
    for (const b of walkBoxes)
      if (x > b.x - b.w / 2 && x < b.x + b.w / 2 && z > b.z - b.d / 2 && z < b.z + b.d / 2 && b.h > h) h = b.h;
    return h;
  };

  // zonas lentas (água/lama): slowAt true dentro do retângulo.
  const slowRects = (spec.slow || []).map((s) => ({ x: num(s.x, 0), z: num(s.z, 0), w: num(s.w, 2), d: num(s.d, 2) }));
  const slowAtXZ = (x, z) => slowRects.some((s) => x > s.x - s.w / 2 && x < s.x + s.w / 2 && z > s.z - s.d / 2 && z < s.z + s.d / 2);

  // props GLB: passthrough; a malha é assentada no build, CONDICIONADA ao GLB
  // carregado (placeProp devolve null sem asset). Colisor sem malha reprovaria o MAP4.
  const props = (spec.props || []).map((p) => ({
    id: p.id, x: num(p.x, 0), z: num(p.z, 0), yaw: num(p.yaw, 0),
    h: num(p.h, 2.4), solid: !!p.solid, cw: num(p.cw, 0), cd: num(p.cd, 0),
  }));

  // Invariante (mapjson-props-check): prop sólido CARREGADO bloqueia AQUI, uma única vez,
  // em colliders E navColliders (mundo, spawn e grafo); asset ausente não vira parede fantasma.
  for (const p of props)
    if (p.solid && p.cw > 0 && p.cd > 0 && hasProp(p.id)) {
      const y = heightAt(p.x, p.z);
      const c = { minX: p.x - p.cw / 2, maxX: p.x + p.cw / 2, minY: y, maxY: y + p.h, minZ: p.z - p.cd / 2, maxZ: p.z + p.cd / 2 };
      colliders.push(c); navColliders.push(c);
    }

  // grade de waypoints — bloqueio só por navColliders; altura pelo campo; continuidade ≤ DEGRAU.
  const blocked = (x, z, inflate) => {
    // faixa do corpo relativa ao chão local (heightAt): sólido assentado em plataforma elevada também bloqueia
    const h = heightAt(x, z);
    for (const c of navColliders)
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < h + 1.6 && c.maxY > h + 0.15) return true;
    return false;
  };
  const nodes = [], adj = [];
  // Preserva coordenadas acumuladas nas bordas dos colisores; contadores limitam o trabalho.
  for (let ix = 0, gx = -hx + inset; ix < columns && gx <= hx - inset; ix++, gx += STEP)
    for (let iz = 0, gz = -hz + inset; iz < rows && gz <= hz - inset; iz++, gz += STEP) {
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz, y: heightAt(gx, gz) });
    }
  const segClear = (a, b) => {
    const n = Math.max(6, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.45));
    let hPrev = heightAt(a.x, a.z);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, 0.25)) return false;
      const h = heightAt(x, z);
      if (Math.abs(h - hPrev) > DEGRAU) return false;   // degrau/parede de altura: corta a aresta
      hPrev = h;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) {
    adj.push([]);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz;
      if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j);
    }
  }

  const lado = (arr) => (arr || []).map((s) => ({ x: num(s.x, 0), z: num(s.z, 0), yaw: num(s.yaw, 0) }));
  const spawns = { E: lado(spec.spawns && spec.spawns.E), B: lado(spec.spawns && spec.spawns.B) };
  const ctfPoints = (spec.ctf || []).map((p) => ({ id: p.id, label: p.label, x: num(p.x, 0), z: num(p.z, 0) }));
  const pickups = (spec.pickups || []).map((p) => ({ weapon: p.weapon, x: num(p.x, 0), z: num(p.z, 0) }));
  const bounds = { minX: -hx + 0.5, maxX: hx - 0.5, minZ: -hz + 0.5, maxZ: hz - 0.5 };

  return {
    colliders, navColliders, boxes, ramps, slowRects, props, nodes, adj, spawns, ctfPoints,
    pickups, bounds, wallH, floor, half: { x: hx, z: hz }, heightAt, slowAtXZ, hasElevation,
  };
}

/* validatePlan — a régua de conteúdo. Devolve a lista de problemas (vazia = ok).
   R1 grafo conexo (alcança rampas e topos) · R2 aresta bidirecional · R3 spawn na área
   jogável (dentro dos bounds e fora de sólido não-walkable) · R4 rampa subível. */
export function validatePlan(plan) {
  const problemas = [];

  if (plan.nodes.length === 0) {
    problemas.push('R1 grafo de waypoints vazio');
  } else {
    const visto = new Uint8Array(plan.nodes.length);
    const fila = [0]; visto[0] = 1; let alcancados = 1;
    while (fila.length) {
      const n = fila.shift();
      for (const m of plan.adj[n]) if (!visto[m]) { visto[m] = 1; alcancados++; fila.push(m); }
    }
    if (alcancados !== plan.nodes.length)
      problemas.push(`R1 grafo desconexo: ${alcancados}/${plan.nodes.length} nós alcançáveis a partir do nó 0 (rampa curta demais ou plataforma sem acesso?)`);
  }

  for (let i = 0; i < plan.adj.length; i++)
    for (const j of plan.adj[i])
      if (!plan.adj[j].includes(i)) { problemas.push(`R2 aresta unidirecional ${i}→${j} (sem volta)`); break; }

  const dentroBounds = (x, z) => x > plan.bounds.minX && x < plan.bounds.maxX && z > plan.bounds.minZ && z < plan.bounds.maxZ;
  // "dentro de sólido" = dentro de muro/caixa NÃO-walkable. Spawn no TOPO de caixa walkable é válido.
  // Mesma faixa do blocked relativa ao chão: spawn sob colisor elevado com folga é válido.
  const dentroSolido = (x, z) => { const h = plan.heightAt(x, z);
    return plan.navColliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY < h + 1.6 && c.maxY > h + 0.15); };
  for (const lado of ['E', 'B']) {
    const arr = plan.spawns[lado] || [];
    if (arr.length === 0) { problemas.push(`R3 lado ${lado} sem spawn`); continue; }
    for (const s of arr) {
      if (!dentroBounds(s.x, s.z)) problemas.push(`R3 spawn ${lado} fora dos limites (${s.x}, ${s.z})`);
      else if (dentroSolido(s.x, s.z)) problemas.push(`R3 spawn ${lado} dentro de sólido (${s.x}, ${s.z})`);
    }
  }

  for (const r of plan.ramps || []) {
    if (!(r.rise > 0) || !(r.w > 0) || !(r.d > 0)) { problemas.push(`R4 rampa degenerada (rise=${r.rise}, w=${r.w}, d=${r.d})`); continue; }
    const run = (r.dir === '+x' || r.dir === '-x') ? r.w : r.d;
    const grade = r.rise / run;
    if (grade > RAMPA_GRADE_MAX + 1e-6)
      problemas.push(`R4 rampa íngreme demais em (${r.x}, ${r.z}): grade ${grade.toFixed(2)} > ${RAMPA_GRADE_MAX} — alongue a rampa ou reduza o rise`);
  }

  return problemas;
}

export function validateMapSpec(spec) {
  return validatePlan(planFromJSON(spec));
}

/* propIdsFromSpec — lista única de ids de prop GLB para o preload (MAPS[id].props). */
export function propIdsFromSpec(spec) {
  return [...new Set((spec && spec.props || []).map((p) => p.id).filter(Boolean))];
}

/* Geometria EXATA de uma rampa: caixa com topo inclinado, Y dos 4 cantos vindo do MESMO
   campo de altura que o groundHeightAt usa. Sem chute de rotação — bate com a física. */
function buildRampGeo(r) {
  const yAt = (lx, lz) => rampYAt(r, r.x + lx, r.z + lz) ?? 0;
  const hw = r.w / 2, hd = r.d / 2;
  // 4 cantos topo (XZ, Y do campo) + 4 cantos base (y=0)
  const ax = -hw, bx = hw, az = -hd, bz = hd;
  const tA = yAt(ax, az), tB = yAt(bx, az), tC = yAt(bx, bz), tD = yAt(ax, bz);
  const v = [
    ax, tA, az, bx, tB, az, bx, tC, bz, ax, tD, bz,   // 0..3 topo
    ax, 0, az, bx, 0, az, bx, 0, bz, ax, 0, bz,        // 4..7 base
  ];
  const idx = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* buildMapFromJSON — o loader que game.js enxerga como um `build*()` qualquer.
   RECUSA spec inválido (loud, nunca calado) e devolve o contrato de world completo. */
export function buildMapFromJSON(scene, _T, spec) {
  const problemas = validateMapSpec(spec);
  if (problemas.length) throw new Error(`mapa JSON inválido (${spec.id || '?'}): ${problemas.join(' · ')}`);

  const plan = planFromJSON(spec);
  const root = new THREE.Group(); scene.add(root);
  const lam = (color) => new THREE.MeshLambertMaterial({ color });
  // owned: malhas com geometria/material criados POR ESTE build — clones de placeProp() compartilham o template e ficam de fora.
  const owned = [];

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(plan.half.x * 2, plan.half.z * 2), lam(plan.floor.color));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor); owned.push(floor);

  const occluders = [];
  for (const b of plan.boxes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), lam(b.color));
    m.position.set(b.x, b.h / 2, b.z); m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m); owned.push(m);
  }
  for (const r of plan.ramps) {
    const m = new THREE.Mesh(buildRampGeo(r), lam(r.color));
    m.position.set(r.x, 0, r.z); m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m); owned.push(m);   // bala/bloodspatter batem na rampa como em qualquer superfície
  }
  // zonas lentas: lâmina fina translúcida só para o jogador VER a água (não é occluder nem colisor)
  for (const s of plan.slowRects) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d),
      new THREE.MeshLambertMaterial({ color: '#2b6c8f', transparent: true, opacity: 0.55 }));
    w.rotation.x = -Math.PI / 2; w.position.set(s.x, 0.03, s.z); w.receiveShadow = true; root.add(w); owned.push(w);
  }

  const hemi = new THREE.HemisphereLight(0xf2fbff, 0xb9c6d0, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 45, -6); sun.castShadow = true;
  aplicaSombraSol(sun);
  sun.shadow.camera.left = -Math.max(plan.half.x, plan.half.z) - 6;
  sun.shadow.camera.right = Math.max(plan.half.x, plan.half.z) + 6;
  sun.shadow.camera.top = Math.max(plan.half.x, plan.half.z) + 6;
  sun.shadow.camera.bottom = -Math.max(plan.half.x, plan.half.z) - 6;
  sun.shadow.camera.far = 160; sun.shadow.bias = -0.0004;
  scene.add(sun);

  const groundHeightAt = (x, z) => plan.heightAt(x, z);
  const slowAt = (x, z) => plan.slowAtXZ(x, z);

  // props GLB: assentados no campo de altura. Sem o GLB carregado, placeProp devolve null
  // e nada entra (nem malha nem colisor) — o mapa renderiza antes dos assets existirem.
  for (const p of plan.props) {
    const y = groundHeightAt(p.x, p.z);
    const mesh = placeProp(p.id, { x: p.x, y, z: p.z, ry: p.yaw, targetH: p.h });
    if (!mesh) continue;
    root.add(mesh); occluders.push(mesh);
  }

  const pickups = plan.pickups.map((p) => {
    // caixa-marcador: game.js troca pelo GLB da arma em startGame; assentada no relevo.
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.9), lam('#c9a227'));
    m.position.set(p.x, groundHeightAt(p.x, p.z) + 0.16, p.z); m.castShadow = true; root.add(m); owned.push(m);
    return { weapon: p.weapon, x: p.x, z: p.z, mesh: m };
  });

  const { nodes, adj } = plan;
  function nearestWaypoint(x, z) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1);
    const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) {
      const n = q.shift();
      for (const m of adj[n]) if (prev[m] === -1) {
        prev[m] = n;
        if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; }
        q.push(m);
      }
    }
    return [fromIdx];
  }

  // dispose() é idempotente e só libera o que ESTE build criou (owned + alvo de sombra);
  // texturas de initTextures e recursos dos props são compartilhados e preservados.
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    scene.remove(root); scene.remove(hemi); scene.remove(sun);
    sun.shadow.dispose();
    for (const m of owned) {
      m.geometry?.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x?.dispose()); else mat?.dispose();
    }
  };

  return {
    root, colliders: plan.colliders, occluders, decalSolids: [root], groundHeightAt, slowAt,
    spawns: plan.spawns, sun, hemi, pickups, ctfPoints: plan.ctfPoints, dispose,
    waypoints: { nodes, adj }, nearestWaypoint, findPath, bounds: plan.bounds,
    // relevo: o jogo passa yRef pro groundHeightAt dos bots e confere dy nas arestas.
    layeredNavigation: plan.hasElevation, botLayeredNavigation: plan.hasElevation,
    authoredSpawnYaw: true,
  };
}

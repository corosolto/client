// ============================================================================
// map_json.js — LOADER ÚNICO: MAPA COMO DADO (JSON) EM VEZ DE CÓDIGO.
// ----------------------------------------------------------------------------
// POR QUE EXISTE (issue #210, "conteúdo como dado")
// Mapa hoje é código: cada `map_*.js` é geometria à mão (os cinco maiores somam
// ~9.400 linhas, ~40% do jogo), e cada contribuição de conteúdo vira um PR que
// ninguém revisa de verdade. Aqui o mapa passa a ser um DESCRITOR JSON e o loader
// devolve o MESMO contrato de world que os `build*()` entregam — colliders,
// occluders, spawns, ctfPoints, pickups, grafo de waypoints (nodes+adj),
// nearestWaypoint/findPath, bounds, groundHeightAt, slowAt, luzes.
//
// COMO SE LIGA SEM RAMO CONDICIONAL NO JOGO
// Um mapa JSON entra no registro (maps.js) por um módulo-casca de 3 linhas que
// exporta `build<Nome>(scene, T) = buildMapFromJSON(scene, T, SPEC)` e a lista de
// props (`propIdsFromSpec(SPEC)`). game.js continua chamando `MAPS[id].build(scene,
// T)` sem saber a origem. Nenhum `map_*.js` existente é tocado; os formatos convivem.
//
// A RÉGUA NASCE JUNTO DO FORMATO
// `validateMapSpec`/`validatePlan` conferem o que já quebrou PR de mapa aqui: grafo
// de waypoints conexo (R1), aresta bidirecional (R2), spawn dentro da área jogável
// (R3) e rampa que o corpo consegue subir (R4). O `buildMapFromJSON` RECUSA spec
// inválido em vez de subir mapa quebrado calado — falha silenciosa é a assinatura do
// defeito mais caro deste repo. A régua roda em node puro por `tools/eval/mapjson-check.mjs`.
//
// RELEVO: CAMPO DE ALTURA SINGLE-VALUED
// `groundHeightAt(x, z)` devolve UMA superfície por coluna — o máximo entre piso 0,
// as rampas que cobrem (x,z) e o topo das caixas `walkable`. É DE PROPÓSITO que não
// há andares sobrepostos (mezanino sobre piso no mesmo x,z): isso exige navegação em
// camadas autorada à mão (ver `map_havan.js`) e fica fora do formato de dado. Rampa dá
// elevação que BOT e jogador sobem; topo de caixa `walkable` é superfície só do jogador
// (o bot contorna, como em todo mapa plano de hoje). Relevo de verdade entre andares
// de bot é feito por RAMPA, não por escalar caixa.
//
// FORMATO (descritor JSON)
//   { id, name,
//     bounds: { x, z },                 // semi-eixos; interior [-x,x] × [-z,z]
//     floor:  { color },
//     walls:  { height, thickness, color },   // muro perimetral gerado (fechado)
//     boxes:  [ { w, h, d, x, z, color, walkable } ],  // obstáculo = colisor + occluder;
//                                                      //  walkable:true => topo é piso do jogador
//     ramps:  [ { x, z, w, d, rise, dir, color } ],    // superfície inclinada andável
//                                                      //  dir ∈ '+x'|'-x'|'+z'|'-z' (lado que sobe)
//     slow:   [ { x, z, w, d } ],                      // zona lenta (água/lama): slowAt=true
//     props:  [ { id, x, z, yaw, h, solid, cw, cd } ], // GLB decorativo (placeProp);
//                                                      //  solid:true => colisor cw×h×cd quando carregado
//     spawns: { E: [ { x, z, yaw } ], B: [ … ] },
//     ctf:    [ { id, label, x, z } ],
//     pickups:[ { weapon, x, z } ],
//     waypoints: { step, inset } }             // parâmetros da grade do grafo
// ============================================================================
import * as THREE from 'three';
import { aplicaSombraSol } from './mapquality.js';
import { placeProp } from './mapprops.js';

const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// Degrau que o corpo sobe andando (game.js `_collide`/STEP_H) — o MESMO número que a
// régua de mapa usa (map-check.mjs DEGRAU). É o critério de continuidade da navegação.
const DEGRAU = 0.30;
// Teto de inclinação de rampa: abaixo disto o corpo sobe sem engasgar E o grafo conecta
// com amostragem de 0,45 m (0,55·0,45 = 0,25 < DEGRAU). Acima, a rampa vira parede.
const RAMPA_GRADE_MAX = 0.55;
const DIRS = new Set(['+x', '-x', '+z', '-z']);

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

/* planFromJSON — PURO (sem THREE): traduz o descritor em geometria de navegação,
   colisão e CAMPO DE ALTURA. É o que a régua confere e o que o builder desenha, então
   os dois medem exatamente a mesma superfície. */
export function planFromJSON(spec) {
  if (!spec || !spec.bounds) throw new Error('spec de mapa JSON sem `bounds`');
  const hx = num(spec.bounds.x, 0), hz = num(spec.bounds.z, 0);
  if (hx <= 0 || hz <= 0) throw new Error('`bounds` precisa de x e z positivos');

  const wall = spec.walls || {};
  const wallH = num(wall.height, 4), wallT = num(wall.thickness, 0.5);
  const wallColor = wall.color || '#5b6169';
  const floor = { color: (spec.floor && spec.floor.color) || '#3a3f45' };

  const colliders = [];      // física do jogo: muros + TODAS as caixas (+ props sólidos em runtime)
  const navColliders = [];   // só o que bloqueia navegação horizontal: muros + caixas NÃO-walkable
  const boxes = [];          // {w,h,d,x,z,color,walkable} para o builder THREE
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

  // props GLB: passthrough; malha + colisor são resolvidos no build, CONDICIONADOS ao GLB
  // carregado (placeProp devolve null sem asset). Colisor sem malha reprovaria o MAP4.
  const props = (spec.props || []).map((p) => ({
    id: p.id, x: num(p.x, 0), z: num(p.z, 0), yaw: num(p.yaw, 0),
    h: num(p.h, 2.4), solid: !!p.solid, cw: num(p.cw, 0), cd: num(p.cd, 0),
  }));

  // grade de waypoints — bloqueio só por navColliders; altura pelo campo; continuidade ≤ DEGRAU.
  const STEP = num(spec.waypoints && spec.waypoints.step, 3.4);
  const inset = num(spec.waypoints && spec.waypoints.inset, 2);
  const blocked = (x, z, inflate) => {
    for (const c of navColliders)
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15) return true;
    return false;
  };
  const nodes = [], adj = [];
  for (let gx = -hx + inset; gx <= hx - inset; gx += STEP)
    for (let gz = -hz + inset; gz <= hz - inset; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz, y: heightAt(gx, gz) });
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
  const dentroSolido = (x, z) => plan.navColliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.maxY > 0.15);
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
    0, 2, 1, 0, 3, 2,       // topo
    4, 5, 6, 4, 6, 7,       // base
    0, 1, 5, 0, 5, 4,       // lado az
    1, 2, 6, 1, 6, 5,       // lado bx
    2, 3, 7, 2, 7, 6,       // lado bz
    3, 0, 4, 3, 4, 7,       // lado ax
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

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(plan.half.x * 2, plan.half.z * 2), lam(plan.floor.color));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);

  const occluders = [];
  for (const b of plan.boxes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), lam(b.color));
    m.position.set(b.x, b.h / 2, b.z); m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m);
  }
  for (const r of plan.ramps) {
    const m = new THREE.Mesh(buildRampGeo(r), lam(r.color));
    m.position.set(r.x, 0, r.z); m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m);   // bala/bloodspatter batem na rampa como em qualquer superfície
  }
  // zonas lentas: lâmina fina translúcida só para o jogador VER a água (não é occluder nem colisor)
  for (const s of plan.slowRects) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d),
      new THREE.MeshLambertMaterial({ color: '#2b6c8f', transparent: true, opacity: 0.55 }));
    w.rotation.x = -Math.PI / 2; w.position.set(s.x, 0.03, s.z); w.receiveShadow = true; root.add(w);
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
    if (p.solid && p.cw > 0 && p.cd > 0) {
      plan.colliders.push({ minX: p.x - p.cw / 2, maxX: p.x + p.cw / 2, minY: y, maxY: y + p.h, minZ: p.z - p.cd / 2, maxZ: p.z + p.cd / 2 });
    }
  }

  const pickups = plan.pickups.map((p) => {
    // caixa-marcador: game.js troca pelo GLB da arma em startGame; assentada no relevo.
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.9), lam('#c9a227'));
    m.position.set(p.x, groundHeightAt(p.x, p.z) + 0.16, p.z); m.castShadow = true; root.add(m);
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

  return {
    root, colliders: plan.colliders, occluders, decalSolids: [root], groundHeightAt, slowAt,
    spawns: plan.spawns, sun, hemi, pickups, ctfPoints: plan.ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath, bounds: plan.bounds,
    // relevo: o jogo passa yRef pro groundHeightAt dos bots e confere dy nas arestas.
    layeredNavigation: plan.hasElevation, botLayeredNavigation: plan.hasElevation,
    authoredSpawnYaw: true,
  };
}

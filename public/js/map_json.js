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
// Um mapa JSON entra no registro (maps.js) como um `build` normal:
//   arena_json: { name: 'Arena', build: (scene, T) => buildMapFromJSON(scene, T, spec) }
// game.js continua chamando `MAPS[id].build(scene, T)` sem saber a origem. Nenhum
// `map_*.js` existente é tocado; os dois formatos convivem por construção.
//
// A RÉGUA NASCE JUNTO DO FORMATO
// `validateMapSpec`/`validatePlan` conferem o que já quebrou PR de mapa aqui: grafo
// de waypoints conexo, aresta bidirecional e spawn dentro da área jogável. O
// `buildMapFromJSON` RECUSA spec inválido em vez de subir mapa quebrado calado —
// falha silenciosa é a assinatura do defeito mais caro deste repo. A régua roda em
// node puro por `tools/eval/mapjson-check.mjs`.
//
// FORMATO (descritor JSON)
//   { id, name,
//     bounds: { x, z },                 // semi-eixos; interior [-x,x] × [-z,z]
//     floor:  { color },
//     walls:  { height, thickness, color },   // muro perimetral gerado (fechado)
//     boxes:  [ { w, h, d, x, z, color } ],    // obstáculo = colisor + occluder
//     spawns: { E: [ { x, z, yaw } ], B: [ … ] },
//     ctf:    [ { id, label, x, z } ],
//     pickups:[ { weapon, x, z } ],
//     waypoints: { step, inset } }             // parâmetros da grade do grafo
// ============================================================================
import * as THREE from 'three';

const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);

/* planFromJSON — PURO (sem THREE): traduz o descritor em geometria de navegação e
   colisão. É o que a régua confere e o que o builder desenha, então os dois medem
   exatamente a mesma coisa. */
export function planFromJSON(spec) {
  if (!spec || !spec.bounds) throw new Error('spec de mapa JSON sem `bounds`');
  const hx = num(spec.bounds.x, 0), hz = num(spec.bounds.z, 0);
  if (hx <= 0 || hz <= 0) throw new Error('`bounds` precisa de x e z positivos');

  const wall = spec.walls || {};
  const wallH = num(wall.height, 4), wallT = num(wall.thickness, 0.5);
  const wallColor = wall.color || '#5b6169';
  const floor = { color: (spec.floor && spec.floor.color) || '#3a3f45' };

  const colliders = [];
  const boxes = [];   // {w,h,d,x,z,color} para o builder THREE
  const addBox = (w, h, d, x, z, color) => {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - d / 2, maxZ: z + d / 2 });
    boxes.push({ w, h, d, x, z, color });
  };

  // muro perimetral fechado (4 lados) — occluder do mapa por construção
  addBox(hx * 2 + wallT * 2, wallH, wallT, 0, hz + wallT / 2, wallColor);
  addBox(hx * 2 + wallT * 2, wallH, wallT, 0, -hz - wallT / 2, wallColor);
  addBox(wallT, wallH, hz * 2, -hx - wallT / 2, 0, wallColor);
  addBox(wallT, wallH, hz * 2, hx + wallT / 2, 0, wallColor);

  for (const b of spec.boxes || [])
    addBox(num(b.w, 1), num(b.h, 1), num(b.d, 1), num(b.x, 0), num(b.z, 0), b.color || '#7a8089');

  // grade de waypoints — mesmo padrão dos map_*.js (grade + blocked + segClear)
  const STEP = num(spec.waypoints && spec.waypoints.step, 3.4);
  const inset = num(spec.waypoints && spec.waypoints.inset, 2);
  const blocked = (x, z, inflate) => {
    for (const c of colliders)
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15) return true;
    return false;
  };
  const nodes = [], adj = [];
  for (let gx = -hx + inset; gx <= hx - inset; gx += STEP)
    for (let gz = -hz + inset; gz <= hz - inset; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => {
    for (let i = 1; i < 6; i++) {
      const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, 0.25)) return false;
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

  return { colliders, boxes, nodes, adj, spawns, ctfPoints, pickups, bounds, wallH, floor, half: { x: hx, z: hz } };
}

/* validatePlan — a régua de conteúdo. Devolve a lista de problemas (vazia = ok).
   R1 grafo conexo · R2 aresta bidirecional · R3 spawn na área jogável (dentro dos
   bounds e fora de sólido). */
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
      problemas.push(`R1 grafo desconexo: ${alcancados}/${plan.nodes.length} nós alcançáveis a partir do nó 0`);
  }

  for (let i = 0; i < plan.adj.length; i++)
    for (const j of plan.adj[i])
      if (!plan.adj[j].includes(i)) { problemas.push(`R2 aresta unidirecional ${i}→${j} (sem volta)`); break; }

  const dentroBounds = (x, z) => x > plan.bounds.minX && x < plan.bounds.maxX && z > plan.bounds.minZ && z < plan.bounds.maxZ;
  const dentroSolido = (x, z) => plan.colliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.maxY > 0.15);
  for (const lado of ['E', 'B']) {
    const arr = plan.spawns[lado] || [];
    if (arr.length === 0) { problemas.push(`R3 lado ${lado} sem spawn`); continue; }
    for (const s of arr) {
      if (!dentroBounds(s.x, s.z)) problemas.push(`R3 spawn ${lado} fora dos limites (${s.x}, ${s.z})`);
      else if (dentroSolido(s.x, s.z)) problemas.push(`R3 spawn ${lado} dentro de sólido (${s.x}, ${s.z})`);
    }
  }

  return problemas;
}

export function validateMapSpec(spec) {
  return validatePlan(planFromJSON(spec));
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

  const hemi = new THREE.HemisphereLight(0xf2fbff, 0xb9c6d0, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 45, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -Math.max(plan.half.x, plan.half.z) - 6;
  sun.shadow.camera.right = Math.max(plan.half.x, plan.half.z) + 6;
  sun.shadow.camera.top = Math.max(plan.half.x, plan.half.z) + 6;
  sun.shadow.camera.bottom = -Math.max(plan.half.x, plan.half.z) - 6;
  sun.shadow.camera.far = 160; sun.shadow.bias = -0.0004;
  scene.add(sun);

  const pickups = plan.pickups.map((p) => {
    // caixa-marcador: game.js troca pelo GLB da arma em startGame
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.9), lam('#c9a227'));
    m.position.set(p.x, 0.16, p.z); m.castShadow = true; root.add(m);
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

  const groundHeightAt = () => 0;
  const slowAt = () => false;

  return {
    root, colliders: plan.colliders, occluders, decalSolids: [root], groundHeightAt, slowAt,
    spawns: plan.spawns, sun, hemi, pickups, ctfPoints: plan.ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath, bounds: plan.bounds,
  };
}

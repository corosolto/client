/* Runtime browser: Game._updatePlayer/_collide movem o corpo. Raios por frame
   amostram o envelope, não uma cápsula contínua. Não aprova estética ou FPS.
   UV removido: a razão 17,24 do baseline media o piso, não os espelhos alterados. */
export async function probeRuntime(physics) {
  const THREE = await import('three');
  const g = window.__game, W = g?.world, p = g?.player;
  const require = (condition, message) => { if (!condition) throw Error(message); };
  require(W && p && typeof g._updatePlayer === 'function', 'Game real indisponível');
  require(W.waypoints?.nodes?.length && W.waypoints?.adj?.length, 'Grafo ausente');
  require(W.ctfPoints?.length === 4 && W.pickups?.length > 0, 'Objetivos/pickups ausentes');
  require(W.occluders?.length > 0 && W.colliders?.length > 0, 'Colisores/oclusores ausentes');
  require(physics && [physics.stepHeight, physics.riserHeight, physics.ctfRadius].every(v => Number.isFinite(v) && v > 0), 'Constantes físicas do fonte ausentes');
  const DT = 1 / 60, RADIUS = .38, EYE = 1.62, ARRIVAL = .13;
  const finitePosition = v => [v.x, v.y, v.z].every(Number.isFinite);
  const visible = object => {
    for (let o = object; o; o = o.parent) if (!o.visible) return false;
    return true;
  };
  const describe = object => ({ uuid: object.uuid, name: object.name, type: object.type });
  const eyeAt = (x, z) => new THREE.Vector3(x, W.groundHeightAt(x, z) + EYE, z);
  const originals = Object.fromEntries(['update', '_updateBot', '_checkCtfAlvo', '_checkPace', '_collide'].map(k => [k, g[k]]));
  const playerState = Object.fromEntries(Object.entries(p).map(([key, value]) => [key, value?.isVector3 ? value.clone() : value]));
  const gameState = Object.fromEntries(['time', 'keys', '_smokes', 'touchMove', 'mouseDown0', 'state', '_spaceHeld'].map(k => [k, g[k]]));
  let activeRun = null;
  g.update = () => {};
  g._updateBot = () => {};
  g._checkCtfAlvo = () => {};
  g._checkPace = () => {};
  g._smokes = []; g.keys = {}; g.touchMove = null; g.mouseDown0 = false; g.state = 'live';
  g._collide = function (pos, radius) {
    const before = pos.clone();
    originals._collide.call(this, pos, radius);
    if (activeRun && pos === p.pos) {
      const correction = Math.hypot(pos.x - before.x, pos.z - before.z);
      activeRun.collisionCalls++;
      if (correction > 1e-6) {
        activeRun.contacts++; activeRun.correctionMetres += correction;
        if (activeRun.contactSamples.length < 8) activeRun.contactSamples.push({ before: before.toArray(), after: pos.toArray(), correction });
      }
    }
  };
  try {
    W.root.updateMatrixWorld(true);
    const varais = [];
    W.root.traverse(object => {
      if (!object.userData.escadaoVaral || !visible(object)) return;
      const box = new THREE.Box3().setFromObject(object);
      require(!box.isEmpty() && finitePosition(box.min) && finitePosition(box.max), 'Varal sem geometria mensurável');
      varais.push({ ...describe(object), id: object.userData.escadaoVaral, min: box.min.toArray(), max: box.max.toArray() });
    });
    require(varais.length >= 5, `Varais insuficientes: ${varais.length}; contrato exige pelo menos 5`);

    // after-review5: os únicos 2 headHits eram o mesmo SkinnedMesh Cat, congelado
    // a y=6.4786 enquanto os pés passavam a y=6.12. AmbientLife move esses animais
    // e marca seus meshes nonSolidSurface. Eles não são arquitetura estática.
    // Exclui somente descendentes dos roots registrados, nunca por nome ou por uma
    // isenção genérica de GLB/nonSolidSurface. _collide e todos os props permanecem.
    const dynamicMeshes = new WeakMap(), dynamicExclusions = [];
    require(W.ambience?.animals?.length > 0, 'Fauna registrada ausente: não inferir exclusões por nome');
    for (const animal of W.ambience.animals) {
      const root = animal.root;
      require(root?.isObject3D && root !== W.root, `Root de fauna inválido: ${animal.id}`);
      let inWorld = false;
      for (let parent = root.parent; parent; parent = parent.parent) if (parent === W.root) inWorld = true;
      require(inWorld, `Fauna fora do mundo medido: ${animal.id}`);
      const entry = { id: animal.id, type: animal.type, source: animal.source, root: describe(root), meshes: [], excludedVisibleMeshes: 0 };
      root.traverse(object => {
        require(!W.occluders.includes(object), `Fauna virou occluder: ${animal.id}/${object.uuid}`);
        if (!object.isMesh) return;
        require(object.userData.nonSolidSurface === true, `Fauna sem semântica não sólida: ${animal.id}/${object.uuid}`);
        require(!dynamicMeshes.has(object), `Mesh de fauna registrado duas vezes: ${object.uuid}`);
        dynamicMeshes.set(object, entry);
        entry.meshes.push(describe(object));
      });
      require(entry.meshes.length > 0, `Fauna registrada sem malha: ${animal.id}`);
      dynamicExclusions.push(entry);
    }

    // Grade só prefiltra AABBs; os hits continuam contra os triângulos desenhados.
    const grid = new Map(), meshBoxes = new WeakMap(), CELL = 4, bounds = W.bounds;
    let meshCount = 0;
    W.root.traverse(object => {
      if (!object.isMesh || !visible(object)) return;
      const dynamic = dynamicMeshes.get(object);
      if (dynamic) { dynamic.excludedVisibleMeshes++; return; }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (!materials.some(m => m && m.visible !== false)) return;
      const box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) return;
      require(finitePosition(box.min) && finitePosition(box.max), 'Mesh com limites não finitos');
      const entry = { object, box }; meshCount++;
      meshBoxes.set(object, box);
      const x0 = Math.floor(Math.max(box.min.x, bounds.minX - RADIUS) / CELL);
      const x1 = Math.floor(Math.min(box.max.x, bounds.maxX + RADIUS) / CELL);
      const z0 = Math.floor(Math.max(box.min.z, bounds.minZ - RADIUS) / CELL);
      const z1 = Math.floor(Math.min(box.max.z, bounds.maxZ + RADIUS) / CELL);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const key = `${x},${z}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(entry);
      }
    });
    require(meshCount > 0, 'Nenhuma malha para medir apoio/headroom');
    const ray = new THREE.Raycaster(), origin = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
    const shoulders = [[0, 0], [RADIUS, 0], [-RADIUS, 0], [0, RADIUS], [0, -RADIUS]];
    const rayHit = (x, y, z, direction, far, accept = () => true) => {
      const candidates = grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) || [];
      const y2 = y + direction.y * far;
      const meshes = candidates.filter(({ box }) => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z
        && box.max.y >= Math.min(y, y2) && box.min.y <= Math.max(y, y2)).map(e => e.object);
      ray.set(origin.set(x, y, z), direction); ray.near = 0; ray.far = far;
      return ray.intersectObjects(meshes, false).find(hit => {
        const mat = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
        return mat && mat.visible !== false && accept(hit);
      });
    };
    const bodySample = run => {
      const position = p.pos.toArray();
      run.trace.push(position);
      if (!rayHit(p.pos.x, p.pos.y + .30, p.pos.z, down, .61)) {
        run.unsupported++;
        if (run.supportSamples.length < 8) run.supportSamples.push(position);
      }
      for (const [dx, dz] of shoulders) {
        const x = p.pos.x + dx, z = p.pos.z + dz;
        const localFloor = W.groundHeightAt(x, z, p.pos.y);
        const hit = rayHit(x, p.pos.y + .31, z, up, EYE - .31, candidate => {
          const box = meshBoxes.get(candidate.object);
          // O ombro dianteiro cruza o piso do próximo degrau antes de o pé subir.
          // Só exclui massa baixa que acompanha o piso físico e cabe num espelho.
          const stepSurface = localFloor > p.pos.y && localFloor - p.pos.y <= physics.stepHeight
            && candidate.point.y <= p.pos.y + physics.stepHeight
            && box.max.y - box.min.y <= physics.riserHeight + 1e-6
            && box.max.y <= localFloor + physics.riserHeight + 1e-6
            && g._retaAndavel(p.pos.x, p.pos.z, x, z, RADIUS, physics.stepHeight);
          if (stepSurface) {
            run.stepSurfaceHits++;
            if (run.stepSurfaceSamples.length < 4) run.stepSurfaceSamples.push({ position, offset: [dx, dz], localFloor, point: candidate.point.toArray(), meshTop: box.max.y });
          }
          return !stepSurface;
        });
        if (hit) {
          run.headHits++;
          if (run.headSamples.length < 8) run.headSamples.push({ position, offset: [dx, dz], object: describe(hit.object), point: hit.point.toArray() });
        }
      }
      for (const v of varais) {
        const nx = Math.max(v.min[0], Math.min(p.pos.x, v.max[0]));
        const nz = Math.max(v.min[2], Math.min(p.pos.z, v.max[2]));
        if (Math.hypot(nx - p.pos.x, nz - p.pos.z) < RADIUS && v.min[1] < p.pos.y + EYE && v.max[1] > p.pos.y + .30) {
          run.varalHits++;
          if (run.varalSamples.length < 8) run.varalSamples.push({ position, uuid: v.uuid, id: v.id });
        }
      }
    };
    const reset = ([x, z], walk) => {
      p.pos.set(x, W.groundHeightAt(x, z), z); p.vel.set(0, 0, 0);
      p.grounded = true; p.mantle = null; p.crouchF = 0; p.scoped = false;
      p.hp = 100; p.alive = true; p.pitch = 0;
      p.jumpBufferedUntil = 0; p.coyoteUntil = 0; g._spaceHeld = false;
      g.keys = { KeyW: true, ShiftLeft: walk };
    };
    const inTargetRange = target => target && Math.hypot(p.pos.x - target.x, p.pos.z - target.z) <= target.radius;
    const runLeg = (id, points, { walk = false, reverse = false, category = 'stairs', target = null } = {}) => {
      const run = { id, category, reverse, walk, start: p.pos.toArray(), end: null, seconds: 0, frames: 0, collisionCalls: 0,
        contacts: 0, correctionMetres: 0, contactSamples: [], unsupported: 0, supportSamples: [], headHits: 0, headSamples: [],
        varalHits: 0, varalSamples: [], maxSpeed: 0, distance: 0, stationaryFrames: 0, mantleFrames: 0,
        stepSurfaceHits: 0, stepSurfaceSamples: [], maxNoProgressFrames: 0, stalled: false, target, failed: null, trace: [] };
      activeRun = run;
      bodySample(run);
      const segments = [];
      let from = [p.pos.x, p.pos.z];
      for (const target of points) {
        const count = Math.max(1, Math.ceil(Math.hypot(target[0] - from[0], target[1] - from[1]) / 6));
        for (let i = 1; i <= count; i++) segments.push([from[0] + (target[0] - from[0]) * i / count, from[1] + (target[1] - from[1]) * i / count]);
        from = target;
      }
      for (const [segmentIndex, [tx, tz]] of segments.entries()) {
        if (inTargetRange(target)) break;
        require(Number.isFinite(tx) && Number.isFinite(tz), 'Destino inválido');
        // Um waypoint na borda do alcance não concede os 13 cm de tolerância para fora.
        const reached = () => target && segmentIndex === segments.length - 1
          ? inTargetRange(target) : Math.hypot(tx - p.pos.x, tz - p.pos.z) <= ARRIVAL;
        let frames = 0, noProgress = 0, bestDistance = Math.hypot(tx - p.pos.x, tz - p.pos.z);
        // Watchdog operacional herdado: 10 s por segmento. Não é limite de qualidade/FPS.
        while (!inTargetRange(target) && !reached() && frames < 600) {
          const old = p.pos.clone();
          p.yaw = Math.atan2(p.pos.x - tx, p.pos.z - tz);
          g.time += DT; g._updatePlayer(DT); frames++; run.frames++;
          if (!finitePosition(p.pos) || !finitePosition(p.vel)) { run.failed = { reason: 'nonfinite', target: [tx, tz] }; break; }
          const distance = Math.hypot(p.pos.x - old.x, p.pos.z - old.z);
          run.distance += distance; run.maxSpeed = Math.max(run.maxSpeed, distance / DT);
          if (distance < .001) run.stationaryFrames++;
          if (p.mantle) run.mantleFrames++;
          const remaining = Math.hypot(tx - p.pos.x, tz - p.pos.z);
          if (remaining < bestDistance - 1e-6) { bestDistance = remaining; noProgress = 0; } else noProgress++;
          run.maxNoProgressFrames = Math.max(run.maxNoProgressFrames, noProgress);
          bodySample(run);
        }
        if (run.failed) break;
        if (!inTargetRange(target) && !reached()) {
          run.stalled = noProgress > 0;
          run.failed = { reason: 'segment-timeout', target: [tx, tz], position: p.pos.toArray() }; break;
        }
      }
      run.seconds = run.frames * DT; run.end = p.pos.toArray();
      if (!run.failed && (!run.frames || !run.collisionCalls)) run.failed = { reason: 'empty-traversal' };
      activeRun = null;
      return run;
    };
    const routes = [
      ['central', [[1.2, 13.8], [1.2, 8.5], [1.2, 1.5], [1.2, -6.4], [1.2, -9]]],
      ['oeste', [[-12, 13.5], [-12, 6.5], [-12, 0], [-12, -6.4], [-12, -9]]],
      ['leste', [[12, 13.5], [12, 6.1], [8.1, 6.1], [8.1, 8.5], [1.2, 8.5]]],
    ];
    const results = [];
    for (const [id, points] of routes) for (const walk of [false, true]) {
      reset(points[0], walk);
      results.push(runLeg(id, points.slice(1), { walk }));
      // Retorno da chegada observada, sem teleporte nem limpeza de velocidade.
      results.push(runLeg(id, points.slice(0, -1).reverse(), { walk, reverse: true }));
    }

    // RetaAndavel valida ARESTAS; alcance exige caminho conectado + caminhada real.
    const nodes = W.waypoints.nodes, adjacency = W.waypoints.adj, edgeCache = new Map();
    const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const bodyFree = point => {
      const sample = new THREE.Vector3(point.x, W.groundHeightAt(point.x, point.z), point.z);
      const before = sample.clone();
      g._collide(sample, RADIUS);
      return finitePosition(sample) && sample.distanceTo(before) <= 1e-3;
    };
    const straight = (a, b) => bodyFree(a) && bodyFree(b)
      && g._retaAndavel(a.x, a.z, b.x, b.z, RADIUS, physics.stepHeight);
    const edge = (a, b) => {
      const key = `${a}:${b}`;
      if (!edgeCache.has(key)) edgeCache.set(key, straight(nodes[a], nodes[b]));
      return edgeCache.get(key);
    };
    let localConnectorSearches = 0;
    const connectors = point => {
      const candidates = nodes.map((node, i) => ({ i, d: distance(node, point) }))
        .sort((a, b) => a.d - b.d).slice(0, 24);
      const found = new Map();
      for (const { i } of candidates) if (straight(point, nodes[i])) found.set(i, [[point.x, point.z], [nodes[i].x, nodes[i].z]]);
      if (found.size || !bodyFree(point)) return found;
      // Um prop entre o corpo e o waypoint exige uma curva, não torna o alvo inalcançável.
      // Grade de 25 cm igual a pickup-check; 3 m é orçamento local do planejador.
      localConnectorSearches++;
      const queue = [{ x: point.x, z: point.z, ix: 0, iz: 0, path: [[point.x, point.z]] }];
      const seen = new Set(['0:0']);
      for (let cursor = 0; cursor < queue.length && found.size < 4; cursor++) {
        const at = queue[cursor];
        for (const { i } of candidates) if (!found.has(i) && straight(at, nodes[i])) found.set(i, [...at.path, [nodes[i].x, nodes[i].z]]);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ix = at.ix + dx, iz = at.iz + dz, key = `${ix}:${iz}`;
          if (Math.abs(ix) > 12 || Math.abs(iz) > 12 || seen.has(key)) continue;
          const next = { x: point.x + ix * .25, z: point.z + iz * .25, ix, iz };
          if (!straight(at, next)) continue;
          seen.add(key); queue.push({ ...next, path: [...at.path, [next.x, next.z]] });
        }
      }
      return found;
    };
    const plan = (from, target) => {
      if (straight(from, target)) return [[target.x, target.z]];
      const starts = connectors(from), goals = connectors(target);
      if (!starts.size || !goals.size) return null;
      const queue = [...starts.keys()], parents = new Map(queue.map(i => [i, null]));
      let found = null;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const at = queue[cursor];
        if (goals.has(at)) { found = at; break; }
        for (const next of adjacency[at] || []) {
          require(Number.isInteger(next), 'Adjacência inesperada: registrar o formato antes de planejar');
          if (parents.has(next) || !nodes[next] || !edge(at, next)) continue;
          parents.set(next, at); queue.push(next);
        }
      }
      if (found === null) return null;
      const indices = [];
      for (let at = found; at !== null; at = parents.get(at)) indices.push(at);
      indices.reverse();
      return [...starts.get(indices[0]), ...indices.slice(1).map(i => [nodes[i].x, nodes[i].z]), ...[...goals.get(found)].reverse().slice(1)];
    };
    const targets = [
      ...W.ctfPoints.map(t => ({ ...t, radius: g.ctfPts.find(pt => pt.id === t.id)?.r ?? physics.ctfRadius, id: `ctf:${t.id}`, kind: 'ctf' })),
      ...W.pickups.map((t, i) => ({ x: t.x, z: t.z, radius: 1, id: `map:${i}:${t.weapon}`, kind: 'pickup' })),
      ...(g.drops || []).filter(t => t.rack).map((t, i) => ({ x: t.x, z: t.z, radius: 1, id: `rack:${i}:${t.weapon}`, kind: 'pickup' })),
    ];
    require(targets.filter(t => t.id.startsWith('rack:')).length > 0, 'Armários ausentes: não omitir rack');
    const circulation = [], spawnLinks = [], breadcrumbFallbacks = [];
    const regressionOrder = ['map:1:shotgun', 'map:3:deagle', 'map:2:mp5'];
    for (const [team, slots] of Object.entries(W.spawns)) {
      require(slots.length > 0, `Spawn ${team} vazio`);
      const start = slots[0];
      for (let i = 0; i < slots.length; i++) spawnLinks.push({ team, slot: i, planned: !!plan(slots[i], start) });
      reset([start.x, start.z], false);
      const breadcrumbs = [p.pos.toArray()];
      const planFromCurrent = (target, targetId) => {
        if (!bodyFree(target)) return null;
        const direct = plan(p.pos, target);
        if (direct) return direct;
        // after-review3: a deagle foi alcançada, mas os 5 waypoints locais são uma ilha.
        // Reverte somente trechos realmente percorridos, revalidados com o corpo atual.
        const retreat = [];
        let cursor = { x: p.pos.x, z: p.pos.z };
        for (let i = breadcrumbs.length - 1; i >= 0; i--) {
          const [x, , z] = breadcrumbs[i], anchor = { x, z };
          if (distance(cursor, anchor) < .25 || !straight(cursor, anchor)) continue;
          retreat.push([x, z]); cursor = anchor;
          const continuation = plan(anchor, target);
          if (!continuation) continue;
          breadcrumbFallbacks.push({ team, targetId, from: p.pos.toArray(), join: [x, z], retreatPoints: retreat.length });
          return [...retreat, ...continuation];
        }
        return null;
      };
      const pending = [...targets], visits = [];
      while (pending.length) {
        const priority = target => {
          const index = regressionOrder.indexOf(target.id);
          return index < 0 ? regressionOrder.length : index;
        };
        pending.sort((a, b) => priority(a) - priority(b) || distance(p.pos, a) - distance(p.pos, b));
        const target = pending.shift();
        if (inTargetRange(target) && bodyFree(p.pos)) {
          visits.push({ id: target.id, failed: null, distance: distance(p.pos, target), position: p.pos.toArray(), alreadyInReach: true });
          continue;
        }
        // Alvo é a região de interação, não o centro possivelmente ocupado por um prop.
        const candidates = [{ x: target.x, z: target.z }];
        for (const factor of [.75, 1]) for (let i = 0; i < 8; i++) candidates.push({ x: target.x + target.radius * factor * Math.cos(i * Math.PI / 4), z: target.z + target.radius * factor * Math.sin(i * Math.PI / 4) });
        candidates.push(...nodes.filter(node => distance(node, target) <= target.radius));
        candidates.sort((a, b) => distance(p.pos, a) - distance(p.pos, b));
        let path = null;
        for (const candidate of candidates) { path = planFromCurrent(candidate, target.id); if (path) break; }
        if (!path) { visits.push({ id: target.id, failed: { reason: 'planner-no-path', target: [target.x, target.z] } }); continue; }
        const run = runLeg(`${team}:${target.id}`, path, { category: 'circulation', target });
        breadcrumbs.push(...run.trace.slice(1));
        if (!run.failed && (!inTargetRange(target) || !bodyFree(p.pos))) run.failed = { reason: 'invalid-arrival', distance: distance(p.pos, target), bodyFree: bodyFree(p.pos) };
        visits.push({ id: target.id, failed: run.failed, distance: distance(p.pos, target), position: p.pos.toArray() }); results.push(run);
        if (run.failed) break;
      }
      const returnPath = planFromCurrent(start, 'return');
      const back = returnPath ? runLeg(`${team}:return`, returnPath, { category: 'circulation', reverse: true }) : null;
      if (back) results.push(back);
      circulation.push({ team, expectedVisits: targets.length, visits, returned: !!back && !back.failed, returnFailure: back?.failed || (!back ? 'planner-no-path' : null) });
    }

    const spawnSightlines = [], flankSightlines = [];
    for (const e of W.spawns.E) for (const b of W.spawns.B) spawnSightlines.push({ from: [e.x, e.z], to: [b.x, b.z], clear: g._losClear(eyeAt(e.x, e.z), eyeAt(b.x, b.z)) });
    for (const [x, z] of [[-9, 8.5], [9, 8.5]]) for (const slots of Object.values(W.spawns)) for (const spawn of slots) {
      flankSightlines.push({ from: [x, z], to: [spawn.x, spawn.z], clear: g._losClear(eyeAt(x, z), eyeAt(spawn.x, spawn.z)) });
    }
    return {
      varais, results, circulation, spawnLinks, breadcrumbFallbacks, targets: targets.map(({ id, kind, x, z, radius }) => ({ id, kind, x, z, radius })),
      los: { spawnSightlines, flankSightlines },
      measurement: { dt: DT, radius: RADIUS, eye: EYE, arrival: ARRIVAL, rayOffsets: shoulders, meshCount, broadphaseCells: grid.size,
        physics, regressionOrder, dynamicExclusions, expectedStairRuns: routes.length * 4, edgeChecks: edgeCache.size, localConnectorSearches, weapon: p.weapon, fov: g.camera.fov, quality: g.settings.quality },
      limitations: [
        'Headroom: cinco raios verticais por frame; não é cápsula contínua nem prova exaustiva de quinas.',
        'Apoio/headroom estático excluem somente meshes não sólidos dos roots W.ambience.animals identificados em dynamicExclusions; não medem contato visual transitório com fauna.',
        'Circulação exige corpo livre no raio CTF real ou a 1 m da arma; não aciona captura nem seleção/coleta por E.',
        'Dois slots de spawn são percorridos; demais slots têm conexão no grafo com arestas _retaAndavel.',
        'Planejador usa 24 waypoints próximos e conectores locais em grade de 25 cm até 3 m; planner-no-path é cobertura pendente.',
        'Ilhas de waypoints usam retorno pelos breadcrumbs reais, com cada trecho revalidado antes de percorrer; não há teleporte.',
        'LOS usa somente observadores/pontos registrados; não aprova equilíbrio competitivo global.',
        'Fauna permanece na pose carregada e fora da grade estática; movimento/reação dependem do gate ambience, e distração sob combate/FPS requerem captura separada.',
        'Não mede UV de espelhos, estética, dia/noite ou desempenho. Relógio simulado não é FPS.',
      ],
    };
  } finally {
    activeRun = null;
    for (const [key, value] of Object.entries(originals)) g[key] = value;
    for (const [key, value] of Object.entries(playerState)) {
      if (value?.isVector3 && p[key]?.isVector3) p[key].copy(value); else p[key] = value;
    }
    Object.assign(g, gameState);
  }
}

/* EV7: duas rotas devem oferecer uma interrupção com espaço para o corpo;
   o eixo central pode manter sua linha de tiro. Não há teto de metros de exposição
   no contrato: os intervalos ficam no recibo, sem alegar equilíbrio competitivo.
   Alto→spawn replica ALTO/FORA/GRID_LOS/R de escadao-rota-check, tolerância zero.
   Separado da caminhada para poder repetir a mesma amostra no mutante de abrigo. */
export async function probeSightlines({ contract, routes, radius }) {
  const THREE = await import('three');
  const g = window.__game, W = g?.world;
  if (!W || !routes || routes.length !== 3 || !(radius > 0)
    || !Object.values(contract).every(v => Number.isFinite(v) && v > 0)) throw Error('EV7: contrato/amostra ausente');
  const { high, outside, grid, losGrid, bodyRadius, eye } = contract;
  const savedSmokes = g._smokes;
  g._smokes = [];
  try {
    W.root.updateMatrixWorld(true);
    const eyeAt = (x, z) => new THREE.Vector3(x, W.groundHeightAt(x, z) + eye, z);
    const free = (x, z, r) => {
      const p = new THREE.Vector3(x, W.groundHeightAt(x, z), z);
      g._collide(p, r);
      return Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3;
    };
    const shelters = [];
    W.root.traverse(object => {
      if (!object.userData.escadaoAbrigo) return;
      const box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) throw Error('EV7: abrigo marcado sem geometria');
      shelters.push({ uuid: object.uuid, name: object.name, active: W.occluders.includes(object), min: box.min.toArray(), max: box.max.toArray() });
    });
    if (!shelters.length) throw Error('EV7: abrigos do contrato ausentes');

    // Amostra o caminho realmente percorrido a cada raio do corpo; mede comprimentos
    // pela distância percorrida, não pelo número arbitrário de waypoints do autor.
    const sampledRoutes = routes.map(({ id, trace }) => {
      if (!Array.isArray(trace) || trace.length < 2) throw Error(`EV7: rota vazia ${id}`);
      const samples = [{ position: trace[0], metres: 0 }];
      let metres = 0;
      for (let i = 1; i < trace.length; i++) {
        metres += Math.hypot(trace[i][0] - trace[i - 1][0], trace[i][2] - trace[i - 1][2]);
        if (metres - samples.at(-1).metres >= radius || i === trace.length - 1) samples.push({ position: trace[i], metres });
      }
      return { id, length: metres, samples };
    });
    const observers = [[-12, -12], [0, -12], [12, -12], ...W.spawns.B.map(s => [s.x, s.z])];
    const highSightlines = observers.map(([x, z]) => {
      if (!free(x, z, radius)) throw Error(`EV7: observador alto dentro de colisor (${x},${z})`);
      const views = sampledRoutes.map(route => {
        const samples = route.samples.map(sample => ({ ...sample, clear: g._losClear(eyeAt(x, z), eyeAt(sample.position[0], sample.position[2])) }));
        const intervals = [];
        for (const sample of samples) {
          const last = intervals.at(-1);
          if (last && last.clear === sample.clear) last.end = sample.metres;
          else intervals.push({ clear: sample.clear, start: sample.metres, end: sample.metres });
        }
        for (const interval of intervals) interval.length = interval.end - interval.start;
        const longest = clear => Math.max(0, ...intervals.filter(i => i.clear === clear).map(i => i.length));
        return { id: route.id, length: route.length, samples, intervals, longestExposed: longest(true), longestProtected: longest(false),
          interrupted: longest(false) >= 2 * radius };
      });
      return { from: [x, z], routes: views, interruptedRoutes: views.filter(r => r.interrupted).length };
    });

    // Mesma origem/alinhamento e tolerância da régua contratual; só os raios usam
    // os GLBs/occluders carregados no navegador. Guarda observadores e pares abertos.
    const x0 = Math.ceil((W.bounds.minX + bodyRadius + .1) / grid) * grid;
    const z0 = Math.ceil((W.bounds.minZ + bodyRadius + .1) / grid) * grid;
    const x1 = Math.floor((W.bounds.maxX - bodyRadius - .1) / grid) * grid;
    const z1 = Math.floor((W.bounds.maxZ - bodyRadius - .1) / grid) * grid;
    const spawnProtection = [];
    for (const [team, slots] of Object.entries(W.spawns)) {
      const floor = Math.min(...slots.map(s => W.groundHeightAt(s.x, s.z)));
      const observations = [];
      let pairs = 0, exposedPairs = 0;
      for (let x = x0; x <= x1; x += losGrid) for (let z = z0; z <= z1; z += losGrid) {
        if (W.groundHeightAt(x, z) < floor + high || !free(x, z, bodyRadius)) continue;
        const eligible = slots.map((s, index) => ({ ...s, index })).filter(s => Math.hypot(x - s.x, z - s.z) >= outside);
        if (!eligible.length) continue;
        const visibleSlots = [];
        for (const spawn of eligible) {
          pairs++;
          if (g._losClear(eyeAt(x, z), eyeAt(spawn.x, spawn.z))) { exposedPairs++; visibleSlots.push(spawn.index); }
        }
        observations.push({ from: [x, z], position: [x, W.groundHeightAt(x, z), z], testedSlots: eligible.map(s => s.index), visibleSlots });
      }
      // O spawn mais alto pode não ter nenhum piso ALTO acima; não é falha por si.
      spawnProtection.push({ team, floor, pairs, exposedPairs, observations, slots: slots.map(s => [s.x, W.groundHeightAt(s.x, s.z), s.z]) });
    }
    if (!spawnProtection.some(s => s.pairs > 0)) throw Error('EV7: nenhuma visada alta elegível medida');
    return { highSightlines, spawnProtection, shelters, contract, routeSampleSpacing: radius,
      limits: 'Interrupção exige trecho oculto >= diâmetro do corpo em 2/3 rotas por observador. Maior exposição contínua é reportada, sem teto não previsto no contrato. Não prova todos os ângulos competitivos.' };
  } finally {
    g._smokes = savedSmokes;
  }
}

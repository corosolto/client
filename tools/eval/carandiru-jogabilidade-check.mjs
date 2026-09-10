/* Régua de reautoria do Carandiru. Nasce antes do blockout e cresce por checkpoint.
   C1 ativa CAR1/CAR2/CAR3/CAR6. C2 ativa CAR4/CAR5/CAR8; C3 ativa CAR7.
   Uso: node tools/eval/carandiru-jogabilidade-check.mjs --checkpoint=C1
        node tools/eval/carandiru-jogabilidade-check.mjs --checkpoint=C1 --mutante=muro-sem-acesso
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { preloadPropGeometry } from './prop-geometry-fixture.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const checkpoint = (process.argv.find((a) => a.startsWith('--checkpoint=')) || '=C1').split('=')[1];
const mutant = (process.argv.find((a) => a.startsWith('--mutante=')) || '=').split('=')[1];
const selftestMutants = process.argv.includes('--selftest-mutantes');
const mutants = {
  'muro-sem-acesso': 'CAR2', 'guarita-fechada': 'CAR2',
  'patamar-desconectado': 'CAR2', 'degrau-alto': 'CAR2',
  'colisao-bloqueando': 'CAR2', 'guarita-inalcancavel': 'CAR2',
  'pavilhao-solido': 'CAR3', 'escada-decorativa': 'CAR3',
  'janela-sem-parede': 'CAR3',
  'rota-unica': 'CAR4', 'spawn-exposto': 'CAR5',
  'arame-na-passarela': 'CAR6', 'viatura-procedural': 'CAR7',
};
if (!['C1', 'C2', 'C3', 'C4'].includes(checkpoint)) throw new Error(`checkpoint desconhecido: ${checkpoint}`);
if (mutant && !mutants[mutant]) throw new Error(`mutante desconhecido: ${mutant}`);

const source = await import('../../public/js/maps.js');
const mapModule = await import('../../public/js/map_penitenciaria.js');
const vehicleId = 'carandiru_viatura_1990';
const vehiclePath = `public/models/props/${vehicleId}.glb`;
const vehicleExists = existsSync(vehiclePath);
let vehicleGeometryLoaded = false, vehicleGlb = { triangles: 0, textures: 0, error: 'ausente' };
if (vehicleExists) {
  try {
    const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(vehiclePath);
    const primitives = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives());
    vehicleGlb = {
      triangles: Math.round(primitives.reduce((sum, primitive) => sum
        + (primitive.getIndices()?.getCount() || primitive.getAttribute('POSITION')?.getCount() || 0) / 3, 0)),
      textures: doc.getRoot().listTextures().length,
    };
    await preloadPropGeometry([vehicleId]);
    vehicleGeometryLoaded = true;
  } catch (error) { vehicleGlb = { triangles: 0, textures: 0, error: error.message }; }
}
const game = bootGame('penitenciaria', { textures: await initTextures(), bots: 0, seed: 1977 });
const world = game.world;
registerPropTemplate(vehicleId, null);
const fallbackWorld = MAPS.penitenciaria.build(new THREE.Scene(), await initTextures());
world.root.updateMatrixWorld(true);
const c = structuredClone(world.carandiru || {});
if (selftestMutants) Object.assign(c, {
  routes: [{ id: 'externa' }, { id: 'pavilhao' }, { id: 'muralha' }],
  minRouteWidth: 1.2,
  maxSpawnSight: 2,
  counterfireRoutes: 2,
  cost: { med: 100, low: 80, baselineMed: 100, baselineLow: 80 },
});
if (mutant === 'muro-sem-acesso') c.wallAccesses = [];
if (mutant === 'guarita-fechada') c.guardEntries = [];
if (mutant === 'patamar-desconectado' && c.guardRoutes?.[0]) c.guardRoutes[0].points.at(-2)[1] += 1;
if (mutant === 'degrau-alto' && c.wallAccesses?.[0]?.heights?.[5]) c.wallAccesses[0].heights[5] += .2;
if (mutant === 'colisao-bloqueando' && c.wallAccesses?.[0]) {
  const a = c.wallAccesses[0], i = 5, z = a.z0 + a.dz * i;
  world.colliders.push({ minX: a.x - 1.4, maxX: a.x + 1.4, minY: 0, maxY: 8,
    minZ: z - .3, maxZ: z + .3, tag: 'mutante-colisao-escada' });
}
if (mutant === 'guarita-inalcancavel' && c.guardEntries?.[0]) c.guardEntries[0].reachable = false;
if (mutant === 'pavilhao-solido') c.pavilionPassages = [];
if (mutant === 'escada-decorativa') c.pavilionStairs = [];
if (mutant === 'janela-sem-parede') c.pavilionWindowSupports = [];
if (mutant === 'rota-unica') c.routes = (c.routes || []).slice(0, 1);
if (mutant === 'spawn-exposto' && selftestMutants) c.maxSpawnSight = 4;
if (mutant === 'arame-na-passarela') c.wireClearance = 0;
if (mutant === 'viatura-procedural') { c.mintVehicle = false; c.vehicleSource = 'fallback'; }

const named = (name) => !!world.root.getObjectByName(name);
const MAX_PLAYER_STEP = .55;
const staircaseWorks = (samples = [], target = 5.7) => samples.length >= 8
  && samples[0] <= MAX_PLAYER_STEP && samples.at(-1) >= target
  && samples.every((h, i) => i === 0 || h >= samples[i - 1] && h - samples[i - 1] <= MAX_PLAYER_STEP);
const stairEnvelopeWorks = (stair, minWidth, minRun) => stair?.width >= minWidth && stair?.run >= minRun;
const accessSurfaceWorks = (a) => {
  let y = 0;
  return a.heights.every((expected, i) => {
    const x = a.x ?? a.x0 + i * a.dx, z = a.z ?? a.z0 + i * a.dz;
    const next = world.groundHeightAt(x, z, y), rise = next - y;
    y = next;
    // Um patamar sobreposto pode assumir os últimos degraus; ainda precisa ser
    // alcançável dentro do mesmo limite STEP_H usado pelo movimento real.
    return next + .01 >= expected && rise <= MAX_PLAYER_STEP + .001;
  });
};
const pathWalkable = (points = [], label = '') => {
  const samples = samplesOf(points, .12);
  let previous = points[0]?.[1] || 0;
  return samples.length >= 2 && samples.every((point, index) => {
    const y = world.groundHeightAt(point.x, point.z, previous), rise = y - previous;
    const free = capsuleFree(point.x, y, point.z);
    const ok = Math.abs(y - point.y) <= MAX_PLAYER_STEP + .02 && Math.abs(rise) <= MAX_PLAYER_STEP + .001 && free;
    if (!ok && process.argv.includes('--debug')) console.error('CAR2 percurso', label, index,
      { point: [point.x, point.y, point.z], ground: y, previous, rise, free });
    previous = y;
    return ok;
  });
};
const capsuleFree = (x, y, z, colliders = world.colliders, radius = .38) => {
  if (colliders !== world.colliders) return !colliders.some((box) => x > box.minX - radius && x < box.maxX + radius
    && z > box.minZ - radius && z < box.maxZ + radius && box.minY < y + 1.55 && box.maxY > y + .25);
  const probe = new THREE.Vector3(x, y, z);
  game._collide(probe, radius);
  return Math.hypot(probe.x - x, probe.z - z) < 1e-3;
};
const pointFree = (x, y, z) => !world.colliders.some((box) => x > box.minX && x < box.maxX
  && z > box.minZ && z < box.maxZ && box.minY < y + 1.55 && box.maxY > y + .25);
const samplesOf = (points, spacing = .25) => {
  const out = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k], length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const count = Math.max(1, Math.ceil(length / spacing));
    for (let i = k === 1 ? 0 : 1; i <= count; i++) {
      const t = i / count;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t,
        z: a[2] + (b[2] - a[2]) * t, dx: b[0] - a[0], dz: b[2] - a[2] });
    }
  }
  return out;
};
const routeMeasurement = (route) => {
  const samples = samplesOf(route.points || []), blocked = [], unsupported = [], narrow = [];
  for (const p of samples) {
    const ground = world.groundHeightAt(p.x, p.z, p.y);
    if (Math.abs(ground - p.y) > .65) unsupported.push(p);
    if (!capsuleFree(p.x, p.y, p.z)) blocked.push(p);
    const length = Math.hypot(p.dx, p.dz) || 1, nx = -p.dz / length, nz = p.dx / length;
    if (!pointFree(p.x + nx * .6, p.y, p.z + nz * .6) || !pointFree(p.x - nx * .6, p.y, p.z - nz * .6)) narrow.push(p);
  }
  const endpoint = (point) => world.nearestWaypoint(point[0], point[2], point[1]);
  const connected = (points) => {
    if (!points?.length) return false;
    const a = endpoint(points[0]), b = endpoint(points.at(-1)), path = world.findPath(a, b);
    return a === b || path.length > 1 && path[0] === a && path.at(-1) === b;
  };
  return { id: route.id, samples: samples.length, blocked: blocked.length, unsupported: unsupported.length,
    narrow: narrow.length, firstBlocked: blocked[0] && [blocked[0].x, blocked[0].y, blocked[0].z].map((n) => +n.toFixed(2)),
    firstNarrow: narrow[0] && [narrow[0].x, narrow[0].y, narrow[0].z].map((n) => +n.toFixed(2)),
    connected: connected(route.points), midConnected: connected(route.midBranch) };
};
const routeMetrics = selftestMutants ? [] : (c.routes || []).map(routeMeasurement);
const routeMids = (c.routes || []).map((route) => route.points?.[Math.floor(route.points.length / 2)]).filter(Boolean);
const independentRoutes = routeMids.length >= 3 && routeMids.every((a, i) => routeMids.every((b, j) =>
  i === j || Math.hypot(a[0] - b[0], (a[1] - b[1]) * 2, a[2] - b[2]) >= 6));
const mid = world.ctfPoints?.find((point) => point.id === 'MID');
const routesReachMid = selftestMutants || !!mid && /PAVILHÃO 6/i.test(mid.label) && Math.hypot(mid.x, mid.z) <= 1
  && (c.routes || []).every((route) => {
    const endpoint = route.midBranch?.at(-1);
    return endpoint && Math.hypot(endpoint[0] - mid.x, endpoint[2] - mid.z) <= 1;
  });
const spawnRouteAccess = selftestMutants || Object.values(world.spawns).flat().every((spawn) => (c.routes || []).every((route) => {
  const endpoint = spawn.z < 0 ? route.points?.[0] : route.points?.at(-1);
  if (!endpoint) return false;
  const from = world.nearestWaypoint(spawn.x, spawn.z, 0), to = world.nearestWaypoint(endpoint[0], endpoint[2], endpoint[1]);
  const path = world.findPath(from, to);
  return from === to || path.length > 1 && path.at(-1) === to;
}));
const upperNodes = world.waypoints.nodes.filter((n) => n.y > 3.2), wallNodes = upperNodes.filter((n) => n.y > 5.5);

const segmentHits = (a, b, box) => {
  let enter = 0, exit = 1;
  for (const [start, end, min, max] of [[a[0], b[0], box.minX, box.maxX], [a[1], b[1], box.minY, box.maxY], [a[2], b[2], box.minZ, box.maxZ]]) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) { if (start <= min || start >= max) return false; continue; }
    let lo = (min - start) / delta, hi = (max - start) / delta;
    if (lo > hi) [lo, hi] = [hi, lo];
    enter = Math.max(enter, lo); exit = Math.min(exit, hi);
    if (enter >= exit) return false;
  }
  return exit > .02 && enter < .98;
};
const losColliders = mutant === 'spawn-exposto'
  ? world.colliders.filter((box) => !String(box.tag).startsWith('pavilhao-canto')) : world.colliders;
const visible = (a, b) => !losColliders.some((box) => {
  const originInside = a[0] > box.minX - .5 && a[0] < box.maxX + .5 && a[1] > box.minY - .5
    && a[1] < box.maxY + .5 && a[2] > box.minZ - .5 && a[2] < box.maxZ + .5;
  return !originInside && segmentHits(a, b, box);
});
const towerSight = selftestMutants ? [] : (c.watchtowers || []).map((tower) => {
  const targets = tower.team === 'E' ? world.spawns.B : world.spawns.E;
  const seen = targets.filter((spawn) => visible(tower.eye, [spawn.x, 1.6, spawn.z]));
  return { name: tower.name, visible: seen.length, targets: seen.map((spawn) => [spawn.x, spawn.z]) };
});
const maxSpawnSight = selftestMutants ? c.maxSpawnSight : towerSight.length ? Math.max(...towerSight.map((row) => row.visible)) : 4;
const counterfire = selftestMutants ? c.counterfireRoutes : new Set((c.counterfireVantages || []).filter((vantage) =>
  (c.watchtowers || []).some((tower) => visible(vantage.eye, tower.eye))).map((vantage) => vantage.route)).size;

const perfPath = (process.argv.find((a) => a.startsWith('--performance=')) || '=tools/eval/carandiru-performance.json').split('=')[1];
const sourceHash = createHash('sha256').update(readFileSync(new URL('../../public/js/map_penitenciaria.js', import.meta.url))).digest('hex');
let perf = null;
if (!selftestMutants && existsSync(perfPath)) perf = JSON.parse(readFileSync(perfPath, 'utf8'));
const perfRows = perf?.samples || [];
const perfValid = selftestMutants ? c.cost?.med <= c.cost?.baselineMed * 1.15 && c.cost?.low <= c.cost?.baselineLow * 1.15
  : perf?.sourceSha256 === sourceHash && ['med', 'low'].every((quality) => [5, 8].every((team) => {
    const row = perfRows.find((sample) => sample.variant === 'candidate' && sample.quality === quality && sample.team === team);
    const baseline = perfRows.find((sample) => sample.variant === 'baseline' && sample.quality === quality && sample.team === team);
    return row?.state === 'live' && baseline?.state === 'live' && row.actualBots === team * 2 - 1
      && baseline.actualBots === team * 2 - 1 && row.errors?.length === 0 && baseline.errors?.length === 0
      && row.frames >= 120 && baseline.frames >= 120 && row.callsPerFrame <= baseline.callsPerFrame * 1.15;
  }));
const mintRegistry = JSON.parse(readFileSync('mint-assets.json', 'utf8')).assets?.['carandiru-viatura-1990'];
const vehicleHash = vehicleExists ? createHash('sha256').update(readFileSync(vehiclePath)).digest('hex') : '';
const sourceNotes = readFileSync('public/models/props/FONTE.md', 'utf8');
const provenanceValid = mintRegistry?.files?.includes(vehiclePath)
  && mintRegistry.source?.kind === 'mint-model' && /^(?:ks|p)[a-z0-9]+$/.test(mintRegistry.source?.assetId || '')
  && /^https:\/\/mint\.gg\/(?:project|chat)\//.test(mintRegistry.source?.chatUrl || '')
  && typeof mintRegistry.source?.prompt === 'string' && mintRegistry.source.prompt.length >= 120
  && typeof mintRegistry.source?.licenseBasis === 'string' && mintRegistry.source.licenseBasis.length >= 20
  && mintRegistry.processing?.finalSha256 === vehicleHash
  && sourceNotes.includes(`${vehicleId}.glb`) && sourceNotes.includes(mintRegistry.source.chatUrl || '#');
const candidateCollider = world.colliders.find((box) => box.tag === 'carro-policia');
const fallbackCollider = fallbackWorld.colliders.find((box) => box.tag === 'carro-policia');
const sameVehicleCollider = !!candidateCollider && JSON.stringify(candidateCollider) === JSON.stringify(fallbackCollider);
const c3ReceiptPath = 'tools/eval/carandiru-c3-browser.json';
const c3Receipt = existsSync(c3ReceiptPath) ? JSON.parse(readFileSync(c3ReceiptPath, 'utf8')) : null;
const c3BrowserLegacyValid = c3Receipt?.sourceSha256 === sourceHash && c3Receipt?.state === 'live'
  && c3Receipt?.viewport?.join('x') === '1200x800' && c3Receipt?.vehicle?.source === 'mint'
  && c3Receipt?.vehicle?.visible === true && c3Receipt?.vehicle?.httpStatus >= 200
  && c3Receipt?.vehicle?.httpStatus < 300 && c3Receipt?.errors?.length === 0;
const c4ReceiptPath = 'tools/eval/carandiru-c4-browser.json';
const c4Receipt = existsSync(c4ReceiptPath) ? JSON.parse(readFileSync(c4ReceiptPath, 'utf8')) : null;
const c3BrowserValid = c3BrowserLegacyValid || c4Receipt?.sourceSha256 === sourceHash && c4Receipt?.state === 'live'
  && c4Receipt?.viewport?.join('x') === '1200x800' && c4Receipt?.vehicle?.source === 'mint'
  && c4Receipt?.vehicle?.visible === true && c4Receipt?.vehicle?.httpStatus >= 200
  && c4Receipt?.vehicle?.httpStatus < 300 && c4Receipt?.errors?.length === 0;
const c4RouteIds = ['radial-interna', 'externa-oeste', 'muralha-leste'];
const c4Routes = c4Receipt?.routes || [];
const c4BrowserValid = c4Receipt?.sourceSha256 === sourceHash && c4Receipt?.state === 'live'
  && c4Receipt?.viewport?.join('x') === '1200x800' && c4Receipt?.aspectRatio === '3:2'
  && c4Receipt?.humanVisualApproval === 'pending' && c4Receipt?.errors?.length === 0
  && c4Routes.length === 3 && c4RouteIds.every((id) => {
    const route = c4Routes.find((row) => row.id === id);
    return route?.continuous === true && route?.collisionCorrections === 0
      && route?.traceSamples >= 60 && route?.startErrorM <= .05 && route?.endErrorM <= .05
      && route?.maxStepM <= .8 && route?.video?.bytes >= 50000
      && route?.motionDurationSecs >= 4 && route?.video?.durationSecs >= 4
      && /^[a-f0-9]{64}$/.test(route?.video?.sha256 || '')
      && route?.video?.width === 1200 && route?.video?.height === 800
      && route?.captures?.length === 3 && route.captures.every((capture) =>
        capture.width === 1200 && capture.height === 800 && /^[a-f0-9]{64}$/.test(capture.sha256 || ''));
  }) && (c4Routes.find((route) => route.id === 'muralha-leste')?.verticalRangeM || 0) >= 5.7
  && c4Receipt?.wallReadability?.distancesM?.join(',') === '10,20,30'
  && c4Receipt?.wallReadability?.captures?.length === 3
  && c4Receipt.wallReadability.captures.every((capture) => capture.width === 1200 && capture.height === 800)
  && c4Receipt?.guardTraversal?.length === 12 && c4Receipt.guardTraversal.every((row) => row.reached === true && row.endErrorM <= .65)
  && c4Receipt?.stairTraversal?.length === 2 && c4Receipt.stairTraversal.every((row) => row.reached === true && row.endErrorM <= .65)
  && c4Receipt?.guardCaptures?.length === 6 && c4Receipt.guardCaptures.every((capture) => capture.width === 1200 && capture.height === 800)
  && c4Receipt?.pavilionCapture?.width === 1200 && c4Receipt?.pavilionCapture?.height === 800;
const results = [];
const put = (id, ok, detail) => { results.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`); };

put('CAR1', source.MAPS.penitenciaria?.name === 'Carandiru' && source.MAPS.penitenciaria?.build === MAPS.penitenciaria.build,
  `nome=${source.MAPS.penitenciaria?.name}; ID penitenciaria preservado`);
const access = c.wallAccesses || [], entries = c.guardEntries || [], walks = c.wallWalkways || [];
const guardRoutes = c.guardRoutes || [];
const reachableEntries = entries.filter((entry) => named(entry.name) && entry.reachable === true
  && Math.abs(world.groundHeightAt(entry.inside[0], entry.inside[2], entry.inside[1]) - entry.inside[1]) <= .01
  && capsuleFree(entry.inside[0], entry.inside[1], entry.inside[2]));
const walkableGuardRoutes = guardRoutes.filter((route) => named(route.name) && pathWalkable(route.points, `${route.name}:ida`)
  && pathWalkable([...route.points].reverse(), `${route.name}:volta`));
put('CAR2', access.length >= 4 && access.every((a) => named(a.name) && staircaseWorks(a.heights)
  && stairEnvelopeWorks(a, 2.6, 12) && accessSurfaceWorks(a)
  && Math.abs(a.heights.at(-1) - a.landingY) <= .01)
  && new Set(access.map((a) => a.team)).size === 2 && walks.length >= 4 && walks.every((w) => named(w.name))
  && entries.length >= 6 && reachableEntries.length === entries.length
  && guardRoutes.length >= 6 && walkableGuardRoutes.length === guardRoutes.length,
  `${access.length}/4 acessos em ${new Set(access.map((a) => a.team)).size}/2 lados de spawn; `
  + `degrau máximo=${Math.max(0, ...access.flatMap((a) => a.heights.map((h, i) => h - (a.heights[i - 1] || 0)))).toFixed(3)} m; `
  + `largura/run=${(access[0]?.width || 0).toFixed(2)}/${(access[0]?.run || 0).toFixed(2)} m; ${walks.length}/4 passarelas; guaritas=${reachableEntries.length}/${entries.length}; rotas contínuas=${walkableGuardRoutes.length}/${guardRoutes.length}`);
const passages = c.pavilionPassages || [], pStairs = c.pavilionStairs || [], gallery = c.pavilionGallery;
const windowSupports = c.pavilionWindowSupports || [];
put('CAR3', passages.length >= 2 && passages.every((p) => p.width >= 2.2 && named(p.name))
  && pStairs.length >= 1 && pStairs.every((s) => named(s.name) && staircaseWorks(s.heights, 3.3)
    && stairEnvelopeWorks(s, 3, 6.5) && accessSurfaceWorks(s))
  && gallery?.connected && named(gallery.name) && (c.pavilionWindows || []).length >= 4
  && windowSupports.length === (c.pavilionWindows || []).length
  && windowSupports.every((support) => named(support.window) && named(support.wall)
    && world.groundHeightAt(support.firing[0], support.firing[2], support.firing[1]) === support.firing[1]
    && capsuleFree(support.firing[0], support.firing[1], support.firing[2]))
  && !world.colliders.some((x) => x.tag === 'pavilhao'),
  `${passages.length}/2 passagens; ${pStairs.length}/1 escada; `
  + `largura/run=${(pStairs[0]?.width || 0).toFixed(2)}/${(pStairs[0]?.run || 0).toFixed(2)} m; superfície=${!!pStairs[0] && accessSurfaceWorks(pStairs[0])}; galeria=${!!gallery?.connected}`);
const car4 = selftestMutants ? (c.routes || []).length >= 3 && c.minRouteWidth >= 1.2
  : (c.routes || []).length >= 3 && independentRoutes && spawnRouteAccess && routesReachMid && routeMetrics.every((r) =>
    r.samples > 0 && !r.blocked && !r.unsupported && !r.narrow && r.connected && r.midConnected)
    && upperNodes.length >= 20 && wallNodes.length >= 10;
put('CAR4', car4, selftestMutants ? `${(c.routes || []).length}/3 rotas; largura ${c.minRouteWidth ?? 'pendente'}`
  : `${routeMetrics.map((r) => `${r.id}: b${r.blocked}${r.firstBlocked?`@${r.firstBlocked}`:''}/s${r.unsupported}/e${r.narrow}${r.firstNarrow?`@${r.firstNarrow}`:''}/${r.connected&&r.midConnected?'ligada':'solta'}`).join('; ')}; altos=${upperNodes.length}; muralha=${wallNodes.length}; 3 saídas/spawn=${spawnRouteAccess}; MID P6=${routesReachMid}`);
put('CAR5', maxSpawnSight <= 2 && counterfire >= 2 && towerSight.every((row) => named(row.name)),
  `máximo visto=${maxSpawnSight}/4; contrafogo real=${counterfire}/3; ${towerSight.map((row) => `${row.name}:${row.visible}`).join(', ') || 'fixture'}`);
if (process.argv.includes('--debug')) console.error('CAR5 visadas', JSON.stringify(towerSight));
put('CAR6', c.elevatedCoverage >= .9 && c.wireClearance >= 1.75,
  `piso ${Math.round((c.elevatedCoverage || 0) * 100)}%; altura livre ${c.wireClearance ?? 'pendente'} m`);
put('CAR7', c.mintVehicle === true && c.vehicleSource === 'mint' && vehicleGeometryLoaded
  && vehicleGlb.triangles > 0 && vehicleGlb.triangles <= 8000 && vehicleGlb.textures <= 4
  && mapModule.PENITENCIARIA_PROPS.includes(vehicleId) && provenanceValid && sameVehicleCollider && c3BrowserValid,
  `Mint=${!!c.mintVehicle}/${c.vehicleSource || 'ausente'}; GLB=${vehicleGlb.error || `${vehicleGlb.triangles}t/${vehicleGlb.textures}tex`}; `
  + `registro=${provenanceValid}; fallback/colisor=${sameVehicleCollider}; browser=${c3BrowserValid}`);
put('CAR8', perfValid, selftestMutants ? `med=${c.cost?.med}; low=${c.cost?.low}`
  : `recibo=${perf ? 'presente' : 'ausente'}; amostras=${perfRows.length}/8; fonte=${perf?.sourceSha256 === sourceHash ? 'atual' : 'divergente'}`);
put('CAR9', c4BrowserValid, `vídeos=${c4Routes.length}/3; rotas=${c4Routes.filter((route) => route.continuous).length}/3; `
  + `muralha=${c4Routes.find((route) => route.id === 'muralha-leste')?.verticalRangeM ?? 'pendente'} m; `
  + `guaritas=${c4Receipt?.guardTraversal?.filter((row) => row.reached).length || 0}/12; `
  + `pavilhão=${c4Receipt?.stairTraversal?.filter((row) => row.reached).length || 0}/2; `
  + `silhuetas=${c4Receipt?.wallReadability?.captures?.length || 0}/3; humano=${c4Receipt?.humanVisualApproval || 'ausente'}`);

const active = checkpoint === 'C1' ? new Set(['CAR1', 'CAR2', 'CAR3', 'CAR6'])
  : checkpoint === 'C2' ? new Set(['CAR1', 'CAR2', 'CAR3', 'CAR4', 'CAR5', 'CAR6', 'CAR8'])
    : checkpoint === 'C3' ? new Set(results.filter((r) => r.id !== 'CAR9').map((r) => r.id))
      : new Set(results.map((r) => r.id));
const failed = results.filter((r) => active.has(r.id) && !r.ok).map((r) => r.id);
if (mutant) {
  const target = mutants[mutant];
  if (!active.has(target)) throw new Error(`mutante ${mutant} pertence a ${target}, inativo em ${checkpoint}`);
  if (failed.length !== 1 || failed[0] !== target) throw new Error(`mutante ${mutant} deveria reprovar somente ${target}; reprovou ${failed.join(', ') || 'nada'}`);
  console.log(`MUTANTE MORDIDO: ${mutant} -> ${target}`);
  process.exit(0);
}
if (selftestMutants) throw new Error('--selftest-mutantes exige --mutante');
console.log(`CARANDIRU ${checkpoint} ${failed.length ? `VERMELHO: ${failed.join(', ')}` : 'VERDE'}`);
process.exit(failed.length ? 1 : 0);

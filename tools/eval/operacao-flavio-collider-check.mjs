// Física real do mapa com registro de templates instrumentado; sem afirmar fidelidade visual dos GLBs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, THREE, initTextures } from './harness.mjs';
import { withVisibleShotOccluders } from '../../public/js/shot_surfaces.js';

const url = new URL('../../public/js/map_operacao_flavio.js', import.meta.url);
let source = readFileSync(url, 'utf8');
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const edits = {
  'fallback-solido': ['fallback[2], mats.metal, false, fallbackSolid);', 'fallback[2], mats.metal, true, fallbackSolid);'],
  'sombra-fallback-solido': ['caixa.castShadow = fallbackSolid || !lowProfile;', 'caixa.castShadow = !lowProfile;'],
  'cadeiras-gigantes': ["['assentos_aeroporto', -20, -34, [2.6, 1.05, 0.9], Math.PI / 2, 2.6, 1.05, 0.9, true]", "['assentos_aeroporto', -20, -34, 6, Math.PI / 2, 6, 1.5, 2.2, true]"],
  'sem-rota-interna': ["    [{ x: 0, z: -16 }, { x: 0, z: -14.5 }, { x: 12, z: -14.5 }, { x: 12, z: -7 }, { x: 15.5, z: -3 }, { x: 15.5, z: 1 }, { x: 15.5, z: 7 }, { x: 13, z: 9 }, { x: 11.8, z: 18 }, { x: 9, z: 20 }, { x: 7, z: 23 }],\n", ''],
  'sem-cobertura-extra': ["bloco('cobertura-tatica-hangar-leste', 10, 0.725, 37, 4, 1.45, 1.4, mats.metal);", "bloco('cobertura-tatica-hangar-leste', 10, 0.725, 37, 4, 1.45, 1.4, mats.metal, false);"],
  'proxy-so-glb': ['const colliderDoProp = (id, x, y, z, w, h, d, yaw = 0) => {', 'const colliderDoProp = (id, x, y, z, w, h, d, yaw = 0) => { if (!templates.has(id)) return;'],
  'sem-yaw': ['if (solid) colliderDoProp(id, x, 0, z, w, h, d, yaw);', 'if (solid) colliderDoProp(id, x, 0, z, w, h, d);'],
  'sem-asas': ["  colliderDoProp('aviao_executivo_asas', 0, 0.8, 55.4, 16, 1.4, 3.2, Math.PI);", ''],
  'spawn-invertido': ['B: [{ x: -20, z: -48, yaw: Math.PI }', 'B: [{ x: -20, z: -48, yaw: 0 }'],
  'sem-cobertura': ["bloco('cobertura-tatica-hangar', -3, 0.725, 37, 5, 1.45, 1.4, mats.metal);", "bloco('cobertura-tatica-hangar', -3, 0.725, 37, 5, 1.45, 1.4, mats.metal, false);"],
  'rota-n2': ['const candidates = buckets.get(`${cx + ox},${cz + oz}`) || [];', 'const candidates = nodes.map((_, j) => j);'],
  'vidro-low-fisico': ['? new THREE.MeshStandardMaterial({', '? new THREE.MeshPhysicalMaterial({'],
  'sombras-low-completas': ['mesh.castShadow = sombra && (solid || !lowProfile)', 'mesh.castShadow = sombra'],
};
if (mutant) {
  const edit = edits[mutant];
  assert.ok(edit, 'mutante conhecido');
  assert.equal(source.split(edit[0]).length, 2, 'alvo único');
  source = source.replace(...edit);
  console.log('Mutação aplicada: '+mutant);
}
const mapSource = source;
const loadModule = async (lowProfile) => {
  let fixtureSource = mapSource.replace('const lowProfile = ehBaixa();', `const lowProfile = ${lowProfile};`);
  assert.notEqual(fixtureSource, mapSource, 'perfil de qualidade instrumentado');
  fixtureSource = fixtureSource.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  fixtureSource += '\nexport function fixtureTemplates(template) { templates.clear(); if(template) for(const id of Object.keys(PROP_FILES)) templates.set(id,template); }';
  return import('data:text/javascript;base64,'+Buffer.from(fixtureSource).toString('base64'));
};
const mediumModule = await loadModule(false), lowModule = await loadModule(true);
const textures = initTextures();
const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ transmission: .5 }));
const world = (module, loaded) => {
  module.fixtureTemplates(loaded ? template : null);
  return withVisibleShotOccluders(module.buildOperacaoFlavio)(new THREE.Scene(), textures);
};
const fallback = world(mediumModule, false), loaded = world(mediumModule, true);
const lowFallback = world(lowModule, false), lowLoaded = world(lowModule, true);
const blocked = (map, x, z, inflate = 0) => map.colliders.some(c => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.8 && c.maxY > .1);
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('ok '+name); }
  catch(error) { failures++; console.error('FALHA '+name+': '+error.message); }
};
try {
  check('loaded-fallback-identical-colliders', () => {
    assert.deepEqual(fallback.colliders, loaded.colliders);
  });
  for (const x of [-17, 17]) check('terminal-door-'+x, () => {
    assert.equal(blocked(loaded, x, -15.82), false, 'controle carregado abre a porta');
    assert.equal(blocked(fallback, x, -15.82), false, 'fallback também abre a porta');
  });
  check('plane-proxy-independent-of-template', () => {
    for (const map of [loaded, fallback]) {
      assert.equal(blocked(map, 0, 56), true, 'fuselagem tem proxy');
      assert.equal(blocked(map, 7, 55), true, 'asas entram na pegada física');
      assert.equal(blocked(map, 7.2, 49.2), false, 'último checkpoint continua livre');
    }
  });
  check('prop-yaw-rotates-aabb', () => {
    const tractor = loaded.colliders.find(c => c.id === 'trator_bagagem');
    const stairs = loaded.colliders.find(c => c.id === 'escada_embarque');
    const serviceCar = loaded.colliders.find(c => c.id === 'carro_servico' && Math.abs((c.minX + c.maxX) / 2 + 16) < 1e-9);
    assert.ok(tractor && stairs && serviceCar, 'proxies identificados');
    assert.ok(Math.abs((tractor.maxX - tractor.minX) - 2.4) < 1e-9, 'trator troca largura após yaw 90°');
    assert.ok(Math.abs((tractor.maxZ - tractor.minZ) - 4.2) < 1e-9, 'trator troca profundidade após yaw 90°');
    assert.ok(Math.abs((stairs.maxX - stairs.minX) - 4) < 1e-9, 'escada respeita yaw');
    assert.ok(Math.abs((stairs.maxZ - stairs.minZ) - 3) < 1e-9, 'escada respeita profundidade rotacionada');
    assert.ok(Math.abs((serviceCar.maxX - serviceCar.minX) - 2.4) < 1e-9, 'equipamento usa o yaw declarado');
    assert.ok(Math.abs((serviceCar.maxZ - serviceCar.minZ) - 5) < 1e-9, 'equipamento rotaciona a profundidade');
  });
  check('airport-chairs-human-scale-and-aligned-colliders', () => {
    for (const [label, map] of [['loaded', loaded], ['fallback', fallback]]) {
      map.root.updateMatrixWorld(true);
      const chairs = map.root.children.filter(o => o.name === 'assentos_aeroporto' || o.name === 'fallback-assentos_aeroporto');
      const proxies = map.colliders.filter(c => c.id === 'assentos_aeroporto');
      assert.equal(chairs.length, 4, `${label}: quatro bancos visíveis`);
      assert.equal(proxies.length, 4, `${label}: quatro proxies`);
      for (const chair of chairs) {
        const box = new THREE.Box3().setFromObject(chair), size = box.getSize(new THREE.Vector3());
        assert.ok(Math.abs(size.y - 1.05) < 1e-6, `${label}: encosto abaixo da estatura de 1,72 m`);
        assert.ok(Math.max(size.x, size.z) <= 2.600001, `${label}: banco sem escala monumental`);
        const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
        const proxy = proxies.find(c => Math.abs((c.minX + c.maxX) / 2 - cx) < 1e-6 && Math.abs((c.minZ + c.maxZ) / 2 - cz) < 1e-6);
        assert.ok(proxy, `${label}: proxy no centro visual`);
        const visualBounds = { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
        for (const key of ['minX', 'maxX', 'minZ', 'maxZ']) assert.ok(Math.abs(visualBounds[key] - proxy[key]) < 1e-6, `${label}: ${key} alinhado`);
        assert.ok(Math.abs(size.y - (proxy.maxY - proxy.minY)) < 1e-6, `${label}: altura do proxy alinhada`);
      }
    }
  });
  for (const [name,map] of [['loaded',loaded],['fallback',fallback]]) check('plane-occludes-'+name, () => {
    map.root.updateMatrixWorld(true);
    const context = { world: map, ray: new THREE.Raycaster(), _smokes: [] };
    const clear = Game.prototype._losClear.call(context,new THREE.Vector3(-15,1.5,56),new THREE.Vector3(15,1.5,56));
    assert.equal(clear,false,'fuselagem bloqueia LOS e raycast do jogo');
  });
  for (const [name,map] of [['loaded',loaded],['fallback',fallback]]) check('plane-stops-hitscan-'+name, () => {
    map.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-15,1.5,56),new THREE.Vector3(1,0,0),0,30);
    assert.ok(ray.intersectObjects(map.occluders,false).length > 0,'a lista real de superfícies intercepta a bala');
  });
  const assertReachable = (from, to, label) => {
    const start = loaded.nearestWaypoint(from.x, from.z), end = loaded.nearestWaypoint(to.x, to.z);
    const path = loaded.findPath(start, end);
    assert.equal(path[0], start, label+': origem');
    assert.equal(path.at(-1), end, label+': destino alcançável');
    for (let i = 1; i < path.length; i++) assert.ok(loaded.waypoints.adj[path[i - 1]].includes(path[i]), label+': aresta real');
  };
  const assertNode = (point, label) => assert.ok(loaded.waypoints.nodes.some(node => Math.abs(node.x - point.x) < .001 && Math.abs(node.z - point.z) < .001), label+': nó explícito');
  const assertClearSegment = (a, b, label, inflate = .55) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .2));
    for (let n = 0; n <= steps; n++) {
      const t = n / steps;
      assert.equal(blocked(loaded, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, inflate), false, `${label}: corpo livre no passo ${n}`);
    }
  };
  check('escort-route-explicit-and-clear', () => {
    assert.equal(loaded.escortPath.length, 13);
    for (let i = 0; i < loaded.escortPath.length; i++) {
      const point = loaded.escortPath[i];
      assertNode(point, `checkpoint ${i}`);
      assert.equal(blocked(loaded, point.x, point.z, .46), false, `checkpoint ${i} livre`);
      if (i) {
        assertClearSegment(loaded.escortPath[i - 1], point, `escolta ${i}`, .46);
        assertReachable(loaded.escortPath[i - 1], point, `escolta ${i}`);
      }
    }
  });
  check('all-terminal-doors-have-graph-routes', () => {
    const doors = [
      ...[-20, 20].map(x => [{ x, z: -53.1 }, { x, z: -48.5 }]),
      ...[-17, 0, 17].map(x => [{ x, z: -17.1 }, { x, z: -12.5 }]),
      ...[-43, -25].flatMap(z => [
        [{ x: -27.9, z }, { x: -32.5, z }], [{ x: 27.9, z }, { x: 32.5, z }],
      ]),
    ];
    assert.equal(loaded.waypoints.stats.doorCount, doors.length);
    const centers = [
      ...[-20, 20].map(x => ({ x, z: -52 })), ...[-17, 0, 17].map(x => ({ x, z: -16 })),
      ...[-43, -25].flatMap(z => [{ x: -29, z }, { x: 29, z }]),
    ];
    centers.forEach((point, i) => assertNode(point, `centro da porta ${i}`));
    doors.forEach(([from, to], i) => {
      assertNode(from, `relé da porta ${i}`); assertNode(to, `relé da porta ${i}`);
      assertReachable(from, to, `porta ${i}`);
    });
  });
  check('five-service-routes-survive-cover-and-reach-boarding', () => {
    const routes = [
      [{ x: -17, z: -16 }, { x: -23, z: -10 }, { x: -23, z: 0 }, { x: -19.4, z: 1.8 }, { x: -19.4, z: 4.2 }, { x: -23, z: 8 }, { x: -23, z: 15 }, { x: -23, z: 18 }, { x: -16, z: 20 }, { x: -14, z: 23 }],
      [{ x: 0, z: -16 }, { x: 0, z: -12 }, { x: -4, z: 0 }, { x: 2, z: 15 }, { x: 0, z: 20 }, { x: 0, z: 23 }],
      [{ x: 17, z: -16 }, { x: 23, z: -10 }, { x: 23, z: 0 }, { x: 19.4, z: 1.8 }, { x: 19.4, z: 4.2 }, { x: 23, z: 8 }, { x: 21, z: 14 }, { x: 21, z: 18 }, { x: 16, z: 20 }, { x: 14, z: 23 }],
      [{ x: 0, z: -16 }, { x: 0, z: -14.5 }, { x: -12, z: -14.5 }, { x: -12, z: -7 }, { x: -15.5, z: -3 }, { x: -15.5, z: 2 }, { x: -15.5, z: 8 }, { x: -13.5, z: 11 }, { x: -13.5, z: 19 }, { x: -9, z: 20 }, { x: -7, z: 23 }],
      [{ x: 0, z: -16 }, { x: 0, z: -14.5 }, { x: 12, z: -14.5 }, { x: 12, z: -7 }, { x: 15.5, z: -3 }, { x: 15.5, z: 1 }, { x: 15.5, z: 7 }, { x: 13, z: 9 }, { x: 11.8, z: 18 }, { x: 9, z: 20 }, { x: 7, z: 23 }],
    ];
    assert.equal(loaded.waypoints.stats.routeCount, 5);
    routes.forEach((route, r) => {
      route.forEach((point, i) => {
        assertNode(point, `rota ${r} ponto ${i}`);
        if (i) {
          assertClearSegment(route[i - 1], point, `rota ${r} trecho ${i - 1}`);
          assertReachable(route[i - 1], point, `rota ${r} trecho ${i - 1}`);
        }
      });
      assertReachable(route[0], loaded.escortPath.at(-1), `rota ${r} até embarque`);
      assertReachable(route.at(-1), loaded.escortPath.at(-1), `rota ${r} sem beco`);
    });
  });
  check('graph-edges-are-symmetric-and-physical', () => {
    const { nodes, adj } = loaded.waypoints;
    for (let i = 0; i < nodes.length; i++) for (const j of adj[i]) {
      assert.ok(adj[j].includes(i), `aresta ${i}-${j} bidirecional`);
      if (j < i) continue;
      const a = nodes[i], b = nodes[j], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .3));
      for (let n = 1; n < steps; n++) {
        const t = n / steps;
        assert.equal(blocked(loaded, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, .55), false, `aresta ${i}-${j} livre`);
      }
    }
  });
  check('graph-build-uses-local-candidates', () => {
    const stats = loaded.waypoints.stats;
    assert.ok(stats.candidatePairs > 0 && stats.edges > 0);
    assert.ok(stats.candidatePairs < stats.totalPairs * .2, `candidatos ${stats.candidatePairs}/${stats.totalPairs}`);
  });
  check('solid-covers-and-lateral-cover-points', () => {
    const requiredCovers = [
      'cobertura-tatica-terminal-oeste', 'cobertura-tatica-terminal-leste',
      'cobertura-tatica-servico-oeste', 'cobertura-tatica-servico-leste',
      'cobertura-tatica-acesso-oeste', 'cobertura-tatica-acesso-leste',
      'cobertura-tatica-hangar', 'cobertura-tatica-hangar-leste', 'cobertura-tatica-apron',
    ].sort();
    const covers = loaded.root.children.filter(o => o.name.startsWith('cobertura-tatica-'));
    assert.deepEqual(covers.map(o => o.name).sort(), requiredCovers);
    for (const cover of covers) {
      const proxy = loaded.colliders.find(c => c.id === cover.name);
      assert.ok(proxy && Math.abs(proxy.maxY - proxy.minY - 1.45) < 1e-9, `${cover.name} é sólida`);
    }
    for (const map of [loaded, fallback]) {
      map.root.updateMatrixWorld(true);
      for (const cover of map.root.children.filter(o => o.name.startsWith('cobertura-tatica-'))) {
        const box = new THREE.Box3().setFromObject(cover), x = (box.min.x + box.max.x) / 2;
        const ray = new THREE.Raycaster(new THREE.Vector3(x, 1.2, box.min.z - .5), new THREE.Vector3(0, 0, 1), 0, box.max.z - box.min.z + 1);
        assert.ok(ray.intersectObject(cover, false).length > 0, `${cover.name} interrompe a visada central`);
      }
    }
    assert.ok(loaded.escortCoverPoints.length >= 20);
    for (const point of loaded.escortCoverPoints) {
      assert.equal(blocked(loaded, point.x, point.z, .46), false, 'ponto de cobertura utilizável');
      const distance = Math.min(...loaded.colliders.filter(c => c.maxY >= 1.2 && c.minY <= .1).map(c => Math.hypot(
        Math.max(c.minX - point.x, 0, point.x - c.maxX), Math.max(c.minZ - point.z, 0, point.z - c.maxZ))));
      assert.ok(distance <= 1.6, 'ponto está encostado em cobertura real');
      assert.ok(Math.min(...loaded.escortPath.map(p => Math.hypot(p.x - point.x, p.z - point.z))) > 1, 'ponto não repete checkpoint');
    }
  });
  check('spawn-clearance-and-first-read', () => {
    for (const [team, spawns] of Object.entries(loaded.spawns)) for (const [i, spawn] of spawns.entries()) {
      assert.equal(blocked(loaded, spawn.x, spawn.z, .7), false, `${team}${i} sem colisor próximo`);
      const forward = { x: -Math.sin(spawn.yaw), z: -Math.cos(spawn.yaw) };
      const firstRead = { x: spawn.x + forward.x * 2, z: spawn.z + forward.z * 2 };
      assertClearSegment(spawn, firstRead, `${team}${i} primeira leitura`, .46);
      const nearest = loaded.waypoints.nodes[loaded.nearestWaypoint(spawn.x, spawn.z)];
      assertClearSegment(spawn, nearest, `${team}${i} conexão inicial ao grafo`, .46);
      assertReachable(spawn, team === 'B' ? loaded.escortPath[0] : loaded.escortPath.at(-1), `spawn ${team}${i}`);
    }
    assert.ok(loaded.spawns.B.every(spawn => Math.abs(spawn.yaw - Math.PI) < 1e-9), 'B olha para +z, não para a fachada sul');
    const spawn = loaded.spawns.B[0], next = loaded.escortPath[1];
    const length = Math.hypot(next.x - spawn.x, next.z - spawn.z);
    const dot = (-Math.sin(spawn.yaw)) * (next.x - spawn.x) / length + (-Math.cos(spawn.yaw)) * (next.z - spawn.z) / length;
    assert.ok(dot > .75, 'primeira leitura aponta para a rota');
  });
  check('low-profile-avoids-transmission-and-decorative-shadows', () => {
    const materials = map => {
      const result = []; map.root.traverse(o => { if (o.isMesh) result.push(...(Array.isArray(o.material) ? o.material : [o.material])); }); return result;
    };
    assert.ok(materials(fallback).some(m => m.isMeshPhysicalMaterial && m.transmission > 0), 'médio preserva vidro físico');
    for (const map of [lowFallback, lowLoaded]) assert.equal(materials(map).some(m => m.isMeshPhysicalMaterial || m.transmission > 0), false, 'baixo não usa transmissão, inclusive nos GLBs');
    const casters = map => { let count = 0; map.root.traverse(o => { if (o.isMesh && o.castShadow) count++; }); return count; };
    assert.ok(casters(lowFallback) < casters(fallback), 'baixo reduz submissões ao shadow pass');
    const mediumTrim = fallback.root.children.filter(o => o.name === 'perfil-teto-terminal');
    const lowTrim = lowFallback.root.children.filter(o => o.name === 'perfil-teto-terminal');
    assert.ok(mediumTrim.length > 0 && mediumTrim.every(o => o.castShadow));
    assert.ok(lowTrim.every(o => !o.castShadow), 'decoração não projeta sombra no baixo');
    const facadeShadows = map => { const flags = []; map.root.getObjectByName('terminal_fachada').traverse(o => { if (o.isMesh) flags.push(o.castShadow); }); return flags; };
    assert.ok(facadeShadows(loaded).every(Boolean), 'médio preserva sombra dos props decorativos');
    assert.ok(facadeShadows(lowLoaded).every(flag => !flag), 'baixo corta sombra dos props decorativos');
    assert.ok(lowFallback.root.children.filter(o => o.name.startsWith('cobertura-tatica-')).every(o => o.castShadow), 'cover sólido preserva sombra');
    const decorativeFallbacks = new Set(['fallback-terminal_fachada', 'fallback-terminal_portal', 'fallback-arco_seguranca']);
    const fallbackMeshes = lowFallback.root.children.filter(o => o.name.startsWith('fallback-'));
    const solidFallbacks = fallbackMeshes.filter(o => !decorativeFallbacks.has(o.name));
    assert.ok(solidFallbacks.length > 0 && solidFallbacks.every(o => o.castShadow), 'fallback sólido preserva sombra no baixo');
    assert.ok(fallbackMeshes.filter(o => decorativeFallbacks.has(o.name)).every(o => !o.castShadow), 'fallback decorativo não projeta sombra no baixo');
    const signature = map => map.root.children.filter(o => o.isMesh).map(o => [o.name, o.geometry.type, o.position.x, o.position.y, o.position.z]);
    assert.deepEqual(signature(lowFallback), signature(fallback), 'mesma composição visual e identidade dos objetos');
    const mediumGlass = fallback.root.children.find(o => o.name === 'janela-terminal');
    const lowGlass = lowFallback.root.children.find(o => o.name === 'janela-terminal');
    assert.ok(mediumGlass && lowGlass && mediumGlass.material.color.equals(lowGlass.material.color), 'cor do vidro preservada');
  });
} finally {
  mediumModule.fixtureTemplates(null); lowModule.fixtureTemplates(null);
  fallback.dispose?.(); loaded.dispose?.(); lowFallback.dispose?.(); lowLoaded.dispose?.();
  template.geometry.dispose(); template.material.dispose();
}
process.exitCode = failures ? 1 : 0;

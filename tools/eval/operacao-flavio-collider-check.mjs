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
  'e-spawn-invertido': ['E: [{ x: -33, z: 54, yaw: 0 }, { x: -28, z: 56, yaw: 0 }, { x: 33, z: 54, yaw: 0 }, { x: 30, z: 56, yaw: 0 }],', 'E: [{ x: -33, z: 54, yaw: Math.PI }, { x: -28, z: 56, yaw: Math.PI }, { x: 33, z: 54, yaw: Math.PI }, { x: 30, z: 56, yaw: Math.PI }],'],
  'sem-cobertura': ["bloco('cobertura-tatica-hangar', -3, 0.725, 37, 5, 1.45, 1.4, mats.metal);", "bloco('cobertura-tatica-hangar', -3, 0.725, 37, 5, 1.45, 1.4, mats.metal, false);"],
  'rota-n2': ['const candidates = buckets.get(`${cx + ox},${cz + oz}`) || [];', 'const candidates = nodes.map((_, j) => j);'],
  'vidro-low-fisico': ['? new THREE.MeshStandardMaterial({', '? new THREE.MeshPhysicalMaterial({'],
  'sombras-low-completas': ['mesh.castShadow = sombra && (solid || !lowProfile)', 'mesh.castShadow = sombra'],
  'sem-jardineira-embarque': ["    real('jardineira', -7.2, -38.6, 0),\n", ''],
  'ponto-sem-papel': ["{ x: 13, z: -41, role: 'guard', zone: 'embarque' },", '{ x: 13, z: -41 },'],
  // z=47,8: a 1,98 m da pilha de ULD real de (-1;44,6) (em 47,4 ela ainda ficava a 1,6 m).
  'ponto-afastado': ["{ x: -3.2, z: 49.9, role: 'guard', zone: 'apron' },", "{ x: -3.2, z: 47.8, role: 'guard', zone: 'apron' },"],
  'container-oeste-decorativo': ["real('containers_carga', -12, 51.4, 0),", "real('containers_carga', -12, 51.4, 0, false),"],
  'gpu-decorativo': ["real('energia_solo', 24, 50, Math.PI / 2),", "real('energia_solo', 24, 50, Math.PI / 2, false),"],
  'armadilha-lounge': ['E: [{ x: -33, z: 54, yaw: 0 }, { x: -28, z: 56, yaw: 0 }, { x: 33, z: 54, yaw: 0 }, { x: 30, z: 56, yaw: 0 }],', 'E: [{ x: -20, z: -47, yaw: 0 }, { x: -28, z: 56, yaw: 0 }, { x: 33, z: 54, yaw: 0 }, { x: 30, z: 56, yaw: 0 }],'],
  'bay-vira-beco': ["real('containers_carga', -12, 51.4, 0),", "real('containers_carga', -13.5, 51.4, 0),"],
  'ilha-patio-fantasma': ["real('barreiras_aeroporto', -6.2, 4, 0),", "real('barreiras_aeroporto', -6.2, 4, 0, false),"],
  // Playtest 06/11: anéis no piso confundiam o lounge; a direção vem da placa sobre a porta.
  'anel-no-lounge': ['  const equipamentos = [', "  { const anel = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 28), mats.metal); anel.rotation.x = -Math.PI / 2; anel.position.set(-20, 0.13, -44); root.add(anel); }\n  const equipamentos = ["],
  // Variantes da rota do VIP (playtest 06/11): validadas como a rota do meio.
  'variante-no-container': ['{ x: 14.5, z: 32 }, { x: 18, z: 32 }', '{ x: 14.5, z: 32 }, { x: 18, z: 28 }'],
  'variante-sem-no': ['for (const caminho of ESCORT_PATHS.slice(1)) for (const ponto of caminho) addNode(ponto.x, ponto.z);', ''],
  'variante-longe-da-escada': ['{ x: 5.5, z: 47 }, { x: 6.2, z: 52 },', '{ x: 5.5, z: 47 },'],
  'faixa-afunda': ['const Y_MARCACAO = 0.13;', 'const Y_MARCACAO = 0.06;'],
  'escada-sem-proxy': ["  colliderDoProp('escada_embarque', xEscada, 0, PORTA_EMBARQUE.z, ...MEDIDA_REAL.escada_embarque, YAW_ESCADA);\n", ''],
  // Escada do playtest 06/11: topo voltado para fora, lado oposto à porta, porta pintada no -x.
  'escada-invertida': ['const YAW_ESCADA = Math.PI / 2;', 'const YAW_ESCADA = -Math.PI / 2;'],
  'escada-longe-da-porta': ['const xEscada = PORTA_EMBARQUE.x + MEDIDA_REAL.escada_embarque[2] / 2;', 'const xEscada = -3.2;'],
  'aviao-sem-espelho': ["  if (templates.has('aviao_executivo')) objectivePlane.scale.x *= -1;\n", ''],
  'placa-sem-seta': ['placaEmbarque.center.set(0.5, 0);', 'placaEmbarque.center.set(0.5, 0.5);'],
  'placa-oclusora': ['  root.add(placaEmbarque);\n', '  root.add(placaEmbarque); occluders.push(placaEmbarque);\n'],
  'sem-detalhe-embarque': ['new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.58, 14), mats.sinalizacao, conePos.length)', 'new THREE.InstancedMesh(new THREE.ConeGeometry(0.17, 0.58, 14), mats.sinalizacao, Math.max(0, conePos.length - 10))'],
  'carro-gigante': ["real('carro_servico', -16, 15, Math.PI / 2),", "['carro_servico', -16, 15, 5, Math.PI / 2, 5, 2.4, 2.4, true],"],
  'carro-eixo-trocado': ["real('carro_servico', -18, 38, Math.PI / 2),", "['carro_servico', -18, 38, [1.6, 1.95, 3.2], Math.PI / 2, 3.2, 1.95, 1.6, true],"],
  'balcao-gigante': ["real('balcao_recepcao', 16.75, -39, 0),", "['balcao_recepcao', 16.75, -39, 7.2, 0, 7, 1.4, 2.2, true],"],
  'jardineira-render-baixo': ["real('jardineira', 24, -44.5, 0),", "['jardineira', 24, -44.5, 2.5, 0, 2.5, 1.8, 1.4, true],"],
  'kit-barreira-no-patio': ["usarProp('barreiras_aeroporto', [x, 0.08, 59.6]", "usarProp('barreiras_aeroporto', [x, 0.08, 52]"],
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
  fixtureSource += '\nexport function fixtureTemplates(template) { templates.clear(); if(template) for(const id of Object.keys(PROP_FILES)) templates.set(id, typeof template === "function" ? template(id) : template); }';
  return import('data:text/javascript;base64,'+Buffer.from(fixtureSource).toString('base64'));
};
const mediumModule = await loadModule(false), lowModule = await loadModule(true);
const textures = initTextures();
const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ transmission: .5 }));
const world = (module, loaded) => {
  module.fixtureTemplates(loaded === true ? template : loaded || null);
  return withVisibleShotOccluders(module.buildOperacaoFlavio)(new THREE.Scene(), textures);
};
const fallback = world(mediumModule, false), loaded = world(mediumModule, true);
const lowFallback = world(lowModule, false), lowLoaded = world(lowModule, true);
// Caixa com as proporções nativas de cada GLB (accessor min/max + transformações dos nós):
// a régua de escala mede o volume que o jogador vê, não o cubo unitário do fixture.
const glbBounds = (file) => {
  const bytes = readFileSync(new URL('../../public/models/props/operacao_decola/' + file, import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const box = new THREE.Box3();
  const visit = (index, parent) => {
    const node = gltf.nodes[index], local = new THREE.Matrix4();
    if (node.matrix) local.fromArray(node.matrix);
    else local.compose(new THREE.Vector3(...(node.translation || [0, 0, 0])),
      new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(node.scale || [1, 1, 1])));
    const matrix = parent.clone().multiply(local);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const { min, max } = gltf.accessors[primitive.attributes.POSITION];
      box.union(new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)).applyMatrix4(matrix));
    }
    for (const child of node.children || []) visit(child, matrix);
  };
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, new THREE.Matrix4());
  return box;
};
// Vértices reais (GLB sem Draco, nós sem transformação) e a porta da cinemática: a orientação
// da escada é medida na malha, não no cubo do fixture.
const glbLer = (path) => {
  const bytes = readFileSync(new URL(path, import.meta.url)), tamanho = bytes.readUInt32LE(12);
  return { gltf: JSON.parse(bytes.subarray(20, 20 + tamanho).toString('utf8')), bin: bytes.subarray(28 + tamanho) };
};
const glbVertices = (file) => {
  const { gltf, bin } = glbLer('../../public/models/props/operacao_decola/' + file), pontos = [];
  assert.ok(gltf.nodes.every(n => !n.matrix && !n.translation && !n.rotation && !n.scale), `${file}: malha no eixo nativo`);
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const accessor = gltf.accessors[primitive.attributes.POSITION], view = gltf.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126, `${file}: POSITION em float`);
    const passo = view.byteStride || 12, inicio = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    for (let i = 0; i < accessor.count; i++) pontos.push(new THREE.Vector3(...[0, 4, 8].map(k => bin.readFloatLE(inicio + i * passo + k))));
  }
  return pontos;
};
const portaCinematica = (() => {
  const { gltf } = glbLer('../../public/models/cinematics/operacao_flavio_boarding.glb');
  const palco = readFileSync(new URL('../../public/js/flavio-boarding.js', import.meta.url), 'utf8').match(/stage\.position\.set\(([^)]+)\)/)[1].split(',').map(Number);
  const caixa = (nome) => {
    const no = gltf.nodes.find(n => n.name === nome);
    assert.ok(no && !no.rotation && !no.scale, `${nome}: nó só translada`);
    const { min, max } = gltf.accessors[gltf.meshes[no.mesh].primitives[0].attributes.POSITION];
    return new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)).translate(new THREE.Vector3(...no.translation)).translate(new THREE.Vector3(...palco));
  };
  const soleira = caixa('GEO-boarding-threshold');
  return { soleira: { x: soleira.max.x, z: (soleira.min.z + soleira.max.z) / 2 }, topo: caixa('GEO-boarding-jamb-a').max.y };
})();
const glbTemplates = Object.fromEntries(Object.entries(mediumModule.PROP_FILES).map(([id, file]) => {
  const box = glbBounds(file), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  return [id, new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z).translate(center.x, center.y, center.z), template.material)];
}));
const glbReal = world(mediumModule, (id) => glbTemplates[id]);
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
      assert.equal(blocked(map, map.escortPath.at(-1).x, map.escortPath.at(-1).z), false, 'último checkpoint continua livre');
    }
  });
  check('prop-yaw-rotates-aabb', () => {
    const tractor = loaded.colliders.find(c => c.id === 'trator_bagagem');
    const stairs = loaded.colliders.find(c => c.id === 'escada_embarque');
    const serviceCar = loaded.colliders.find(c => c.id === 'carro_servico' && Math.abs((c.minX + c.maxX) / 2 + 16) < 1e-9);
    assert.ok(tractor && stairs && serviceCar, 'proxies identificados');
    // Medidas reais (trator 2,8×1,5 m, carro 1,6×3,2 m no eixo nativo do GLB) após yaw 90°.
    assert.ok(Math.abs((tractor.maxX - tractor.minX) - 1.5) < 1e-9, 'trator troca largura após yaw 90°');
    assert.ok(Math.abs((tractor.maxZ - tractor.minZ) - 2.8) < 1e-9, 'trator troca profundidade após yaw 90°');
    assert.ok(Math.abs((stairs.maxX - stairs.minX) - 4) < 1e-9, 'escada respeita yaw');
    assert.ok(Math.abs((stairs.maxZ - stairs.minZ) - 1.68) < 1e-9, 'escada respeita profundidade rotacionada (largura real 1,68 m)');
    assert.ok(Math.abs((serviceCar.maxX - serviceCar.minX) - 3.2) < 1e-9, 'equipamento usa o yaw declarado');
    assert.ok(Math.abs((serviceCar.maxZ - serviceCar.minZ) - 1.6) < 1e-9, 'equipamento rotaciona a profundidade');
  });
  check('airport-chairs-human-scale-and-aligned-colliders', () => {
    for (const [label, map] of [['loaded', loaded], ['fallback', fallback]]) {
      map.root.updateMatrixWorld(true);
      const chairs = map.root.children.filter(o => o.name === 'assentos_aeroporto' || o.name === 'fallback-assentos_aeroporto');
      const proxies = map.colliders.filter(c => c.id === 'assentos_aeroporto');
      assert.equal(chairs.length, 8, `${label}: oito bancos visíveis (4 do terminal + 4 de cobertura)`);
      assert.equal(proxies.length, 8, `${label}: oito proxies`);
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
  check('vehicle-props-human-scale-and-aligned-colliders', () => {
    // Razões contra o personagem de 1,72 m: [altura mín, altura máx, maior lado máx].
    // Carro ≥1× a estatura porque esconde o VIP em pé; GPU/trator ficam abaixo (só agachado);
    // a pilha de ULD é a cobertura alta legítima do apron. Jardineira ≥1× porque a folhagem
    // visível é o que esconde o VIP; balcão real (~1,2 m) e muro New Jersey só cobrem agachado.
    const ESTATURA = 1.72;
    const LIMITES = {
      carro_servico: [1, 1.15, 2.2], trator_bagagem: [0.75, 0.95, 1.75], energia_solo: [0.7, 0.9, 1.75],
      scanner_bagagem: [0.75, 1, 2], estacao_manutencao: [0.9, 1.15, 2], containers_carga: [1.6, 2, 2],
      carrinho_ferramentas: [0.6, 0.8, 0.75], torre_iluminacao: [2, 2.75, 2.4],
      jardineira: [1, 1.1, 1.5], balcao_recepcao: [0.6, 0.75, 2.4], escada_embarque: [1.5, 2, 2.4],
      barreiras_aeroporto: [0.7, 0.85, 2.7],
    };
    // O muro de barreiras é procedural; o kit GLB só existe como cenário fora dos limites.
    const NOME_VISUAL = { barreiras_aeroporto: 'barreira-jersey' };
    glbReal.root.updateMatrixWorld(true);
    for (const kit of glbReal.root.children.filter(o => o.name === 'barreiras_aeroporto')) {
      const box = new THREE.Box3().setFromObject(kit);
      assert.ok(box.min.z > glbReal.bounds.maxZ, `kit de barreiras sem collider dentro da área jogável (z ${box.min.z.toFixed(2)})`);
    }
    for (const [id, [minH, maxH, maxL]] of Object.entries(LIMITES)) {
      const pecas = glbReal.root.children.filter(o => o.name === (NOME_VISUAL[id] || id));
      const proxies = glbReal.colliders.filter(c => c.id === id);
      assert.ok(pecas.length > 0 && pecas.length === proxies.length, `${id}: um proxy por peça visível (${pecas.length}×${proxies.length})`);
      for (const peca of pecas) {
        const box = new THREE.Box3().setFromObject(peca), size = box.getSize(new THREE.Vector3());
        const onde = `${id}@(${((box.min.x + box.max.x) / 2).toFixed(1)},${((box.min.z + box.max.z) / 2).toFixed(1)})`;
        assert.ok(size.y >= minH * ESTATURA - 1e-6 && size.y <= maxH * ESTATURA + 1e-6,
          `${onde}: altura ${size.y.toFixed(2)} m fora de ${minH}–${maxH}× a estatura`);
        assert.ok(Math.max(size.x, size.z) <= maxL * ESTATURA + 1e-6,
          `${onde}: ${Math.max(size.x, size.z).toFixed(2)} m acima de ${maxL}× a estatura`);
        const visual = { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
        const proxy = proxies.find(c => Object.keys(visual).every(key => Math.abs(visual[key] - c[key]) < 1e-6));
        assert.ok(proxy, `${onde}: proxy com a mesma pegada do GLB (eixo e tamanho)`);
        assert.ok(Math.abs(size.y - (proxy.maxY - proxy.minY)) < 1e-6, `${onde}: altura do proxy alinhada`);
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
  // Toda variante (world.escortPaths) passa pelo mesmo crivo da rota do meio: nó explícito,
  // corpo do VIP livre em cada trecho, grafo contínuo, mesma saída e mesma escada.
  check('escort-route-explicit-and-clear', () => {
    assert.equal(loaded.escortPath.length, 13);
    assert.equal(loaded.escortPaths.length, 3, 'meio, oeste e leste');
    assert.deepEqual(loaded.escortPaths[0], loaded.escortPath, 'variante 0 é a rota do meio');
    loaded.escortPaths.forEach((caminho, rota) => {
      assert.deepEqual(caminho[0], loaded.escortPath[0], `variante ${rota} sai do embarque`);
      assert.deepEqual(caminho.at(-1), loaded.escortPath.at(-1), `variante ${rota} termina na escada do avião`);
      for (let i = 0; i < caminho.length; i++) {
        const point = caminho[i];
        assertNode(point, `variante ${rota} checkpoint ${i}`);
        assert.equal(blocked(loaded, point.x, point.z, .46), false, `variante ${rota} checkpoint ${i} livre`);
        if (i) {
          assertClearSegment(caminho[i - 1], point, `variante ${rota} escolta ${i}`, .46);
          assertReachable(caminho[i - 1], point, `variante ${rota} escolta ${i}`);
        }
      }
    });
    // Lanes distintas no pátio de serviço: média x por variante separada por ≥8 m.
    const patio = loaded.escortPaths.map(c => c.filter(p => p.z >= -16 && p.z <= 23));
    const medias = patio.map(ps => ps.reduce((s, p) => s + p.x, 0) / ps.length).sort((a, b) => a - b);
    assert.ok(medias.every((m, i) => !i || m - medias[i - 1] >= 8), `pátio com lanes separadas (${medias.map(m => m.toFixed(1))})`);
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
  // A proteção de embarque/apron agora gira em torno de objetos reais do aeroporto;
  // as caixas procedurais restantes são só as do corredor de serviço e do hangar.
  check('solid-covers-and-lateral-cover-points', () => {
    const requiredCovers = [
      'cobertura-tatica-servico-oeste', 'cobertura-tatica-servico-leste',
      'cobertura-tatica-acesso-oeste', 'cobertura-tatica-acesso-leste',
      'cobertura-tatica-hangar', 'cobertura-tatica-hangar-leste',
    ].sort();
    const covers = loaded.root.children.filter(o => o.name.startsWith('cobertura-tatica-'));
    assert.deepEqual(covers.map(o => o.name).sort(), requiredCovers, 'embarque e apron sem caixas decorativas');
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
  });
  const losBlocked = (map, ax, az, bx, bz, y = 1.5) => {
    const origin = new THREE.Vector3(ax, y, az), dir = new THREE.Vector3(bx - ax, 0, bz - az);
    const ray = new THREE.Raycaster(origin, dir.clone().normalize(), 0, dir.length() - .05);
    return ray.intersectObjects(map.occluders, false).length > 0;
  };
  check('real-cover-hides-vip-and-stops-hitscan', () => {
    // Inventário fixo: peça decorativa (solid=false) some dos colliders e falha aqui.
    // Escala real: o GPU gigante de (-1;44,6) virou pilha de ULD (3,27 m), a pilha leste foi
    // a x=17,4 e os gaveteiros de (8,6;47)/(-1,5;26) viraram GPU real; trator/GPU (≤1,55 m)
    // só cobrem agachado.
    const esperadas = [
      ['jardineira', -7.2, -38.6], ['jardineira', 8.2, -38.6], ['jardineira', -22.5, -41.3],
      ['jardineira', -22.5, -39.8], ['jardineira', 17.5, -43], ['jardineira', -28, -45.5], ['jardineira', 24, -44.5],
      // Balcões viraram fileiras de módulos reais de 3,5 m na mesma pegada; plantas novas
      // atrás deles fazem a ocultação em pé que o balcão gigante (3,2 m) fazia.
      ['balcao_recepcao', 0, -30.25], ['balcao_recepcao', 0, -33.75], ['balcao_recepcao', 13.25, -39], ['balcao_recepcao', 16.75, -39],
      ['jardineira', -5.3, -20.9], ['jardineira', 5.3, -20.9], ['jardineira', 0, -36.2], ['jardineira', 13.6, -36.9],
      ['containers_carga', -1, 44.6], ['energia_solo', 24, 50], ['energia_solo', 8.6, 47], ['trator_bagagem', 21, 46],
      ['containers_carga', -12, 51.4], ['containers_carga', -12, 53.6], ['containers_carga', 17.4, 52],
      ['barreiras_aeroporto', 5, -4], ['barreiras_aeroporto', -6.2, 4], ['carro_servico', 18, 10],
      ['trator_bagagem', -19, 9], ['barreiras_aeroporto', -11, 24], ['barreiras_aeroporto', 11, 24],
      ['energia_solo', -1.5, 26], ['barreiras_aeroporto', -24, 47],
      ['carro_servico', -8, 54.5], ['barreiras_aeroporto', 25.5, 55], ['jardineira', -18, -34.8],
    ];
    for (const [id, x, z] of esperadas) assert.ok(loaded.colliders.some(c => c.id === id
      && Math.abs((c.minX + c.maxX) / 2 - x) < 1e-9 && Math.abs((c.minZ + c.maxZ) / 2 - z) < 1e-9),
      `cobertura real ${id}@(${x},${z}) presente e sólida`);
    // Cobertura que esconde o VIP em pé (≥1,72 m) é a que tem essa altura no mundo real:
    // plantas altas, pilhas de ULD, utilitário de pátio e armário da estação de manutenção.
    const tall = loaded.colliders.filter(c => ['jardineira', 'containers_carga', 'carro_servico', 'estacao_manutencao'].includes(c.id) && c.maxY - c.minY >= 1.72);
    const porZona = { embarque: 0, apron: 0 };
    for (const c of tall) {
      const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
      if (cz < -16) porZona.embarque++; else if (cz > 44) porZona.apron++;
      assert.equal(blocked(loaded, cx, cz), true, `${c.id}@(${cx},${cz}) é sólido, não cenografia atravessável`);
      assert.ok(losBlocked(loaded, cx, cz - 6, cx, cz + 6) || losBlocked(loaded, cx, cz + 6, cx, cz - 6),
        `${c.id}@(${cx},${cz}) não oclui hitscan a 1,5 m de altura dos olhos`);
    }
    assert.ok(porZona.embarque >= 3 && porZona.apron >= 3, 'cobertura alta por zona: ' + JSON.stringify(porZona));
    for (const c of loaded.colliders.filter(c => c.id === 'balcao_recepcao')) {
      const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
      assert.equal(blocked(loaded, cx, cz), true, `balcao@(${cx},${cz}) é sólido`);
      assert.ok(losBlocked(loaded, cx, cz - 6, cx, cz + 6, 1.2), `balcao@(${cx},${cz}) não oclui agachado a 1,2 m`);
    }
  });
  check('cover-points-usable-and-formation-ready', () => {
    assert.ok(loaded.escortCoverPoints.length >= 26, 'slots suficientes ao longo da rota');
    const zonas = {};
    for (const point of loaded.escortCoverPoints) {
      assert.ok(['guard', 'roamer'].includes(point.role) && ['embarque', 'servico', 'hangar', 'apron'].includes(point.zone),
        `(${point.x},${point.z}) sem papel/zona declarados`);
      (zonas[point.zone] ??= { guard: 0, roamer: 0 })[point.role]++;
      assert.equal(blocked(loaded, point.x, point.z, .46), false, `(${point.x},${point.z}) utilizável`);
      const distance = Math.min(...loaded.colliders.filter(c => c.maxY >= 1.2 && c.minY <= .1).map(c => Math.hypot(
        Math.max(c.minX - point.x, 0, point.x - c.maxX), Math.max(c.minZ - point.z, 0, point.z - c.maxZ))));
      assert.ok(distance <= 1.6, `(${point.x},${point.z}) está encostado em cobertura real`);
      assert.ok(Math.min(...loaded.escortPaths.flat().map(p => Math.hypot(p.x - point.x, p.z - point.z))) > 1, `(${point.x},${point.z}) não repete checkpoint`);
      const nearest = loaded.waypoints.nodes[loaded.nearestWaypoint(point.x, point.z)];
      assertClearSegment(point, nearest, `(${point.x},${point.z}) ligado ao grafo`, .46);
    }
    for (const [zone, paper] of Object.entries(zonas)) assert.ok(paper.guard >= 4, `${zone} sustenta 4 guardas diretos`);
    for (const zone of ['embarque', 'apron']) assert.ok(zonas[zone].roamer >= 2, `${zone} sustenta 2 roamers`);
  });
  check('guard-slots-occluded-from-approach-lanes', () => {
    const lanes = {
      norteCentro: [0, -17.6], norteLeste: [17, -17.6], ladoOesteSul: [-30.6, -43],
      apronOeste: [-32, 54], apronLeste: [32, 54], hangarBoca: [0, 19],
    };
    const protegido = {
      // Slots do lounge recuaram para trás das plantas de 1,8 m (balcão real de 1,25 m não esconde em pé).
      '-7.2,-40': ['norteCentro'], '8.2,-40': ['norteCentro'], '0,-37.8': ['norteCentro'],
      '-20.5,-40.5': ['ladoOesteSul'], '13,-41': ['norteLeste'], '-6,-22.3': ['norteCentro'], '6,-22.3': ['norteCentro'],
      '-1,46.9': ['hangarBoca'], '-6.6,49': ['apronOeste'],
      // Slot leste seguiu a pilha de ULD de escala real (antes 12,6;50,4 com container de 5 m).
      '-3.2,49.9': ['apronOeste', 'apronLeste'], '14.4,50.2': ['apronOeste', 'apronLeste'],
    };
    loaded.root.updateMatrixWorld(true);
    for (const point of loaded.escortCoverPoints.filter(p => p.role === 'guard')) {
      for (const lane of protegido[point.x + ',' + point.z] || []) {
        const [ax, az] = lanes[lane];
        assert.ok(losBlocked(loaded, ax, az, point.x, point.z), `guard (${point.x},${point.z}) exposto à lane ${lane}`);
      }
    }
  });
  check('boarding-lounge-not-a-respawn-trap', () => {
    const sala = { minX: -29, maxX: 29, minZ: -57, maxZ: -44 };   // espelha o predicado E do modo (spawnCandidates)
    const naSala = (x, z) => x > sala.minX && x < sala.maxX && z > sala.minZ && z < sala.maxZ;
    const fim = loaded.escortPath.at(-1);
    for (const s of loaded.spawns.E) {
      assert.equal(naSala(s.x, s.z), false, `spawn E (${s.x},${s.z}) dentro do embarque`);
      assert.ok(s.z > 0, `spawn E (${s.x},${s.z}) fica à frente da rota`);
      const path = loaded.findPath(loaded.nearestWaypoint(s.x, s.z), loaded.nearestWaypoint(fim.x, fim.z))
        .map(i => loaded.waypoints.nodes[i]).filter(n => naSala(n.x, n.z));
      assert.equal(path.length, 0, 'caminho E até o embarque do avião não funila pela sala: ' + path.map(n => `${n.x},${n.z}`).join(' '));
    }
    const saida = loaded.findPath(loaded.nearestWaypoint(-20, -53.1), loaded.nearestWaypoint(fim.x, fim.z));
    assert.equal(saida.at(-1), loaded.nearestWaypoint(fim.x, fim.z), 'relé sul sempre tem rota de saída (B não nasce preso)');
  });
  check('graph-single-component-no-dead-ends', () => {
    const { nodes, adj } = loaded.waypoints;
    const seen = new Uint8Array(nodes.length), fila = [0]; seen[0] = 1;
    for (let i = 0; i < fila.length; i++) for (const j of adj[fila[i]]) if (!seen[j]) { seen[j] = 1; fila.push(j); }
    assert.equal(fila.length, nodes.length, 'grafo com uma componente só');
    const folhas = nodes.filter((_, i) => adj[i].length === 1);
    assert.equal(folhas.length, 0, 'nenhum nó folha: ' + folhas.map(n => `${n.x},${n.z}`).join(' '));
  });
  check('route-pressure-attacker-approach-bounded', () => {
    const { adj } = loaded.waypoints;
    const bfs = (from) => {
      const dist = new Int32Array(loaded.waypoints.nodes.length).fill(-1), q = [from]; dist[from] = 0;
      for (let i = 0; i < q.length; i++) for (const j of adj[q[i]]) if (dist[j] < 0) { dist[j] = dist[q[i]] + 1; q.push(j); }
      return dist;
    };
    for (const s of loaded.spawns.E) {
      const dist = bfs(loaded.nearestWaypoint(s.x, s.z));
      loaded.escortPaths.flat().forEach((cp, k) => {
        const d = dist[loaded.nearestWaypoint(cp.x, cp.z)];
        assert.ok(d > 0, `E(${s.x},${s.z}) alcança o checkpoint ${k}`);
        assert.ok(d <= 35, `E(${s.x},${s.z})→cp${k} em ${d} arestas: cobertura não virou labirinto`);
      });
    }
  });
  check('vip-cover-density-per-checkpoint', () => {
    // Contrato acordado com o modo: cada checkpoint intermediário tem >=2 slots a 8 m
    // para o VIP escolher abrigo por concealment (raio de âncora de 8 m).
    for (const caminho of loaded.escortPaths) caminho.forEach((cp, k) => {
      if (k === 0 || k === caminho.length - 1) return;
      const near = loaded.escortCoverPoints.filter(p => Math.hypot(p.x - cp.x, p.z - cp.z) <= 8);
      assert.ok(near.length >= 2, `cp${k} (${cp.x},${cp.z}) com ${near.length} slots a 8 m`);
    });
  });
  check('patrol-cover-chain-along-route', () => {
    const tall = loaded.colliders.filter(c => c.maxY >= 1.2 && c.minY <= .1);
    for (const caminho of loaded.escortPaths) for (let i = 1; i < caminho.length; i++) {
      const a = caminho[i - 1], b = caminho[i];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2);
      for (let n = 0; n <= steps; n++) {
        const t = n / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const d = Math.min(...tall.map(c => Math.hypot(Math.max(c.minX - x, 0, x - c.maxX), Math.max(c.minZ - z, 0, z - c.maxZ))));
        assert.ok(d <= 8, `rota a ${d.toFixed(1)} m de cobertura alta em (${x.toFixed(1)},${z.toFixed(1)})`);
      }
    }
  });
  check('stairs-tucked-against-fuselage', () => {
    const escada = loaded.colliders.find(c => c.id === 'escada_embarque');
    assert.ok(escada, 'proxy da escada existe');
    const fuselagem = loaded.colliders.find(c => c.id === 'aviao_executivo_fuselagem');
    const gap = Math.max(escada.minX - fuselagem.maxX, fuselagem.minX - escada.maxX);
    assert.ok(gap <= 0.6, `escada a ${gap.toFixed(2)} m da fuselagem`);
    assert.equal(blocked(loaded, loaded.escortPath.at(-1).x, loaded.escortPath.at(-1).z, .46), false, 'checkpoint final livre');
    assert.equal(blocked(loaded, 7, 55), true, 'asas entram na pegada física');
    assert.equal(blocked(loaded, 7, 55) === blocked(fallback, 7, 55), true, 'escada igual com GLB e fallback');
  });
  // Playtest 06/11 ("escada ao contrário"): o topo nativo da escada encosta na porta real da
  // cinemática, a porta pintada do avião fica do mesmo lado e as três rotas terminam no pé.
  check('boarding-stairs-face-door-from-every-route', () => {
    const vertices = glbVertices('escada_embarque.glb');
    const ys = vertices.map(v => v.y), alto = Math.max(...ys) - (Math.max(...ys) - Math.min(...ys)) * 0.2;
    const topo = vertices.filter(v => v.y >= alto), zTopo = topo.reduce((soma, v) => soma + v.z, 0) / topo.length;
    assert.ok(Math.abs(zTopo) > 0.1, `plataforma nativa num extremo do eixo z (${zTopo.toFixed(2)})`);
    const escada = loaded.colliders.find(c => c.id === 'escada_embarque');
    const modelo = loaded.root.getObjectByName('escada_embarque');
    assert.ok(escada && modelo && Math.abs(modelo.rotation.y - escada.yaw) < 1e-9, 'render e colisor com o mesmo yaw');
    assert.ok(Math.abs(Math.sin(2 * escada.yaw)) < 1e-9, 'yaw em múltiplo de 90° (AABB exata)');
    const dir = { x: Math.sin(escada.yaw) * Math.sign(zTopo), z: Math.cos(escada.yaw) * Math.sign(zTopo) };
    const largX = escada.maxX - escada.minX, largZ = escada.maxZ - escada.minZ;
    const comprimento = Math.abs(dir.x) * largX + Math.abs(dir.z) * largZ, largura = Math.abs(dir.z) * largX + Math.abs(dir.x) * largZ;
    const centro = { x: (escada.minX + escada.maxX) / 2, z: (escada.minZ + escada.maxZ) / 2 };
    const ponta = (s) => ({ x: centro.x + s * dir.x * comprimento / 2, z: centro.z + s * dir.z * comprimento / 2 });
    const topoMundo = ponta(1), pe = ponta(-1), porta = portaCinematica.soleira;
    const dTopo = Math.hypot(topoMundo.x - porta.x, topoMundo.z - porta.z);
    assert.ok(dTopo <= 0.5, `topo da escada a ${dTopo.toFixed(2)} m da porta da cinemática`);
    assert.ok(Math.hypot(pe.x - porta.x, pe.z - porta.z) >= comprimento - 0.5, 'degraus descem para longe da porta');
    assert.ok(Math.abs(pe.x) > Math.abs(topoMundo.x) + 3, 'pé da escada do lado de fora da fuselagem');
    // O GLB do avião pinta a porta no +x nativo (esquerda do piloto): a matriz do mundo leva
    // esse lado ao lado da escada, senão os degraus sobem numa janela.
    loaded.objectivePlane.updateMatrixWorld(true);
    const ladoPintado = new THREE.Vector3(1, 0, 0).transformDirection(loaded.objectivePlane.matrixWorld);
    assert.equal(Math.sign(ladoPintado.x), Math.sign(porta.x), 'porta pintada do avião no lado da escada');
    loaded.escortPaths.forEach((caminho, rota) => {
      const fim = caminho.at(-1), antes = caminho.at(-2);
      const rel = { x: fim.x - centro.x, z: fim.z - centro.z };
      const aoLongo = -(rel.x * dir.x + rel.z * dir.z), lateral = Math.abs(rel.x * dir.z - rel.z * dir.x);
      assert.ok(aoLongo > comprimento / 2 && aoLongo <= comprimento / 2 + 1.6, `variante ${rota}: embarque a ${(aoLongo - comprimento / 2).toFixed(2)} m do pé`);
      assert.ok(lateral <= largura / 2, `variante ${rota}: embarque de frente para os degraus (${lateral.toFixed(2)} m)`);
      assert.equal(blocked(loaded, fim.x, fim.z, .46), false, `variante ${rota}: pé da escada livre`);
      assertClearSegment(antes, fim, `variante ${rota} chegada ao pé`, .46);
      assertReachable(antes, fim, `variante ${rota} chegada ao pé`);
    });
  });
  // Placa (playtest 06/11): render-only, ancorada na ponta da seta ▼ logo acima da porta, igual
  // em todos os perfis; não vira colisor, oclusor nem alvo de raycast.
  check('boarding-label-above-door', () => {
    const porta = portaCinematica.soleira, topoPorta = portaCinematica.topo;
    for (const [nome, mapa] of [['loaded', loaded], ['fallback', fallback], ['low', lowLoaded], ['low-fallback', lowFallback]]) {
      const placa = mapa.root.getObjectByName('placa-embarque-flavio');
      assert.ok(placa?.isSprite && placa.parent === mapa.root && placa.visible, `${nome}: placa visível no mapa`);
      assert.ok(placa.center.x === 0.5 && placa.center.y === 0, `${nome}: âncora na ponta da seta, que aponta para baixo`);
      assert.ok(Math.hypot(placa.position.x - porta.x, placa.position.z - porta.z) <= 0.6, `${nome}: placa sobre a porta`);
      assert.ok(placa.position.y >= topoPorta && placa.position.y <= topoPorta + 1, `${nome}: seta logo acima da porta (y ${placa.position.y})`);
      assert.ok(placa.scale.x >= 3 && placa.scale.y >= 2 && placa.material.map?.isTexture && placa.material.fog === false, `${nome}: legível do pátio`);
      assert.equal(mapa.occluders.includes(placa), false, `${nome}: placa não é oclusor`);
      assert.equal(mapa.colliders.some(c => /placa/.test(c.id || '')), false, `${nome}: placa não é colisor`);
      const raio = new THREE.Raycaster(new THREE.Vector3(placa.position.x + 6, placa.position.y + 1.2, placa.position.z), new THREE.Vector3(-1, 0, 0));
      assert.equal(raio.intersectObject(placa).length, 0, `${nome}: tiro e LOS atravessam a placa`);
    }
  });
  // Playtest 06/11: os "círculos redondos na sala de embarque" eram os anéis de checkpoint; o
  // piso do terminal e os checkpoints ficam sem anel.
  check('lounge-without-floor-rings', () => {
    const checkpoints = loaded.escortPaths.flat();
    for (const [nome, mapa] of [['loaded', loaded], ['fallback', fallback]]) {
      mapa.root.updateMatrixWorld(true);
      const aneis = [];
      mapa.root.traverse(o => {
        if (o.name === 'marca-checkpoint-escolta') aneis.push(o.name);
        if (!o.isMesh || !/^(Ring|Circle|Torus)Geometry$/.test(o.geometry?.type || '')) return;
        const p = o.getWorldPosition(new THREE.Vector3());
        const noTerminal = Math.abs(p.x) <= 29 && p.z >= -57 && p.z <= -16;
        const noCheckpoint = checkpoints.some(cp => Math.hypot(cp.x - p.x, cp.z - p.z) < 1.5);
        if (p.y < 0.6 && (noTerminal || noCheckpoint)) aneis.push(`${o.name || o.geometry.type}@(${p.x.toFixed(1)},${p.z.toFixed(1)})`);
      });
      assert.deepEqual(aneis, [], `${nome}: anéis no piso do lounge ou dos checkpoints`);
    }
  });
  check('hangar-stripes-above-slab', () => {
    const piso = loaded.root.children.find(o => o.name === 'piso-hangar');
    const topoPiso = piso.position.y + piso.geometry.parameters.height / 2;
    const faixas = loaded.root.children.filter(o => o.name.startsWith('faixa-box-hangar')
      || o.name === 'eixo-hangar' || o.name.startsWith('travessa-box-hangar'));
    assert.ok(faixas.length > 0 && faixas.every(o => o.position.y - o.geometry.parameters.height / 2 > topoPiso + 0.005), 'faixas acima da laje do hangar');
  });
  check('distant-ridge-separates-horizon', () => {
    const serras = loaded.root.children.filter(o => o.name === 'serra-distante');
    assert.equal(serras.length, 5, 'cinco volumes de serra');
    assert.ok(serras.every(s => Math.abs(s.position.z) > 150), 'serra além da pista, na faixa de névoa');
    assert.equal(loaded.colliders.some(c => c.id === 'serra-distante'), false, 'serra não é colisor');
  });
  check('west-e-spawn-frame-clean', () => {
    const oeste = loaded.spawns.E.find(sp => sp.x < 0 && sp.z > 40);
    assert.ok(oeste, 'spawn E oeste existe');
    const forward = { x: oeste.x - Math.sin(oeste.yaw) * 2, z: oeste.z - Math.cos(oeste.yaw) * 2 };
    assertClearSegment(oeste, forward, 'E oeste primeira leitura', .46);
    const colados = loaded.colliders.filter(c => c.id === 'barreiras_aeroporto'
      && Math.abs((c.minX + c.maxX) / 2 - oeste.x) < 6 && Math.abs((c.minZ + c.maxZ) / 2 - oeste.z) < 6);
    assert.equal(colados.length, 0, 'sem trilho colado no primeiro quadro do spawn E oeste');
  });
  check('lounge-lighting-and-vantage-contract', () => {
    // Captura preta do gauntlet era ponto de vista dentro do balcão, não luz ausente:
    // a régua prova que nenhum waypooint válido nasce penetrado e que as luminárias
    // do terminal continuam nos três meridianos do salão.
    const luzes = [];
    loaded.root.traverse(o => { if (o.isPointLight && o.position.z < -14 && o.position.z > -52) luzes.push(Math.round(o.position.z)); });
    assert.deepEqual(luzes.sort((a, b) => a - b), [-46, -34, -22], 'três pontos de luz no embarque');
    for (const n of loaded.waypoints.nodes) assert.equal(blocked(loaded, n.x, n.z, .46), false, `nó (${n.x},${n.z}) penetrado`);
  });
  check('apron-cover-balance-between-e-lanes', () => {
    const tall = loaded.colliders.filter(c => (c.minZ + c.maxZ) / 2 > 44 && c.maxY - c.minY >= 1.4);
    const oeste = tall.filter(c => (c.minX + c.maxX) / 2 < 0).length;
    const leste = tall.filter(c => (c.minX + c.maxX) / 2 > 0).length;
    assert.ok(Math.abs(oeste - leste) <= 2, `apron equilibrado entre lanes E: ${oeste}×${leste}`);
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
    assert.ok(loaded.spawns.E.every(spawn => Math.abs(spawn.yaw) < 1e-9), 'base E olha para -z, para dentro do mapa');
    const spawn = loaded.spawns.B[0], next = loaded.escortPath[1];
    const length = Math.hypot(next.x - spawn.x, next.z - spawn.z);
    const dot = (-Math.sin(spawn.yaw)) * (next.x - spawn.x) / length + (-Math.cos(spawn.yaw)) * (next.z - spawn.z) / length;
    assert.ok(dot > .75, 'primeira leitura aponta para a rota');
  });
  check('ground-operation-detail-around-boarding', () => {
    const group = loaded.root.getObjectByName('operacao-solo-embarque');
    assert.ok(group, 'grupo de operação de solo existe');
    const cones = loaded.root.getObjectByName('cones-seguranca-embarque');
    const chocks = loaded.root.getObjectByName('calocos-trem-embarque');
    assert.equal(cones?.count, 10, '10 cones de segurança instanciados');
    assert.equal(chocks?.count, 4, 'quatro calços de trem');
    const children = [...group.children];
    assert.equal(children.filter(o => o.name === 'marca-pneu-embarque').length, 4, 'marcas de pneu no pátio');
    assert.equal(children.filter(o => o.name === 'cabo-servico-embarque').length, 2, 'cabos de serviço ligam as valvulas');
    assert.equal(loaded.root.children.filter(o => o.name === 'valvula-servico-embarque').length, 2, 'valvulas de serviço');
    assert.equal(children.filter(o => o.name === 'mancha-oleo-embarque').length, 6, 'manchas de óleo quebram o asfalto liso');
    assert.equal(children.filter(o => o.name === 'remendo-asfalto-embarque').length, 5, 'remendos variam o tom do asfalto');
    assert.equal(children.filter(o => o.name === 'linha-servico-embarque').length, 8, 'faixas de via de serviço lateral');
    assert.equal(loaded.root.getObjectByName('bagagens-embarque')?.count, 14, 'malas instanciadas nas carretas');
    assert.equal(children.filter(o => o.name === 'carreta-bagagem-embarque').length, 2, 'carretas de bagagem laterais');
    assert.equal(loaded.root.children.filter(o => o.name === 'cerca-perimetro-apron').length, 3, 'malha perimetral fecha o pátio e o norte');
    assert.equal(loaded.root.getObjectByName('postes-cerca-norte')?.count, 15, 'postes da cerca norte');
    assert.equal(loaded.root.children.filter(o => o.name === 'hangar-distante-norte').length, 2, 'hangares distantes fecham o horizonte norte');
    assert.ok(loaded.root.getObjectByName('biruta-apron'), 'biruta de vento no perímetro');
    assert.ok(loaded.root.getObjectByName('caminhao-combustivel-embarque'), 'caminhão de combustível fora da área jogável');
    assert.ok(loaded.colliders.every(c => !/cones-seguranca|calocos-trem|cabo-servico/.test(c.id)), 'detalhe render-only não bloqueia rota');
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
    // O kit GLB de barreiras virou cenário fora da área jogável (sem collider, sem sombra no baixo).
    const decorativeFallbacks = new Set(['fallback-terminal_fachada', 'fallback-terminal_portal', 'fallback-arco_seguranca', 'fallback-barreiras_aeroporto']);
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
  fallback.dispose?.(); loaded.dispose?.(); lowFallback.dispose?.(); lowLoaded.dispose?.(); glbReal.dispose?.();
  template.geometry.dispose(); template.material.dispose();
  for (const mesh of Object.values(glbTemplates)) mesh.geometry.dispose();
}
process.exitCode = failures ? 1 : 0;

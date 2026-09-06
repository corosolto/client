/* Contrato Escadão, revisão das referências r2 (HEAD rejeitado: 9911d554).
   O usuário rejeitou o camburão no patamar: a cobertura deve ser alvenaria, sem
   landmark/veículo. Mantém saídas de beco com zero LOS de spawn e a quina exposta
   por dois observadores laterais + topo (3/3). Alvo x=0→.6: o ponto antigo
   ficava dentro do collider (.42m de correção); o novo deixa o corpo livre.
   Laterais (±4,8)→(±1.5,7): as casas aproximadas bloqueiam os raios antigos.
   As novas posições ocupam lados opostos da escada estreita, com corpo livre e
   conexão física ao centro; é adaptação da amostra ao layout, não redução de 3/3.
   Cover: userData.escadaoPatamarCover='alvenaria', malha visível oclusora, collider
   com o footprint existente, raio cruzando a massa e Game._collide no interior.
   Não classifica estética de alvenaria por pixels, nem GLBs não identificados:
   esta régua Node mede arquitetura procedural; referências/GLBs pedem browser.

   Mutantes: sem-bloqueio-flanco | cobertura-perfeita | veiculo-no-patamar |
   cobertura-sem-colisao | varal-sumiu | varal-so-no-topo.
   cobertura-perfeita substitui caveirao-perfeito; veiculo-no-patamar substitui
   caminhao-bau (agora reinserir veículo REAL é o defeito, não ausência do casco).
   Cada mutante exige baseline verde e alteração observada na cláusula esperada.
   OUT opcional grava contract.json com SHA, medidas e baseline do mutante.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { THREE, initTextures, bootGame } from './harness.mjs';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || null;
const expected = { 'sem-bloqueio-flanco': 'EC1', 'cobertura-perfeita': 'EC2',
  'veiculo-no-patamar': 'EC3', 'cobertura-sem-colisao': 'EC4', 'varal-sumiu': 'EC5', 'varal-so-no-topo': 'EC6' };
if (mutante && !expected[mutante]) {
  console.error(`Mutante desconhecido: ${mutante}; conhecidos: ${Object.keys(expected).join(', ')}`);
  process.exit(2);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['public/js/map_escadao.js', 'public/js/game.js', 'tools/eval/escadao-contract-check.mjs'];
const sources = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sources };
const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const world = game.world;
const olhos = (x, z, extra = 1.62) => new THREE.Vector3(x, world.groundHeightAt(x, z) + extra, z);
const visible = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const describe = o => ({ uuid: o.uuid, name: o.name, type: o.type });
// Volume físico da cobertura anterior, preservado por decisão da revisão r2.
const floor = world.groundHeightAt(0, 0);
const footprint = { minX: -4.5, maxX: .1, minY: floor, maxY: floor + 2.5, minZ: -.56, maxZ: 1.64 };
const region = new THREE.Box3(new THREE.Vector3(-5, floor - .1, -1.96), new THREE.Vector3(3, floor + 4, 3.04));
const colliderMatches = c => Object.keys(footprint).every(k => Math.abs(c[k] - footprint[k]) < 1e-6);
const roots = tag => { const found = []; world.root.traverse(o => { if (tag(o) && visible(o)) found.push(o); }); return found; };
const coverRoots = () => roots(o => o.userData.escadaoPatamarCover === 'alvenaria');
const clothes = () => roots(o => !!o.userData.escadaoVaral);
const onTop = o => o.position.y >= world.groundHeightAt(0, -30) - .5;

function measure() {
  game.scene.updateMatrixWorld(true);
  let spawnViews = 0, spawnPairs = 0;
  for (const from of [olhos(-9, 8.5), olhos(9, 8.5)]) for (const slots of Object.values(world.spawns)) for (const spawn of slots) {
    spawnPairs++;
    if (game._losClear(from, olhos(spawn.x, spawn.z))) spawnViews++;
  }
  // Topo z=-12 evita a falsa visada sob o degrau (BUG-54). Todas as posições
  // precisam comportar o corpo: LOS de dentro de parede não demonstra risco.
  const bodyPosition = (x, z) => {
    const position = new THREE.Vector3(x, world.groundHeightAt(x, z), z), corrected = position.clone();
    game._collide(corrected, .42);
    const correction = Math.hypot(corrected.x - x, corrected.z - z);
    return { position: position.toArray(), correction, free: correction < 1e-3 };
  };
  const target = bodyPosition(.6, 1.5);
  const observers = [[-1.5, 7], [1.5, 7], [0, -12]].map(([x, z]) => ({ ...bodyPosition(x, z),
    connectsToCenter: game._retaAndavel(x, z, 0, z, .42, .30), clear: game._losClear(olhos(x, z), olhos(.6, 1.5, 1.2)) }));
  const exposed = observers.filter(o => o.clear).length;
  const vehicles = roots(o => !!o.userData.landmark || !!o.userData.vehicle || !!o.userData.escadaoPatamarVehicle
    || /caveir[aã]o|cambur[aã]o|viatura|caminh[aã]o|truck|vehicle|ve[ií]culo|fusca/i.test(o.name || ''))
    .filter(o => region.intersectsBox(new THREE.Box3().setFromObject(o))).map(describe);
  const cover = coverRoots(), meshes = [];
  for (const root of cover) root.traverse(o => {
    if (!o.isMesh || !visible(o) || !world.occluders.includes(o)) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    if (materials.some(m => m && m.visible !== false && m.colorWrite !== false && (!m.transparent || m.opacity > 0))) meshes.push(o);
  });
  const from = new THREE.Vector3(-2.2, floor + 1.2, -1.06), to = new THREE.Vector3(-2.2, floor + 1.2, 2.14);
  const direction = to.clone().sub(from), ray = new THREE.Raycaster(from, direction.clone().normalize(), 0, direction.length());
  const hits = ray.intersectObjects(meshes, false);
  // x=-2.2 também toca a fachada aproximada: não isolaria a remoção do cover.
  // x=-1.5 fica dentro da mesma massa e livre dos demais colisores (red→green).
  const center = new THREE.Vector3(-1.5, floor, .54), corrected = center.clone();
  game._collide(corrected, .42);
  const correction = Math.hypot(corrected.x - center.x, corrected.z - center.z);
  const colliderCount = world.colliders.filter(colliderMatches).length;
  const coverage = { roots: cover.map(describe), meshes: meshes.length, crossingHits: hits.map(h => ({ object: describe(h.object), point: h.point.toArray() })),
    closed: !game._losClear(from, to), colliderCount, correction, interiorProbe: center.toArray(), corrected: corrected.toArray(), footprint };
  const varais = clothes(), high = varais.filter(onTop).length, low = varais.length - high;
  const checks = [
    ['EC1', spawnPairs === 16 && spawnViews === 0, 'saídas dos dois becos sem LOS de spawn', `visadas=${spawnViews}/${spawnPairs}`],
    ['EC2', exposed === 3 && target.free && observers.every(o => o.free && o.connectsToCenter), 'quina da cobertura exposta por 2 laterais + topo',
      `ângulos=${exposed}/3, alvo livre=${target.free}, observadores livres=${observers.filter(o => o.free).length}/3`],
    ['EC3', vehicles.length === 0, 'patamar sem landmark/veículo', `objetos=${vehicles.length}`],
    ['EC4', cover.length === 1 && meshes.length > 0 && hits.length > 0 && coverage.closed && colliderCount === 1 && correction > 1e-3,
      'cobertura arquitetônica observável e sólida no footprint preservado', `roots=${cover.length}, meshes=${meshes.length}, hits=${hits.length}, collider=${colliderCount}, correção=${correction.toFixed(3)}m`],
    ['EC5', high >= 2, 'dois varais visíveis no topo', `varais no mirante=${high}/2`],
    ['EC6', varais.length >= 5 && low >= 3, 'varal espalhado: 5 no mapa, 3 fora do mirante', `total=${varais.length}/5, fora=${low}/3`],
  ];
  return { checks, vehicles, coverage, spawnViews, spawnPairs, exposed, target, observers, varais: { total: varais.length, high, low } };
}

function mutate() {
  if (mutante === 'sem-bloqueio-flanco') {
    const count = world.occluders.length;
    if (!count) throw Error('Mutante sem oclusores para remover');
    world.occluders = [];
    return { removedOccluders: count };
  }
  if (mutante === 'cobertura-perfeita') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial());
    box.position.copy(olhos(.6, 1.5, 1.2)); world.root.add(box); world.occluders.push(box);
    return { inserted: describe(box) };
  }
  if (mutante === 'veiculo-no-patamar') {
    // Veículo procedural concreto, com casco e quatro rodas; não só flag simulada.
    const vehicle = new THREE.Group(); vehicle.name = 'Veiculo_reinstalado_no_patamar';
    vehicle.userData.landmark = 'veiculo-patamar'; vehicle.userData.escadaoPatamarVehicle = true;
    vehicle.position.set(1.2, floor, .54);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 2), new THREE.MeshBasicMaterial({ color: 0x242424 }));
    body.position.y = 1; vehicle.add(body);
    for (const x of [-.78, .78]) for (const z of [-.65, .65]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .18, 12), new THREE.MeshBasicMaterial({ color: 0x080808 }));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .3, z); vehicle.add(wheel);
    }
    world.root.add(vehicle); vehicle.traverse(o => { if (o.isMesh) world.occluders.push(o); });
    world.colliders.push({ minX: .3, maxX: 2.1, minY: floor, maxY: floor + 1.55, minZ: -.46, maxZ: 1.54 });
    return { inserted: describe(vehicle), meshes: vehicle.children.length };
  }
  if (mutante === 'cobertura-sem-colisao') {
    const matches = world.colliders.filter(colliderMatches);
    if (matches.length !== 1) throw Error(`Mutante exige um collider de cobertura; encontrou ${matches.length}`);
    world.colliders = world.colliders.filter(c => c !== matches[0]);
    return { removedCollider: matches[0] };
  }
  const targets = clothes().filter(o => mutante === 'varal-sumiu' ? onTop(o) : !onTop(o));
  if (!targets.length) throw Error('Mutante não encontrou varal alvo');
  const removed = mutante === 'varal-sumiu' ? targets.slice(0, 1) : targets;
  removed.forEach(o => { o.visible = false; });
  return { hidden: removed.map(describe) };
}

let receipt = { provenance, mutante, status: 'incomplete' };
try {
  const before = measure(); receipt = { ...receipt, ...before };
  if (mutante) {
    receipt.before = before;
    if (before.checks.some(([, ok]) => !ok)) throw Error('Baseline vermelho: não atribuir falha preexistente ao mutante');
    receipt.mutation = mutate();
    const after = measure(); receipt = { ...receipt, ...after };
    const causal = mutante === 'veiculo-no-patamar' ? after.vehicles.some(o => o.uuid === receipt.mutation.inserted.uuid)
      : mutante === 'cobertura-sem-colisao' ? after.coverage.colliderCount === 0 && before.coverage.colliderCount === 1 && after.coverage.correction <= 1e-3
        : mutante === 'cobertura-perfeita' ? after.exposed < before.exposed
          : mutante === 'sem-bloqueio-flanco' ? after.spawnViews > before.spawnViews
            : after.varais.total < before.varais.total;
    receipt.causal = causal;
    if (!causal || after.checks.find(([id]) => id === expected[mutante])?.[1] !== false) throw Error(`Mutante sobreviveu/sem causalidade em ${expected[mutante]}`);
    receipt.status = 'mutation-detected';
    // Convenção histórica: mutante mordido retorna 1; recibo distingue erro de detecção.
    process.exitCode = 1;
  } else {
    receipt.status = before.checks.every(([, ok]) => ok) ? 'passed' : 'failed';
    if (receipt.status === 'failed') process.exitCode = 1;
  }
  for (const file of files) if (hash(fs.readFileSync(file)) !== sources[file]) throw Error(`Fonte mudou durante medição: ${file}`);
  for (const [id, ok, name, detail] of receipt.checks) console.log(`${ok ? '✓' : '✗'} ${id} ${name} (${detail})`);
  console.log(`ESCADÃO-CONTRATO ${receipt.status}`);
} catch (error) {
  receipt.status = 'error'; receipt.error = error.stack; process.exitCode = 1; console.error(error.message);
} finally {
  if (process.env.OUT) { fs.mkdirSync(process.env.OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.OUT, 'contract.json'), JSON.stringify(receipt, null, 2)); }
}

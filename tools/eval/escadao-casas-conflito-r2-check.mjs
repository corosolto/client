/* Baseline do relato humano de 08/09/2026: a casa central precisa
   funcionar nos dois sentidos e os sobrados do mirante precisam de acesso lateral.

   Esta régua é deliberadamente vermelha antes do patch de runtime. Ela mede o
   corpo real do jogo (r=0,38, game.js:_collide) e o degrau real (0,30 m,
   game.js:_retaAndavel), em vez de inferir circulação pela malha visual.

   Escopos:
     --scope=mutation núcleo verde usado para provar os três mutantes
     --scope=central  inclui as duas janelas da casa central; baseline vermelha
     --scope=full     inclui também os dois pavimentos superiores; baseline vermelha

   Mutantes indicam o escopo exigido quando não usam --scope=mutation:
     --mutante=janela-fechada  veda a janela voltada à escada
     --mutante=janela-oposta-fechada veda a nova janela da mesma sala
     --mutante=piso-reaberto   reabre o buraco sob o interior
     --mutante=acesso-removido fecha a entrada alta da passarela
     --mutante=casa-mirante-fechada veda a porta voltada ao respawn do mirante
 */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const scope = process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] || 'full';
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || null;
const scopes = ['mutation', 'central', 'full'];
const mutants = ['janela-fechada', 'janela-oposta-fechada', 'piso-reaberto', 'acesso-removido', 'casa-mirante-fechada'];
const mutantScopes = { 'janela-oposta-fechada': 'central', 'casa-mirante-fechada': 'full' };
if (!scopes.includes(scope)) throw Error(`Escopo desconhecido: ${scope}`);
if (mutant && !mutants.includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);
if (mutant && scope !== (mutantScopes[mutant] || 'mutation')) throw Error(`Mutante ${mutant} requer --scope=${mutantScopes[mutant] || 'mutation'}`);

const molde = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
registerPropTemplate('escadao_casa_r3', molde);

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const BODY_RADIUS = .38;
const MAX_STEP = .30;
const EYE_HEIGHT = 1.62;
const CENTRAL_FLOOR = 2.75;
const MIRANTE_FLOOR = 7.56;
const MAIN_ROOM = { x0: -3.35, x1: 1.35, z0: 14.2, z1: 16.8 };

W.root.updateMatrixWorld(true);

const rawClear = (from, to) => {
  const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, from.distanceTo(to) - .01);
  return ray.intersectObjects(W.occluders, true).length === 0;
};

let mutationApplied = !mutant;
if (mutant === 'janela-fechada') {
  const from = new THREE.Vector3(-1.4, CENTRAL_FLOOR + EYE_HEIGHT, 15.3);
  const to = new THREE.Vector3(0, W.groundHeightAt(0, 11) + 1.5, 11);
  const before = rawClear(from, to);
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, .32), new THREE.MeshStandardMaterial());
  sealed.position.set(-1.45, CENTRAL_FLOOR + 1.6, 14.35);
  W.root.add(sealed); W.occluders.push(sealed); W.root.updateMatrixWorld(true);
  mutationApplied = before && !rawClear(from, to);
}
if (mutant === 'janela-oposta-fechada') {
  const from = new THREE.Vector3(-1.4, CENTRAL_FLOOR + EYE_HEIGHT, 15.7);
  const to = new THREE.Vector3(0, W.groundHeightAt(0, 24) + 1.5, 24);
  const before = rawClear(from, to);
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, .32), new THREE.MeshStandardMaterial());
  sealed.position.set(-1.45, CENTRAL_FLOOR + 1.6, 16.675);
  W.root.add(sealed); W.occluders.push(sealed); W.root.updateMatrixWorld(true);
  mutationApplied = before && !rawClear(from, to);
}
if (mutant === 'piso-reaberto') {
  const original = W.groundHeightAt;
  const before = original(-1.4, 15.3, CENTRAL_FLOOR);
  W.groundHeightAt = (x, z, yRef) => {
    if (x >= -8.6 && x <= 8.6 && z >= 14.2 && z <= 18.5 && yRef >= 2.5) return 0;
    return original(x, z, yRef);
  };
  mutationApplied = before === CENTRAL_FLOOR && W.groundHeightAt(-1.4, 15.3, CENTRAL_FLOOR) !== before;
}
if (mutant === 'acesso-removido') {
  const before = game._retaAndavel(.2, 10.12, .9, 10.12, BODY_RADIUS, MAX_STEP);
  W.colliders.push({ minX: .35, maxX: 1.25, minY: CENTRAL_FLOOR, maxY: 5.7, minZ: 9.9, maxZ: 10.38 });
  const after = game._retaAndavel(.2, 10.12, .9, 10.12, BODY_RADIUS, MAX_STEP);
  mutationApplied = before && !after;
}
if (mutant === 'casa-mirante-fechada') {
  const before = game._retaAndavel(12, -29.5, 12, -27, BODY_RADIUS, MAX_STEP);
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.2, .32), new THREE.MeshStandardMaterial());
  sealed.position.set(12, MIRANTE_FLOOR + 1.1, -29.025);
  W.root.add(sealed); W.occluders.push(sealed);
  W.colliders.push({ minX: 11.275, maxX: 12.725, minY: MIRANTE_FLOOR, maxY: MIRANTE_FLOOR + 2.2, minZ: -29.185, maxZ: -28.865 });
  W.root.updateMatrixWorld(true);
  mutationApplied = before && !game._retaAndavel(12, -29.5, 12, -27, BODY_RADIUS, MAX_STEP);
}
assert.ok(mutationApplied, `MUTANTE NAO APLICOU: ${mutant}`);

const visible = [];
W.root.traverseVisible(o => {
  if (!o.isMesh || o.name?.startsWith('decal:') || o.userData?.nonSolidSurface || o.userData?.pecas) return;
  if (Array.isArray(o.material) ? o.material.some(m => m.visible) : o.material?.visible !== false) visible.push(o);
});
const clear = (from, to) => {
  const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, from.distanceTo(to) - .01);
  return ray.intersectObjects(W.occluders, true).length === 0
    && ray.intersectObjects(visible, false).length === 0;
};
const capsuleAt = (x, y, z) => {
  const feet = new THREE.Vector3(x, y, z), resolved = feet.clone();
  game._collide(resolved, BODY_RADIUS);
  return resolved.distanceTo(feet) < 1e-6;
};
const floorVisible = (x, y, z) => {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, y + .9, z), new THREE.Vector3(0, -1, 0), 0, 1.2);
  return ray.intersectObjects(visible, false).some(hit => Math.abs(hit.point.y - y) < .03);
};

const failures = [];
const checks = [];
const check = (id, ok, measured, expected, fix) => {
  checks.push({ id, ok, measured, expected });
  if (!ok) failures.push(`${id}: medido ${measured}; esperado ${expected}. ${fix}`);
};

const centralFloors = [
  ['geminada-leste', -1.4, 15.3],
  ['geminada-oeste', -5.975, 15.05],
  ['casa-frontal', 6.2, 15.5],
  ['janela-rua', 7.175, 17.7],
];
for (const [name, x, z] of centralFloors) {
  const y = W.groundHeightAt(x, z, CENTRAL_FLOOR);
  check(`PISO/${name}`, Math.abs(y - CENTRAL_FLOOR) < .001 && floorVisible(x, CENTRAL_FLOOR, z),
    `ground=${y.toFixed(2)}, malha=${floorVisible(x, CENTRAL_FLOOR, z)}`, `ground=2.75 e malha sob os pés`,
    'Feche a laje contínua e faça groundHeightAt reconhecer a mesma superfície.');
  check(`CAPSULA/${name}`, capsuleAt(x, CENTRAL_FLOOR, z), 'corpo r=0.38', 'posição sem deslocamento',
    'Abra o volume útil até o diâmetro corporal de 0.76 m.');
}

const routeSpecs = {
  'acesso-superior-central': {
    floor: CENTRAL_FLOOR,
    points: [[-.3, 10.12], [.9, 10.12], [.9, 12], [.9, 14.4], [1, 14.9], [-1.4, 15.5]],
  },
};
if (scope !== 'mutation') routeSpecs['acesso-inferior-central'] = {
  floor: CENTRAL_FLOOR,
  points: [[9.2, 23.2], [9.2, 20], [9.2, 17.5], [9.2, 16], [8, 16], [7, 16], [4.4, 15], [1.45, 14.94], [-1.4, 15.5]],
};

if (scope === 'full') {
  routeSpecs['casa-mirante-oeste-frontal'] = {
    floor: MIRANTE_FLOOR,
    points: [[-4.5, -34], [-8.8, -33], [-9.4, -30.4], [-12, -28.6], [-12, -26]],
  };
  routeSpecs['casa-mirante-leste-frontal'] = {
    floor: MIRANTE_FLOOR,
    points: [[4.5, -34], [8.6, -31], [9.4, -29.6], [12, -29.6], [12, -27]],
  };
}

const drive = (points) => {
  const actor = game.player;
  actor.pos.set(points[0][0], W.groundHeightAt(points[0][0], points[0][1]), points[0][1]);
  actor.vel.set(0, 0, 0); actor.grounded = true; actor.mantle = null;
  let frames = 0, maxY = actor.pos.y;
  for (const [x, z] of points.slice(1)) {
    actor.vel.set(0, 0, 0);
    let leg = 0;
    while (Math.hypot(x - actor.pos.x, z - actor.pos.z) > .15 && leg++ < 360) {
      actor.yaw = Math.atan2(actor.pos.x - x, actor.pos.z - z);
      game.time += 1 / 60;
      game._moveEntity(actor, { ax: 0, az: -1, jump: false, crouch: false, shift: false }, 1 / 60);
      maxY = Math.max(maxY, actor.pos.y); frames++;
    }
    if (leg >= 360) return { reached: false, frames, maxY, end: [actor.pos.x, actor.pos.y, actor.pos.z] };
  }
  return { reached: true, frames, maxY, end: [actor.pos.x, actor.pos.y, actor.pos.z] };
};

const routeResults = {};
for (const [name, spec] of Object.entries(routeSpecs)) {
  const result = drive(spec.points); routeResults[name] = result;
  check(`ROTA/${name}`, result.reached,
    `chegou=${result.reached}, maxY=${result.maxY.toFixed(2)}, fim=${result.end.map(n => n.toFixed(2)).join(',')}`,
    'ida livre com r=0.38 e degrau<=0.30',
    'Abra a passagem indicada e registre piso/rampa na física e no grafo.');
}

if (scope === 'full') {
  for (const [name, x, z] of [['casa-mirante-oeste', -12, -26], ['casa-mirante-leste', 12, -27]]) {
    const y = W.groundHeightAt(x, z, MIRANTE_FLOOR);
    check(`PISO/${name}`, Math.abs(y - MIRANTE_FLOOR) < .001 && floorVisible(x, MIRANTE_FLOOR, z),
      `ground=${y.toFixed(2)}, malha=${floorVisible(x, MIRANTE_FLOOR, z)}`, `ground=${MIRANTE_FLOOR.toFixed(2)} e malha sob os pés`,
      'Preserve o piso do mirante dentro da casa e uma superfície visível sob os pés.');
    check(`CAPSULA/${name}`, capsuleAt(x, MIRANTE_FLOOR, z), 'corpo r=0.38', 'posição sem deslocamento',
      'Troque a caixa sólida por um shell com interior útil para a cápsula real.');
  }
}

const losRows = [
  {
    id: 'janela-escada', route: 'acesso-superior-central',
    eye: [-1.4, CENTRAL_FLOOR + EYE_HEIGHT, 15.3], target: [-.6, W.groundHeightAt(-.6, 11) + 1.5, 11],
  },
];
if (scope !== 'mutation') losRows.push({
    id: 'janela-oposta-mesma-sala', route: 'acesso-inferior-central',
    eye: [-1.4, CENTRAL_FLOOR + EYE_HEIGHT, 15.7], target: [0, W.groundHeightAt(0, 24) + 1.5, 24],
  });
if (scope === 'full') losRows.push(
  {
    id: 'casa-mirante-oeste-contrajogo', route: 'casa-mirante-oeste-frontal',
    eye: [-12, MIRANTE_FLOOR + EYE_HEIGHT, -25], target: [-12, MIRANTE_FLOOR + 1.5, -21.8],
  },
  {
    id: 'casa-mirante-leste-contrajogo', route: 'casa-mirante-leste-frontal',
    eye: [12, MIRANTE_FLOOR + EYE_HEIGHT, -26], target: [12, MIRANTE_FLOOR + 1.5, -22.8],
  },
);

const losMatrix = [];
for (const row of losRows) {
  const eye = new THREE.Vector3(...row.eye), target = new THREE.Vector3(...row.target);
  const eyeFloor = row.eye[1] - EYE_HEIGHT;
  const targetFloor = row.target[1] - 1.5;
  const result = {
    id: row.id,
    eyeCapsule: capsuleAt(row.eye[0], eyeFloor, row.eye[2]),
    targetCapsule: capsuleAt(row.target[0], targetFloor, row.target[2]),
    fire: clear(eye, target),
    counter: clear(target, eye),
    evictionRoute: routeResults[row.route]?.reached === true,
  };
  losMatrix.push(result);
  check(`LOS/${row.id}`, Object.values(result).slice(1).every(Boolean), JSON.stringify(result),
    'olho/alvo ocupáveis, tiro e revide livres, atacante com rota de expulsão',
    'Abra somente o vão útil e conecte a posição à rota física do atacante.');
}

if (scope !== 'mutation') {
  const centralEyes = losRows.filter(row => row.id.startsWith('janela-'));
  const inMainRoom = row => row.eye[0] > MAIN_ROOM.x0 && row.eye[0] < MAIN_ROOM.x1
    && row.eye[2] > MAIN_ROOM.z0 && row.eye[2] < MAIN_ROOM.z1;
  check('SALA/janelas-opostas-no-mesmo-comodo', centralEyes.length === 2 && centralEyes.every(inMainRoom),
    JSON.stringify(centralEyes.map(row => ({ id: row.id, eye: row.eye }))),
    'dois olhos dentro da sala x=-3.35..1.35, z=14.2..16.8',
    'Meça as duas faces da mesma sala tática; não conte uma janela de outro volume conectado.');

  const ruaEye = new THREE.Vector3(...losRows.find(row => row.id === 'janela-oposta-mesma-sala').eye);
  const exposed = W.spawns.E.filter(slot => clear(ruaEye,
    new THREE.Vector3(slot.x, W.groundHeightAt(slot.x, slot.z) + 1.62, slot.z)));
  check('SPAWN/janela-oposta-mesma-sala', exposed.length === 0, `${exposed.length} slots E visíveis`, '0 slots E visíveis',
    'Mantenha cobertura depois da aproximação da rua para que a janela não vire spawn kill.');
}

if (scope === 'full') {
  for (const row of losRows.filter(r => r.id.startsWith('casa-mirante-'))) {
    const eye = new THREE.Vector3(...row.eye);
    const exposed = W.spawns.B.filter(slot => clear(eye,
      new THREE.Vector3(slot.x, W.groundHeightAt(slot.x, slot.z) + 1.5, slot.z)));
    check(`SPAWN/${row.id}`, exposed.length === 0, `${exposed.length} slots B visíveis`, '0 slots B visíveis',
      'Oriente a janela para o centro do mirante e feche a face voltada ao nascimento.');
  }

  const fauna = W.ambience?.animals || [];
  const faunaCount = type => fauna.filter(animal => animal.type === type).length;
  for (const [type, minimum] of [['rat', 5], ['pigeon', 5], ['cat', 2], ['cockroach', 5]]) {
    check(`AMBIENCIA/${type}`, faunaCount(type) >= minimum, faunaCount(type), `>=${minimum}`,
      'Distribua a fauna entre rua, patamares, escadas e mirante em vez de concentrá-la fora do percurso.');
  }
  const plantios = W.root.getObjectByName('escadao_vegetacao')?.userData.escadaoPlantios || [];
  check('AMBIENCIA/matinhos', plantios.length >= 25, plantios.length, '>=25 plantios',
    'Aumente os tufos visíveis nas bordas dos lances e nos encontros com as paredes.');
  const esgoto = W.root.getObjectByName('escadao_esgoto_curvo')?.userData.escadaoEsgoto;
  check('AMBIENCIA/esgoto-curvo', !!esgoto && esgoto.points >= 24 && esgoto.xSpan >= .3 && esgoto.yDrop >= 7,
    JSON.stringify(esgoto || null), '>=24 pontos, curva lateral>=0.3 m e queda>=7 m',
    'Faça o filete acompanhar os três lances com queda e variação lateral visíveis.');
  const fios = W.root.getObjectByName('escadao_fiacao')?.userData.escadaoRamais || [];
  check('AMBIENCIA/fios', fios.length >= 28, fios.length, '>=28 ramais',
    'Reforce as travessias e os ramais presos às fachadas ao longo da subida.');
  let guardas = 0;
  W.root.traverse(object => { if (object.userData?.escadaoPassarelaGuarda) guardas++; });
  check('CASA/passarela-sem-buraco-lateral', guardas === 2, guardas, '2 guardas laterais',
    'Feche as duas quedas da passarela sem invadir a boca da escada principal.');
  check('SPAWN/inferior-sem-biombo-central', W.spawns.E.every(slot => Math.abs(slot.x) >= 4 && slot.z > 25),
    JSON.stringify(W.spawns.E), 'slots atrás dos sobrados e centro livre',
    'Use os sobrados como proteção natural e mantenha a rua central desobstruída.');
}

const report = {
  scope, mutant,
  capsule: { radius: BODY_RADIUS, diameter: BODY_RADIUS * 2, maxStep: MAX_STEP, eyeHeight: EYE_HEIGHT },
  floors: { central: CENTRAL_FLOOR, mirante: MIRANTE_FLOOR },
  mainRoom: MAIN_ROOM,
  losMatrix,
  routes: Object.fromEntries(Object.entries(routeResults).map(([name, r]) => [name, {
    reached: r.reached, frames: r.frames, maxY: Number(r.maxY.toFixed(3)), end: r.end.map(n => Number(n.toFixed(3))),
  }])),
  checks: { total: checks.length, passed: checks.filter(c => c.ok).length, failed: failures.length },
  failures,
};
console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`ESCADAO CASAS CONFLITO R2 RED: ${failures.length} cláusula(s) — veja failures no JSON acima`);
  process.exitCode = 1;
} else {
  console.log(`ESCADAO CASAS CONFLITO R2 PASS: ${checks.length} cláusulas`);
}

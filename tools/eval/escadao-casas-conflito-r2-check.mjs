/* Baseline do relato humano de 08/09/2026 (PR #529): a casa central precisa
   funcionar nos dois sentidos e os sobrados do mirante precisam de acesso lateral.

   Esta régua é deliberadamente vermelha antes do patch de runtime. Ela mede o
   corpo real do jogo (r=0,38, game.js:_collide) e o degrau real (0,30 m,
   game.js:_retaAndavel), em vez de inferir circulação pela malha visual.

   Escopos:
     --scope=mutation núcleo verde usado para provar os três mutantes
     --scope=central  inclui as duas janelas da casa central; baseline vermelha
     --scope=full     inclui também os dois pavimentos superiores; baseline vermelha

   Mutantes, sempre com --scope=mutation:
     --mutante=janela-fechada  veda a janela voltada à escada
     --mutante=piso-reaberto   reabre o buraco sob o interior
     --mutante=acesso-removido fecha a entrada alta da passarela
 */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const scope = process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] || 'full';
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || null;
const scopes = ['mutation', 'central', 'full'];
const mutants = ['janela-fechada', 'piso-reaberto', 'acesso-removido'];
if (!scopes.includes(scope)) throw Error(`Escopo desconhecido: ${scope}`);
if (mutant && !mutants.includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);
if (mutant && scope !== 'mutation') throw Error('Mutantes rodam com --scope=mutation para isolar a cláusula que devem morder');

const molde = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
registerPropTemplate('escadao_casa_r3', molde);

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
const BODY_RADIUS = .38;
const MAX_STEP = .30;
const EYE_HEIGHT = 1.62;
const CENTRAL_FLOOR = 2.75;
const MIRANTE_FLOOR = 7.56;
const UPPER_FLOOR = MIRANTE_FLOOR + 3.05;

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
    points: [[-.3, 10.12], [.9, 10.12], [.9, 12], [.9, 14.4], [1, 14.9], [3.2, 15.5]],
  },
};
if (scope !== 'mutation') routeSpecs['acesso-inferior-central'] = {
  floor: CENTRAL_FLOOR,
  points: [[9.2, 23.2], [9.2, 20], [9.2, 17.5], [9.2, 16], [8, 16], [7, 16], [6.2, 15.5]],
};

if (scope === 'full') {
  routeSpecs['sobrado-oeste-lateral'] = {
    floor: UPPER_FLOOR,
    points: [[-14.55, -22.8], [-14.55, -24.4], [-14.55, -25.5], [-14.55, -26.6], [-14.55, -27.7], [-13.8, -27.7], [-10.35, -26]],
  };
  routeSpecs['sobrado-leste-lateral'] = {
    floor: UPPER_FLOOR,
    points: [[14.55, -23.8], [14.55, -25.4], [14.55, -26.5], [14.55, -27.6], [14.55, -28.5], [13.8, -28.5], [10.35, -27]],
  };
}

const drive = (points) => {
  const actor = game.player;
  actor.pos.set(points[0][0], W.groundHeightAt(points[0][0], points[0][1]), points[0][1]);
  actor.vel.set(0, 0, 0); actor.grounded = true; actor.mantle = null;
  let frames = 0, maxY = actor.pos.y;
  for (const [x, z] of points.slice(1)) {
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
  const climbed = name.startsWith('sobrado-') ? result.maxY >= spec.floor - .08 : true;
  check(`ROTA/${name}`, result.reached && climbed,
    `chegou=${result.reached}, maxY=${result.maxY.toFixed(2)}, fim=${result.end.map(n => n.toFixed(2)).join(',')}`,
    `ida livre com r=0.38 e degrau<=0.30${name.startsWith('sobrado-') ? ` até y=${UPPER_FLOOR.toFixed(2)}` : ''}`,
    'Abra a passagem indicada e registre piso/rampa na física e no grafo.');
}

if (scope === 'full') {
  for (const [name, x, z] of [['sobrado-oeste', -10.35, -26], ['sobrado-leste', 10.35, -27]]) {
    const y = W.groundHeightAt(x, z, UPPER_FLOOR);
    check(`PISO/${name}`, Math.abs(y - UPPER_FLOOR) < .001 && floorVisible(x, UPPER_FLOOR, z),
      `ground=${y.toFixed(2)}, malha=${floorVisible(x, UPPER_FLOOR, z)}`, `ground=${UPPER_FLOOR.toFixed(2)} e malha sob os pés`,
      'Cadastre o pavimento superior no groundHeightAt e preserve uma laje visível.');
    check(`CAPSULA/${name}`, capsuleAt(x, UPPER_FLOOR, z), 'corpo r=0.38', 'posição sem deslocamento',
      'Recorte a parede do pavimento para a cápsula real, sem depender só da fachada.');
  }
}

const losRows = [
  {
    id: 'janela-escada', route: 'acesso-superior-central',
    eye: [-1.4, CENTRAL_FLOOR + EYE_HEIGHT, 15.3], target: [0, W.groundHeightAt(0, 11) + 1.5, 11],
  },
];
if (scope !== 'mutation') losRows.push({
    id: 'janela-respawn-inferior', route: 'acesso-inferior-central',
    eye: [7.175, CENTRAL_FLOOR + EYE_HEIGHT, 17.7], target: [10.8, W.groundHeightAt(10.8, 24) + 1.5, 24],
  });
if (scope === 'full') losRows.push(
  {
    id: 'sobrado-oeste-contrajogo', route: 'sobrado-oeste-lateral',
    eye: [-10.35, UPPER_FLOOR + EYE_HEIGHT, -26], target: [-5, MIRANTE_FLOOR + 1.5, -27],
  },
  {
    id: 'sobrado-leste-contrajogo', route: 'sobrado-leste-lateral',
    eye: [10.35, UPPER_FLOOR + EYE_HEIGHT, -27], target: [5, MIRANTE_FLOOR + 1.5, -27],
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

if (scope === 'full') {
  for (const row of losRows.filter(r => r.id.startsWith('sobrado-'))) {
    const eye = new THREE.Vector3(...row.eye);
    const exposed = W.spawns.B.filter(slot => clear(eye,
      new THREE.Vector3(slot.x, W.groundHeightAt(slot.x, slot.z) + 1.5, slot.z)));
    check(`SPAWN/${row.id}`, exposed.length === 0, `${exposed.length} slots B visíveis`, '0 slots B visíveis',
      'Oriente a janela para o centro do mirante e feche a face voltada ao nascimento.');
  }
}

const report = {
  scope, mutant,
  capsule: { radius: BODY_RADIUS, diameter: BODY_RADIUS * 2, maxStep: MAX_STEP, eyeHeight: EYE_HEIGHT },
  floors: { central: CENTRAL_FLOOR, mirante: MIRANTE_FLOOR, upper: UPPER_FLOOR },
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

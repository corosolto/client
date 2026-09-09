import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourcePath = path.join(root, 'tools/blender/viewmodels/build_pistol_hires_pilot.py');
const glbPath = path.join(root, 'public/models/viewmodels/coro/pistol-hires.glb');
const source = fs.readFileSync(sourcePath, 'utf8');

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

function tuple(pattern, label) {
  const match = source.match(pattern);
  expect(Boolean(match), `${label}: contrato ausente no gerador`);
  return match ? match.slice(1).map(Number) : [];
}

const support = tuple(
  /SUPPORT_WRIST_OFFSET\s*=\s*Vector\(\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\)/,
  'empunhadura de apoio',
);
if (support.length) {
  expect(support[0] >= 3.5, `palma de apoio continua recuada (x=${support[0]}; mínimo 3.5)`);
  expect(support[1] >= -1.25, `palma de apoio continua sob o carregador (y=${support[1]}; mínimo -1.25)`);
  expect(support[2] >= -1.25, `palma de apoio continua baixa (z=${support[2]}; mínimo -1.25)`);
}

const supportRotation = tuple(
  /SUPPORT_WRIST_ROTATION_DEG\s*=\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/,
  'rotação anatômica do punho de apoio',
);
if (supportRotation.length) {
  expect(supportRotation[2] >= 25 && supportRotation[2] <= 35,
    `polegar de apoio continua aberto/vertical (z=${supportRotation[2]}; faixa 25..35)`);
}

const camera = tuple(
  /camera\.location\s*=\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/,
  'câmera da pistola',
);
if (camera.length) {
  expect(camera[0] >= 18 && camera[0] <= 22,
    `ângulo da pistola saiu do registro frontal atual (camera.x=${camera[0]}; faixa 18..22)`);
}

const target = tuple(
  /target\s*=\s*Vector\(\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\)/,
  'alvo óptico da pistola',
);
if (target.length) {
  expect(target[0] >= 10 && target[0] <= 14,
    `alvo óptico saiu do registro frontal atual (target.x=${target[0]}; faixa 10..14)`);
}

expect(/camera_data\.shift_x\s*=/.test(source), 'falta shift_x: o enquadramento frontal corta/desloca a pistola');
expect(/camera_data\.shift_y\s*=/.test(source), 'falta shift_y: o enquadramento não possui correção óptica vertical');

const duplicateActions = [...source.matchAll(/action\s*=\s*bpy\.data\.actions\.new\(action_name\)/g)].length;
expect(duplicateActions === 1,
  `cada clip deve criar uma única Action; encontrados ${duplicateActions} comandos idênticos`);

expect(source.includes('trigger_fingers = {"R_point1_031", "R_point2_032", "R_point3_033"}'),
  'Shoot precisa animar a cadeia real do indicador dominante');
expect(source.includes('(0, False), (1, True), (3, True), (5, False), (8, False)'),
  'pressão do gatilho precisa acontecer imediatamente no disparo e retornar à pegada');
expect(source.includes('recoil = Vector((0.10, 0.65, 0.42)) if pressed'),
  'Shoot precisa ter recuo visual curto sem soltar as mãos da arma');
expect(source.includes('for root_name in ("_rootJoint", "CoroWeapon", "CoroMagazine")'),
  'Shoot precisa mover mãos, arma e carregador acoplado como uma única montagem');
expect(source.includes('CoroFreshMagazine'),
  'recarga precisa de um segundo carregador independente');
expect(source.includes('spent-mag removal plus hand-led fresh-mag insertion'),
  'recarga precisa remover o usado e levar o novo com a mão até a arma');
expect(source.includes('fresh_position - seated, fresh_visible'),
  'carregador novo precisa percorrer uma trajetória própria até o encaixe');
expect(source.includes('action.use_fake_user = True'),
  'todas as ações precisam ser preservadas no .blend e no GLB');
expect(source.includes('idle.use_fake_user = True'),
  'Idle precisa ser preservada no .blend e no GLB');

expect(fs.existsSync(glbPath), 'GLB público da pistola não existe');
if (fs.existsSync(glbPath)) {
  const glb = fs.readFileSync(glbPath);
  expect(glb.length > 100_000, `GLB suspeitamente pequeno (${glb.length} bytes)`);
  expect(glb.subarray(0, 4).toString('ascii') === 'glTF', 'arquivo público não possui cabeçalho GLB');
}

if (failures.length) {
  console.error('PISTOL_HIRES_PILOT FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PISTOL_HIRES_PILOT PASS: grip, câmera, gatilho, recarga de dois carregadores e artefato respeitam o contrato');

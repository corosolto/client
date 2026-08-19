/* Treta no Vietnã: rampas acessam guaritas, sem degrau invisível nem cenário decorativo.
 * Mutantes: --mutante=sem-rampa | --mutante=rampa-plana | --mutante=clima-claro | --mutante=sem-estrutura | --mutante=escuro
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { THREE, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MAP_FILE = resolve('public/js/map_treta_vietnan.js');
const PREVIEW = resolve('public/img/map-previews/treta_vietnan.jpg');
const TOWER_TOP = 3.2;
const falhas = [];
const ok = (cond, msg) => { if (!cond) falhas.push(msg); };

if (!existsSync(MAP_FILE)) {
  console.error('VIETNÃ — FALHA\n  V1 arquivo public/js/map_treta_vietnan.js ausente');
  process.exit(1);
}

const { buildTretaVietnam } = await import(`${pathToFileURL(MAP_FILE).href}?check=${Date.now()}`);
ok(typeof buildTretaVietnam === 'function', 'V1 builder buildTretaVietnam ausente');

if (typeof buildTretaVietnam === 'function') {
  const scene = new THREE.Scene();
  const world = buildTretaVietnam(scene, await initTextures());
  scene.updateMatrixWorld(true);

  const findParts = () => {
    const ramps = [], towers = [];
    world.root.traverse((o) => {
      if (o.userData?.vietnamRamp) ramps.push(o);
      if (o.userData?.vietnamTower) towers.push(o);
    });
    return { ramps, towers };
  };
  if (MUTANTE === 'sem-rampa') {
    const builtRamp = findParts().ramps.at(-1);
    builtRamp?.parent?.remove(builtRamp);
  }
  if (MUTANTE === 'rampa-plana') {
    const originalGroundHeightAt = world.groundHeightAt;
    world.groundHeightAt = (x, z) => {
      const onRamp = Math.abs(z) <= 1.72 && Math.abs(x) >= 19 && Math.abs(x) <= 26;
      return onRamp ? 0 : originalGroundHeightAt(x, z);
    };
  }
  scene.updateMatrixWorld(true);
  const { ramps, towers } = findParts();
  if (MUTANTE === 'clima-claro') {
    scene.getObjectByName('ceu-tempestade-vietnan')?.removeFromParent();
    if (world.sun) world.sun.intensity = 1.8;
  }
  if (MUTANTE === 'sem-estrutura') {
    for (const object of [...world.root.children]) {
      if (object.name.includes('-coluna-telhado')) object.removeFromParent();
    }
  }
  if (MUTANTE === 'escuro') {
    world.hemi.intensity = 0.55;
    world.sun.intensity = 0.72;
    for (const ramp of ramps) ramp.material.color.setHex(0x4a3426);
  }

  ok(ramps.length >= 2, `V2 rampas visíveis: ${ramps.length}, esperado >= 2`);
  ok(towers.length >= 2, `V3 guaritas: ${towers.length}, esperado >= 2`);
  ok(typeof world.groundHeightAt === 'function', 'V4 groundHeightAt ausente');

  for (const ramp of ramps) {
    const { start, end, topY, towerId } = ramp.userData.vietnamRamp;
    ok(start && end && Number.isFinite(topY), `V4 metadados inválidos na rampa ${towerId || '?'}`);
    if (!start || !end || !Number.isFinite(topY) || typeof world.groundHeightAt !== 'function') continue;
    let anterior = -Infinity;
    let maiorDegrau = 0;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      const y = world.groundHeightAt(x, z);
      if (anterior !== -Infinity) maiorDegrau = Math.max(maiorDegrau, Math.abs(y - anterior));
      ok(y + 0.01 >= anterior, `V4 rampa ${towerId} desce em t=${t.toFixed(2)}`);

      const raio = 0.38;
      const bloqueiaCorpo = world.colliders.some((c) => x + raio > c.minX && x - raio < c.maxX
        && z + raio > c.minZ && z - raio < c.maxZ && y + 1.75 > c.minY && y + 0.08 < c.maxY);
      ok(!bloqueiaCorpo, `V5 corpo bloqueado na rampa ${towerId}, t=${t.toFixed(2)}`);
      anterior = y;
    }
    ok(anterior >= topY - 0.12, `V4 rampa ${towerId} termina em ${anterior.toFixed(2)} m, topo ${topY}`);
    ok(maiorDegrau <= 0.30, `V4 rampa ${towerId} tem degrau ${maiorDegrau.toFixed(2)} m`);

    ramp.geometry.computeBoundingBox();
    const box = ramp.geometry.boundingBox;
    const endpointA = new THREE.Vector3(box.min.x, 0, 0).applyMatrix4(ramp.matrixWorld);
    const endpointB = new THREE.Vector3(box.max.x, 0, 0).applyMatrix4(ramp.matrixWorld);
    const low = endpointA.y < endpointB.y ? endpointA : endpointB;
    const high = endpointA.y < endpointB.y ? endpointB : endpointA;
    ok(Math.hypot(low.x - start.x, low.z - start.z) <= 0.25 && Math.abs(low.y) <= 0.12,
      `V5 malha da rampa ${towerId} não começa no chão`);
    ok(Math.hypot(high.x - end.x, high.z - end.z) <= 0.25 && Math.abs(high.y - topY) <= 0.12,
      `V5 malha da rampa ${towerId} não alcança a guarita`);
    ok((box.max.z - box.min.z) >= 2.4, `V5 rampa ${towerId} estreita para travessia`);
  }

  const towerIds = new Set(towers.map((t) => t.userData.vietnamTower));
  for (const ramp of ramps) ok(towerIds.has(ramp.userData.vietnamRamp.towerId), `V6 rampa sem guarita: ${ramp.userData.vietnamRamp.towerId}`);

  ok(world.spawns?.E?.length >= 4 && world.spawns?.B?.length >= 4, 'V7 spawns incompletos');
  ok(world.pickups?.length >= 16, `V8 arsenal curto: ${world.pickups?.length || 0}, esperado >= 16`);
  ok(world.waypoints?.nodes?.length >= 80, `V9 navegação pobre: ${world.waypoints?.nodes?.length || 0} nós`);
  const a = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
  const b = world.nearestWaypoint(world.spawns.B[0].x, world.spawns.B[0].z);
  ok(world.findPath(a, b).length > 2, 'V9 não há rota entre os spawns');

  const foliageMaterials = new Set();
  world.root.traverse((o) => {
    if (!o.isMesh || !o.material?.color) return;
    const color = o.material.color.getHex();
    if (color === 0x315b27 || color === 0x4d7835) foliageMaterials.add(o.material);
  });
  ok(foliageMaterials.size >= 2, `V12 materiais de folhagem: ${foliageMaterials.size}, esperado >= 2`);
  for (const material of foliageMaterials) {
    ok(material.isMeshStandardMaterial && material.map?.isCanvasTexture && material.bumpMap?.isCanvasTexture
      && material.bumpMap !== material.map && material.bumpMap.colorSpace === THREE.NoColorSpace,
      'V12 folhagem sem textura procedural PBR e relevo');
    ok(material.roughness >= 0.8 && material.metalness === 0, 'V12 resposta física incorreta para folha');
  }

  const stormSky = scene.getObjectByName('ceu-tempestade-vietnan');
  ok(stormSky?.material?.map?.isCanvasTexture && stormSky.material.side === THREE.BackSide,
    'V13 céu de guerra procedural ausente');
  ok(scene.fog?.near <= 48 && scene.fog?.far <= 100 && world.sun?.intensity <= 1.25,
    'V13 atmosfera clara demais para o clima de guerra');
  for (const ramp of ramps) {
    const maxChannel = Math.max(ramp.material.color.r, ramp.material.color.g, ramp.material.color.b);
    ok(ramp.material.isMeshStandardMaterial && ramp.material.map?.isCanvasTexture
      && ramp.material.bumpMap?.isCanvasTexture && ramp.material.roughness >= 0.85 && maxChannel <= 0.55,
    `V13 madeira clara ou sem desgaste na ${ramp.name}`);
  }
  scene.updateMatrixWorld(true);
  for (const towerId of ['guarita-oeste', 'guarita-leste']) {
    const roof = world.root.getObjectByName(`${towerId}-telhado`);
    const columns = [], beams = [];
    world.root.traverse((o) => {
      if (o.name === `${towerId}-coluna-telhado`) columns.push(o);
      if (o.name === `${towerId}-viga-lateral`) beams.push(o);
    });
    ok(columns.length === 4, `V14 ${towerId} tem ${columns.length}/4 colunas sustentando o teto`);
    ok(beams.length >= 4, `V14 ${towerId} sem travamento lateral completo`);
    ok(new Set(columns.map((column) => column.geometry)).size <= 1,
      `V14 ${towerId} duplica geometria nas colunas repetidas`);
    if (roof) {
      const roofBottom = new THREE.Box3().setFromObject(roof).min.y;
      for (const column of columns) {
        const box = new THREE.Box3().setFromObject(column);
        ok(box.min.y <= TOWER_TOP + 0.08 && roofBottom - box.max.y <= 0.12,
          `V14 coluna desconectada entre piso e teto em ${towerId}`);
      }
    }
  }
  const rampLightness = Math.max(...ramps.map((ramp) => Math.max(
    ramp.material.color.r, ramp.material.color.g, ramp.material.color.b)));
  ok(world.hemi?.intensity >= 1.1 && world.sun?.intensity >= 1.12 && rampLightness >= 0.3,
    'V15 guaritas escuras demais para leitura durante a partida');
}

ok(existsSync(PREVIEW), 'V10 preview public/img/map-previews/treta_vietnan.jpg ausente');
ok(readFileSync(resolve('src/pages/maps.astro'), 'utf8').includes('treta_vietnan:'), 'V11 tradução da página /maps ausente');

console.log(`TRETA NO VIETNÃ${MUTANTE ? ` [mutante: ${MUTANTE}]` : ''}`);
if (falhas.length) {
  for (const f of falhas) console.log(`  x ${f}`);
  process.exit(1);
}
console.log('  ✓ V1–V15 mapa, rampas, guaritas, estrutura, leitura, arsenal, rotas, folhagem, clima, preview e página EN');

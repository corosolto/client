/* Inspeção da captura offline do BUG-91 (complemento do render Blender).
   ----------------------------------------------------------------------------
   O que ERA a expectativa desta frente: OLHAR as PNGs de
   artifacts/sertao-casas/bug91-after. Nenhum modelo desta sessão recebe imagem
   (nem o juiz, nem o MCP de visão — 'connection closed'), então a inspeção
   visual foi substituída pela MEDIÇÃO do mesmo enquadramento: para cada câmera
   declarada em tools/render-sertao-interiors.py, raios na frustum real contra
   a lista efetiva de oclusores (a mesma geometria que o Blender desenhou a
   partir do geometry.json) respondem se o vão de porta/janela aparece ABERTO
   no quadro e se a lança da carroça norte não toca parede alguma no
   enquadramento.

     CV1  porta e janela das casas dos spawns visíveis como VÃO (raio da câmera
          atravessa a parede sem hit na altura do vão).
     CV2  lança da carroça norte não intercepta nenhuma malha de casa no
          enquadramento (o defeito pré-BUG-91 cravava a platibanda-0).
     CV3  piso das casas dos spawns visível no quadro interior (raio para baixo
          a partir da câmera interna acerta o piso da própria casa).

   Não substitui revisão humana 3:2 em WebGL; registra a limitação no ledger.
   Uso: node tools/eval/sertao-capture-verify-check.mjs
*/
import { THREE, MAPS, initTextures } from './harness.mjs';

const scene = new THREE.Scene();
const saved = globalThis.window; delete globalThis.window;
const world = MAPS.velho_oeste.build(scene, await initTextures()); globalThis.window = saved;
world.root.updateMatrixWorld(true);
const occluders = world.occluders;
const ray = new THREE.Raycaster();
const hitAny = (from, dir, far = 200) => {
  ray.set(from, dir.clone().normalize()); ray.near = 0; ray.far = far;
  return ray.intersectObjects(occluders, false);
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cameras = {
  'casa-spawn-e-ext': { eye: V(10.4, 1.62, -33.8), target: V(9.7, 1.4, -26) },
  'casa-spawn-e-int': { eye: V(9.94, 1.62, -27.97), target: V(9.45, 1.4, -23.05) },
  'casa-spawn-b-ext': { eye: V(-7.3, 1.62, 31.4), target: V(-8.4, 1.4, 24.2) },
  'casa-spawn-b-int': { eye: V(-8.61, 1.62, 25.69), target: V(-7.98, 1.4, 27.17) },
  'carroca-norte': { eye: V(-5.7, 1.62, -14.2), target: V(-6.5, 1.1, -20) },
};

/* CV1 — o vão de porta (y≈1,1) e o de janela (y≈1,62) das casas dos spawns
   precisam aparecer ABERTO no quadro da câmera externa. */
const doorGapVisible = [];
for (const [casa, cam, y] of [
  ['sertao-casa-platibanda-1', cameras['casa-spawn-e-ext'], 1.1],
  ['sertao-casa-pedra-7', cameras['casa-spawn-b-ext'], 1.1],
]) {
  const house = world.interiorHouses.find(h => h.name === casa);
  const meta = house.userData.interior;
  const gapPoint = V(meta.entrance[0], y, meta.entrance[1]);
  const toGap = gapPoint.clone().sub(cam.eye);
  const hits = hitAny(cam.eye, toGap, toGap.length() + 2);
  const blocker = hits.find(h => h.distance < toGap.length() - .05);
  doorGapVisible.push({ casa, y, blocked: !!blocker, blocker: blocker?.object.name || blocker?.object.parent?.name || null });
}
const windowGapVisible = [];
for (const [casa, cam] of [['sertao-casa-platibanda-1', cameras['casa-spawn-e-int']], ['sertao-casa-pedra-7', cameras['casa-spawn-b-int']]]) {
  const house = world.interiorHouses.find(h => h.name === casa);
  const meta = house.userData.interior;
  const gapPoint = V(meta.farWindow[0], 1.62, meta.farWindow[1]);
  const toGap = gapPoint.clone().sub(cam.eye);
  const hits = hitAny(cam.eye, toGap, toGap.length() + 6);
  // acertar o mundo ALÉM do vão é a própria linha de tiro; só bloqueia o que
  // fecha o vão ANTES do plano da janela.
  const blocker = hits.find(h => h.distance < toGap.length() - .05);
  windowGapVisible.push({ casa, blocked: !!blocker, blocker: blocker?.object.name || null });
}

/* CV2 — a lança da carroça norte (espelhada na BUG-91) não pode tocar casa. */
const wagon = world.root.children.find(o => o.name === 'carroca' && Math.abs(o.position.x + 6) < .1 && Math.abs(o.position.z + 19.6) < .1);
let shaftClear = { found: false };
if (wagon) {
  const tipLocal = V(0, .85, -4.8);
  const tip = tipLocal.clone().applyMatrix4(wagon.matrixWorld);
  const cam = cameras['carroca-norte'];
  const toTip = tip.clone().sub(cam.eye);
  const hits = hitAny(cam.eye, toTip, toTip.length() - .3);
  shaftClear = { found: true, blocked: hits.length > 0, blockers: [...new Set(hits.map(h => h.object.parent?.name || h.object.name))].slice(0, 4) };
}

/* CV3 — das câmeras internas, o raio para baixo acerta o PISO da própria casa. */
const floorHits = [];
for (const [casa, cam] of [['sertao-casa-platibanda-1', cameras['casa-spawn-e-int']], ['sertao-casa-pedra-7', cameras['casa-spawn-b-int']]]) {
  const house = world.interiorHouses.find(h => h.name === casa);
  const down = hitAny(cam.eye.clone().add(V(0, -.2, 0)), V(0, -1, 0), 3);
  const piso = down.find(h => h.object.name === `${casa}-piso`);
  floorHits.push({ casa, piso: !!piso, first: down[0]?.object.name || null });
}

const checks = {
  CV1: doorGapVisible.every(d => !d.blocked) && windowGapVisible.every(w => !w.blocked),
  CV2: shaftClear.found && !shaftClear.blocked,
  CV3: floorHits.every(f => f.piso),
};
console.log(JSON.stringify({ checks, doorGapVisible, windowGapVisible, shaftClear, floorHits,
  limitação: 'inspeção por raio no mesmo enquadramento do render; revisão visual humana/WebGL pendente' }, null, 2));
process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;

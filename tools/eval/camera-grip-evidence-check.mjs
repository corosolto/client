/* Evidência offline do piloto Câmera Roxa com a arma canônica M4.

   O Blender persiste mãos e anchors para walk/crouch. A régua recalcula as
   distâncias contra o teto canônico (lib/grip-tolerancia.mjs), confere hashes e
   exige as quatro figuras. Pose em `foraDoContrato` precisa medir ACIMA do teto.
   O mutante move somente a M4 pelo offset persistido e precisa ficar vermelho.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { TETO_PEGADA_M, tetoTexto } from './lib/grip-tolerancia.mjs';

const MUTANT = process.argv.includes('--mutante=arma-deslocada');
const evidencePath = 'tools/eval/asset-evidence/camera-roxa/grip/camera-roxa-grip-evidence.json';
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const failures = [];
const check = (ok, message) => { console.log(`${ok ? '✓' : '✗'} ${message}`); if (!ok) failures.push(message); };

check(evidence.weapon === 'm4', 'arma declarada é M4');
check(evidence.characterSha256 === sha256(evidence.character), 'SHA do Câmera canônico confere');
check(evidence.weaponSha256 === sha256(evidence.weaponFile), 'SHA da M4 canônica confere');
check(evidence.socketContract?.maxHandDistanceMeters === TETO_PEGADA_M, `tolerância do recibo = teto canônico (${tetoTexto})`);
for (const [clip, pose] of Object.entries(evidence.foraDoContrato || {})) {
  const pior = Math.max(distance(pose.rightHand, pose.rightAnchor), distance(pose.leftHand, pose.leftAnchor));
  check(!evidence.poses[clip] && pior > TETO_PEGADA_M && !!pose.motivo,
    `${clip}: fora do contrato mede acima do teto (${pior.toFixed(3)} m > ${tetoTexto}) e declara o motivo`);
}

for (const [clip, pose] of Object.entries(evidence.poses)) {
  const anchors = MUTANT && clip === 'walk' ? pose.mutant : pose;
  const right = distance(pose.rightHand, anchors.rightAnchor);
  const left = distance(pose.leftHand, anchors.leftAnchor);
  check(right <= TETO_PEGADA_M, `${clip}: mão direita toca anchor (${right.toFixed(3)} m <= ${tetoTexto})`);
  check(left <= TETO_PEGADA_M, `${clip}: mão esquerda toca anchor (${left.toFixed(3)} m <= ${tetoTexto})`);
  check(existsSync(pose.render), `${clip}: render de corpo inteiro existe`);
}
check(existsSync(evidence.poses.walk.gripRender), 'grip A limpo existe');
check(existsSync(evidence.poses.walk.mutant.render), 'grip B mutante com M4 existe');

if (MUTANT) {
  if (!failures.length) {
    console.error('MUTANTE PASSOU: deslocar a M4 não deixou a régua vermelha.');
    process.exit(1);
  }
  console.log(`mutante reprovado como esperado (${failures.length} cláusulas).`);
  process.exit(1);
}
if (failures.length) process.exit(1);
console.log('CAMERA-GRIP-EVIDENCE ✓ M4 + walk/crouch + A/B');


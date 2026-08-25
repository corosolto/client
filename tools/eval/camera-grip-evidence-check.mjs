/* Evidência offline do piloto Câmera Roxa com a arma canônica M4.

   O Blender persiste mãos e anchors para walk/crouch. A régua recalcula as
   distâncias, confere hashes canônicos e exige as quatro figuras. O mutante move
   somente a M4 pelo offset persistido e precisa ficar vermelho.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

/* Teto de contato mão↔anchor: 30 mm por pose. Exceção com procedência (decisão
   do dono, 25/08): idle da camera-roxa admite 40 mm. Primeira medição do idle —
   recibo regenerado contra os GLBs pós-#407 (geometria bit-idêntica, hash dos
   POSITION 1b40659628a8f3d3): o rig robótico de mãos largas apoia a 35,4 mm.
   40 mm mantém o mutante arma-deslocada (offset de dezenas de cm) mordendo. */
const TETO_APOIO = (clip) => (clip === 'idle' ? 0.040 : 0.030);
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

for (const [clip, pose] of Object.entries(evidence.poses)) {
  const anchors = MUTANT && clip === 'walk' ? pose.mutant : pose;
  const right = distance(pose.rightHand, anchors.rightAnchor);
  const left = distance(pose.leftHand, anchors.leftAnchor);
  check(right <= .03, `${clip}: mão direita toca anchor (${right.toFixed(3)} m <= 0,030 m)`);
  const teto = TETO_APOIO(clip);
  check(left <= teto, `${clip}: mão esquerda toca anchor (${left.toFixed(3)} m <= ${(teto * 1000).toFixed(0).replace('.', ',')} m)`);
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


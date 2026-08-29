/* Prova Blender não-browser de arma + duas mãos para BUG-46/47.

   Recalcula as distâncias persistidas pelo Blender, confere hashes canônicos e
   exige A/B. O mutante usa os anchors da arma deslocada; não confia em flag ou
   declaração de sucesso do gerador.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const mutation = process.argv.includes('--mutante=arma-deslocada');
const lendaMutation = process.argv.includes('--mutante=lenda-arma-deslocada');
const motocaMutation = process.argv.includes('--mutante=motoca-arma-deslocada');
const microMutation = process.argv.includes('--mutante=microfonildo-arma-deslocada');
const ids = ['programador-virado', 'motoca-cachorro-loko', 'doidinho-bairro', 'designer-ux', 'lenda-lanhouse', 'microfonildo'];
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const failures = [];
const check = (ok, label, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${detail}`);
  if (!ok) failures.push(label);
};

for (const id of ids) {
  const base = `tools/eval/asset-evidence/${id}/grip`;
  const receiptPath = `${base}/${id}-grip-evidence.json`;
  if (!existsSync(receiptPath)) {
    check(false, `${id} recibo Blender`, `${receiptPath} ausente; não sei medir SHA/socket/pegada`);
    continue;
  }
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  check(receipt.characterSha256 === sha256(receipt.character), `${id} SHA personagem`, receipt.characterSha256);
  check(receipt.weaponSha256 === sha256(receipt.weaponFile), `${id} SHA arma ${receipt.weapon}`, receipt.weaponSha256);
  const requiredPoses = id === 'motoca-cachorro-loko' ? ['idle', 'walk', 'crouch'] : ['walk', 'crouch'];
  check(requiredPoses.every((clip) => receipt.poses[clip]), `${id} estados de pegada`, requiredPoses.join('/'));
  for (const [clip, pose] of Object.entries(receipt.poses)) {
    // O mutante do quinto slice usa as coordenadas da M4 realmente deslocada e
    // persistidas pelo Blender. Se Designer sair da lista, o mutante deixa de
    // morder e o próprio portão acusa `MUTANTE PASSOU`.
    const anchors = ((mutation && id === 'designer-ux')
      || (motocaMutation && id === 'motoca-cachorro-loko')
      || (lendaMutation && id === 'lenda-lanhouse')
      || (microMutation && id === 'microfonildo')) && clip === 'walk' ? pose.mutant : pose;
    const right = distance(pose.rightHand, anchors.rightAnchor);
    const left = distance(pose.leftHand, anchors.leftAnchor);
    check(right <= .03, `${id}/${clip} mão de gatilho`, `${right.toFixed(3)} m <= 0,030 m`);
    check(left <= .03, `${id}/${clip} mão de apoio`, `${left.toFixed(3)} m <= 0,030 m`);
    check(existsSync(pose.render), `${id}/${clip} figura`, pose.render);
  }
  check(existsSync(receipt.poses.walk.gripRender), `${id} 3/4 limpo`, receipt.poses.walk.gripRender);
  check(existsSync(receipt.poses.walk.mutant.render), `${id} mutante visual`, receipt.poses.walk.mutant.render);
}

if (mutation || motocaMutation || lendaMutation || microMutation) {
  if (!failures.length) {
    console.error('MUTANTE PASSOU: deslocar arma não abriu contato das mãos.');
    process.exit(1);
  }
  console.log(`mutante arma-deslocada reprovado como esperado: ${failures.join(', ')}`);
  process.exit(1);
}
if (failures.length) process.exit(1);
console.log('PILOT-GRIP-EVIDENCE ✓ Programador/Motoca/Designer/Lenda/Microfonildo M4 + Doidinho P90, idle/walk/crouch/3/4');

/* Evidência 3:2 do piloto precisa provar a arma que aparece no frame.

   Caso real (alpha.60, /tmp/pilot-game-evidence/*-close.png): o capturador aceitava
   qualquer arma sorteada por Game._botWeapon(). Programador segurava vazio; Doidinho
   mostrava um rifle longo em vez da P90; a Câmera ocultava a arma num bloco preto.
   A ficha canônica é CHAR_WEAPON em public/js/characters.js. O contrato exige que o
   capturador reconstrua o MESMO bot com charWeapon(id), meça os meshes efetivamente
   renderizados, espere dois frames idênticos e grave recibo ligado aos PNGs por SHA.

   O mutante operacional vive no próprio capturador: `--mutante=arma-aleatoria` faz a
   variável passada a buildCharacterModel voltar à arma sorteada. A execução tem de
   parar antes do screenshot, por divergência entre expectedWeapon e evidenceWeapon.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { charWeapon } = await import('../../public/js/characters.js');

const source = readFileSync(new URL('../capture-character-game.mjs', import.meta.url), 'utf8');
const checks = [
  ['EVID1 deriva a arma da fonte canônica', /charWeapon\(id\)/.test(source)],
  ['EVID2 a arma canônica alimenta o modelo renderizado', /buildCharacterModel\(bot\.def,\s*\{\s*weaponId:\s*evidenceWeapon/.test(source)],
  ['EVID3 o mutante troca a variável realmente consumida', /mutante=arma-aleatoria/.test(source) && /evidenceWeapon\s*=\s*useRandomWeapon\s*\?\s*bot\.weapon\s*:\s*expectedWeapon/.test(source)],
  ['EVID4 divergência de ID interrompe antes da captura', /evidenceWeapon\s*!==\s*expectedWeapon/.test(source) && /throw new Error\([^\n]*arma canônica/.test(source)],
  ['EVID5 visibilidade vem dos meshes reais da arma', /userData\.noHit/.test(source) && /weaponMeshes/.test(source) && /onScreen/.test(source)],
  ['EVID6 estabilidade é medida em dois frames renderizados', /stableFrames/.test(source) && /requestAnimationFrame/.test(source) && /stable\s*:\s*true/.test(source)],
  ['EVID7 cada PNG deixa recibo com SHA e estado', /createHash/.test(source) && /sha256/.test(source) && /writeFileSync/.test(source) && /evidence\.json/.test(source)],
];

let green = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (ok) green++;
}
console.log(`CHARACTER-GAME-EVIDENCE ${green}/${checks.length}`);
if (green !== checks.length) process.exit(1);

const evidenceArg = process.argv.find((arg) => arg.startsWith('--evidence='));
if (evidenceArg) {
  const directory = evidenceArg.slice('--evidence='.length);
  const ids = process.argv.filter((arg) => arg.startsWith('--char=')).map((arg) => arg.slice('--char='.length));
  const mutant = process.argv.includes('--mutante=arma-aleatoria');
  const staleModelMutant = process.argv.includes('--mutante=modelo-stale');
  const requiredStates = ['close', 'medium', 'grip', 'walk', 'crouch'];
  const failures = [];
  for (const [index, id] of ids.entries()) {
    const receiptPath = `${directory}/${id}-evidence.json`;
    if (!existsSync(receiptPath)) { failures.push(`${id}: recibo ausente`); continue; }
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    if (mutant && index === 0) receipt.evidenceWeapon = receipt.evidenceWeapon === 'awp' ? 'ak' : 'awp';
    if (staleModelMutant && index === 0) {
      const last = receipt.characterModelSha256?.slice(-1);
      receipt.characterModelSha256 = `${receipt.characterModelSha256?.slice(0, -1)}${last === '0' ? '1' : '0'}`;
    }
    if (receipt.char !== id) failures.push(`${id}: recibo pertence a ${receipt.char}`);
    if (receipt.expectedWeapon !== charWeapon(id)) failures.push(`${id}: expected ${receipt.expectedWeapon}, CHAR_WEAPON ${charWeapon(id)}`);
    if (receipt.evidenceWeapon !== receipt.expectedWeapon) failures.push(`${id}: frame usa ${receipt.evidenceWeapon}, esperado ${receipt.expectedWeapon}`);
    const characterModel = new URL(`../../public/models/characters/${id}.glb`, import.meta.url);
    const weaponModel = new URL(`../../public/models/weapons/${charWeapon(id)}.glb`, import.meta.url);
    const characterSha = createHash('sha256').update(readFileSync(characterModel)).digest('hex');
    const weaponSha = createHash('sha256').update(readFileSync(weaponModel)).digest('hex');
    if (receipt.characterModel !== `public/models/characters/${id}.glb` || receipt.characterModelSha256 !== characterSha) {
      failures.push(`${id}: SHA do GLB do personagem divergiu`);
    }
    if (receipt.weaponModel !== `public/models/weapons/${charWeapon(id)}.glb` || receipt.weaponModelSha256 !== weaponSha) {
      failures.push(`${id}: SHA do GLB da arma divergiu`);
    }
    for (const state of requiredStates) {
      const frame = receipt.frames?.find((entry) => entry.label === state);
      if (!frame) { failures.push(`${id}: estado ${state} ausente`); continue; }
      if (!existsSync(frame.file)) { failures.push(`${id}/${state}: PNG ausente`); continue; }
      const sha256 = createHash('sha256').update(readFileSync(frame.file)).digest('hex');
      if (sha256 !== frame.sha256) failures.push(`${id}/${state}: SHA divergiu`);
      if (frame.weaponMeshes < 1 || !frame.onScreen || frame.visiblePixels < 1) failures.push(`${id}/${state}: arma não materializada no frame`);
      if (frame.stableFrames < 2 || frame.stable !== true) failures.push(`${id}/${state}: frame não estabilizou`);
    }
  }
  if (failures.length) {
    failures.forEach((failure) => console.error(`✗ ${failure}`));
    process.exit(1);
  }
  console.log(`CHARACTER-GAME-EVIDENCE RECEIPTS ✓ ${ids.length} piloto(s) · GLB/arma canônicos + 5 estados + SHA + estabilidade`);
}

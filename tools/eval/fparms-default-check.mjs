import fs from 'fs';

const src = fs.readFileSync('public/js/game.js', 'utf8');
const fparmsSrc = fs.readFileSync('public/js/fparms.js', 'utf8');
const mutant = process.argv.includes('--mutante=so-arma')
  ? src.replace("const WEAPON_ONLY = _qsHands === '0';", "const WEAPON_ONLY = _qsHands !== '1';")
  : src;
const fparms = process.argv.includes('--mutante=rosa')
  ? fparmsSrc.replace('const gloveTint = new THREE.Color(0x27323b);', 'const gloveTint = new THREE.Color(0xf0a0a0);')
  : fparmsSrc;
const fails = [];

if (!mutant.includes("const WEAPON_ONLY = _qsHands === '0';"))
  fails.push('FP1 mãos não são o padrão (ou ?hands=0 não faz o A/B só-arma)');
if (!mutant.includes('if (!FP_OFF && !WEAPON_ONLY) arms = buildFPArms'))
  fails.push('FP2 o rig dedicado não é montado quando as mãos estão ativas');
if (!mutant.includes('const gloveMat = dark(0x27323b);'))
  fails.push('FP3 fallback sem luvas neutras — mão sem textura volta a ficar rosa');
if ((mutant.match(/skinMat/g) || []).length)
  fails.push('FP4 fallback ainda usa o material de pele nas mãos');
if (!fparms.includes('const gloveTint = new THREE.Color(0x27323b);'))
  fails.push('FP5 o rig dedicado pode voltar a expor pele rosa sem textura');

if (fails.length) {
  console.error(fails.map((fail) => `✗ ${fail}`).join('\n'));
  process.exit(1);
}
console.log('✓ FP1 mãos padrão; ?hands=0 A/B só-arma; FP2 rig dedicado; FP3–FP5 luvas neutras nos dois caminhos');

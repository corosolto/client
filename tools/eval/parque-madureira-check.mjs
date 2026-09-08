/* Madureira é estrutura visível, não troca de paleta: a pérgola tem duas
   orientações e as palmeiras imperiais ficam fora da colisão competitiva. */
import { THREE, MAPS, initTextures } from './harness.mjs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);
const conhecidos = new Set(['sem-pergola', 'sem-palmeiras', 'alameda-bloqueada']);
if (mutante && !conhecidos.has(mutante)) throw new Error(`Mutante desconhecido: ${mutante}`);

const world = MAPS.parque_treta.build(new THREE.Scene(), await initTextures());
const root = world.root;
const grupos = (prefixo) => {
  const saida = [];
  root.traverse((obj) => { if ((obj.name || '').startsWith(prefixo)) saida.push(obj); });
  return saida;
};
const remover = (prefixos) => {
  const alvos = prefixos.flatMap(grupos);
  for (const alvo of alvos) alvo.parent?.remove(alvo);
  return alvos.length > 0;
};

let aplicou = true;
if (mutante === 'sem-pergola') aplicou = remover(['parque-pergola']);
if (mutante === 'sem-palmeiras') aplicou = remover(['parque-palmeira-imperial']);
if (mutante === 'alameda-bloqueada') {
  aplicou = Number.isInteger(root.userData.alamedaPalmeiras);
  root.userData.alamedaPalmeiras = 0;
}
if (mutante && !aplicou) throw new Error(`Mutante não aplicou: ${mutante}`);

const pergola = grupos('parque-pergola').filter((obj) => obj.name === 'parque-pergola');
const ripas = grupos('parque-pergola-ripas').filter((obj) => obj.name === 'parque-pergola-ripas');
const palmeiras = grupos('parque-palmeira-imperial').filter((obj) => obj.name === 'parque-palmeira-imperial');
const copas = grupos('parque-palmeira-imperial-copa');
const alameda = root.userData.alamedaPalmeiras;
const checks = [
  ['PM1', pergola[0]?.count >= 80 && ripas[0]?.count >= 100,
    `pérgola ${pergola[0]?.count || 0}/80 · ripas ${ripas[0]?.count || 0}/100`],
  ['PM2', palmeiras.length === 1 && copas.length === 1 && palmeiras[0]?.count >= 28 && copas[0]?.count === palmeiras[0]?.count,
    `troncos ${palmeiras[0]?.count || 0}/28 · copas ${copas[0]?.count || 0}`],
  ['PM3', Number.isInteger(alameda) && alameda >= 4,
    `palmeiras liberadas pela guarda de rota ${alameda ?? 'ausente'}/4`],
];
for (const [id, ok, detalhe] of checks) console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detalhe}`);
const falhas = checks.filter(([, ok]) => !ok).map(([id]) => id);
if (mutante) {
  const alvo = { 'sem-pergola': 'PM1', 'sem-palmeiras': 'PM2', 'alameda-bloqueada': 'PM3' }[mutante];
  if (falhas.length !== 1 || falhas[0] !== alvo) throw new Error(`Mutante ${mutante} deveria acender somente ${alvo}; acendeu ${falhas.join(', ') || 'nenhuma'}`);
  console.log(`MUTANTE MORDIDO — ${mutante} -> ${alvo}`);
  process.exit(0);
}
process.exit(falhas.length ? 1 : 0);

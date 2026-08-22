/*
  LAJES-ROOFTOP — a camada superior não pode voltar a ser uma coleção de placas vazias.

  Procedência: plans/10-LAJES.md exige caixas d'água, varais e antenas como leitura
  cultural/ruído visual; a revisão adversarial de 11/08/2026 reprovou a camada alta
  porque esses marcadores não dominavam as placas grandes. O mapa marca somente os
  objetos que realmente desenha (`userData.rooftopDetail`) e esta sonda conta cena,
  categoria e distribuição espacial — não comentários de fonte.

  Limiares estruturais da própria ficha: as três categorias precisam existir, ocupar
  pelo menos três quadrantes cada e, juntas, cobrir os quatro quadrantes do mapa.
  `--mutante=placas-vazias` remove em memória um quadrante e deve reprovar.
*/
import { bootGame, initTextures } from './harness.mjs';

const game = bootGame('fy_lajes', { textures: initTextures(), bots: 0 });
const detalhes = [];
game.world.root.updateMatrixWorld(true);
game.world.root.traverse((obj) => {
  if (!obj.userData?.rooftopDetail) return;
  detalhes.push({ kind: obj.userData.rooftopDetail, x: obj.position.x, z: obj.position.z });
});
if (process.argv.includes('--mutante=placas-vazias'))
  for (let i = detalhes.length - 1; i >= 0; i--) if (detalhes[i].x < 0 && detalhes[i].z > 0) detalhes.splice(i, 1);

const quad = ({ x, z }) => `${x < 0 ? 'W' : 'E'}${z < 0 ? 'N' : 'S'}`;
const exigido = { tank: 8, antenna: 5, clothesline: 4 };
const falhas = [];
for (const [kind, minimo] of Object.entries(exigido)) {
  const itens = detalhes.filter((d) => d.kind === kind);
  const quadrantes = new Set(itens.map(quad));
  if (itens.length < minimo) falhas.push(`${kind}: ${itens.length} < ${minimo}`);
  if (quadrantes.size < 3) falhas.push(`${kind}: só ${quadrantes.size}/4 quadrantes`);
}
const todosQuadrantes = new Set(detalhes.map(quad));
if (todosQuadrantes.size < 4) falhas.push(`cobertura total: ${todosQuadrantes.size}/4 quadrantes`);

console.log('┌─ LAJES-ROOFTOP — detalhe cultural na cena real');
for (const kind of Object.keys(exigido)) {
  const itens = detalhes.filter((d) => d.kind === kind);
  console.log(`├─ ${kind}: ${itens.length} · ${new Set(itens.map(quad)).size}/4 quadrantes`);
}
if (falhas.length) {
  for (const falha of falhas) console.error(`├─ ✗ ${falha}`);
  console.error('└─ REPROVADO'); process.exit(1);
}
console.log('└─ APROVADO');

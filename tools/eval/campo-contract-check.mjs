/*
  CAMPO-CONTRACT — mede no mundo construído a assimetria declarada em
  plans/11-CAMPO-DO-MORRO.md: time E/A nasce no centro aberto do campo e B nasce
  dentro do galpão. A revisão de 11/08/2026 encontrou E em x=-31, fora do campo,
  embora os gates genéricos de colisão/rota estivessem verdes.

  Os limites vêm da geometria declarada pelo próprio mapa (campo ~40 × 25 m e
  galpão 12 × 10 m); a margem interna evita pôr o corpo dentro do alambrado.
  `--mutante=spawn-fora` desloca E para a posição antiga; e
  `--mutante=enquadramento-tampado` restaura a câmera que escondia 25/25 amostras.
  A reprovação visual de 11/08 acrescentou o contrato do galpão: hemisférica >= 1,10,
  duas luzes locais e duas faixas emissivas nas saídas. `galpao-escuro` apaga as
  luzes e prova que a régua não confunde geometria presente com interior legível.
*/
import { THREE, bootGame, initTextures } from './harness.mjs';
import { readFileSync } from 'node:fs';
// Câmera histórica do PR #437 (map-evidence-views.mjs); recorte deste mapa.
const CAMPO_FIELD_MOUTH = { from: [-23, 1.45, 0], look: [0, 1, 0] };

const MUT = process.argv.includes('--mutante=spawn-fora');
const MUT_ROTA = process.argv.includes('--mutante=rota-longa');
const MUT_BECO = process.argv.includes('--mutante=beco-cego');
const MUT_VISADA = process.argv.includes('--mutante=sem-visada-bocas');
const MUT_COVER = process.argv.includes('--mutante=cover-longe');
const MUT_ENQUADRAMENTO = process.argv.includes('--mutante=enquadramento-tampado');
const MUT_GALPAO = process.argv.includes('--mutante=galpao-escuro');
const MUT_BLOCKOUT = process.argv.includes('--mutante=galpao-blockout');
const MUT_REDES = process.argv.includes('--mutante=traves-sem-rede');
const MUT_BANCO = process.argv.includes('--mutante=bancada-central');
const MUT_MARCOS = process.argv.includes('--mutante=marcos-clonados');
const MUT_TORCIDA = process.argv.includes('--mutante=torcida-sentada');
const game = bootGame('campomorro', { textures: initTextures(), bots: 0 });
const luzesGalpao = [], faixasSaida = [], superficiesGalpao = [], framesGalpao = [];
const redes = [], bancos = [], marcos = [], coberturas = [], bancosArq = [], torcidas = [];
game.scene.traverse((object) => {
  if (object.userData?.mapLight === 'galpao') luzesGalpao.push(object);
  if (object.userData?.galpaoExitBand) faixasSaida.push(object);
  if (object.userData?.galpaoSurface) superficiesGalpao.push(object);
  if (object.userData?.galpaoFrame) framesGalpao.push(object);
  if (object.userData?.goalNet) redes.push(object);
  if (object.userData?.fieldBench) bancos.push(object);
  if (object.userData?.fieldLandmark) marcos.push(object);
  if (object.userData?.fieldStandRoof) coberturas.push(object);
  if (object.userData?.fieldStandBench !== undefined) bancosArq.push(object);
  if (object.userData?.crowdInstanced) torcidas.push(object);
});
if (MUT_GALPAO) {
  for (const luz of luzesGalpao) luz.intensity = 0;
  for (const faixa of faixasSaida) faixa.material.emissiveIntensity = 0;
}
if (MUT_BLOCKOUT) for (const superficie of superficiesGalpao) superficie.material.map = null;
if (MUT_REDES) for (const rede of redes) rede.visible = false;
if (MUT_BANCO && bancos[0]) bancos[0].position.set(0, bancos[0].position.y, 0);
if (MUT_MARCOS) for (const marco of marcos) marco.userData.fieldLandmark = 'clonado';
if (MUT_TORCIDA) game.world.onGoal = () => {};
const spawns = JSON.parse(JSON.stringify(game.world.spawns));
if (MUT) spawns.E[0] = { ...spawns.E[0], x: -31, z: 8 };

const falhas = [];
if ((game.world.hemi?.intensity || 0) < 1.1)
  falhas.push(`luz hemisférica do galpão em ${(game.world.hemi?.intensity || 0).toFixed(2)} / 1,10`);
if (luzesGalpao.filter((luz) => luz.intensity >= .8).length < 2)
  falhas.push(`${luzesGalpao.filter((luz) => luz.intensity >= .8).length}/2 luzes locais legíveis no galpão`);
if (faixasSaida.filter((faixa) => faixa.material?.emissiveIntensity >= .55).length < 2)
  falhas.push(`${faixasSaida.filter((faixa) => faixa.material?.emissiveIntensity >= .55).length}/2 faixas emissivas nas saídas`);
const tiposSuperficie = new Set(superficiesGalpao.filter((o) => o.visible !== false && o.material?.map)
  .map((o) => o.userData.galpaoSurface));
if (!tiposSuperficie.has('floor') || !tiposSuperficie.has('ceiling'))
  falhas.push(`superfícies texturizadas do galpão: ${[...tiposSuperficie].join(', ') || 'nenhuma'} / piso+teto`);
if (faixasSaida.filter((faixa) => faixa.userData.galpaoBandAnchored === true).length < 2 || framesGalpao.length < 4)
  falhas.push(`${framesGalpao.length}/4 peças de batente e faixas ancoradas nas duas saídas`);
if (redes.filter((rede) => rede.visible !== false).length < 2) falhas.push(`${redes.filter((r) => r.visible !== false).length}/2 redes nas traves`);
if (bancos.some((banco) => Math.abs(banco.position.x) < 3 && Math.abs(banco.position.z) < 3))
  falhas.push('bancada invade a faixa central de 6 × 6 m');
if (new Set(marcos.map((marco) => marco.userData.fieldLandmark)).size < 3)
  falhas.push(`${new Set(marcos.map((m) => m.userData.fieldLandmark)).size}/3 marcos distintos ao redor do campo`);
game.world.update?.(1 / 60, 0);
const torcidaSentada = torcidas.length === 1 && torcidas[0].userData.crowdState === 'seated';
game.world.onGoal?.(); game.world.update?.(1 / 60, .5);
const torcidaNoGol = torcidas.length === 1 && torcidas[0].userData.crowdState === 'goal-standing';
if (coberturas.filter((o) => o.visible !== false).length < 1 || bancosArq.filter((o) => o.visible !== false).length < 3)
  falhas.push(`${coberturas.filter((o) => o.visible !== false).length}/1 cobertura e ${bancosArq.filter((o) => o.visible !== false).length}/3 bancos na arquibancada`);
if (!torcidaSentada || !torcidaNoGol || torcidas[0]?.count !== 24)
  falhas.push(`torcida instanciada reage ao gol: sentada=${torcidaSentada} gol=${torcidaNoGol} instâncias=${torcidas[0]?.count || 0}`);
if (!readFileSync('public/js/game.js', 'utf8').includes('this.world.onGoal?.();'))
  falhas.push('Game._ctfWin não chama world.onGoal()');
const noCampo = ({ x, z }) => Math.abs(x) <= 19.4 && Math.abs(z) <= 11.9;
const noGalpao = ({ x, z }) => x >= 22.4 && x <= 33.6 && z >= -25.6 && z <= -16.4;
for (const [i, spawn] of (spawns.E || []).entries()) if (!noCampo(spawn))
  falhas.push(`E[${i}] (${spawn.x},${spawn.z}) fora do campo`);
for (const [i, spawn] of (spawns.B || []).entries()) if (!noGalpao(spawn))
  falhas.push(`B[${i}] (${spawn.x},${spawn.z}) fora do galpão`);

// 25 s com a arma mais lenta do mapa (AWP: 5,35 m/s × 0,78 em game.js).
const VELOCIDADE_CONSERVADORA = 5.35 * 0.78;
const { nodes, adj } = game.world.waypoints;
if (MUT_BECO) adj[game.world.nearestWaypoint(-32, 10)] = [];
const campoNode = game.world.nearestWaypoint(0, 0);
const comprimento = (path) => path.slice(1).reduce((total, node, i) => total +
  Math.hypot(nodes[node].x - nodes[path[i]].x, nodes[node].z - nodes[path[i]].z), 0);
const temposB = spawns.B.map((spawn) => {
  const path = game.world.findPath(game.world.nearestWaypoint(spawn.x, spawn.z), campoNode);
  return (MUT_ROTA ? 26 : comprimento(path) / VELOCIDADE_CONSERVADORA);
});
if (temposB.some((tempo) => tempo > 25)) falhas.push(`rota galpão→campo leva ${Math.max(...temposB).toFixed(2)} s`);

// Todo waypoint periférico precisa pertencer ao componente que desemboca no campo.
let becosCegos = 0;
for (let i = 0; i < nodes.length; i++) {
  if (Math.abs(nodes[i].x) <= 19.5 && Math.abs(nodes[i].z) <= 12) continue;
  const path = game.world.findPath(i, campoNode);
  if (path.length < 2 || path[path.length - 1] !== campoNode) becosCegos++;
}
if (becosCegos) falhas.push(`${becosCegos} waypoint(s) periférico(s) sem saída para o campo`);

// As cinco bocas autoradas precisam enxergar ao menos uma de nove amostras internas.
game.scene.updateMatrixWorld(true);
const bocas = [[0,-12],[0,12],[-20,0],[20,0],[12.5,-12]];
const alvosCampo = [-8,0,8].flatMap((x) => [-5,0,5].map((z) => [x,z]));
const olho = (x,z) => new THREE.Vector3(x, game.world.groundHeightAt(x,z) + 1.62, z);
const visivel = MUT_VISADA ? () => false : (a,b) => game._losClear(a,b);
const bocasComVisada = bocas.filter(([x,z]) => alvosCampo.some(([tx,tz]) => visivel(olho(x,z), olho(tx,tz)))).length;
if (bocasComVisada !== bocas.length) falhas.push(`${bocasComVisada}/${bocas.length} bocas com linha de tiro para o campo`);

// A boca também precisa existir na IMAGEM. `_losClear` ignora `collide:false`, mas o
// painel e a verga que reprovaram a captura são malhas visíveis. A câmera de evidência
// atira 25 raios contra uma grade no campo; 80% livres permite os dois montantes da
// própria boca (2/25 bloqueios medidos) e reprova o painel que cobria 25/25.
const origemCaptura = new THREE.Vector3(...(MUT_ENQUADRAMENTO ? [-23, 2.1, 0] : CAMPO_FIELD_MOUTH.from));
const ray = new THREE.Raycaster();
let raiosLivres = 0;
for (const x of [-12, -6, 0, 6, 12]) for (const z of [-8, -4, 0, 4, 8]) {
  const alvo = new THREE.Vector3(x, 1, z);
  const direcao = alvo.clone().sub(origemCaptura), distancia = direcao.length();
  ray.set(origemCaptura, direcao.normalize()); ray.far = distancia - .15;
  const bloqueado = ray.intersectObject(game.world.root, true)
    .some((hit) => hit.object?.isMesh && hit.object.material?.visible !== false);
  if (!bloqueado) raiosLivres++;
}
const aberturaCaptura = raiosLivres / 25;
if (aberturaCaptura < .8) falhas.push(`boca oeste ocupa a captura: ${(aberturaCaptura * 100).toFixed(0)}% da grade do campo visível`);

// Cover é uma caixa com pelo menos 0,9 m; mede distância horizontal da origem até a face.
const distanciaAABB = (c) => Math.hypot(Math.max(c.minX, 0, -c.maxX), Math.max(c.minZ, 0, -c.maxZ));
const coverDist = MUT_COVER ? Infinity : Math.min(...game.world.colliders
  .filter((c) => c.maxY - c.minY >= .9 && c.minY < 1.6)
  .map(distanciaAABB));
const coverTempo = coverDist / VELOCIDADE_CONSERVADORA;
if (coverTempo > 3) falhas.push(`cover central a ${coverTempo.toFixed(2)} s (${coverDist.toFixed(2)} m)`);

console.log('┌─ CAMPO-CONTRACT — centro aberto × galpão protegido');
console.log(`├─ E no campo: ${(spawns.E || []).filter(noCampo).length}/${spawns.E?.length || 0}`);
console.log(`├─ B no galpão: ${(spawns.B || []).filter(noGalpao).length}/${spawns.B?.length || 0}`);
console.log(`├─ pior rota B→campo: ${Math.max(...temposB).toFixed(2)} s / 25 s`);
console.log(`├─ becos cegos: ${becosCegos}`);
console.log(`├─ bocas com visada: ${bocasComVisada}/${bocas.length}`);
console.log(`├─ abertura visual da captura oeste: ${(aberturaCaptura * 100).toFixed(0)}% / 80%`);
console.log(`├─ cover do centro: ${coverTempo.toFixed(2)} s / 3 s`);
console.log(`├─ galpão: hemi ${(game.world.hemi?.intensity || 0).toFixed(2)} · ${luzesGalpao.filter((l) => l.intensity >= .8).length}/2 luzes · ${faixasSaida.filter((f) => f.material?.emissiveIntensity >= .55).length}/2 faixas`);
console.log(`├─ acabamento: ${tiposSuperficie.size}/2 superfícies · ${framesGalpao.length}/4 batentes · ${redes.filter((r) => r.visible !== false).length}/2 redes · ${new Set(marcos.map((m) => m.userData.fieldLandmark)).size}/3 marcos`);
if (falhas.length) {
  for (const falha of falhas) console.error(`├─ ✗ ${falha}`);
  console.error('└─ REPROVADO');
  process.exit(1);
}
console.log('└─ APROVADO');

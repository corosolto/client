/* Piscina e espelho d'água da Mansão precisam ser não entráveis.

   Mede o caminho real: mundo real + Game._collide + raio real do jogador. O defeito
   comprado em 11/08/2026 era um colisor declarado com maxY=0; `_collide` exige topo
   acima dos pés e deixava o jogador parado no centro da água.

   A revisão visual externa alpha.61 (`tmp/map-alpha61-openrouter-review.json`) mostrou
   que esses marcadores ainda aceitavam carro sem frente, jardim de catálogo e ilha
   ambígua. Este contrato agora inspeciona peças reais: três silhuetas esportivas
   distintas com rodas/vidro/grade, maciços assimétricos de três famílias, pergolado
   ancorado, ilha funcional e home theater inequívoco.
   Mutantes: agua-entravel | jardim-pobre | interior-vazio | carros-ausentes.
*/
import { THREE, initTextures, bootGame } from './harness.mjs';

const MUTANTE = process.argv.includes('--mutante=agua-entravel');
const MUT_JARDIM = process.argv.includes('--mutante=jardim-pobre');
const MUT_INTERIOR = process.argv.includes('--mutante=interior-vazio');
const MUT_CARROS = process.argv.includes('--mutante=carros-ausentes');
const MUT_CUNHA = process.argv.includes('--mutante=cunha-countach');
const MUT_CATALOGO = process.argv.includes('--mutante=jardim-catalogo');
const MUT_BLOCKOUT = process.argv.includes('--mutante=interior-blockout');
const MUT_CARROS_CLONADOS = process.argv.includes('--mutante=carros-clonados');
const MUT_CARRO_SEM_FRENTE = process.argv.includes('--mutante=carro-sem-frente');
const MUT_JARDIM_ESPELHO = process.argv.includes('--mutante=jardim-espelho');
const MUT_JARDIM_MONOCULTURA = process.argv.includes('--mutante=jardim-monocultura');
const MUT_PERGOLA_FLUTUA = process.argv.includes('--mutante=pergola-flutua');
const MUT_ILHA_AMBIGUA = process.argv.includes('--mutante=ilha-ambigua');
const MUT_TEATRO_VAZIO = process.argv.includes('--mutante=teatro-vazio');
const MUT_JARDIM_RARO = process.argv.includes('--mutante=jardim-raro');
const MUT_PISCINA_SEM_CUBA = process.argv.includes('--mutante=piscina-sem-cuba');
const MUT_PISCINA_CUBA_CURTA = process.argv.includes('--mutante=piscina-cuba-curta');
const RAIO = 0.38; // mesmo raio passado por Game.update a _collide
const provas = [
  { nome: 'piscina', x: 0, z: -28 },
  { nome: 'espelho', x: -8, z: 25 },
];

const game = bootGame('fy_mansao', { textures: initTextures(), ctf: true, seed: 14000 });
const marcados = [];
game.world.root.traverse((object) => { if (object.userData?.mansaoFeature) marcados.push(object); });
if (MUT_JARDIM) for (const o of marcados) if (['bromelia','palmeira','encosta'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_INTERIOR) for (const o of marcados) if (['ilha-gourmet','estar','divisoria-baixa'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_CARROS) for (const o of marcados) if (o.userData.mansaoFeature === 'carro-generico') o.visible = false;
if (MUT_CUNHA) for (const o of marcados) if (o.userData.mansaoFeature === 'carro-generico') o.userData.hoodHeight = .42;
if (MUT_CATALOGO) for (const o of marcados) if (o.userData.mansaoFeature === 'tropical-3d') o.visible = false;
if (MUT_BLOCKOUT) for (const o of marcados) if (o.userData.mansaoFeature === 'lived-prop') o.visible = false;
if (MUT_CARROS_CLONADOS) {
  const carrosMut = marcados.filter((o) => o.userData.mansaoFeature === 'carro-generico');
  const bodyBase = (() => { let body; carrosMut[0]?.traverse((o) => { if (o.userData?.carPart === 'body') body = o; }); return body; })();
  for (const carro of carrosMut) {
    carro.userData.sportsFamily = 'clone';
    carro.traverse((o) => { if (o.userData?.carPart === 'body' && bodyBase) o.geometry = bodyBase.geometry; });
  }
}
if (MUT_CARRO_SEM_FRENTE) for (const carro of marcados) if (carro.userData.mansaoFeature === 'carro-generico') {
  carro.traverse((o) => { if (['front-wheel','windshield','grille'].includes(o.userData?.carPart)) o.visible = false; });
}
if (MUT_JARDIM_ESPELHO) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-cluster') {
  const par = Math.floor(o.userData.clusterIndex / 2);
  o.position.set((o.userData.clusterIndex % 2 ? -1 : 1) * (5 + par * 2), o.position.y, 20 + par * 5);
}
if (MUT_JARDIM_MONOCULTURA) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-cluster' && o.userData.gardenFamily !== 'heliconia') o.visible = false;
if (MUT_PERGOLA_FLUTUA) for (const o of marcados) if (o.userData.pergolaPart === 'pillar') o.visible = false;
if (MUT_ILHA_AMBIGUA) for (const o of marcados) if (o.userData.mansaoFeature === 'gourmet-part' && o.userData.gourmetPart !== 'countertop') o.visible = false;
if (MUT_TEATRO_VAZIO) for (const o of marcados) if (o.userData.mansaoFeature === 'theater-part') o.visible = false;
if (MUT_JARDIM_RARO) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-mass') o.visible = false;
if (MUT_PISCINA_SEM_CUBA) for (const o of marcados) if (o.userData.mansaoFeature === 'pool-basin-mask') o.visible = false;
if (MUT_PISCINA_CUBA_CURTA) for (const o of marcados) if (o.userData.mansaoFeature === 'pool-basin-mask') o.scale.y = .55;
if (MUTANTE) {
  for (const prova of provas) for (const c of game.world.colliders) {
    if (prova.x > c.minX && prova.x < c.maxX && prova.z > c.minZ && prova.z < c.maxZ) c.maxY = 0;
  }
}
game.world.root.updateMatrixWorld(true);

let falhas = 0;
for (const prova of provas) {
  const antes = new THREE.Vector3(prova.x, game.world.groundHeightAt(prova.x, prova.z), prova.z);
  const depois = antes.clone();
  game._collide(depois, RAIO);
  const deslocamento = depois.distanceTo(antes);
  const ok = deslocamento >= RAIO * 0.9;
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${prova.nome}: deslocamento=${deslocamento.toFixed(3)} m (mínimo ${(RAIO * 0.9).toFixed(3)} m)`);
}

const conta = (tipo) => marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === tipo).length;
const carros = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'carro-generico');
const propsVividos = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'lived-prop');
const superficies = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'interior-surface');
const luzes = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'interior-fill');
const carParts = (carro, tipo) => {
  const parts = [];
  carro.traverse((o) => { if (o.visible !== false && o.userData?.carPart === tipo) parts.push(o); });
  return parts;
};
const carrosComLeitura = carros.filter((carro) =>
  carParts(carro, 'wheel').length + carParts(carro, 'front-wheel').length >= 4
  && carParts(carro, 'front-wheel').length >= 2
  && carParts(carro, 'windshield').length >= 1
  && carParts(carro, 'grille').length >= 1
  && carParts(carro, 'headlight').length >= 2
);
const families = new Set(carros.map((carro) => carro.userData.sportsFamily).filter(Boolean));
const bodySignatures = new Set(carros.map((carro) => {
  let body = null; carro.traverse((o) => { if (o.visible !== false && o.userData?.carPart === 'body') body = o; });
  if (!body) return 'ausente';
  body.geometry.computeBoundingBox();
  const s = body.geometry.boundingBox.getSize(new THREE.Vector3());
  return [s.x,s.y,s.z].map((v) => v.toFixed(3)).join('x');
}));
const clusters = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'garden-cluster');
const clusterFamilies = new Set(clusters.map((o) => o.userData.gardenFamily).filter(Boolean));
const clusterShapes = new Set(clusters.map((cluster) => {
  const tipos=[]; cluster.traverse((o) => { if(o.isMesh) tipos.push(o.geometry?.type || 'sem-geo'); });
  return [...new Set(tipos)].sort().join('+');
}));
const espelhados = clusters.filter((a, i) => clusters.some((b, j) => i !== j
  && Math.abs(a.position.x + b.position.x) < .55 && Math.abs(a.position.z - b.position.z) < .55));
const pergola = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'pergola-part');
const gourmet = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'gourmet-part');
const gourmetTipos = (tipo) => gourmet.filter((o) => o.userData.gourmetPart === tipo).length;
const teatro = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'theater-part');
const teatroTipos = (tipo) => teatro.filter((o) => o.userData.theaterPart === tipo).length;
const massas = marcados.filter((o)=>o.visible!==false&&o.userData.mansaoFeature==='garden-mass');
const massasDensas = massas.filter((massa)=>{let n=0;massa.traverse((o)=>{if(o.isMesh&&o.visible!==false)n++;});return n>=20;});
const massasEspelhadas=massas.filter((a,i)=>massas.some((b,j)=>i!==j&&Math.abs(a.position.x+b.position.x)<.6&&Math.abs(a.position.z-b.position.z)<.6));
const cubas = marcados.filter((o)=>o.visible!==false&&o.userData.mansaoFeature==='pool-basin-mask');
const cubaOpaca=cubas.some((c)=>{const s=new THREE.Box3().setFromObject(c).getSize(new THREE.Vector3());return c.position.y>-.01&&c.position.y<.08&&c.material?.transparent!==true&&s.x>=12&&s.z>=11.8;});
for (const [nome, ok, medido] of [
  ['carros genéricos originais', conta('carro-generico') === 3, `${conta('carro-generico')}/3`],
  ['bromélias', conta('bromelia') >= 8 && conta('bromelia') <= 12, `${conta('bromelia')}/8–12`],
  ['palmeiras', conta('palmeira') >= 2, `${conta('palmeira')}/2`],
  ['encosta verde lateral', conta('encosta') >= 1, `${conta('encosta')}/1`],
  ['ilha gourmet', conta('ilha-gourmet') >= 1, `${conta('ilha-gourmet')}/1`],
  ['grupos de estar', conta('estar') >= 2, `${conta('estar')}/2`],
  ['divisória baixa', conta('divisoria-baixa') >= 1, `${conta('divisoria-baixa')}/1`],
  ['carros com frente própria e capô não-cunha', carros.length === 3 && carros.every((c) => c.userData.genericFront === true && c.userData.hoodHeight >= .58), `${carros.filter((c) => c.userData.genericFront && c.userData.hoodHeight >= .58).length}/3`],
  ['três carros esportivos de silhuetas originais distintas', carros.length === 3 && families.size === 3, `${families.size}/3 famílias`],
  ['três proporções físicas de carroceria', bodySignatures.size === 3 && !bodySignatures.has('ausente'), `${bodySignatures.size}/3`],
  ['carros legíveis com rodas frontais, vidro, grade e faróis', carrosComLeitura.length === 3, `${carrosComLeitura.length}/3`],
  ['folhagem tropical tridimensional', conta('tropical-3d') >= 4, `${conta('tropical-3d')}/4`],
  ['jardim assimétrico autorado', conta('garden-asymmetry') >= 1, `${conta('garden-asymmetry')}/1`],
  ['maciços assimétricos com três famílias tropicais', clusters.length >= 5 && clusterFamilies.size >= 3 && clusterShapes.size >= 3 && espelhados.length <= 1, `${clusters.length} maciços · ${clusterFamilies.size} famílias/${clusterShapes.size} formas · ${espelhados.length} espelhados`],
  ['dois–três maciços tropicais densos e não espelhados', massasDensas.length>=2&&massasDensas.length<=3&&massasEspelhadas.length===0, `${massasDensas.length} densos · ${massasEspelhadas.length} espelhados`],
  ['piscina e vertedouro com cuba opaca contínua acima do gramado', cubaOpaca, `${cubas.length} máscara(s)`],
  ['pergolado ancorado', pergola.filter((o) => o.userData.pergolaPart === 'pillar').length >= 4 && pergola.filter((o) => o.userData.pergolaPart === 'beam').length >= 5, `${pergola.filter((o) => o.userData.pergolaPart === 'pillar').length} pilares · ${pergola.filter((o) => o.userData.pergolaPart === 'beam').length} vigas`],
  ['ilha gourmet funcional e inequívoca', gourmetTipos('countertop') >= 1 && gourmetTipos('stool') >= 3 && gourmetTipos('cooktop') >= 1 && gourmetTipos('sink') >= 1 && gourmetTipos('faucet') >= 1 && gourmetTipos('pendant') >= 3, `${gourmet.length} peças`],
  ['home theater funcional e inequívoco', teatroTipos('screen') >= 1 && teatroTipos('media-console') >= 1 && teatroTipos('recliner') >= 4 && teatroTipos('acoustic-panel') >= 3, `${teatro.length} peças`],
  ['props vividos distintos', new Set(propsVividos.map((o) => o.userData.propType)).size >= 6 && new Set(propsVividos.map((o) => o.userData.propType)).size <= 8, `${new Set(propsVividos.map((o) => o.userData.propType)).size}/6–8`],
  ['piso e forro com texturas próprias', new Set(superficies.map((o) => o.userData.surfaceType)).size >= 2 && new Set(superficies.map((o) => o.material?.map?.uuid).filter(Boolean)).size >= 2, `${new Set(superficies.map((o) => o.userData.surfaceType)).size}/2`],
  ['fill interior', luzes.filter((l) => l.intensity >= 1).length >= 3, `${luzes.filter((l) => l.intensity >= 1).length}/3`],
]) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${nome}: ${medido}`);
}

if (falhas) {
  console.error(`MANSÃO-CONTRATO FALHA: ${falhas} cláusula(s) de água/composição${MUTANTE ? ' (mutante mordido)' : ''}.`);
  process.exitCode = 1;
} else if (process.argv.some((arg) => arg.startsWith('--mutante='))) {
  console.error('MUTANTE sobreviveu: a sonda não dependeu da composição quebrada.');
  process.exitCode = 1;
} else {
  console.log('MANSÃO-CONTRATO OK: água segura e composição autorada presente.');
}

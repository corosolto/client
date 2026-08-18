/* Piscina e espelho d'água da Mansão precisam ser não entráveis.

   Mede o caminho real: mundo real + Game._collide + raio real do jogador. O defeito
   comprado em 11/08/2026 era um colisor declarado com maxY=0; `_collide` exige topo
   acima dos pés e deixava o jogador parado no centro da água.

   A revisão visual externa alpha.61 mostrou que os marcadores aceitavam carro sem
   frente, jardim de catálogo e ilha ambígua; o contrato passou a inspecionar peças
   reais. Em 17/08 (BUG-56) o dono reprovou o visual ("lowpoly de todos") e deu a
   direção: "usar carros que temos em glbs". As cláusulas de silhueta PROCEDURAL
   saíram; a frota da garagem passou a ser GLB do acervo, e o contrato passou a
   exigir: ids reais na frota (arquivo existe e é glTF válido com geometria de
   carro), dimensão de fábrica que CABE no colisor da vaga (a jogabilidade é boa e
   a pegada de colisão não muda — palavra do dono), colisor das 3 vagas preservado
   em runtime e fallback procedural vivo (node não carrega GLB — Lição 3 do
   docs/LICOES.md — e `?glb=0` é o kill-switch do jogador).
   O mundo GLB em si é medido no browser: eval:occluders (tiro-no-ar/atravessa) e
   captura 3:2 — este script de node mede o contrato de fonte, o disco e o mundo
   de fallback.
   Mutantes: agua-entravel | jardim-pobre | interior-vazio | carros-ausentes |
   carros-glb-ausentes | carro-glb-clonado | carro-glb-gigante | vaga-sem-colisor.
*/
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, initTextures, bootGame } from './harness.mjs';

const MUTANTE = process.argv.includes('--mutante=agua-entravel');
const MUT_JARDIM = process.argv.includes('--mutante=jardim-pobre');
const MUT_INTERIOR = process.argv.includes('--mutante=interior-vazio');
const MUT_CARROS = process.argv.includes('--mutante=carros-ausentes');
const MUT_CARROS_GLB = process.argv.includes('--mutante=carros-glb-ausentes');
const MUT_CARRO_CLONADO = process.argv.includes('--mutante=carro-glb-clonado');
const MUT_CARRO_GIGANTE = process.argv.includes('--mutante=carro-glb-gigante');
const MUT_VAGA_SOL = process.argv.includes('--mutante=vaga-sem-colisor');
const MUT_CATALOGO = process.argv.includes('--mutante=jardim-catalogo');
const MUT_BLOCKOUT = process.argv.includes('--mutante=interior-blockout');
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

/* ── FROTA DA GARAGEM (BUG-56): contrato de fonte + disco ───────────────────
   A frota vive no fonte do mapa como tabela GARAGEM [['id', comprimento, altura]].
   Mutantes de fonte precisam PROVAR que aplicaram (skill regua: mutação que não
   casou é confiança falsa). */
const ROOT = path.resolve(import.meta.dirname, '../..');
const MAP_PATH = path.join(ROOT, 'public/js/map_mansao.js');
const HAVAN_PATH = path.join(ROOT, 'public/js/map_havan.js');
let mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
if (MUT_CARROS_GLB) {
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/export const MANSAO_PROPS = \[[\s\S]*?\];/, "export const MANSAO_PROPS = ['mesa_guardasol', 'guarda_sol'];");
  if (mapSrc === antes) { console.error('MUTANTE carros-glb-ausentes NÃO APLICOU (MANSAO_PROPS não casou)'); process.exit(1); }
}
if (MUT_CARRO_CLONADO) {
  const m = mapSrc.match(/const GARAGEM = \[\s*\['([^']+)',\s*[\d.]+,\s*[\d.]+\]/);
  if (!m) { console.error('MUTANTE carro-glb-clonado NÃO APLICOU (GARAGEM não casou)'); process.exit(1); }
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/'[^']+',(\s*[\d.]+,\s*[\d.]+)/g, `'${m[1]}',$1`);
  if (mapSrc === antes) { console.error('MUTANTE carro-glb-clonado NÃO APLICOU (ids não casaram)'); process.exit(1); }
}
if (MUT_CARRO_GIGANTE) {
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/(const GARAGEM = \[\s*\['[^']+',\s*)([\d.]+)/, '$15.20');
  if (mapSrc === antes) { console.error('MUTANTE carro-glb-gigante NÃO APLICOU (comprimento não casou)'); process.exit(1); }
}
const frotaRaw = mapSrc.match(/const GARAGEM = \[([\s\S]*?)\];/);
const frota = [...(frotaRaw?.[1] || '').matchAll(/\['([^']+)',\s*([\d.]+),\s*([\d.]+)\]/g)]
  .map((m) => ({ id: m[1], len: parseFloat(m[2]), h: parseFloat(m[3]) }));
const propsSrc = mapSrc.match(/export const MANSAO_PROPS = \[([\s\S]*?)\];/)?.[1] || '';
const propsIds = [...propsSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]);
/* spread `...GARAGEM` coloca a frota toda no preload por construção; id solto também
   vale. E o USO: cada linha da GARAGEM precisa de um carroAcervo( — declaração sem
   uso é a invariante cega que o mutante do BUG-54 pegou (AGENTS.md, lei 3). */
const preloadOk = propsSrc.includes('...GARAGEM') || frota.every((f) => propsIds.includes(f.id));
const usosCarro = (mapSrc.match(/carroAcervo\(/g) || []).length;
/* dims de fábrica: mesma ficha do map_havan (CAR_DIM é A referência, conferida por
   tools/eval/escala-veiculo-check.mjs) — copiar número à mão que diverge é o quinto
   lugar com o mesmo número desatualizado (AGENTS.md). */
const havanSrc = fs.readFileSync(HAVAN_PATH, 'utf8');
const dimHavan = (id) => {
  const m = havanSrc.match(new RegExp(`'?${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?\\s*:\\s*\\[\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*\\]`));
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};
/* GLB no disco: tem que ser glTF válido com geometria de carro de verdade — blob
  de 200 tris não é carro, e 45k+ estoura o orçamento de triângulos do mapa. */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const glbInfo = {};
for (const f of frota) {
  const file = path.join(ROOT, 'public/models/props', `${f.id}.glb`);
  if (!fs.existsSync(file)) { glbInfo[f.id] = { existe: false }; continue; }
  try {
    const doc = await io.read(file);
    const prim = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
    const tris = prim.reduce((n, p) => n + (p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0) / 3, 0);
    glbInfo[f.id] = { existe: true, tris: Math.round(tris), primitivas: prim.length };
  } catch (e) { glbInfo[f.id] = { existe: true, erro: e.message }; }
}
/* VAGA: colisor original da garagem — x∈[cx-1,cx+1], y∈[0,1.3], z∈[8.95,13.05].
   A jogabilidade é boa por decisão do dono: a pegada não muda. */
const VAGAS = [-6, 0, 6];
const vagaPreservada = (cx) => game.world.colliders.some((c) =>
  c.minX <= cx - 0.99 && c.maxX >= cx + 0.99 && c.minY <= 0 && c.maxY >= 1.3 && c.minZ >= 8.9 && c.minZ <= 9.0 && c.maxZ >= 13.0 && c.maxZ <= 13.1);
if (MUT_VAGA_SOL) game.world.colliders = game.world.colliders.filter((c) => !(c.maxY === 1.3 && c.minZ > 8 && c.maxZ < 14));
const marcados = [];
game.world.root.traverse((object) => { if (object.userData?.mansaoFeature) marcados.push(object); });
if (MUT_JARDIM) for (const o of marcados) if (['bromelia','palmeira','encosta'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_INTERIOR) for (const o of marcados) if (['ilha-gourmet','estar','divisoria-baixa'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_CARROS) for (const o of marcados) if (o.userData.mansaoFeature === 'carro-generico') o.visible = false;
if (MUT_CATALOGO) for (const o of marcados) if (o.userData.mansaoFeature === 'tropical-3d') o.visible = false;
if (MUT_BLOCKOUT) for (const o of marcados) if (o.userData.mansaoFeature === 'lived-prop') o.visible = false;
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
  ['frota da garagem em GLB do acervo — 3 modelos distintos pré-carregados e usados', frota.length === 3 && new Set(frota.map((f) => f.id)).size === 3 && preloadOk && usosCarro >= 3, `${frota.length} na GARAGEM · preload ${preloadOk ? 'ok' : 'FALTA'} · ${usosCarro} carroAcervo( — id fora do preload volta procedural e id declarado sem uso é invariante cega`],
  ['GLBs de carro válidos no disco (geometria real, dentro do orçamento)', frota.length === 3 && frota.every((f) => glbInfo[f.id]?.existe && !glbInfo[f.id].erro && glbInfo[f.id].tris >= 2000 && glbInfo[f.id].tris <= 45000), frota.map((f) => `${f.id}:${glbInfo[f.id]?.existe && !glbInfo[f.id].erro ? `${glbInfo[f.id].tris}t` : 'inválido/ausente'}`).join(' · ')],
  ['escala de fábrica confere com a ficha do acervo (CAR_DIM da Havan)', frota.every((f) => { const d = dimHavan(f.id); return d && Math.abs(d[0] - f.len) < 0.011 && Math.abs(d[1] - f.h) < 0.011; }), `${frota.filter((f) => { const d = dimHavan(f.id); return d && Math.abs(d[0] - f.len) < 0.011 && Math.abs(d[1] - f.h) < 0.011; }).length}/3 sem divergência de ficha`],
  ['carro GLB cabe na vaga (comprimento ≤ 4,35 m; procedural era 4,25)', frota.length === 3 && frota.every((f) => f.len <= 4.35), `maior: ${Math.max(0, ...frota.map((f) => f.len)).toFixed(2)} m — carro além da vaga deixa o corpo dentro do vidro saliente (MAP1 cego em node, Lição 3)`],
  ['pegada de colisão das 3 vagas preservada (x±1, h1,3, z 8,95–13,05)', VAGAS.every(vagaPreservada), `${VAGAS.filter(vagaPreservada).length}/3 vagas — sem isto a troca de prop mudou o cover da garagem`],
  ['fallback procedural vivo (node/?glb=0 mostram 3 carros)', carros.length === 3, `${carros.length}/3 — o fallback é o kill-switch da garagem`],
  ['bromélias', conta('bromelia') >= 8 && conta('bromelia') <= 12, `${conta('bromelia')}/8–12`],
  ['palmeiras', conta('palmeira') >= 2, `${conta('palmeira')}/2`],
  ['encosta verde lateral', conta('encosta') >= 1, `${conta('encosta')}/1`],
  ['ilha gourmet', conta('ilha-gourmet') >= 1, `${conta('ilha-gourmet')}/1`],
  ['grupos de estar', conta('estar') >= 2, `${conta('estar')}/2`],
  ['divisória baixa', conta('divisoria-baixa') >= 1, `${conta('divisoria-baixa')}/1`],
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

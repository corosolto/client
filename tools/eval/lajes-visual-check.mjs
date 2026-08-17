/* ==========================================================================
   LAJES-VISUAL — a casca cobre o mapa inteiro e o horizonte não repete foto?

   O dono reprovou o frame de 15/08: "caixa bonita continua caixa" e o horizonte
   espelhado lia como caleidoscópio. A captura mostrou que a casca assada cobria só
   a fileira norte; esta régua deriva o inventário do mapa real, abre o GLB servido
   e exige geometria em cada footprint. A estética continua sendo julgada no pixel.

   Mutantes (depois da correção): casca-parcial, horizonte-espelhado, casca-optin,
   fallback-inseguro, sobreposicao, lowq-carrega-casca, lightmap-opcional,
   tijolo-adesivo, tijolo-multifiada, entorno-ilhas, barraco-sem-tijolo,
   rota-reta, horizonte-vazio, heroi-vitrine, entorno-pedestais e
   horizonte-sem-casario. Mutante que não casa morre antes da medição.

   Uso: node tools/eval/lajes-visual-check.mjs [--mutante=<nome>]
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

globalThis.location = { search: '' };
globalThis.localStorage = { getItem: () => null };
const mapModule = await import('../../public/js/map_lajes.js');
const { ANEXOS, EDIFICIOS, NOMES_LAJE } = mapModule;
const horizonModule = await import('../../public/js/horizon.js');

const ROOT = path.resolve(import.meta.dirname, '../..');
const MAP_PATH = path.join(ROOT, 'public/js/map_lajes.js');
const HORIZON_PATH = path.join(ROOT, 'public/js/horizon.js');
const SHELL_PATH = path.join(ROOT, 'public/js/shell.js');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
let mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
let horizonSrc = fs.readFileSync(HORIZON_PATH, 'utf8');
let shellSrc = fs.readFileSync(SHELL_PATH, 'utf8');

const aplicar = (antes, depois, nome) => {
  const novo = mapSrc.replace(antes, depois);
  if (novo === mapSrc) throw new Error(`MUTANTE NAO APLICOU: ${nome}`);
  mapSrc = novo;
};
const aplicarShell = (antes, depois, nome) => {
  const novo = shellSrc.replace(antes, depois);
  if (novo === shellSrc) throw new Error(`MUTANTE NAO APLICOU: ${nome}`);
  shellSrc = novo;
};
const aplicarHorizon = (antes, depois, nome) => {
  const novo = horizonSrc.replace(antes, depois);
  if (novo === horizonSrc) throw new Error(`MUTANTE NAO APLICOU: ${nome}`);
  horizonSrc = novo;
};
if (mutante === 'horizonte-espelhado') {
  aplicar(/makeHorizon\(scene, \{ seed: 11/, "makeHorizon(scene, { foto: '/img/textures/horizonte_rio.webp', voltas: 4, seed: 11", mutante);
  horizonSrc += '\nTHREE.MirroredRepeatWrapping\n';
}
if (mutante === 'casca-optin') aplicar("QP.get('shell') !== '0'", "QP.get('shell') === '1'", mutante);
if (mutante === 'fallback-inseguro') aplicar('loadShell(root,', 'root.traverse((o) => { if (o.userData?.lajesVisualBase) o.visible = false; });\n    loadShell(root,', mutante);
if (mutante === 'sobreposicao') aplicar(/\.then\(\(\) => \{[\s\S]*?lajesVisualBase[\s\S]*?\}\)/, '', mutante);
if (mutante === 'lowq-carrega-casca') aplicar("!LOWQ && QP.get('shell') !== '0'", "QP.get('shell') !== '0'", mutante);
if (mutante === 'lightmap-opcional') aplicarShell(
  "  const lm = await new THREE.TextureLoader().loadAsync(url.replace(/\\.glb$/, '_lm.webp'));\n  lm.flipY = false; lm.channel = 1; lm.colorSpace = THREE.SRGBColorSpace;",
  "  let lm = null;\n  try {\n    lm = await new THREE.TextureLoader().loadAsync(url.replace(/\\.glb$/, '_lm.webp'));\n    lm.flipY = false; lm.channel = 1; lm.colorSpace = THREE.SRGBColorSpace;\n  } catch (e) { lm = null; }",
  mutante,
);
if (mutante === 'heroi-vitrine') aplicar('const HERO_BLOCOS_SEM_FRISO = true;', 'const HERO_BLOCOS_SEM_FRISO = false;', mutante);
if (mutante === 'entorno-pedestais') aplicar('const ENTORNO_EM_TERRENO_CONTINUO = true;', 'const ENTORNO_EM_TERRENO_CONTINUO = false;', mutante);
if (mutante === 'horizonte-sem-casario') aplicarHorizon('const HORIZONTE_URBANO_ANCOREADO = true;', 'const HORIZONTE_URBANO_ANCOREADO = false;', mutante);

const call = mapSrc.match(/loadShell\(root,\s*['"]([^'"]+\.glb)['"]\)/);
const glbRel = call?.[1]?.replace(/^\//, '') || '';
const glbPath = glbRel ? path.join(ROOT, 'public', glbRel) : '';
if (!glbPath || !fs.existsSync(glbPath)) {
  console.error(`✗ LV1 casca servida: ${glbRel || 'URL não encontrada'} não existe`);
  process.exit(1);
}

const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(glbPath);
const vertices = [];
for (const mesh of doc.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  const pos = primitive.getAttribute('POSITION');
  if (!pos) continue;
  const v = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    vertices.push([v[0], v[1], v[2]]);
  }
}
if (!vertices.length) {
  console.error('✗ LV1 casca servida: GLB sem POSITION; não sei medir');
  process.exit(1);
}
if (mutante === 'casca-parcial') {
  const antes = vertices.length;
  for (let i = vertices.length - 1; i >= 0; i--) if (vertices[i][2] > -12) vertices.splice(i, 1);
  if (vertices.length === antes) throw new Error('MUTANTE NAO APLICOU: casca-parcial');
}

const inventario = [
  ...EDIFICIOS.map((e, i) => ({ ...e, nome: NOMES_LAJE[i] })),
  ...ANEXOS.map((e, i) => ({ ...e, nome: `ANEXO-${i + 1}` })),
];
const cobertos = [];
const ausentes = [];
for (const f of inventario) {
  const folga = 0.35;
  const n = vertices.filter(([x, y, z]) => x >= f.x - f.w / 2 - folga && x <= f.x + f.w / 2 + folga
    && z >= f.z - f.d / 2 - folga && z <= f.z + f.d / 2 + folga && y >= -0.35 && y <= f.h + 4).length;
  (n >= 8 ? cobertos : ausentes).push(`${f.nome}:${n}`);
}

const horizonCall = mapSrc.match(/makeHorizon\(scene,\s*\{([\s\S]*?)\}\);/)?.[1] || '';
const horizonteUnico = horizonCall && !/\bfoto\s*:|\bvoltas\s*:/.test(horizonCall)
  && !horizonSrc.includes('MirroredRepeatWrapping');
const defaultOn = mapSrc.includes("QP.get('shell') !== '0'");
const loadAt = mapSrc.indexOf('loadShell(root,');
const hideAt = mapSrc.indexOf('if (o.userData?.lajesVisualBase) o.visible = false');
const escondeDepois = /loadShell\(root,[\s\S]{0,160}\.then\(\(\) => \{[\s\S]{0,180}lajesVisualBase[\s\S]{0,80}visible\s*=\s*false/.test(mapSrc);
const fallbackSeguro = loadAt >= 0 && escondeDepois && hideAt > loadAt;
const baseMarcada = mapSrc.includes('m.userData.lajesVisualBase = true')
  && (mapSrc.match(/cascaBase\(/g) || []).length >= 12;
const lowqPoupaCasca = mapSrc.includes("if (!LOWQ && QP.get('shell') !== '0'");
const lowqPoupaHorizonte = /makeHorizon\(scene, \{ seed: 11, chao: 0x7d7560, low: LOWQ \}\)/.test(mapSrc)
  && /casario\(scene, !!opts\.low\)/.test(horizonSrc)
  && /!low \|\| i % 3 === 0/.test(horizonSrc);
const lightmapObrigatoria = /const lm = await new THREE\.TextureLoader\(\)\.loadAsync/.test(shellSrc)
  && !/catch\s*\([^)]*\)\s*\{\s*lm\s*=\s*null/.test(shellSrc);
const tijolosHeroi = mutante === 'tijolo-adesivo' ? [] : (mapModule.TIJOLOS_HEROI || []);
const linhasHeroi = new Map();
for (const [linha, coluna] of tijolosHeroi) {
  if (!linhasHeroi.has(linha)) linhasHeroi.set(linha, []);
  linhasHeroi.get(linha).push(coluna);
}
const largurasHeroi = new Set([...linhasHeroi.values()].map((cols) => Math.max(...cols) - Math.min(...cols) + 1));
const argamassaHeroi = /const argamassaHeroi = paredeCanonica;/.test(mapSrc);
const blocoUnitario = mutante !== 'tijolo-multifiada'
  && /const blocoMats = \[\['#c66b3f', 3\], \['#b85a35', 7\], \['#d17a4c', 11\]\]/.test(mapSrc)
  && /\.map\(\(\[cor, seed\]\) => texturaBlocoHeroi\(cor, seed\)\)/.test(mapSrc)
  && !/tijoloDetalhe\.clone/.test(mapSrc);
const alvenariaComposta = tijolosHeroi.length >= 36 && linhasHeroi.size >= 7 && largurasHeroi.size >= 3
  && /for \(const \[linha, coluna\] of TIJOLOS_HEROI\)/.test(mapSrc)
  && /new THREE\.InstancedMesh/.test(mapSrc)
  && argamassaHeroi
  && blocoUnitario
  && !/addBox\(0\.05,\s*1\.55,\s*2\.45,\s*tijoloDetalhe/.test(mapSrc);
const entorno = mutante === 'entorno-ilhas' ? [] : (mapModule.ENTORNO_HABITADO || []);
const ladosEntorno = ['oeste', 'leste', 'norte', 'sul'];
const coberturaEntorno = ladosEntorno.map((lado) => {
  const casas = entorno.filter((e) => e.lado === lado);
  return { lado, casas: casas.length, profundidades: new Set(casas.map((e) => e.profundidade)).size };
});
const entornoEncostado = entorno.length >= 36
  && coberturaEntorno.every((e) => e.casas >= 7 && e.profundidades >= 3)
  && /for \(const e of ENTORNO_HABITADO\)/.test(mapSrc);
const barracosTijolo = mutante === 'barraco-sem-tijolo' ? [] : entorno.filter((e) => e.tijolo);
const coberturaTijolo = ladosEntorno.map((lado) => {
  const casas = barracosTijolo.filter((e) => e.lado === lado);
  return { lado, casas: casas.length, profundidades: new Set(casas.map((e) => e.profundidade)).size };
});
const tijoloNoEntorno = coberturaTijolo.every((e) => e.casas >= 3 && e.profundidades >= 2)
  && /tijoloCru \? tijoloDetalhe : entornoMats/.test(mapSrc)
  && /e\.sobrado, e\.tijolo\)/.test(mapSrc);
const rotaS = mutante === 'rota-reta'
  ? (mapModule.ROTA_S_NORTE || []).map(([x]) => [x, -34])
  : (mapModule.ROTA_S_NORTE || []);
const rotaDesenhaS = rotaS.length >= 6
  && Math.max(...rotaS.map((p) => p[1])) - Math.min(...rotaS.map((p) => p[1])) >= 4
  && rotaS.some((p) => p[1] <= -36.5) && rotaS.some((p) => p[1] >= -32.5)
  && /ROTA_S_NORTE\.map/.test(mapSrc);
const raioInternoHorizonte = mutante === 'horizonte-vazio'
  ? Infinity : (horizonModule.HORIZON_INNER_RADIUS ?? Infinity);
const horizonteHabitado = raioInternoHorizonte <= 44
  && /raio0:\s*HORIZON_INNER_RADIUS/.test(horizonSrc);
const heroiSemVitrine = /const HERO_BLOCOS_SEM_FRISO = true;/.test(mapSrc)
  && /texturaBlocoHeroi\(/.test(mapSrc)
  && argamassaHeroi
  && !/new THREE\.InstancedMesh\(frisoGeo/.test(mapSrc)
  && !/reboco_quebrado_heroico|const estruturaHeroi/.test(mapSrc);
const terrenoContinuo = /const ENTORNO_EM_TERRENO_CONTINUO = true;/.test(mapSrc)
  && /for \(const t of TERRACOS_ENTORNO\)/.test(mapSrc)
  && /horizonTerrainHeight\(x, z\)/.test(mapSrc)
  && !/terrenoEntorno\(e\.x, e\.z/.test(mapSrc);
const casario = horizonModule.HORIZON_CASARIO || [];
const setoresCasario = new Set(casario.map((e) => Math.floor(((e.theta + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 16)));
const casarioNosCantos = casario.filter((e) => e.radius <= 82 && Math.abs(e.x) >= 20 && Math.abs(e.z) >= 20);
const apoioPelosCantos = typeof horizonModule.horizonHouseSupport === 'function'
  && casario.every((e) => Math.abs(e.base - horizonModule.horizonHouseSupport(e)) <= 0.001);
const corFaixaInterna = horizonSrc.match(/raio0:\s*HORIZON_INNER_RADIUS[\s\S]{0,160}?cor:\s*(0x[\da-f]+)/i)?.[1];
const corFaixaSeguinte = horizonSrc.match(/raio0:\s*72[\s\S]{0,160}?cor:\s*(0x[\da-f]+)/i)?.[1];
const terrenoSemAnelCromatico = corFaixaInterna && corFaixaInterna === corFaixaSeguinte;
const casarioAncorado = casario.length >= setoresCasario.size * 4
  && setoresCasario.size === 16
  && casarioNosCantos.length * 2 >= casario.length
  && apoioPelosCantos
  && terrenoSemAnelCromatico
  && /const HORIZONTE_URBANO_ANCOREADO = true;/.test(horizonSrc)
  && /new THREE\.InstancedMesh/.test(horizonSrc);

const checks = [
  ['LV1', 'casca tem geometria nos footprints do mapa inteiro', ausentes.length === 0,
    `${cobertos.length}/${inventario.length} cobertos${ausentes.length ? ` · faltam ${ausentes.join(', ')}` : ''}`],
  ['LV2', 'horizonte padrão não repete fotografia reconhecível', horizonteUnico,
    horizonteUnico ? 'terreno procedural contínuo, sem MirroredRepeatWrapping' : 'foto/voltas/espelho ainda ativos no caminho padrão'],
  ['LV3', 'casca completa é padrão e possui kill-switch ?shell=0', defaultOn,
    defaultOn ? 'default ON · ?shell=0 restaura procedural' : 'casca continua opt-in ou sem kill-switch'],
  ['LV4', 'fallback procedural permanece se o GLB falhar', fallbackSeguro,
    fallbackSeguro ? 'pele base só some no resolve do GLB' : 'pele base some antes do resolve ou nunca é substituída com segurança'],
  ['LV5', 'casca substitui a pele coberta em vez de duplicá-la', baseMarcada && escondeDepois,
    baseMarcada && escondeDepois ? 'proxies visuais marcados e ocultos após carga' : 'casca e proxies continuam sobrepostos'],
  ['LV6', 'qualidade baixa conserva o fallback e reduz casca, lightmap e horizonte', lowqPoupaCasca && lowqPoupaHorizonte,
    lowqPoupaCasca && lowqPoupaHorizonte ? 'LOWQ bloqueia loadShell e conserva 1/3 do casario instanciado' : 'LOWQ ainda paga shell/lightmap ou o horizonte completo'],
  ['LV7', 'falha da lightmap rejeita a casca e conserva o fallback', lightmapObrigatoria,
    lightmapObrigatoria ? 'lightmap é obrigatória antes de root.add(shell)' : 'casca aceita lightmap ausente e apaga o fallback'],
  ['LV8', 'tijolo herói é alvenaria física irregular, não uma placa texturizada', alvenariaComposta,
    alvenariaComposta ? `${tijolosHeroi.length} blocos unitários em ${linhasHeroi.size} fiadas, ${largurasHeroi.size} larguras e argamassa contínua` : 'sem unidades físicas unitárias, fiadas irregulares, argamassa contínua ou a placa única/multifiada ainda existe'],
  ['LV9', 'entorno habitado encosta nas quatro bordas em múltiplas profundidades', entornoEncostado,
    entornoEncostado ? coberturaEntorno.map((e) => `${e.lado} ${e.casas}/${e.profundidades}d`).join(' · ') : 'ocupação externa ainda rala, unilateral ou isolada em ilhas'],
  ['LV10', 'piso da rua norte desenha as duas inflexões do S', rotaDesenhaS,
    rotaDesenhaS ? `${rotaS.length} pontos · amplitude ${(Math.max(...rotaS.map((p) => p[1])) - Math.min(...rotaS.map((p) => p[1]))).toFixed(1)} m` : 'rota ausente, reta ou sem alternância de lado'],
  ['LV11', 'encosta começa sob o entorno em vez de revelar uma ilha circular', horizonteHabitado,
    horizonteHabitado ? `raio interno ${raioInternoHorizonte} m` : 'círculo vazio entre mapa e morro'],
  ['LV12', 'barracos de tijolo continuam a linguagem nas quatro bordas', tijoloNoEntorno,
    tijoloNoEntorno ? coberturaTijolo.map((e) => `${e.lado} ${e.casas}/${e.profundidades}d`).join(' · ') : 'tijolo ficou num painel isolado ou não alcança as quatro bordas'],
  ['LV13', 'tijolo herói integra a parede sem friso-gaveta nem moldura de vitrine', heroiSemVitrine,
    heroiSemVitrine ? 'fundo usa a própria fachada · microfriso no bloco · sem friso preto nem moldura limpa' : 'fundo contrasta com a fachada, há frisos repetidos/moldura limpa ou falta a integração'],
  ['LV14', 'entorno assenta em terreno contínuo, não em um pedestal por casa', terrenoContinuo,
    terrenoContinuo ? 'quatro terraços compartilham a mesma função de altura das casas' : 'bases continuam isoladas ou o terreno e as casas usam alturas diferentes'],
  ['LV15', 'casario fecha os cantos e assenta a casa inteira sem desenhar anel', casarioAncorado,
    casarioAncorado ? `${casario.length} volumes · ${casarioNosCantos.length} nos cantos · apoio pelos quatro cantos · terreno contínuo` : `${casario.length} volumes · ${casarioNosCantos.length} nos cantos · ${setoresCasario.size}/16 setores; falta massa, apoio ou continuidade cromática`],
];
let falhas = 0;
for (const [id, desc, ok, evid] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${evid}`);
}
if (falhas) {
  console.error(`LAJES-VISUAL FALHA: ${falhas}/${checks.length}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu`);
  process.exitCode = 1;
} else console.log('LAJES-VISUAL OK');

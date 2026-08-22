/* Material rígido escuro em personagem não pode passar pelo shader de pele/roupa.

   Caso real: o GLB do Motoca declarava capacete #0d1218, mas applyCharFX acrescenta
   piso de albedo, SSS e rim laranja. No frame servido ele ficava salmão. O contrato
   CS_HARD_ permite ao asset optar fora dessa etapa sem desligar PBR/luz.

   Mutação: --mutante=semmarcador remove o prefixo da leitura do GLB e precisa
   reprovar. Se não reprovar, a régua está cega para o defeito que diz cobrir.
*/
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const MUTANTE = process.argv.includes('--mutante=semmarcador');
const MUTANTE_CHIN = process.argv.includes('--mutante=queixeira-lamina');
const MUTANTE_SHELL = process.argv.includes('--mutante=casco-halo');
const MUTANTE_RING = process.argv.includes('--mutante=aro-colar');
const MUTANTE_VISOR = process.argv.includes('--mutante=visor-ciano');
const MUTANTE_PROFILE = process.argv.includes('--mutante=queixeira-frontal-lamina');
const MUTANTE_STACKED = process.argv.includes('--mutante=visor-queixeira-empilhados');
const MUTANTE_LEGACY = process.argv.includes('--mutante=legacy-stack-reinserted');
const source = fs.readFileSync('public/js/characters.js', 'utf8');
const assetPath = MUTANTE_LEGACY
  ? 'tools/eval/asset-evidence/motoca-cachorro-loko/motoca-before-causal-cleanup.glb'
  : process.env.CHAR_HARD_ASSET || 'public/models/characters/motoca-cachorro-loko.glb';
const glb = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .read(assetPath);
const materials = glb.getRoot().listMaterials().map((material) => ({
  name: MUTANTE ? material.getName().replace(/^CS_HARD_/, '') : material.getName(),
  color: material.getBaseColorFactor().slice(0, 3),
}));
const helmet = materials.find(({ name }) => /Motofrete_Helmet_(?:Black|Shell|FullFace)$/.test(name));
const visor = materials.find(({ name }) => /Motofrete_Visor_Smoke$/.test(name));
const materialNames = new Set(materials.map(({ name }) => name));
const primitiveComponentCount = (primitive) => {
  const positions = primitive.getAttribute('POSITION');
  const count = positions?.getCount() || 0;
  const parent = Array.from({ length: count }, (_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => { left = find(left); right = find(right); if (left !== right) parent[right] = left; };
  const indices = primitive.getIndices();
  const used = new Set();
  const at = (index) => indices ? indices.getScalar(index) : index;
  const total = indices ? indices.getCount() : count;
  for (let index = 0; index + 2 < total; index += 3) {
    const a = at(index), b = at(index + 1), c = at(index + 2);
    used.add(a); used.add(b); used.add(c); union(a, b); union(b, c);
  }
  return new Set([...used].map(find)).size;
};
let fullFaceComponents = 0, visorComponents = 0;
for (const mesh of glb.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  const name = primitive.getMaterial()?.getName() || '';
  if (name === 'CS_HARD_Motofrete_Helmet_FullFace') fullFaceComponents += primitiveComponentCount(primitive);
  if (name === 'Motofrete_Visor_Smoke') visorComponents += primitiveComponentCount(primitive);
}
// A queixeira autorada em blender-add-cultural-gear.py mede 0,220 m de largura.
// Um passe posterior escalava TODO o material preto e levou o GLB servido a 0,296 m,
// a lâmina horizontal vista no thumbnail. Mede os vértices baixos/frontais da peça.
const chinXs = [];
const shellXs = [];
const ringXs = [];
const frontalChin = [];
for (const mesh of glb.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  const materialName = primitive.getMaterial()?.getName() || '';
  const legacy = /Motofrete_Helmet_Black$/.test(materialName);
  const shell = /Motofrete_Helmet_Shell$/.test(materialName);
  const fullFace = /Motofrete_Helmet_FullFace$/.test(materialName);
  const chin = /Motofrete_ChinBar$/.test(materialName);
  if (!legacy && !shell && !fullFace && !chin) continue;
  const positions = primitive.getAttribute('POSITION');
  for (let i = 0; i < positions.getCount(); i++) {
    const [x, y, z] = positions.getElement(i, []);
    // O passe HARD8 compactou a ponta a ~0,05 m; 6× recompõe deliberadamente
    // a lâmina de ~0,30 m que originou este contrato.
    if ((legacy && y >= 1.36 && y <= 1.46 && z >= .225) || (chin && z >= .15)
        || (fullFace && y >= 1.36 && y <= 1.49 && z >= .08))
      chinXs.push(MUTANTE_CHIN ? x * 6 : x);
    // Projeção frontal que o HARD4 antigo não via: na captura reprovada, a ponta
    // z>=0,20 m ocupa só ~3,5 cm em altura contra ~10,8 cm em largura (razão 3,10),
    // portanto lê como lâmina mesmo sendo estreita no mundo. O alvo autorado deste
    // passe é uma proteção em U com 0,12×0,08 m (1,50); teto 2,0 preserva 33% de folga.
    if ((legacy && y >= 1.34 && y <= 1.47 && z >= .20) || chin
        || (fullFace && y >= 1.35 && y <= 1.50 && z >= .07))
      frontalChin.push([MUTANTE_PROFILE ? x * 1.6 : x, y]);
    if ((legacy && y > 1.46) || shell || (fullFace && y > 1.46)) shellXs.push(MUTANTE_SHELL ? x * 1.5 : x);
    if ((legacy && y >= 1.36 && y <= 1.46) || chin
        || (fullFace && y >= 1.35 && y <= 1.50)) ringXs.push(MUTANTE_RING ? x * 1.4 : x);
  }
}
const chinWidth = chinXs.length ? Math.max(...chinXs) - Math.min(...chinXs) : Infinity;
const shellWidth = shellXs.length ? Math.max(...shellXs) - Math.min(...shellXs) : Infinity;
const ringWidth = ringXs.length ? Math.max(...ringXs) - Math.min(...ringXs) : Infinity;
const visorColor = visor?.color || [Infinity, Infinity, Infinity];
if (MUTANTE_VISOR && visor) visorColor.splice(0, 3, .02, .18, .24);
const visorChroma = Math.max(...visorColor) - Math.min(...visorColor);
const frontalWidth = frontalChin.length ? Math.max(...frontalChin.map(([x]) => x)) - Math.min(...frontalChin.map(([x]) => x)) : Infinity;
const frontalHeight = frontalChin.length ? Math.max(...frontalChin.map(([, y]) => y)) - Math.min(...frontalChin.map(([, y]) => y)) : 0;
const frontalAspect = frontalHeight > 0 ? frontalWidth / frontalHeight : Infinity;
const clauses = [
  ['HARD1 contrato genérico no runtime', /hardSurface\s*=\s*\/\^CS_HARD_/i.test(source)
    && /hardSurface\s*\?\s*m\s*:\s*applyCharFX/.test(source)],
  ['HARD2 capacete declara CS_HARD_', !!helmet && /^CS_HARD_/.test(helmet.name)],
  ['HARD3 albedo continua quase preto', !!helmet && Math.max(...helmet.color) <= 0.02],
  ['HARD4 queixeira não excede os 0,220 m autorados', chinWidth <= .22],
  // Na referência public/img/source-concepts/motoca-cachorro-loko.webp, o casco
  // ocupa ~145 px contra ~385 px dos ombros. O teto de 0,300 m ainda permite
  // ~60% dos ombros de 0,504 m medidos no GLB, cerca de 1,6× a proporção da
  // referência; só elimina o halo que chegava a 0,458 m e à largura dos ombros.
  ['HARD5 casco não vira halo da largura dos ombros', shellWidth <= .30],
  // O mesmo conceito mede ~145 px de capacete contra ~385 px de ombros. O aro
  // inferior inteiro tinha 0,463 m no GLB alpha.57, embora HARD4 enxergasse apenas
  // os 0,196 m da faixa frontal. O teto de 0,300 m é deliberadamente folgado: ele
  // só impede o colar oval reprovado na vista frontal, sem exigir a proporção exata.
  ['HARD6 aro inferior não vira colar ao redor do rosto', ringWidth <= .30],
  // Na referência original o visor levantado é fumaça quase neutra, integrado ao
  // casco preto. O material antigo [0,025; 0,065; 0,085] tinha chroma 0,060 e lia
  // como uma cinta ciano separada. Mantém o smoke escuro e sem matiz saturada.
  ['HARD7 viseira levantada permanece fumaça neutra', !!visor && Math.max(...visorColor) <= .04 && visorChroma <= .03],
  ['HARD8 queixeira frontal não vira lâmina horizontal', frontalChin.length >= 8 && frontalAspect <= 2.0],
  ['HARD9 visor+queixeira formam uma casca full-face, não placas empilhadas',
    !MUTANTE_STACKED
      && materialNames.has('CS_HARD_Motofrete_Helmet_FullFace')
      && !materialNames.has('CS_HARD_Motofrete_ChinBar')
      && !materialNames.has('Motofrete_Visor_Hinge')],
  ['HARD10 casca e visor são regiões conexas únicas, sem pilha de planos',
    fullFaceComponents === 1 && visorComponents === 1],
];
let failed = 0;
for (const [name, ok] of clauses) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (MUTANTE || MUTANTE_CHIN || MUTANTE_SHELL || MUTANTE_RING || MUTANTE_VISOR || MUTANTE_PROFILE || MUTANTE_STACKED || MUTANTE_LEGACY) {
  if (!failed) {
    console.error('MUTANTE PASSOU: remover CS_HARD_ não deixou a régua vermelha.');
    process.exit(1);
  }
  console.log(`mutante reprovado como esperado (${failed} cláusula).`);
  process.exit(1);
}
if (failed) process.exit(1);
console.log(`CHAR-HARD-SURFACE ✓ 10/10 (queixeira ${chinWidth.toFixed(3)} m; frontal ${frontalAspect.toFixed(2)}:1; casco ${shellWidth.toFixed(3)} m; aro ${ringWidth.toFixed(3)} m; visor chroma ${visorChroma.toFixed(3)}; componentes shell/visor ${fullFaceComponents}/${visorComponents})`);

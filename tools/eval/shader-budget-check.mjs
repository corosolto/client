/* WebGL1 precisa caber no piso de oito vetores variáveis da especificação. */
import { readFileSync } from 'node:fs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const mutants = ['fog-separado', 'tri-separado', 'sem-install', 'tri-flat', 'urna-color', 'urna-clearcoat', 'urna-segunda'];
if (mutant && !mutants.includes(mutant)) {
  throw new Error(`mutante desconhecido: ${mutant}`);
}

const parseGlb = (file) => {
  const data = readFileSync(file);
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2) {
    throw new Error(`${file}: GLB 2.0 inválido`);
  }
  let offset = 12;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) {
      return JSON.parse(data.subarray(offset + 8, offset + 8 + length).toString('utf8').replace(/\0+$/g, ''));
    }
    offset += 8 + length;
  }
  throw new Error(`${file}: chunk JSON ausente`);
};

let bloom = readFileSync('public/js/bloom.js', 'utf8');
let brasilia = readFileSync('public/js/map_brasilia.js', 'utf8');
const loader = readFileSync('public/vendor/addons/loaders/GLTFLoader.js', 'utf8');
const urna = parseGlb('public/models/props/urna.glb');

if (mutant === 'fog-separado') {
  const before = bloom;
  bloom = bloom
    .replace(/#if !defined\( STANDARD \)[^\n]+\n\s*varying vec3 vFogPosV;\n\s*#endif/g, 'varying vec3 vFogPosV;')
    .replace(/#if !defined\( STANDARD \)[^\n]+\n\s*vFogPosV = mvPosition\.xyz;\n\s*#endif/g, 'vFogPosV = mvPosition.xyz;')
    .replace(/#if defined\( STANDARD \)[\s\S]*?#else\n\s*vec3 owfFogPosV = vFogPosV;\n\s*#endif/, 'vec3 owfFogPosV = vFogPosV;');
  if (bloom === before) throw new Error('MUTANTE NAO APLICOU: fog-separado');
}
if (mutant === 'tri-separado') {
  const before = brasilia;
  brasilia = brasilia
    .replace(
      'sh.uniforms.uTriScale = { value: scale };\n      sh.fragmentShader',
      `sh.uniforms.uTriScale = { value: scale };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\\nvarying vec3 vTriP;\\nvarying vec3 vTriN;')
        .replace('#include <worldpos_vertex>', \`#include <worldpos_vertex>
  vec4 triWP = vec4( transformed, 1.0 );
  vec3 triON = objectNormal;
  #ifdef USE_INSTANCING
    triWP = instanceMatrix * triWP;
    triON = mat3( instanceMatrix ) * triON;
  #endif
  triWP = modelMatrix * triWP;
  vTriP = triWP.xyz;
  vTriN = normalize( mat3( modelMatrix ) * triON );\`);
      sh.fragmentShader`,
    )
    .replace(
      "'#include <common>\\nuniform float uTriScale;\\nfloat gTriL;'",
      "'#include <common>\\nuniform float uTriScale;\\nvarying vec3 vTriP;\\nvarying vec3 vTriN;\\nfloat gTriL;'",
    )
    .replace(
    'vec3 triP = cameraPosition - ( vec4( vViewPosition, 0.0 ) * viewMatrix ).xyz;\n  vec3 triN = inverseTransformDirection( vNormal, viewMatrix );',
    'vec3 triP = vTriP;\n  vec3 triN = vTriN;',
    );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-separado');
}
if (mutant === 'sem-install') {
  const before = bloom;
  bloom = bloom.replace('SC.fog_pars_fragment = FOG_FRAG_PARS;', '');
  if (bloom === before) throw new Error('MUTANTE NAO APLICOU: sem-install');
}
if (mutant === 'tri-flat') {
  const before = brasilia;
  brasilia = brasilia.replace('triplanar(lam({ color:', 'triplanar(lam({ flatShading: true, color:');
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-flat');
}

const primitives = urna.meshes?.flatMap((mesh) => mesh.primitives || []) || [];
const primitive = primitives
  .find((item) => item.attributes?.TANGENT !== undefined && item.material !== undefined);
const material = primitive && urna.materials?.[primitive.material];
const pbr = material?.pbrMetallicRoughness || {};
if (mutant === 'urna-color') primitive.attributes.COLOR_0 = primitive.attributes.POSITION;
if (mutant === 'urna-clearcoat') {
  material.extensions ||= {};
  material.extensions.KHR_materials_clearcoat = { clearcoatFactor: 1, clearcoatTexture: { index: 0 } };
}
if (mutant === 'urna-segunda') {
  const expensiveMaterial = structuredClone(material);
  expensiveMaterial.extensions ||= {};
  expensiveMaterial.extensions.KHR_materials_clearcoat = { clearcoatFactor: 1, clearcoatTexture: { index: 0 } };
  urna.materials.push(expensiveMaterial);
  const expensivePrimitive = structuredClone(primitive);
  expensivePrimitive.material = urna.materials.length - 1;
  primitives.push(expensivePrimitive);
}
const fixtureOk = Boolean(
  primitive?.attributes?.POSITION !== undefined
  && primitive.attributes.NORMAL !== undefined
  && primitive.attributes.TEXCOORD_0 !== undefined
  && pbr.baseColorTexture
  && pbr.metallicRoughnessTexture
  && material.normalTexture
  && material.occlusionTexture
  && material.emissiveTexture,
);
const loaderSplitsMetalRough = /assignTexture\( materialParams, 'metalnessMap', metallicRoughness\.metallicRoughnessTexture \)/.test(loader)
  && /assignTexture\( materialParams, 'roughnessMap', metallicRoughness\.metallicRoughnessTexture \)/.test(loader);

const litFogUsesBase = /#if !defined\( STANDARD \).*LAMBERT.*PHONG.*TOON.*MATCAP/.test(bloom)
  && /#if defined\( STANDARD \).*LAMBERT.*PHONG.*TOON.*MATCAP[\s\S]*?vec3 owfFogPosV = -vViewPosition;/.test(bloom);
const fogRows = litFogUsesBase ? 0 : 1;
const collectTextureKeys = (value, result = []) => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/Texture$/.test(key) && child && Number.isInteger(child.index)) result.push(key);
    collectTextureKeys(child, result);
  }
  return result;
};
const shadowRows = 1;
const budgetedExtensions = new Set([
  'KHR_materials_anisotropy', 'KHR_materials_clearcoat', 'KHR_materials_emissive_strength',
  'KHR_materials_ior', 'KHR_materials_iridescence', 'KHR_materials_sheen',
  'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_unlit',
  'KHR_materials_volume',
]);
const budgetFor = (item) => {
  const mat = urna.materials?.[item.material] || {};
  const itemPbr = mat.pbrMetallicRoughness || {};
  const textures = collectTextureKeys(mat, []);
  const uv = textures.length + (itemPbr.metallicRoughnessTexture && loaderSplitsMetalRough ? 1 : 0);
  const base = 2
    + (item.attributes?.TANGENT !== undefined ? 2 : 0)
    + (item.attributes?.COLOR_0 !== undefined ? 1 : 0);
  const transmission = mat.extensions?.KHR_materials_transmission ? 1 : 0;
  const unknown = Object.keys(mat.extensions || {}).filter((extension) => !budgetedExtensions.has(extension));
  return { rows: base + shadowRows + Math.ceil(uv / 2) + fogRows + transmission, uv, unknown };
};
const budgets = primitives.filter((item) => item.material !== undefined).map(budgetFor);
const primaryBudget = budgetFor(primitive);
const uvVaryings = primaryBudget.uv;
const urnaRows = Math.max(...budgets.map(({ rows }) => rows));
const allFeaturesBudgeted = budgets.every(({ unknown }) => unknown.length === 0);

const triSource = brasilia.slice(brasilia.indexOf('function triplanar('), brasilia.indexOf('mat.customProgramCacheKey'));
const triAddsVarying = /\bvarying\b/.test(triSource);
const triUsesBase = /vec3 triP = cameraPosition - \( vec4\( vViewPosition, 0\.0 \) \* viewMatrix \)\.xyz;/.test(brasilia)
  && /vec3 triN = inverseTransformDirection\( vNormal, viewMatrix \);/.test(brasilia);
const fogInstalled = [
  ['fog_pars_vertex', 'FOG_VERT_PARS'],
  ['fog_vertex', 'FOG_VERT'],
  ['fog_pars_fragment', 'FOG_FRAG_PARS'],
  ['fog_fragment', 'FOG_FRAG'],
].every(([chunk, source]) => new RegExp(`SC\\.${chunk}\\s*=\\s*${source}`).test(bloom));
const fallbackFogSymmetric = (bloom.match(/#if !defined\( STANDARD \).*MATCAP/g) || []).length === 3
  && /varying vec3 vFogPosV/.test(bloom)
  && /vFogPosV = mvPosition\.xyz/.test(bloom)
  && /vec3 owfFogPosV = vFogPosV/.test(bloom);
const triCalls = brasilia.split('\n').filter((line) => line.includes('triplanar(') && !line.includes('function triplanar'));
const triNonFlat = triCalls.length > 0
  && triCalls.every((line) => line.includes('triplanar(lam(') && !line.includes('flatShading'));

const checks = [
  ['SB1', fixtureOk && loaderSplitsMetalRough && allFeaturesBudgeted, `todas as primitivas da urna têm features contabilizadas; caso-base usa ${uvVaryings} UVs`],
  ['SB2', urnaRows <= 8, `shader da urna usa ${urnaRows}/8 vetores em WebGL1`],
  ['SB3', litFogUsesBase, 'fog iluminado reutiliza vViewPosition'],
  ['SB4', triUsesBase && !triAddsVarying, 'triplanar reutiliza posição e normal do MeshStandard'],
  ['SB5', fogInstalled && fallbackFogSymmetric, 'quatro chunks de fog e fallback não iluminado são simétricos'],
  ['SB6', triNonFlat, 'triplanar aceita apenas MeshStandard sem flatShading'],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [id, ok, description] of checks) {
  console.log(`${ok ? '\x1b[32m✓' : '\x1b[31m✗'} ${id} ${description}\x1b[0m`);
}
if (mutant && !failed.length) failed.push(['MUT', false, `mutação ${mutant} não foi detectada`]);
if (failed.length) {
  console.error(`\x1b[31mSHADER-BUDGET ${failed.length} VERMELHA(S)${mutant ? ` (mutante=${mutant})` : ''}\x1b[0m`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mSHADER-BUDGET verde: shaders críticos cabem no WebGL1 mínimo\x1b[0m');
}

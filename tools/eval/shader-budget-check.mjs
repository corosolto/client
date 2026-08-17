/* WebGL1 precisa caber no piso de oito vetores variáveis da especificação. */
import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { moduleCacheManifest } from '../../scripts/module-cache.mjs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const mutants = [
  'fog-separado', 'tri-separado', 'tri-varying', 'tri-helper-varying',
  'sem-install', 'sem-patch', 'tri-flat', 'lam-flat',
  'urna-color', 'urna-clearcoat', 'urna-anisotropy', 'urna-instancing', 'urna-segunda',
  'sombra-extra', 'sombra-condicional', 'sombra-pontual', 'sombra-reativada', 'spot-map',
  'cache-antigo', 'cache-omitido', 'cache-constante', 'cache-podado', 'cache-entry-site',
];
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
let indexPage = readFileSync('src/pages/index.astro', 'utf8');
let layoutPage = readFileSync('src/layouts/Layout.astro', 'utf8');
let evalServer = readFileSync('tools/eval/serve.mjs', 'utf8');
const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const pruneDist = readFileSync('scripts/prune-dist.mjs', 'utf8');
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
if (mutant === 'sem-patch') {
  const before = bloom;
  bloom = bloom.replace('\npatchFogChunks();', '');
  if (bloom === before) throw new Error('MUTANTE NAO APLICOU: sem-patch');
}
if (mutant === 'tri-flat') {
  const before = brasilia;
  brasilia = brasilia.replace('triplanar(lam({ color:', 'triplanar(lam({ flatShading: true, color:');
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-flat');
}
if (mutant === 'lam-flat') {
  const before = brasilia;
  brasilia = brasilia.replace(
    'new THREE.MeshStandardMaterial({ roughness:',
    'new THREE.MeshStandardMaterial({ flatShading: true, roughness:',
  );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: lam-flat');
}
if (mutant === 'tri-varying') {
  const before = brasilia;
  brasilia = brasilia
    .replace(
      'sh.uniforms.uTriScale = { value: scale };\n      sh.fragmentShader',
      `sh.uniforms.uTriScale = { value: scale };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\\nvarying vec3 vBudgetLeak;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\\nvBudgetLeak = transformed;');
      sh.fragmentShader`,
    )
    .replace('\\nfloat gTriL;', '\\nvarying vec3 vBudgetLeak;\\nfloat gTriL;')
    .replace(
      'vec3 triP = cameraPosition - ( vec4( vViewPosition, 0.0 ) * viewMatrix ).xyz;',
      'vec3 triP = cameraPosition - ( vec4( vViewPosition, 0.0 ) * viewMatrix ).xyz;\\n  triP += vBudgetLeak * 0.000001;',
    );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-varying');
}
if (mutant === 'tri-helper-varying') {
  const before = brasilia;
  brasilia = brasilia
    .replace(
      'function triplanar(mat, tex, scale) {',
      `function budgetVarying(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\\nvarying vec3 vBudgetLeak;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\\nvBudgetLeak = transformed;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\\nvarying vec3 vBudgetLeak;');
}
function triplanar(mat, tex, scale) {`,
    )
    .replace('sh.uniforms.uTriScale = { value: scale };', 'budgetVarying(sh);\n      sh.uniforms.uTriScale = { value: scale };');
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-helper-varying');
}
if (mutant === 'sombra-extra' || mutant === 'sombra-condicional') {
  const before = brasilia;
  brasilia = brasilia.replace(
    'const fill = new THREE.DirectionalLight(SKY2 ? 0xc9b98f : 0xaecbe8, SKY2 ? 0.20 : 0.35);',
    `const fill = new THREE.DirectionalLight(SKY2 ? 0xc9b98f : 0xaecbe8, SKY2 ? 0.20 : 0.35); fill.castShadow = ${mutant === 'sombra-extra' ? 'true' : '!LOWQ'};`,
  );
  if (brasilia === before) throw new Error(`MUTANTE NAO APLICOU: ${mutant}`);
}
if (mutant === 'sombra-pontual') {
  const before = brasilia;
  brasilia = brasilia.replace(
    'fill.position.set(-32, 22, 28); scene.add(fill);',
    `fill.position.set(-32, 22, 28); scene.add(fill);
  const budgetPoint = new THREE.PointLight(0xffffff, 1); budgetPoint.castShadow = true; scene.add(budgetPoint);`,
  );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: sombra-pontual');
}
if (mutant === 'sombra-reativada') {
  const before = brasilia;
  brasilia = brasilia.replace(
    'fill.position.set(-32, 22, 28); scene.add(fill);',
    'fill.castShadow = false; fill.castShadow = true; fill.position.set(-32, 22, 28); scene.add(fill);',
  );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: sombra-reativada');
}
if (mutant === 'spot-map') {
  const before = brasilia;
  brasilia = brasilia.replace(
    'fill.position.set(-32, 22, 28); scene.add(fill);',
    `fill.position.set(-32, 22, 28); scene.add(fill);
  const budgetSpot = new THREE.SpotLight(0xffffff, 1); budgetSpot.map = new THREE.Texture(); scene.add(budgetSpot);`,
  );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: spot-map');
}
if (mutant === 'cache-antigo') {
  indexPage = indexPage.replaceAll('?v=${V}-${JS_REV}', '?v=${V}');
  layoutPage = layoutPage.replaceAll('?v=${V}-${JS_REV}', '?v=${V}');
  evalServer = evalServer.replaceAll('?v=${V}-${JS_REV}', '?v=${V}');
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
if (mutant === 'urna-anisotropy') {
  material.extensions ||= {};
  material.extensions.KHR_materials_anisotropy = { anisotropyStrength: 1 };
}
if (mutant === 'urna-instancing') {
  const instanceNode = urna.nodes?.find((node) => node.mesh === 0);
  instanceNode.extensions ||= {};
  instanceNode.extensions.EXT_mesh_gpu_instancing = {
    attributes: { _COLOR_0: primitive.attributes.POSITION },
  };
  urna.extensionsUsed ||= [];
  if (!urna.extensionsUsed.includes('EXT_mesh_gpu_instancing')) urna.extensionsUsed.push('EXT_mesh_gpu_instancing');
}
if (mutant === 'urna-segunda') {
  const expensiveMaterial = JSON.parse(JSON.stringify(material));
  expensiveMaterial.extensions ||= {};
  expensiveMaterial.extensions.KHR_materials_clearcoat = { clearcoatFactor: 1, clearcoatTexture: { index: 0 } };
  urna.materials.push(expensiveMaterial);
  const expensivePrimitive = JSON.parse(JSON.stringify(primitive));
  expensivePrimitive.material = urna.materials.length - 1;
  urna.meshes[0].primitives.push(expensivePrimitive);
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
const shadowLights = [...brasilia.matchAll(
  /(?:const|let|var)\s+(\w+)\s*=\s*new THREE\.(Directional|Point|Spot)Light\(/g,
)].map((match) => ({ name: match[1], type: match[2] }));
const shadowRows = shadowLights.filter(({ name, type }) => {
  const assignments = [...brasilia.matchAll(new RegExp(`\\b${name}\\.castShadow\\s*=\\s*([^;]+)`, 'g'))];
  const castsShadow = assignments.some((assignment) => assignment[1].trim() !== 'false');
  const mapsSpot = type === 'Spot'
    && [...brasilia.matchAll(new RegExp(`\\b${name}\\.map\\s*=\\s*([^;]+)`, 'g'))]
      .some((assignment) => !/^(?:null|undefined)$/.test(assignment[1].trim()));
  return castsShadow || mapsSpot;
}).length;
const budgetedExtensions = new Set([
  'KHR_materials_anisotropy', 'KHR_materials_clearcoat', 'KHR_materials_emissive_strength',
  'KHR_materials_ior', 'KHR_materials_iridescence', 'KHR_materials_sheen',
  'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_unlit',
  'KHR_materials_volume',
]);
const scene = urna.scenes?.[urna.scene ?? 0];
const activeNodeIndices = new Set();
const visitNode = (nodeIndex) => {
  if (activeNodeIndices.has(nodeIndex)) return;
  activeNodeIndices.add(nodeIndex);
  for (const child of urna.nodes?.[nodeIndex]?.children || []) visitNode(child);
};
for (const root of scene?.nodes || []) visitNode(root);
const instanceColorMeshes = new Set([...activeNodeIndices]
  .map((nodeIndex) => urna.nodes?.[nodeIndex])
  .filter((node) => node?.extensions?.EXT_mesh_gpu_instancing?.attributes?._COLOR_0 !== undefined)
  .map((node) => node.mesh));
const primitiveRecords = urna.meshes.flatMap((mesh, meshIndex) =>
  (mesh.primitives || []).map((item) => ({ item, meshIndex })));
const budgetFor = ({ item, meshIndex }) => {
  const mat = urna.materials?.[item.material] || {};
  const itemPbr = mat.pbrMetallicRoughness || {};
  const textures = collectTextureKeys(mat, []);
  const anisotropy = mat.extensions?.KHR_materials_anisotropy;
  const anisotropyUv = anisotropy && (anisotropy.anisotropyStrength ?? 1) > 0 ? 1 : 0;
  const uv = textures.length
    + (itemPbr.metallicRoughnessTexture && loaderSplitsMetalRough ? 1 : 0)
    + anisotropyUv;
  const base = 2
    + (item.attributes?.TANGENT !== undefined ? 2 : 0)
    + (item.attributes?.COLOR_0 !== undefined || instanceColorMeshes.has(meshIndex) ? 1 : 0);
  const transmission = mat.extensions?.KHR_materials_transmission ? 1 : 0;
  const unknown = Object.keys(mat.extensions || {}).filter((extension) => !budgetedExtensions.has(extension));
  return { rows: base + shadowRows + Math.ceil(uv / 2) + fogRows + transmission, uv, unknown };
};
const budgets = primitiveRecords.filter(({ item }) => item.material !== undefined).map(budgetFor);
const primaryBudget = budgetFor(primitiveRecords.find(({ item }) => item === primitive));
const uvVaryings = primaryBudget.uv;
const urnaRows = Math.max(...budgets.map(({ rows }) => rows));
const allFeaturesBudgeted = budgets.every(({ unknown }) => unknown.length === 0);

const triAddsVarying = /\bvarying\b/.test(brasilia.replaceAll('\\n', '\n'));
const triUsesBase = /vec3 triP = cameraPosition - \( vec4\( vViewPosition, 0\.0 \) \* viewMatrix \)\.xyz;/.test(brasilia)
  && /vec3 triN = inverseTransformDirection\( vNormal, viewMatrix \);/.test(brasilia);
const fogInstalled = [
  ['fog_pars_vertex', 'FOG_VERT_PARS'],
  ['fog_vertex', 'FOG_VERT'],
  ['fog_pars_fragment', 'FOG_FRAG_PARS'],
  ['fog_fragment', 'FOG_FRAG'],
].every(([chunk, source]) => new RegExp(`SC\\.${chunk}\\s*=\\s*${source}`).test(bloom))
  && /\npatchFogChunks\(\);/.test(bloom);
const fallbackFogSymmetric = (bloom.match(/#if !defined\( STANDARD \).*MATCAP/g) || []).length === 3
  && /varying vec3 vFogPosV/.test(bloom)
  && /vFogPosV = mvPosition\.xyz/.test(bloom)
  && /vec3 owfFogPosV = vFogPosV/.test(bloom);
const triCalls = brasilia.split('\n').filter((line) => line.includes('triplanar(') && !line.includes('function triplanar'));
const lamSource = brasilia.slice(brasilia.indexOf('const lam ='), brasilia.indexOf('function addBox('));
const triNonFlat = triCalls.length > 0
  && triCalls.every((line) => line.includes('triplanar(lam(') && !line.includes('flatShading'))
  && !lamSource.includes('flatShading');
const manifest = moduleCacheManifest();
let cachedModules = manifest.modules;
let cacheMutationApplied = true;
if (mutant === 'cache-omitido' || mutant === 'cache-entry-site') {
  const omitted = mutant === 'cache-omitido' ? 'vao.js' : 'site-bg.js';
  const before = cachedModules.length;
  cachedModules = cachedModules.filter((module) => module !== omitted);
  cacheMutationApplied = cachedModules.length === before - 1;
}
if (mutant === 'cache-podado' && !cachedModules.includes('editor/editor.js')) {
  const before = cachedModules.length;
  cachedModules = [...cachedModules, 'editor/editor.js'];
  cacheMutationApplied = cachedModules.length === before + 1;
} else if (mutant === 'cache-podado') {
  cacheMutationApplied = false;
}
let contentRevisionChanged = moduleCacheManifest('public/js', (file) => {
  const content = readFileSync(file);
  return file.endsWith('/vao.js') ? Buffer.concat([content, Buffer.from('\n')]) : content;
}).revision !== manifest.revision;
if (mutant === 'cache-constante') contentRevisionChanged = false;
const reachableModules = new Set();
const visitModule = (module) => {
  if (reachableModules.has(module)) return;
  reachableModules.add(module);
  const source = readFileSync(posix.join('public/js', module), 'utf8');
  const imports = source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.\.?\/[^'"]+\.js)['"]/g);
  for (const match of imports) {
    const dependency = posix.normalize(posix.join(posix.dirname(module), match[1]));
    if (!dependency.startsWith('../')) visitModule(dependency);
  }
};
visitModule('main.js');
const injectedCacheContract = (source) => source.includes('__MANIFESTO_JS__')
  && (source.match(/\?v=\$\{V\}-\$\{JS_REV\}/g) || []).length >= 2;
const buildCacheContract = /const MANIFESTO_JS = moduleCacheManifest\(\)/.test(astroConfig)
  && /__MANIFESTO_JS__:\s*JSON\.stringify\(MANIFESTO_JS\)/.test(astroConfig);
const evalCacheContract = evalServer.includes('moduleCacheManifest')
  && (evalServer.match(/\?v=\$\{V\}-\$\{JS_REV\}/g) || []).length >= 2;
const prunedJsPrefixes = [...new Set([...pruneDist.matchAll(
  /['"](?:dist\/client|\.vercel\/output\/static)\/js\/([^'"]+)['"]/g,
)].map((match) => `${match[1].replace(/\/$/, '')}/`))];
const publishedModulesOnly = prunedJsPrefixes.length > 0
  && cachedModules.every((module) => !prunedJsPrefixes.some((prefix) => module.startsWith(prefix)));
const filesOnDisk = [];
const visitDirectory = (directory = '') => {
  for (const entry of readdirSync(posix.join('public/js', directory), { withFileTypes: true })) {
    const module = posix.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(module);
    else if (entry.isFile() && entry.name.endsWith('.js')) filesOnDisk.push(module);
  }
};
visitDirectory();
const expectedPublishedModules = filesOnDisk
  .filter((module) => !prunedJsPrefixes.some((prefix) => module.startsWith(prefix)))
  .sort();
const publishedGraphComplete = cachedModules.length === expectedPublishedModules.length
  && expectedPublishedModules.every((module, index) => cachedModules[index] === module);
const moduleCache = buildCacheContract
  && injectedCacheContract(indexPage)
  && injectedCacheContract(layoutPage)
  && evalCacheContract
  && [...reachableModules].every((module) => cachedModules.includes(module))
  && publishedModulesOnly
  && publishedGraphComplete
  && cacheMutationApplied
  && contentRevisionChanged;

const checks = [
  ['SB1', fixtureOk && loaderSplitsMetalRough && allFeaturesBudgeted, `todas as primitivas da urna têm features contabilizadas; caso-base usa ${uvVaryings} UVs`],
  ['SB2', urnaRows <= 8, `shader da urna usa ${urnaRows}/8 vetores em WebGL1`],
  ['SB3', litFogUsesBase, 'fog iluminado reutiliza vViewPosition'],
  ['SB4', triUsesBase && !triAddsVarying, 'triplanar reutiliza posição e normal do MeshStandard'],
  ['SB5', fogInstalled && fallbackFogSymmetric, 'quatro chunks de fog e fallback não iluminado são simétricos'],
  ['SB6', triNonFlat, 'triplanar aceita apenas MeshStandard sem flatShading'],
  ['SB7', moduleCache, 'módulos locais mudam de URL junto com o conteúdo'],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [id, ok, description] of checks) {
  console.log(`${ok ? '\x1b[32m✓' : '\x1b[31m✗'} ${id} ${description}\x1b[0m`);
}
const mutantClause = {
  'fog-separado': 'SB2',
  'tri-separado': 'SB4',
  'tri-varying': 'SB4',
  'tri-helper-varying': 'SB4',
  'sem-install': 'SB5',
  'sem-patch': 'SB5',
  'tri-flat': 'SB6',
  'lam-flat': 'SB6',
  'urna-color': 'SB2',
  'urna-clearcoat': 'SB2',
  'urna-anisotropy': 'SB2',
  'urna-instancing': 'SB2',
  'urna-segunda': 'SB2',
  'sombra-extra': 'SB2',
  'sombra-condicional': 'SB2',
  'sombra-pontual': 'SB2',
  'sombra-reativada': 'SB2',
  'spot-map': 'SB2',
  'cache-antigo': 'SB7',
  'cache-omitido': 'SB7',
  'cache-constante': 'SB7',
  'cache-podado': 'SB7',
  'cache-entry-site': 'SB7',
};
if (mutant && !failed.some(([id]) => id === mutantClause[mutant])) {
  failed.push(['MUT', false, `mutação ${mutant} não acendeu ${mutantClause[mutant]}`]);
}
if (failed.length) {
  console.error(`\x1b[31mSHADER-BUDGET ${failed.length} VERMELHA(S)${mutant ? ` (mutante=${mutant})` : ''}\x1b[0m`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mSHADER-BUDGET verde: shaders críticos cabem no WebGL1 mínimo\x1b[0m');
}

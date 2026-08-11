/* WebGL1 precisa caber no piso de oito vetores variáveis da especificação. */
import { readFileSync } from 'node:fs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && !['fog-separado', 'tri-separado'].includes(mutant)) {
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
  brasilia = brasilia.replace(
    'vec3 triP = cameraPosition - ( vec4( vViewPosition, 0.0 ) * viewMatrix ).xyz;\n  vec3 triN = inverseTransformDirection( vNormal, viewMatrix );',
    'varying vec3 vTriP; varying vec3 vTriN;\n  vec3 triP = vTriP;\n  vec3 triN = vTriN;',
  );
  if (brasilia === before) throw new Error('MUTANTE NAO APLICOU: tri-separado');
}

const primitive = urna.meshes?.flatMap((mesh) => mesh.primitives || [])
  .find((item) => item.attributes?.TANGENT !== undefined && item.material !== undefined);
const material = primitive && urna.materials?.[primitive.material];
const pbr = material?.pbrMetallicRoughness || {};
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
const uvVaryings = 6;
const baseVec3Rows = 4;
const shadowRows = 1;
const uvRows = Math.ceil(uvVaryings / 2);
const urnaRows = baseVec3Rows + shadowRows + uvRows + fogRows;

const triAddsVarying = /varying\s+vec3\s+vTri[PN]\b/.test(brasilia);
const triUsesBase = /vec3 triP = cameraPosition - \( vec4\( vViewPosition, 0\.0 \) \* viewMatrix \)\.xyz;/.test(brasilia)
  && /vec3 triN = inverseTransformDirection\( vNormal, viewMatrix \);/.test(brasilia);

const checks = [
  ['SB1', fixtureOk && loaderSplitsMetalRough, 'a urna real mantém tangente e seis usos de UV'],
  ['SB2', urnaRows <= 8, `shader da urna usa ${urnaRows}/8 vetores em WebGL1`],
  ['SB3', litFogUsesBase, 'fog iluminado reutiliza vViewPosition'],
  ['SB4', triUsesBase && !triAddsVarying, 'triplanar reutiliza posição e normal do MeshStandard'],
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

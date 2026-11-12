import { STUDIO_SKELETON_JOINTS } from './data/content-releases.js';

export const STUDIO_SKELETON_COUNTS = new Map(
  STUDIO_SKELETON_JOINTS.map((name) => [name, name.startsWith('Curl_') ? 2 : 1]),
);
export const STUDIO_SKELETON_TOTAL = [...STUDIO_SKELETON_COUNTS.values()].reduce((sum, count) => sum + count, 0);

/* O GLTFLoader torna únicos os nomes de nó repetidos (o 2º Curl_R vira Curl_R_1) e guarda o
   nome original do glTF em userData.name; a contagem usa esse nome. Sem userData (fixture
   sintética, nó criado à mão) vale bone.name. */
const nomeGltf = (bone) => (typeof bone.userData?.name === 'string' ? bone.userData.name : bone.name);

export function studioSkeletonMismatch(bones) {
  const unique = new Set(bones);
  const joints = new Map();
  for (const bone of unique) joints.set(nomeGltf(bone), (joints.get(nomeGltf(bone)) || 0) + 1);
  const missing = [...STUDIO_SKELETON_COUNTS.keys()].filter((name) => !joints.has(name));
  const unexpected = [...joints.keys()].filter((name) => !STUDIO_SKELETON_COUNTS.has(name));
  const wrongCount = [...joints].filter(([name, count]) => STUDIO_SKELETON_COUNTS.get(name) !== count);
  const invalid = missing.length || unexpected.length || wrongCount.length || bones.length !== STUDIO_SKELETON_TOTAL;
  const detail = [
    missing.length ? `sem ${missing.join(',')}` : '',
    unexpected.length ? `inesperadas ${unexpected.join(',')}` : '',
    wrongCount.length ? `multiplicidade inválida ${wrongCount.map(([name, count]) => `${name}=${count}`).join(',')}` : '',
    bones.length !== STUDIO_SKELETON_TOTAL ? `total ${bones.length} (esperado ${STUDIO_SKELETON_TOTAL})` : '',
  ].filter(Boolean).join('; ');
  return invalid ? detail : null;
}

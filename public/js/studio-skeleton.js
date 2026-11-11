import { STUDIO_SKELETON_JOINTS } from './data/content-releases.js';

export const STUDIO_SKELETON_COUNTS = new Map(
  STUDIO_SKELETON_JOINTS.map((name) => [name, name.startsWith('Curl_') ? 2 : 1]),
);
export const STUDIO_SKELETON_TOTAL = [...STUDIO_SKELETON_COUNTS.values()].reduce((sum, count) => sum + count, 0);

/* `nomeDe` devolve o nome da junta no glTF. O GLTFLoader torna nomes de nó únicos
   (createUniqueName: o segundo `Curl_R` vira `Curl_R_1`), então contar `bone.name` depois
   do load reprovava todo pack meshy-28, cujos Curl_R/Curl_L vêm em dobro por contrato. */
export function studioSkeletonMismatch(bones, nomeDe = (bone) => bone.name) {
  const unique = new Set(bones);
  const joints = new Map();
  for (const bone of unique) { const name = nomeDe(bone); joints.set(name, (joints.get(name) || 0) + 1); }
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

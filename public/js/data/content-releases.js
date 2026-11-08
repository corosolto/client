/* Releases imutáveis de personagem do Studio, fixadas pelo SHA-256 do manifest.json. Não põem
   ninguém no elenco; trocar ou reverter release é mudar o pin. Contrato: docs/studio-character-release.md. */

// Os 11 estados do runtime 3P (STATES + OPT_STATES de glbchars.js): todos obrigatórios no pacote.
export const STUDIO_CHARACTER_STATES = Object.freeze([
  'idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire',
]);

// Único esqueleto aceito (lista autoritativa: corosolto/studio tools/lib/character-pack.mjs).
export const STUDIO_CHARACTER_SKELETON = 'meshy-28';
// Os 26 nomes distintos das 28 juntas (Curl_R/Curl_L repetem); o adaptador exige todos no modelo.
export const STUDIO_SKELETON_JOINTS = Object.freeze([
  'Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot',
  'RightToeBase', 'Spine02', 'Spine01', 'Spine', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'neck', 'Head', 'head_end', 'headfront',
  'Curl_R', 'Curl_L',
]);

export const CHARACTER_RELEASES = Object.freeze({
  'capitao-caveira': Object.freeze({
    kind: 'character',
    id: 'capitao-caveira',
    version: '0.1.1',
    manifestSha256: 'ea613a3a7fee31b22b8121fa212c7331a67fbc2ac565e06b24160d897355e523',
    manifestUrl: '/packs/character/capitao-caveira/0.1.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
});

export const characterRelease = (id) =>
  (typeof id === 'string' && Object.hasOwn(CHARACTER_RELEASES, id) ? CHARACTER_RELEASES[id] : null);

/* RELEASES FIXADAS DE CONTEÚDO DO STUDIO (personagens).
   ----------------------------------------------------------------------------
   Cada entrada fixa UMA release imutável de um pacote do Studio pelo SHA-256 dos
   bytes exatos do manifest.json. O runtime (studio-character.js) baixa o manifesto,
   confere o hash ANTES de interpretar o JSON e só então confere cada arquivo por
   tamanho e SHA-256. Nada aqui é "a versão mais recente": trocar de release é
   trocar o pin neste arquivo, num PR revisável, e o rollback é reverter o pin.

   Contrato do pacote: corosolto/studio docs/character-pack.md (kind "character").
   Integração no cliente: docs/studio-character-release.md.

   Entrar aqui NÃO coloca o personagem no elenco (characters.js), no backend nem nas
   mídias do hub: este registro só torna o corpo carregável a partir do pacote
   verificado (glbchars.js). A promoção ao elenco é um PR separado. */

/* Os 11 estados que o runtime de 3ª pessoa consome (STATES + OPT_STATES de
   glbchars.js). Para um personagem do Studio todos são obrigatórios: sem clipe
   compartilhado nem índice de fallback. */
export const STUDIO_CHARACTER_STATES = Object.freeze([
  'idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire',
]);

/* Único esqueleto aceito: o meshy-28 do doador mst.glb (lista autoritativa em
   corosolto/studio tools/lib/character-pack.mjs). */
export const STUDIO_CHARACTER_SKELETON = 'meshy-28';
/* Os 26 nomes distintos das 28 juntas do meshy-28 (Curl_R/Curl_L aparecem duas vezes).
   O adaptador (glbchars.js) exige todos no esqueleto do modelo carregado: o manifesto
   declarar "meshy-28" não basta. */
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
    version: '0.1.0',
    manifestSha256: '7f8e149a28a41f14df203f9a229c07b460424a082688a210176dc31635a7852e',
    manifestUrl: '/packs/character/capitao-caveira/0.1.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
});

export const characterRelease = (id) =>
  (typeof id === 'string' && Object.hasOwn(CHARACTER_RELEASES, id) ? CHARACTER_RELEASES[id] : null);

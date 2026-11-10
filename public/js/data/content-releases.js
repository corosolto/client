/* Releases imutáveis de personagem do Studio, fixadas pelo SHA-256 do manifest.json. Não põem
   ninguém no elenco; trocar ou reverter release é mudar o pin. Contrato: docs/studio-character-release.md. */

// Os 11 estados do runtime 3P (STATES + OPT_STATES de glbchars.js): todos obrigatórios no pacote.
export const STUDIO_CHARACTER_STATES = Object.freeze([
  'idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire',
]);

// Clipes extras opcionais do pacote (animations.extra do Studio): nomes fixos do vocabulário
// ou prefixo emote_ com pelo menos um sufixo. Autoritativo: corosolto/studio tools/lib/character-pack.mjs
// (68 nomes: coreExtraClipNames + converterExtraClipNames — os 45 últimos espelham a biblioteca de
// conversão de animações, feat/animation-conversion-20261109, na mesma ordem ordenada do Studio).
export const STUDIO_EXTRA_CLIPS = Object.freeze([
  // Núcleo do contrato (locomoção cardinal, armas, dano, melee, resultado de rodada).
  'strafe_left', 'strafe_right', 'walk_back', 'run_back',
  'strafe_left_pistol', 'strafe_right_pistol', 'walk_back_pistol',
  'reload_rifle', 'reload_pistol', 'draw_rifle', 'holster_rifle', 'draw_pistol', 'holster_pistol',
  'hit_front', 'hit_back', 'hit_left', 'hit_right', 'hit_head',
  'grenade_throw', 'knife_idle', 'knife_stab', 'victory', 'defeat',
  // Nomes propostos pela biblioteca de conversão (diagonais <gait>_<fwd|back>_<left|right>,
  // sprint, agachado, viradas, fases do salto, mortes por direção etc.), em ordem alfabética.
  'crouch_aim', 'crouch_pistol', 'crouch_turn_left', 'crouch_turn_right',
  'crouchwalk_back', 'crouchwalk_back_left', 'crouchwalk_back_right',
  'crouchwalk_fwd_left', 'crouchwalk_fwd_right', 'crouchwalk_left', 'crouchwalk_right',
  'death_crouch', 'death_front', 'death_headshot_back', 'death_headshot_front', 'death_right',
  'idle_aim', 'jump_land', 'jump_loop', 'jump_pistol', 'jump_start',
  'run_back_left', 'run_back_pistol', 'run_back_right', 'run_fwd_left', 'run_fwd_right',
  'run_left', 'run_pistol', 'run_right',
  'shoot_crouch', 'shoot_pistol', 'sprint', 'sprint_back', 'sprint_back_left', 'sprint_back_right',
  'sprint_fwd_left', 'sprint_fwd_right', 'sprint_left', 'sprint_right',
  'turn_left', 'turn_right',
  'walk_back_left', 'walk_back_right', 'walk_fwd_left', 'walk_fwd_right',
]);
export const STUDIO_EXTRA_CLIP_PREFIXES = Object.freeze(['emote_']);
export const isStudioExtraClipName = (name) =>
  STUDIO_EXTRA_CLIPS.includes(name)
  || STUDIO_EXTRA_CLIP_PREFIXES.some((prefixo) => name.length > prefixo.length && name.startsWith(prefixo));

// Família do clipe (contrato v3): espelho de clipFamily do Studio (tools/lib/character-pack.mjs),
// que por sua vez espelha packFamily do conversor. 'states' para os 11 estados; emote_ → 'emote'
// (o conversor chama o pack de 'emotes'); victory|defeat|death_* → 'ceremony';
// reload_|draw_|holster_|hit_|grenade_|knife_|shoot_ → 'combat'; o resto é 'loco'.
export const STUDIO_CLIP_FAMILIES = Object.freeze(['loco', 'combat', 'ceremony', 'emote']);
export const studioClipFamily = (name) => {
  if (STUDIO_CHARACTER_STATES.includes(name)) return 'states';
  if (name.startsWith('emote_')) return 'emote';
  if (/^(victory|defeat|death_)/.test(name)) return 'ceremony';
  if (/^(reload_|draw_|holster_|hit_|grenade_|knife_|shoot_)/.test(name)) return 'combat';
  return 'loco';
};

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
    version: '0.2.0',
    manifestSha256: '8cfc9dc1964451c7fba6d8b3834e0bd8f3f9313ba3ba3b0ba04b8c9186a891db',
    manifestUrl: '/packs/character/capitao-caveira/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  /* Elenco Fora do Ar (passe Sessão da Treta): todos em 0.2.0, SHA do manifest.json instalado. */
  'teletreco-sinal-fraco': Object.freeze({
    kind: 'character',
    id: 'teletreco-sinal-fraco',
    version: '0.2.0',
    manifestSha256: 'd0f4e6d79d9933bb5b109c1ae9838652e777f4ad3d0b01174d367e294802a288',
    manifestUrl: '/packs/character/teletreco-sinal-fraco/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bebe-reborn': Object.freeze({
    kind: 'character',
    id: 'bebe-reborn',
    version: '0.2.0',
    manifestSha256: '9372fa1d9a0b9ec436d30a16743ed49b7071977509794075c59b804160378c25',
    manifestUrl: '/packs/character/bebe-reborn/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'chupa-cabra': Object.freeze({
    kind: 'character',
    id: 'chupa-cabra',
    version: '0.2.0',
    manifestSha256: 'd9cd49a5cbf721f94d51ef481b7bb1f0a37b7c0abf63199f354d5e9311438f05',
    manifestUrl: '/packs/character/chupa-cabra/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-antenao': Object.freeze({
    kind: 'character',
    id: 'teletreco-antenao',
    version: '0.2.0',
    manifestSha256: 'e8ada810d3163ba357c10bb01beffdfaadf8fea4a7ec1ba2e9e5825714cb5752',
    manifestUrl: '/packs/character/teletreco-antenao/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'assombracao-lanhouse': Object.freeze({
    kind: 'character',
    id: 'assombracao-lanhouse',
    version: '0.2.0',
    manifestSha256: '30bbf1fbb9bc2f9db3fe1689bb4c292442f32ed05adcb87713a46e99238fec67',
    manifestUrl: '/packs/character/assombracao-lanhouse/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'dracula': Object.freeze({
    kind: 'character',
    id: 'dracula',
    version: '0.2.0',
    manifestSha256: 'ad29198f9d0caac859cdb557ce8d4921d490bf65fce12fa117909f7998598261',
    manifestUrl: '/packs/character/dracula/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'boneca-da-cristaleira': Object.freeze({
    kind: 'character',
    id: 'boneca-da-cristaleira',
    version: '0.2.0',
    manifestSha256: '67c94f70037a23b664fdf6a77a4c46ea0b12605f234039b85a0b7fc9fd70d1c6',
    manifestUrl: '/packs/character/boneca-da-cristaleira/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'satanista-talkshow': Object.freeze({
    kind: 'character',
    id: 'satanista-talkshow',
    version: '0.2.0',
    manifestSha256: '74ea766287766c7a6a96396ea172c7701d1ec23a1729c57cee9a1c9f24311bc0',
    manifestUrl: '/packs/character/satanista-talkshow/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'clovis-fora-do-ar': Object.freeze({
    kind: 'character',
    id: 'clovis-fora-do-ar',
    version: '0.2.0',
    manifestSha256: 'd04747a8fc81edda818abe05a0a2dcdd532e4035213aa7ddd15d6f97c3fabd7b',
    manifestUrl: '/packs/character/clovis-fora-do-ar/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-chiadinho': Object.freeze({
    kind: 'character',
    id: 'teletreco-chiadinho',
    version: '0.2.0',
    manifestSha256: '4dc938616fcf2c12749b00f77a7aeb7c6a3f27ca4163daba40b855f5ef431d24',
    manifestUrl: '/packs/character/teletreco-chiadinho/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bicho-do-bueiro': Object.freeze({
    kind: 'character',
    id: 'bicho-do-bueiro',
    version: '0.2.0',
    manifestSha256: '18ea853b1e1b01b0700fc37e4dc07f4ed4322ab09db72a99538d81e590bf969f',
    manifestUrl: '/packs/character/bicho-do-bueiro/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'coronel-arrego': Object.freeze({
    kind: 'character',
    id: 'coronel-arrego',
    version: '0.2.0',
    manifestSha256: '05711b9e0f70f059bd83e24c7f6c62edf39d406564e2d0f9dce9e4fead7deecd',
    manifestUrl: '/packs/character/coronel-arrego/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'sorridente-onibus': Object.freeze({
    kind: 'character',
    id: 'sorridente-onibus',
    version: '0.2.0',
    manifestSha256: '1c50c68ba612b8e17e17dafba351a0b3940fc74dd60bda6eddd061f670c1c862',
    manifestUrl: '/packs/character/sorridente-onibus/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bebezao-de-feira': Object.freeze({
    kind: 'character',
    id: 'bebezao-de-feira',
    version: '0.2.0',
    manifestSha256: 'ca46d70cfb20f21623d89b88a30ebac1b39ccb64e54b0645991a7c2a9cb734f1',
    manifestUrl: '/packs/character/bebezao-de-feira/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'boneco-falante-87': Object.freeze({
    kind: 'character',
    id: 'boneco-falante-87',
    version: '0.2.0',
    manifestSha256: 'bf04e24c9b697d95181ff489155ae2c9d46d2a217b692b2fa4da48c93d8caeb9',
    manifestUrl: '/packs/character/boneco-falante-87/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'padre-parapsicologo': Object.freeze({
    kind: 'character',
    id: 'padre-parapsicologo',
    version: '0.2.0',
    manifestSha256: '1bc49b6e94bf1dabc8cbef87f0b09e121908cbaaaf954126524a12ef4a7cc0d8',
    manifestUrl: '/packs/character/padre-parapsicologo/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'muro-de-caco': Object.freeze({
    kind: 'character',
    id: 'muro-de-caco',
    version: '0.2.0',
    manifestSha256: 'd5d01a70b3184ad6efea742f5be2b9db9bf11551e2511163b3282c162f3c0892',
    manifestUrl: '/packs/character/muro-de-caco/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-fora-do-ar': Object.freeze({
    kind: 'character',
    id: 'teletreco-fora-do-ar',
    version: '0.2.0',
    manifestSha256: '35589f378543c7b5ffac629a83774451665592a53fea70d12ab15cfd6a56e206',
    manifestUrl: '/packs/character/teletreco-fora-do-ar/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'coelho-pascoa-shopping': Object.freeze({
    kind: 'character',
    id: 'coelho-pascoa-shopping',
    version: '0.2.0',
    manifestSha256: '2e1d8ed87a5f5f0646ee88b7d0cdd62c41dce51180c1763d0109e34ead7b190f',
    manifestUrl: '/packs/character/coelho-pascoa-shopping/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'pm-arrego': Object.freeze({
    kind: 'character',
    id: 'pm-arrego',
    version: '0.2.0',
    manifestSha256: '842b667b46da9ebf07a92814e2e6423213bebf160720e95e5e29129446a1c1ec',
    manifestUrl: '/packs/character/pm-arrego/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'nanica': Object.freeze({
    kind: 'character',
    id: 'nanica',
    version: '0.2.0',
    manifestSha256: 'f5e2df01bcb4831e2521bba99701d11ca1b14f3c2f07470602211e566aaaaef6',
    manifestUrl: '/packs/character/nanica/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'roqueiro-mistico-70': Object.freeze({
    kind: 'character',
    id: 'roqueiro-mistico-70',
    version: '0.2.0',
    manifestSha256: '518cfaa3b780a53d8a7b9e375d305c741386ebcb79d222369827d96dca3446bb',
    manifestUrl: '/packs/character/roqueiro-mistico-70/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'profeta-auditorio': Object.freeze({
    kind: 'character',
    id: 'profeta-auditorio',
    version: '0.2.0',
    manifestSha256: '66faaf744d27ad9fe8b1013777a7639eb5a36aa97577c3827aecfa5addb4e186',
    manifestUrl: '/packs/character/profeta-auditorio/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bicheiro-barracao': Object.freeze({
    kind: 'character',
    id: 'bicheiro-barracao',
    version: '0.2.0',
    manifestSha256: 'ec4db5c4f57486965694b1e1cf7da0c9c6ff7d9e0719d6928f11b23c9dbed46c',
    manifestUrl: '/packs/character/bicheiro-barracao/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'prata': Object.freeze({
    kind: 'character',
    id: 'prata',
    version: '0.2.0',
    manifestSha256: 'a8de2c03c5ba7e294fac45cdba0ab569150b1605f7992c45b8bcf25a5a747a05',
    manifestUrl: '/packs/character/prata/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'dom-pedro-i': Object.freeze({
    kind: 'character',
    id: 'dom-pedro-i',
    version: '0.2.0',
    manifestSha256: '31a24f91bd09b145ee73447346b6a812d30b516fbeecb7c6723418626823f5c7',
    manifestUrl: '/packs/character/dom-pedro-i/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'tiradentes': Object.freeze({
    kind: 'character',
    id: 'tiradentes',
    version: '0.2.0',
    manifestSha256: 'a7890f436e8163fbb3f56f17aa3899bf882ed4365e9420d132de1bd785a72ca4',
    manifestUrl: '/packs/character/tiradentes/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'corisco': Object.freeze({
    kind: 'character',
    id: 'corisco',
    version: '0.2.0',
    manifestSha256: '061c3822aa6e77b613021e95a74813c502df7563cfa1ca9f9805e0ecd43cde91',
    manifestUrl: '/packs/character/corisco/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'vlad': Object.freeze({
    kind: 'character',
    id: 'vlad',
    version: '0.2.0',
    manifestSha256: '020d49dbc6e4e3c092059a97c747e742f09f0b123391aa43bba3eedb5713a973',
    manifestUrl: '/packs/character/vlad/0.2.0/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
});

export const characterRelease = (id) =>
  (typeof id === 'string' && Object.hasOwn(CHARACTER_RELEASES, id) ? CHARACTER_RELEASES[id] : null);

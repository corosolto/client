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
  /* Elenco Fora do Ar (passe Sessão da Treta): 19 em 0.2.1 (estados corrigidos; coelho com rig novo)
     e 11 em 0.2.0, SHA do manifest.json instalado. */
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
    version: '0.2.1',
    manifestSha256: '6f76cf2bf23a7aa3d02cefd75c721400acc97ce66300e864b6bc6e5ece0d5c13',
    manifestUrl: '/packs/character/bebe-reborn/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'chupa-cabra': Object.freeze({
    kind: 'character',
    id: 'chupa-cabra',
    version: '0.2.1',
    manifestSha256: 'baf74d1a78be7f6ee069892ad42f0fca3368a2e93b064477bdeb953361080afc',
    manifestUrl: '/packs/character/chupa-cabra/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-antenao': Object.freeze({
    kind: 'character',
    id: 'teletreco-antenao',
    version: '0.2.1',
    manifestSha256: 'f299fc3118721aa181486ad1e5435ecd7a88750ca448f58582d693f4f825b421',
    manifestUrl: '/packs/character/teletreco-antenao/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'assombracao-lanhouse': Object.freeze({
    kind: 'character',
    id: 'assombracao-lanhouse',
    version: '0.2.1',
    manifestSha256: '6c5bc00f19f13d2fe97d52dff6f9e32047d29cf134e13d103b2e3204bb6c38d6',
    manifestUrl: '/packs/character/assombracao-lanhouse/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'dracula': Object.freeze({
    kind: 'character',
    id: 'dracula',
    version: '0.2.1',
    manifestSha256: '0853eb8ec34d37c8b9da3f4b7c73d949e1110b30531756e81e26d1acab727932',
    manifestUrl: '/packs/character/dracula/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'boneca-da-cristaleira': Object.freeze({
    kind: 'character',
    id: 'boneca-da-cristaleira',
    version: '0.2.2',
    manifestSha256: 'f22f4f1b1541800d69c6b22fe018c454dfc6fa15270c36380f0ed041b879dcd8',
    manifestUrl: '/packs/character/boneca-da-cristaleira/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: 'c2a709c09e24234fc9c7067f1ebf4907b1fde0a02dc19aa11b59c92aefaac2a6',
    manifestUrl: '/packs/character/clovis-fora-do-ar/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-chiadinho': Object.freeze({
    kind: 'character',
    id: 'teletreco-chiadinho',
    version: '0.2.1',
    manifestSha256: 'acb1172e1daa7694f1e5c09b97d3083d5782a59153cd945c912e16ce1b1585f9',
    manifestUrl: '/packs/character/teletreco-chiadinho/0.2.1/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '83b8fef61a417fad38d11aa4a111141bce35be46ba6d43e83fc443e46d32dbf9',
    manifestUrl: '/packs/character/coronel-arrego/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'sorridente-onibus': Object.freeze({
    kind: 'character',
    id: 'sorridente-onibus',
    version: '0.2.1',
    manifestSha256: '063a26b7d8ae59b2795c1527bf9030309dd5f3c3a759f50f8c03cd6e1ee7b453',
    manifestUrl: '/packs/character/sorridente-onibus/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bebezao-de-feira': Object.freeze({
    kind: 'character',
    id: 'bebezao-de-feira',
    version: '0.2.2',
    manifestSha256: '2c92b27f555c3005542195e3b749b3707a407bb75da07e41980b6aaa15e12b87',
    manifestUrl: '/packs/character/bebezao-de-feira/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'boneco-falante-87': Object.freeze({
    kind: 'character',
    id: 'boneco-falante-87',
    version: '0.2.1',
    manifestSha256: '4cb3b661087d96236165280b48fad8e695d8e14218f481f2770ccbc5cf5bb245',
    manifestUrl: '/packs/character/boneco-falante-87/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'padre-parapsicologo': Object.freeze({
    kind: 'character',
    id: 'padre-parapsicologo',
    version: '0.2.1',
    manifestSha256: 'd12efa79026cfea122f6b25bd3c4e95c5b639756af730d8232b81ac04297f78a',
    manifestUrl: '/packs/character/padre-parapsicologo/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'muro-de-caco': Object.freeze({
    kind: 'character',
    id: 'muro-de-caco',
    version: '0.2.1',
    manifestSha256: '96a56379d3f377caaeccb5a60362328784d29efc53478af49fae2e79111cdfed',
    manifestUrl: '/packs/character/muro-de-caco/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'teletreco-fora-do-ar': Object.freeze({
    kind: 'character',
    id: 'teletreco-fora-do-ar',
    version: '0.2.1',
    manifestSha256: 'bc166b0dbc56da505ffd1522b95765a8bf59292946e7ef5638b55cf1e55785c7',
    manifestUrl: '/packs/character/teletreco-fora-do-ar/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'coelho-pascoa-shopping': Object.freeze({
    kind: 'character',
    id: 'coelho-pascoa-shopping',
    version: '0.2.1',
    manifestSha256: 'e3da61cf5c160eff840d0202392022e405c6982eb16ea95b59e2aa35d860f53b',
    manifestUrl: '/packs/character/coelho-pascoa-shopping/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'pm-arrego': Object.freeze({
    kind: 'character',
    id: 'pm-arrego',
    version: '0.2.1',
    manifestSha256: '84026cb5e4adcfc7c953cdc873d685072b41fde18f7b9eb31a94b2f55ff5c594',
    manifestUrl: '/packs/character/pm-arrego/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'nanica': Object.freeze({
    kind: 'character',
    id: 'nanica',
    version: '0.2.1',
    manifestSha256: 'e3d9de4642d17d1cb16bb3999f0cf79e19c5ddf466f21a0369fad6bf1f74bca9',
    manifestUrl: '/packs/character/nanica/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'roqueiro-mistico-70': Object.freeze({
    kind: 'character',
    id: 'roqueiro-mistico-70',
    version: '0.2.1',
    manifestSha256: '0ab155a459d5ada1b34f0f2646826a298de05a71a3b01f04cd8e3c567f52362a',
    manifestUrl: '/packs/character/roqueiro-mistico-70/0.2.1/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'profeta-auditorio': Object.freeze({
    kind: 'character',
    id: 'profeta-auditorio',
    version: '0.2.1',
    manifestSha256: 'a70181139e3b300ac2b3817b333b940725937442f234c6d32d237bc09807c9ae',
    manifestUrl: '/packs/character/profeta-auditorio/0.2.1/manifest.json',
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

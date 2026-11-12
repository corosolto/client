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
    version: '0.2.2',
    manifestSha256: '0f58df6316047dfd8d952a13c1b4db9b58a3fc4954f8b6a67561bb676d876edb',
    manifestUrl: '/packs/character/capitao-caveira/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: 'ca7533e9e385389b309817c8131b38be2e69940ff84aada4d2d6896fe0d6fcee',
    manifestUrl: '/packs/character/chupa-cabra/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '9f1430d40c47f3b5f7f12fcd656713b98eaaf0d1b181ed479cfa7f7413f77034',
    manifestUrl: '/packs/character/assombracao-lanhouse/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'dracula': Object.freeze({
    kind: 'character',
    id: 'dracula',
    version: '0.2.2',
    manifestSha256: '9ac89e9dc0e8a999496271418d36cd7f2a3380fd43245beba52d787bd87ecb31',
    manifestUrl: '/packs/character/dracula/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: 'ba7cbc049edf85761d6835c392f58ea86e277cb8c5103fa3a7a6d4bc79cd0e48',
    manifestUrl: '/packs/character/satanista-talkshow/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '0485acdc0bec14203bdc2c0af50c9fdb5ae12ff04ae543a93850470ac6a190f6',
    manifestUrl: '/packs/character/teletreco-chiadinho/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'bicho-do-bueiro': Object.freeze({
    kind: 'character',
    id: 'bicho-do-bueiro',
    version: '0.2.2',
    manifestSha256: 'e7d0b4e04a4fc6e7f305c4a3be6ee1e944c2213185977b710b7165daf196afae',
    manifestUrl: '/packs/character/bicho-do-bueiro/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '3d87628a94bdb28d64f456e165f3648ead40faf488b5e0b3622ab59b04016c97',
    manifestUrl: '/packs/character/sorridente-onibus/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '4b4469d1b7ac82274066b7bd4eeb9bef4afb6e905af0cfe97648971aa5f146c7',
    manifestUrl: '/packs/character/padre-parapsicologo/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: 'ecc4605a4ee01df1ed7a8577d23f0503ba6217244085c38412d613a9f628c6e1',
    manifestUrl: '/packs/character/coelho-pascoa-shopping/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '0aa7073f20cd6db05180a36783c50326edaa9d002d43381169ccef05bccd0a06',
    manifestUrl: '/packs/character/nanica/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'roqueiro-mistico-70': Object.freeze({
    kind: 'character',
    id: 'roqueiro-mistico-70',
    version: '0.2.2',
    manifestSha256: '04d55d0d6cf5ae485329907c05509f57307e1679aaf4e691f3e601c29a603084',
    manifestUrl: '/packs/character/roqueiro-mistico-70/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'profeta-auditorio': Object.freeze({
    kind: 'character',
    id: 'profeta-auditorio',
    version: '0.2.2',
    manifestSha256: 'e264b2fe396daaa543df1d7b3da1fd3c7a3d51a0d49231bdb1dc98796d29e7ac',
    manifestUrl: '/packs/character/profeta-auditorio/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: 'ffc21d81d943aed8ef557e348c199338b1d5ff955fb9324201c854f2062a4b23',
    manifestUrl: '/packs/character/prata/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
  'dom-pedro-i': Object.freeze({
    kind: 'character',
    id: 'dom-pedro-i',
    version: '0.2.2',
    manifestSha256: 'c82a45a1a77b52d703d5e78dcf099adee6726df04741517fd71a458d59e98aaf',
    manifestUrl: '/packs/character/dom-pedro-i/0.2.2/manifest.json',
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
    version: '0.2.2',
    manifestSha256: '35556ec1c9daf8175fec6d12f931fed24bd0ef8a89b08addf5e419d4ad4e082a',
    manifestUrl: '/packs/character/vlad/0.2.2/manifest.json',
    minRuntime: '2.1.0-alpha.138',
    skeleton: STUDIO_CHARACTER_SKELETON,
  }),
});

export const characterRelease = (id) =>
  (typeof id === 'string' && Object.hasOwn(CHARACTER_RELEASES, id) ? CHARACTER_RELEASES[id] : null);

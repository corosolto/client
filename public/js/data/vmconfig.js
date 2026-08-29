// Tabela pura do viewmodel autorado (BUG-75): famílias KINEMATION + as 26 armas.
// `ready` é o portão de rollout — false = a arma continua no caminho legado.

// Por família: mount (socket→gun-space, +Z=cano, autorado no editor), equip
// (par General rifle|pistol), camShake (preset do recoil.json), reloadStyle.
export const VM_FAMILY = {
  // Resíduo transversal da rodada 3 do crítico (arma↔mão). A inclinação CS do
  // PACOTE inteiro vive no FAMILY_FRAME do authoredvm, não aqui.
  ak:       { ready: false, mount: { pos: [-0.02, -0.03, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag' },
  ar:       { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag' },
  mp5:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag' },
  smg:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag' },
  p90:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag' },
  g3:       { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag' },
  marksman: { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag' },
  svd:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag' },
  sniper:   { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'mag' },
  bolt:     { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'bolt_loop' },
  deagle:   { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'mag' },
  pistol:   { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol', reloadStyle: 'mag' },
  revolver: { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'cylinder' },
  shotgun:  { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Shotgun', reloadStyle: 'pump_loop' },
  lmg:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag' },
  // A granada já funcionava antes deste conserto (bind no hand_r, sem o bug do
  // socket) — nasce ready para não regredir o arremesso que o jogo usa hoje.
  grenade:  { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Pistol', reloadStyle: 'mag' },
};

// Por arma (faca fica no melee): trim = ajuste fino do wrap Mint no socket;
// ads = auto (alça medida) + resíduo; parts = Tier 2 (carregador/ferrolho móveis).
const W = (family, extra = {}) => ({
  family,
  trim: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 },
  ads: { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 },
  recoilScale: 1,
  parts: null,
  eject: null,
  ...extra,
});

export const VM_WEAPON = {
  awp: W('sniper'),
  // Tier 2: caixa do carregador MEDIDA (bloco MAG de weapons.js, gun-space em
  // metros) reparentada ao bone Mag do pack — o pente sai na mão na recarga.
  ak: W('ak', { parts: { mag: { box: { min: [-0.0165, -0.133, 0.015], max: [0.0165, 0.015, 0.191] }, bone: 'Mag' } } }),
  m4: W('ar'),
  mp5: W('mp5'),
  shotgun: W('shotgun'),
  // O pack autora a Deagle com 23–27° de pitch (hand cannon); no nosso mount o
  // teto de leitura é 12° (RS1) — a escala doma sem perder a assinatura.
  deagle: W('deagle', { recoilScale: 0.45 }),
  pistol: W('pistol'),
  m92: W('ak'),
  akm: W('ak', { parts: { mag: { box: { min: [-0.0145, -0.132, 0.015], max: [0.0145, 0.018, 0.184] }, bone: 'Mag' } } }),
  g3: W('g3'),
  revolver38: W('revolver'),
  md97: W('ar'),
  carbine: W('ar'),
  m400: W('sniper'),
  mosin: W('bolt'),
  rem700: W('sniper'),
  lmg: W('lmg'),
  scar: W('ar'),
  tavor: W('ar'),
  famas: W('ar'),
  uzi: W('smg'),
  p90: W('p90'),
  svd: W('svd'),
  g3sg1: W('marksman'),
  sks: W('marksman'),
};

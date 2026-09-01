// Tabela pura do viewmodel autorado (BUG-75): famílias KINEMATION + as 26 armas.
// `ready` é o portão de rollout — false = a arma continua no caminho legado.

// Por família: mount (socket→gun-space, +Z=cano, autorado no editor), equip
// (par General rifle|pistol), camShake (preset do recoil.json), reloadStyle.
export const VM_FAMILY = {
  // mount/trim = resíduo arma↔mão; inclinação do PACOTE vive no FAMILY_FRAME.
  // cs16 = máquina de 6 estados dos QC (cadências: tools/viewmodels/cs16-timings.json).
  ak:       { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.432, shoot: 0.8 } },
  ar:       { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 3.054, shoot: 1.5 } },
  mp5:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 0.857, reload: 2.632, shoot: 0.667 } },
  smg:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 0.909, reload: 3.143, shoot: 0.926 } },
  p90:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 3.375, shoot: 0.467 } },
  // g3/marksman/svd: doador COMPARTILHADO v_g3sg1 (não existem no CS 1.6).
  g3:       { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  marksman: { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  svd:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  sniper:   { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.9, shoot: 1.171 } },
  bolt:     { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'bolt_loop', cs16: { draw: 1.0, reload: 2.0, shoot: 1.286 } },
  deagle:   { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.167, shoot: 0.575 } },
  pistol:   { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.703, shoot: 1.0 } },
  revolver: { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'cylinder' },
  shotgun:  { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Shotgun', reloadStyle: 'pump_loop', cs16: { draw: 1.0, shoot: 1.156 } },
  // belt: a M249 alimenta por cinto/caixa — não há pente destacável para a mão
  // buscar, e cobrar um da régua seria cobrar mentira.
  lmg:      { ready: false, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'belt', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
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
  awp: W('sniper', { trim: { pos: [0, 0, 0], rotDeg: [0, 15, 0], scale: 1 } }),
  // baked: GLB assado OFFLINE com a Mint dentro (pente separado, sockets
  // nomeados) — o runtime só toca clipes. Caixa MAG: régua eval:cs16.
  ak: W('ak', { baked: true, golden: true, parts: { mag: { box: { min: [-0.022, -0.145, 0.005], max: [0.022, 0.02, 0.2] }, bone: 'Mag' } } }),
  m4: W('ar'),
  mp5: W('mp5'),
  shotgun: W('shotgun'),
  // O pack autora a Deagle com 23–27° de pitch (hand cannon); no nosso mount o
  // teto de leitura é 12° (RS1) — a escala doma sem perder a assinatura.
  deagle: W('deagle', { recoilScale: 0.45, trim: { pos: [0, 0, 0], rotDeg: [14, 0, 0], scale: 1 } }),
  pistol: W('pistol', { baked: true, runtime: 'family', timing: 'gameplay' }),
  m92: W('ak'),
  revolver38: W('revolver'),
  // Recuo de viewmodel abaixo de 4% da própria arma não se lê (P7 do gauntlet):
  // as duas armas mais leves do REC_DEG precisam de amplitude no mount.
  md97: W('ar', { recoilScale: 1.8 }),
  carbine: W('ar'),
  mosin: W('bolt'),
  lmg: W('lmg'),
  scar: W('ar'),
  famas: W('ar'),
  uzi: W('smg'),
  p90: W('p90', { recoilScale: 1.6 }),
  svd: W('svd'),
  sks: W('marksman'),
};

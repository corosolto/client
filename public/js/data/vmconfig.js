// Tabela pura do viewmodel autorado (BUG-75): famílias KINEMATION + as 26 armas.
// `ready` é portão por arma; produção só liga com VM_LAUNCH e todas prontas (vmlaunch.js).

// Chave de lançamento. Só o dono vira: com qualquer arma fora de `ready`, a
// régua reprova e o runtime continua 100% no legado (fparms).
export const VM_LAUNCH = false;

// A faca não tem família de fogo: o portão dela mora aqui (meleevm.js). `true`
// preserva o veredito do dono registrado no #618 (faca, pistola e AK).
export const VM_MELEE = {
  knife: { ready: true },
};

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
// ads = auto (alça medida) + resíduo; linhaDeMira = abertura da alça e topo da massa (nó + ponto
// local) quando o socket `sight` não está nela; parts = Tier 2 (carregador/ferrolho móveis).
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
  // Produto K (KINEMATION, 67 juntas) assado por arma no catálogo privado:
  // <família>/<arma>-baked-runtime.glb; `runtime:'family'` usa <família>/<família>-runtime.glb.
  awp: W('sniper', { baked: true, frame: 'family' }),
  // AK: único golden público até o rebuild em K (VM-LAUNCH-K-STATUS.md).
  // Caixa MAG: régua eval:cs16.
  ak: W('ak', { baked: true, golden: true, parts: { mag: { box: { min: [-0.022, -0.145, 0.005], max: [0.022, 0.02, 0.2] }, bone: 'Mag' } } }),
  // `frame` aceita override manual; a medida gerada por arma vive em `vmframe.js`.
  // Evidência: docs/reports/VIEWMODEL-ENQUADRAMENTO-ESCALA-2026-09-18.md.
  m4: W('ar', { baked: true }),
  mp5: W('mp5', { baked: true, runtime: 'family', timing: 'gameplay',
    ads: { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  // KSG girada no produto (shotgun-k-fix.mjs): pacote 5× recua ao tamanho da AK e a alça
  // fica acima do cano; o resíduo de ADS põe alça e massa na cruz (vmads-sim.mjs).
  shotgun: W('shotgun', { baked: true, timing: 'gameplay',
    frame: { x: 0.65, y: -0.72, z: -1.0, rotDeg: [8, 4, -5] },
    ads: { auto: true, off: [0.013, 0.238, 0], rotDeg: [-9.74, 0.62, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'RIG_WEAPON_SHOTGUN', alca: [0, 13.6, -5.5], massa: [0, 13.8, 21.5] } } }),
  // anchor/namedParts valem só na montagem ao vivo (eval authored-attach-check).
  deagle: W('deagle', { baked: true, runtime: 'family', timing: 'gameplay', recoilScale: 0.45,
    anchor: 'neutral_bone', namedParts: {
      magazine: { mesh: 'GEO-deagle-magazine', bone: 'Mag' },
      slide: { mesh: 'GEO-deagle-slide', bone: 'Slider' },
      slideLiner: { mesh: 'GEO-deagle-slide-liner-reconstructed', bone: 'Slider' },
      hammer: { mesh: 'GEO-deagle-hammer', bone: 'Hammer' },
    } }),
  // PT-38 congelada a 1,796× do enquadramento da AK (auditoria Codex 22/09).
  pistol: W('pistol', { baked: true, runtime: 'family', timing: 'gameplay' }),
  // ready:false: só "faca pistola e ak" têm veredito do dono (KNOWN-BUGS, 19/09).
  m92: W('ak', { baked: true, frame: 'family', ready: false }),
  akm: W('ak', { baked: true, frame: 'family', ready: false }),
  g3: W('g3', { baked: true, frame: 'family' }),
  // Pose de duas mãos aponta ~55° para cima no frame da família: o pacote gira de lado
  // (yaw 25°, pitch −10°) no fov da pistola; alça e massa na cruz (vmads-sim.mjs).
  revolver38: W('revolver', { baked: true, runtime: 'family', timing: 'gameplay',
    frame: { x: 0.28, y: -0.08, z: -0.46, fov: 55, rotDeg: [-10, 25, -10] },
    ads: { auto: true, off: [-0.001, -0.001, 0], rotDeg: [-0.44, -0.19, 0], pull: 0.52, fovScale: 1,
      linhaDeMira: { ref: 'RIG_WEAPON_REVOLVER', alca: [0, 1.55, -1.0], massa: [0, 1.85, -14.15] } },
    anchor: 'neutral_bone', namedParts: {
      cartridge0: { mesh: 'GEO-Cartridge0', bone: 'Cartridge0' },
      cartridge0_Case: { mesh: 'GEO-Cartridge0_Case', bone: 'Cartridge0' },
      cartridge1: { mesh: 'GEO-Cartridge1', bone: 'Cartridge1' },
      cartridge1_Case: { mesh: 'GEO-Cartridge1_Case', bone: 'Cartridge1' },
      cartridge2: { mesh: 'GEO-Cartridge2', bone: 'Cartridge2' },
      cartridge2_Case: { mesh: 'GEO-Cartridge2_Case', bone: 'Cartridge2' },
      cartridge3: { mesh: 'GEO-Cartridge3', bone: 'Cartridge3' },
      cartridge3_Case: { mesh: 'GEO-Cartridge3_Case', bone: 'Cartridge3' },
      cartridge4: { mesh: 'GEO-Cartridge4', bone: 'Cartridge4' },
      cartridge4_Case: { mesh: 'GEO-Cartridge4_Case', bone: 'Cartridge4' },
      cartridge5: { mesh: 'GEO-Cartridge5', bone: 'Cartridge5' },
      cartridge5_Case: { mesh: 'GEO-Cartridge5_Case', bone: 'Cartridge5' },
      drum: { mesh: 'GEO-Drum', bone: 'Drum' },
      drumCore: { mesh: 'GEO-Drum_InnerCore', bone: 'Drum' },
      ejector: { mesh: 'GEO-Ejector', bone: 'Ejector' },
      ejectorShaft: { mesh: 'GEO-Ejector_Shaft', bone: 'Ejector' },
      crane: { mesh: 'GEO-CraneArm_Link', bone: 'CraneArm' },
      hammer: { mesh: 'GEO-Hammer', bone: 'Hammer' },
      trigger: { mesh: 'GEO-Trigger', bone: 'Trigger' },
    } }),
  // Recuo de viewmodel abaixo de 4% da própria arma não se lê (P7 do gauntlet):
  // as duas armas mais leves do REC_DEG precisam de amplitude no mount.
  // Socket `sight` abaixo da linha alça–massa: o resíduo põe as duas na cruz (vmads-sim.mjs).
  md97: W('ar', { baked: true, recoilScale: 1.8,
    ads: { auto: true, off: [-0.006, 0, 0], rotDeg: [-4.31, 0.51, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_MD97', alca: [0.24, 0.112, -0.0095], massa: [-0.265, 0.107, -0.010] } } }),
  carbine: W('ar', { baked: true }),
  m400: W('sniper', { baked: true, frame: 'family' }),
  mosin: W('bolt', { baked: true }),
  // Candidata DMR assada por arma. `frame:family` preserva o enquadramento
  // medido desta base; a câmera embutida do doador não é usada como frame.
  rem700: W('bolt', { baked: true, frame: 'family' }),
  lmg: W('lmg', { baked: true, timing: 'gameplay',
    ads: { auto: false, off: [-0.10, 0.12, 0], rotDeg: [0, 0, 0], pull: 0.04, fovScale: 1 } }),
  scar: W('ar', { baked: true }),
  tavor: W('ar', { baked: true }),
  famas: W('ar', { baked: true }),
  uzi: W('smg', { baked: true, timing: 'gameplay',
    ads: { auto: false, off: [-0.12, 0.18, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  p90: W('p90', { baked: true, timing: 'gameplay', recoilScale: 1.6,
    ads: { auto: false, off: [-0.12, 0.18, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  svd: W('svd', { baked: true }),
  g3sg1: W('g3', { baked: true, frame: 'family' }),
  sks: W('marksman', { baked: true }),
};

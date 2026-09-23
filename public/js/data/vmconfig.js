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
  // Produto K (KINEMATION, 67 juntas) assado por arma no catálogo privado:
  // <família>/<arma>-baked-runtime.glb; `runtime:'family'` usa <família>/<família>-runtime.glb.
  awp: W('sniper', { baked: true, frame: 'family' }),
  // AK/AKM K (rifles-ak-final.py + grip-support.mjs): frame pelo retrato da golden (vm-gauntlet:
  // mão/arma 0,74 contra 0,73) dentro da faixa do eval:vm-frame; ADS pela alça e massa.
  ak: W('ak', { baked: true,
    frame: { x: 0.065, y: 0.04, z: -0.203, fov: 57, rotDeg: [1.69, 7.69, 6.19] },
    ads: { auto: true, off: [-0.001, 0.0009, 0], rotDeg: [-6.12, -0.71, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_AK', alca: [-0.06, 0.153, 0.005], massa: [-0.48, 0.155, 0.005] } } }),
  // `frame` aceita override manual; a medida gerada por arma vive em `vmframe.js`.
  // Evidência: docs/reports/VIEWMODEL-ENQUADRAMENTO-ESCALA-2026-09-18.md.
  // Resíduos de ADS da onda 3 (vm/w3-config): aparelho visto na cruz, medido no eval:vm-mira em 3:2 e 16:9.
  m4: W('ar', { baked: true, ads: { auto: true, off: [-0.0053, -0.0533, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  // Quadril: +18° de rolagem deita o cano (eixo na tela 141° → 149°, AK 155°; o crítico via
  // "pitch 39° vs 26°"). ADS desfaz a rolagem e o resíduo leva o aro da massa à cruz (eval:vm-mira 44 → 0 px).
  mp5: W('mp5', { baked: true, runtime: 'family', timing: 'gameplay', frame: { rotDeg: [-10.1, 0, 18] },
    ads: { auto: true, off: [-0.0925, 0.0245, 0], rotDeg: [0, 0, -18], pull: 0.05, fovScale: 1 } }),
  // KSG girada no produto (shotgun-k-fix.mjs): pacote 5× recua ao tamanho da AK e a alça
  // fica acima do cano; o resíduo de ADS põe alça e massa na cruz (vmads-sim.mjs).
  shotgun: W('shotgun', { baked: true, timing: 'gameplay',
    frame: { x: 0.65, y: -0.72, z: -1.0, rotDeg: [8, 4, -5] },
    ads: { auto: true, off: [-0.005, 0.238, 0], rotDeg: [-9.74, 0.62, -4], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'RIG_WEAPON_SHOTGUN', alca: [0, 13.6, -5.5], massa: [0, 13.8, 21.5] } } }),
  // anchor/namedParts valem só na montagem ao vivo (eval authored-attach-check).
  deagle: W('deagle', { baked: true, runtime: 'family', timing: 'gameplay', recoilScale: 0.45,
    frame: { x: 0.1, y: -0.1, z: -0.25, fov: 55, rotDeg: [-5, 15, -5] },
    ads: { auto: true, off: [0.006, -0.024, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 },
    // Frame de curta contra a PT-38 aprovada (docs/reports/VM-INTEGRACAO-K.md).
    anchor: 'neutral_bone', namedParts: {
      magazine: { mesh: 'GEO-deagle-magazine', bone: 'Mag' },
      slide: { mesh: 'GEO-deagle-slide', bone: 'Slider' },
      slideLiner: { mesh: 'GEO-deagle-slide-liner-reconstructed', bone: 'Slider' },
      hammer: { mesh: 'GEO-deagle-hammer', bone: 'Hammer' },
    } }),
  // PT-38 no enquadramento APROVADO (FAMILY_FRAME.pistol); a reescala do #631 foi revertida.
  // As curtas medem-se contra ela: ARMAS_CURTAS em tools/eval/lib/vm-limiares.mjs.
  pistol: W('pistol', { baked: true, runtime: 'family', timing: 'gameplay' }),
  // ready:false: só "faca pistola e ak" têm veredito do dono (KNOWN-BUGS, 19/09). M92: arma até o
  // punho (grip-support.mjs), cabo na borda e ADS pela alça tangente (sockets 10° fora da linha).
  m92: W('ak', { baked: true, ready: false,
    frame: { x: 0.0948, y: 0.0409, z: -0.1014, fov: 57, rotDeg: [6, 15, 2] },
    ads: { auto: true, off: [-0.0007, 0.0526, 0], rotDeg: [-10.89, -0.77, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_M92', alca: [0.04, 0.188, 0.021], massa: [-0.3, 0.193, 0.021] } } }),
  akm: W('ak', { baked: true, ready: false,
    frame: { x: 0.065, y: 0.04, z: -0.203, fov: 57, rotDeg: [1.69, 7.69, 6.19] },
    ads: { auto: true, off: [0.0106, -0.0035, 0], rotDeg: [-5.49, -0.64, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_AKM', alca: [-0.06, 0.15, 0.012], massa: [-0.48, 0.152, 0.012] } } }),
  g3: W('g3', { baked: true, frame: 'family', ads: { auto: true, off: [-0.01, -0.107, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  // Pose de duas mãos aponta ~55° para cima no frame da família: o pacote gira (yaw 16°, cano
  // ~15° como a PT-38) no fov da pistola; o ADS usa o clipe `ads` do produto (ads-pose.mjs).
  revolver38: W('revolver', { baked: true, runtime: 'family', timing: 'gameplay',
    frame: { x: 0.2, y: -0.08, z: -0.4, fov: 55, rotDeg: [-10, 16, -5] },
    ads: { auto: true, off: [-0.0129, -0.0099, 0], rotDeg: [0.5, -1.33, 0], pull: 0.46, fovScale: 1,
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
  md97: W('ar', { baked: true, recoilScale: 1.8,
    // linhaDeMira = alça e massa (nó + ponto local): o socket `sight` fica abaixo da alça.
    ads: { auto: true, off: [-0.006, 0, 0], rotDeg: [-4.31, 0.51, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_MD97', alca: [0.24, 0.112, -0.0095], massa: [-0.265, 0.107, -0.010] } } }),
  carbine: W('ar', { baked: true }),
  m400: W('sniper', { baked: true, frame: 'family' }),
  mosin: W('bolt', { baked: true }),
  // Candidata DMR assada por arma. `frame:family` preserva o enquadramento
  // medido desta base; a câmera embutida do doador não é usada como frame.
  rem700: W('bolt', { baked: true, frame: 'family' }),
  // ADS automático (alça medida no eixo). Frame: opção B do #632, decisão do dono (0,877× da AK;
  // faixa própria em FAIXA_ESCALA.lmg, vm-limiares.mjs).
  lmg: W('lmg', { baked: true, timing: 'gameplay', frame: { z: -0.375 }, ads: { auto: true, off: [-0.022, -0.003, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  scar: W('ar', { baked: true, ads: { auto: true, off: [0.0109, -0.0464, 0], rotDeg: [0, 0, -14], pull: 0.05, fovScale: 1 } }),
  tavor: W('ar', { baked: true, ads: { auto: true, off: [0, -0.051, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  famas: W('ar', { baked: true, ads: { auto: true, off: [-0.0019, -0.063, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  uzi: W('smg', { baked: true, timing: 'gameplay', ads: { auto: true, off: [-0.02, -0.03, 0], rotDeg: [0, 0, -15], pull: 0.05, fovScale: 1 } }),
  // ADS: o anel da óptica ficava ~60 px acima da cruz (crítico L1 50–55; eval:vm-mira 60 → 3 px). A
  // rolagem do quadril (−60° no FAMILY_FRAME) fica: −40° desenquadrou a arma e borrou o anel no A/B cego.
  p90: W('p90', { baked: true, timing: 'gameplay', recoilScale: 1.6,
    ads: { auto: true, off: [-0.0058, -0.068, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  svd: W('svd', { baked: true }),
  g3sg1: W('g3', { baked: true, frame: 'family' }),
  sks: W('marksman', { baked: true }),
};

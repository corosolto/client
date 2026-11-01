import { VM_FRAME as VM_WEAPON_FRAME } from './vmframe.js';
import { VM_FABRICA_POS } from './vmfabrica.js';

// Tabela pura do viewmodel autorado (BUG-75): famílias KINEMATION + as 26 armas.
// `ready` é portão por arma; produção só liga com VM_LAUNCH e todas prontas (vmlaunch.js).

// O dono autorizou as mãos novas por padrão em 27/09. O build publicado precisa
// servir os GLBs privados antes do merge; com qualquer arma fora de `ready`, o runtime cai no legado.
export const VM_LAUNCH = true;

// A faca não tem família de fogo: o portão dela mora aqui (meleevm.js). `true`
// preserva o veredito do dono registrado no #618 (faca, pistola e AK).
export const VM_MELEE = {
  knife: { ready: true },
};

// Por família: mount (socket→gun-space, +Z=cano, autorado no editor), equip
// (par General rifle|pistol), camShake (preset do recoil.json), reloadStyle.
export const VM_FAMILY = {
  // mount/trim = resíduo arma↔mão; inclinação do pacote vive em VM_AUTHORED_FRAME.
  // cs16 = máquina de 6 estados dos QC (cadências: tools/viewmodels/cs16-timings.json).
  ak:       { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.432, shoot: 0.8 } },
  ar:       { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 3.054, shoot: 1.5 } },
  mp5:      { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 0.857, reload: 2.632, shoot: 0.667 } },
  smg:      { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 0.909, reload: 3.143, shoot: 0.926 } },
  p90:      { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Light', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 3.375, shoot: 0.467 } },
  // g3/marksman/svd: doador COMPARTILHADO v_g3sg1 (não existem no CS 1.6).
  g3:       { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  marksman: { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  svd:      { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
  sniper:   { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.9, shoot: 1.171 } },
  bolt:     { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Sniper', reloadStyle: 'bolt_loop', cs16: { draw: 1.0, reload: 2.0, shoot: 1.286 } },
  deagle:   { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.167, shoot: 0.575 } },
  pistol:   { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol', reloadStyle: 'mag', cs16: { draw: 1.0, reload: 2.703, shoot: 1.0 } },
  revolver: { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'pistol', camShake: 'Pistol_Heavy', reloadStyle: 'cylinder' },
  shotgun:  { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Shotgun', reloadStyle: 'pump_loop', cs16: { draw: 1.0, shoot: 1.156 } },
  // belt: a M249 alimenta por cinto/caixa — não há pente destacável para a mão
  // buscar, e cobrar um da régua seria cobrar mentira.
  lmg:      { ready: true, mount: { pos: [0, 0, 0], rotDeg: [0, 0, 0], scale: 1 }, equip: 'rifle', camShake: 'Rifle_Heavy', reloadStyle: 'belt', cs16: { draw: 1.0, reload: 4.667, shoot: 0.5 } },
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
  // AK = golden aprovada no quadril (rota gold#ak, eval:vm-launch VL7).
  // ADS em linha: `linha:true` centra alça/massa (?ads1pfix=0 volta ao foco) — docs/visual-consistency/AK-ADS.md.
  ak: W('ak', { baked: true, golden: true, parts: { mag: { box: { min: [-0.022, -0.145, 0.005], max: [0.022, 0.02, 0.2] }, bone: 'Mag' } },
    // Centro dos bounds da face frontal, GLB4094c0534f; coordenadas locais do Rifle.
    bocaGolden: { revision: '4094c0534f', mesh: 'coro_solto_project_ak_body', vertices: 4869,
      bone: 'Rifle_metarig', boneIndex: 69,
      point: [-0.007025681626175773, 0.5414973542972648, 0.0016889069557109795] },
    ads: { auto: true, off: [0, -0.10, 0], rotDeg: [0, 0, 0], pull: 0, fovScale: 1, alivio: 0.35, estilo: 'foco', linha: true,
      golden: { osso: 'Rifle_metarig', alca: [-0.0064, 0.167, 0.0603], massa: [-0.0064, 0.5128, 0.0577], cima: [0, 0, 1] } } }),
  // `frame` aceita override manual; a medida gerada por arma vive em `vmframe.js`.
  // Evidência: docs/reports/VIEWMODEL-ENQUADRAMENTO-ESCALA-2026-09-18.md.
  m4: W('ar', { baked: true, ads: { auto: true, off: [-0.0053, -0.0533, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
  // Quadril: +18° de rolagem deita o cano (eixo na tela 141° → 149°, AK 155°; o crítico via
  // "pitch 39° vs 26°"). ADS desfaz a rolagem e o resíduo leva o aro da massa à cruz (eval:vm-mira 44 → 0 px).
  mp5: W('mp5', { baked: true, runtime: 'family', timing: 'gameplay', assetLimit: 'mint-sem-pente; weaponModel adiciona MAG procedimental', frame: { rotDeg: [-10.1, 0, 18] },
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
  // M92: arma até o
  // punho (grip-support.mjs), cabo na borda e ADS pela alça tangente (sockets 10° fora da linha).
  m92: W('ak', { baked: true, ready: true, assetLimit: 'pente-fundido-na-malha Mint',
    frame: { x: 0.0948, y: 0.0409, z: -0.1014, fov: 57, rotDeg: [6, 15, 2] },
    ads: { auto: true, off: [-0.0007, 0.0526, 0], rotDeg: [-10.89, -0.77, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_M92', alca: [0.04, 0.188, 0.021], massa: [-0.3, 0.193, 0.021] } } }),
  akm: W('ak', { baked: true, ready: true,
    frame: { x: 0.065, y: 0.04, z: -0.203, fov: 57, rotDeg: [1.69, 7.69, 6.19] },
    ads: { auto: true, off: [0.0106, -0.0035, 0], rotDeg: [-5.49, -0.64, 0], pull: 0.05, fovScale: 1,
      linhaDeMira: { ref: 'MINT_WEAPON_AKM', alca: [-0.06, 0.15, 0.012], massa: [-0.48, 0.152, 0.012] } } }),
  g3: W('g3', { baked: true, frame: { y: -0.015, fov: 78, rotDeg: [8, -0.2, 18] }, ads: { auto: true, off: [-0.01, -0.107, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1 } }),
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
  md97: W('ar', { baked: true, recoilScale: 1.8, assetLimit: 'mint-sem-pente; weaponModel adiciona MAG procedimental', frame: { fov: 90, rotDeg: [-4, -4, -12] },
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
  scar: W('ar', { baked: true, assetLimit: 'pente-fundido-na-malha Mint', ads: { auto: true, off: [0.0109, -0.0464, 0], rotDeg: [0, 0, -14], pull: 0.05, fovScale: 1 } }),
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

// Fábrica (docs/reports/VM-FABRICA.md): padrão no lançamento; revisão por arma ainda aceita query.
// Frame único = o da AK K (ajustado contra a golden); a curta usa o da PT-38 aprovada.
export const VM_FABRICA_FRAME = Object.freeze({ x: 0.065, y: 0.04, z: -0.203, fov: 57, rotDeg: [1.69, 7.69, 6.19] });
// alivio = distância olho→alça no ADS, do aimPointOffset do Settings do pack (m).
const F = (familia, chassi, extra = {}) => ({
  familia, chassi, manga: false, recoilScale: 1, timing: 'gameplay',
  ads: { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0, fovScale: 1, alivio: 0.3 },
  ...extra,
});
// A 'ak' fica fora: o dono manteve a golden aprovada (24/09); o chassi AK do pack serve a 'akm'.
// Foco com cruz livre: a arma fica abaixo da linha de tiro em vez de cobrir o alvo.
const A = (alivio) => ({ auto: true, off: [0, -0.08, 0], rotDeg: [0, 0, 0], pull: 0, fovScale: 1, alivio, estilo: 'foco' });
// A luneta oculta o viewmodel durante o ADS; ela não usa a mira de foco.
const S = (alivio) => ({ ...A(alivio), estilo: 'luneta' });
const CURTA = { x: 0.1, y: -0.1, z: -0.22, fov: 55, rotDeg: [0, 15, -5], drawDrop: 0.34 };
// recoilScale é só a mola visual; o recuo do tiro vive em game.js.
export const VM_FABRICA = Object.freeze({
  akm: F('ak', 'AK', { recoilScale: 4.5, recoilLoc: 1.5, ads: A(0.3) }),
  m4: F('ar', 'MX16A4', { recoilScale: 4.5, recoilLoc: 1.5, ads: A(0.3) }),
  famas: F('ar', 'MX16A4', { variante: true, recoilScale: 1.0, recoilLoc: 0.8, ads: A(0.28) }),
  tavor: F('ar', 'MX16A4', { variante: true, recoilScale: 1.0, recoilLoc: 0.8, frame: { x: 0.235, y: -0.06, z: -0.24 }, ads: A(0.28) }),
  // manga:true: a troca do pente só fica no quadro com o pacote longe, e aí a boca da manga
  // entra; nesses dois a extensão não fura a câmera (crítico, rodada 1).
  g3: F('g3', 'G3', { manga: true, recoilScale: 9, recoilLoc: 1.5, frame: { x: 0.195, y: -0.07, z: -0.353, rotDeg: [1.69, 7.69, 4.7] }, ads: A(0.22) }),
  svd: F('svd', 'SVD', { manga: true, recoilScale: 3, recoilLoc: 1.5, ads: S(0.34) }),
  awp: F('sniper', 'L96X', { recoilScale: 3.5, frame: { x: 0.21, y: -0.05, z: -0.3, fov: 44, rotDeg: [1.69, 4, 6.19] }, ads: S(0.12) }),
  mosin: F('bolt', 'Kar98K', { recoilScale: 3.3, frame: { x: 0.14, y: -0.05, z: -0.123, fov: 50, rotDeg: [-2, 7.69, 6.19] }, ads: S(0.4) }),
  mp5: F('mp5', 'MPS5', { recoilScale: 0.85, recoilLoc: 0.5, ads: A(0.3) }),
  p90: F('p90', 'PDW90', { recoilScale: 0.85, recoilLoc: 0.6, ads: A(0.5) }),
  lmg: F('lmg', 'MGX5', { recoilScale: 4, recoilLoc: 1.5, frame: { x: 0.335, y: -0.04, z: -0.15, rotDeg: [1.69, 0, -8] }, ads: S(0.3) }),
  shotgun: F('shotgun', 'KXG12', { recoilScale: 2.8, recoilLoc: 1.2, ads: A(0.1) }),
  pistol: F('pistol', 'X18', { frame: CURTA, ads: { ...A(0.38), auto: false, off: [0, 0.04, 0], estilo: 'foco', linha: { off: [0, -0.08, 0], estilo: 'foco' } } }),
  deagle: F('deagle', 'DGL50', { recoilScale: 0.45, frame: CURTA, ads: { ...A(0.38), auto: false, off: [0, 0.04, 0], estilo: 'foco', linha: { off: [0, -0.08, 0], estilo: 'foco' } } }),
  revolver38: F('revolver', 'Viper-357', { frame: { ...CURTA, y: -0.07, rotDeg: [-10, 0, -5] }, ads: A(0.38) }),
  m92: F('ak', 'AK', { variante: true, recoilScale: 4.5, recoilLoc: 1.5, ads: A(0.3) }),
  md97: F('ar', 'MX16A4', { variante: true, recoilScale: 4.5, recoilLoc: 1.5, ads: A(0.3) }),
  m400: F('ar', 'MX16A4', { variante: true, recoilScale: 4.5, recoilLoc: 1.5, ads: S(0.3) }),
  g3sg1: F('g3', 'G3', { variante: true, recoilScale: 7, recoilLoc: 1.5, ads: S(0.1) }),
  scar: F('marksman', 'Mk14EBR', { variante: true, recoilScale: 3, frame: { x: 0.2, y: -0.06, z: -0.3, rotDeg: [-2.5, 7.69, 6.19] }, ads: A(0.3) }),
  sks: F('marksman', 'Kar98K', { variante: true, recoilScale: 3.3, frame: { x: 0.2, y: -0.05, z: -0.2, fov: 50, rotDeg: [1.69, -10, 6.19], scale: 1.8 }, ads: S(0.4) }),
  rem700: F('bolt', 'Kar98K', { variante: true, recoilScale: 3.3, frame: { x: 0.14, y: -0.05, z: -0.123, fov: 50, rotDeg: [-2, 7.69, 6.19] }, ads: S(0.4) }),
  carbine: F('bolt', 'Kar98K', { variante: true, recoilScale: 3.3, frame: { x: 0.115, y: -0.04, z: -0.123, fov: 50 }, ads: A(0.35) }),
  uzi: F('smg', 'X18', { variante: true, manga: true, recoilScale: 3, frame: { ...CURTA, x: 0.26, y: -0.2, z: -0.55, rotDeg: [21, 15, -5] }, ads: A(0.4) }),
});
export const VM_FRAME = {
  vmScale: 0.72,
  tanBarrel: 0.22,
  adsPullZ: 0.02,
  recuoZ: 1.50,
  nearX: 6.00,
  cls: {
    rifle:   { roll: -0.0524, pitch: 0.1571, yaw: 0.2793, tanH: 0.360, clear: 0.020, minz: 0.3450, fwdTan: 1.60 },
    sniper:  { roll: 0.580, pitch: 0.1571, yaw: 0.2094, tanH: 0.360, clear: 0.020, minz: 0.3350, fwdTan: 1.60 },
    shotgun: { roll: -0.078, pitch: 0.1047, yaw: 0.3491, tanH: 0.360, clear: 0.020, minz: 0.3450, fwdTan: 1.60 },
    smg:     { roll: -0.085, pitch: 0.4189, yaw: 0.4887, tanH: 0.360, clear: 0.020, minz: 0.3500, fwdTan: 1.60 },
    // Armas curtas: yaw alto expõe o flanco da arma em hip-fire; no ADS o
    // runtime zera pitch/yaw e realinha a alça ao centro.
    pistol:  { roll: 0.000, pitch: 0.1745, yaw: 1.0472, tanH: 0.285, clear: 0.020, minz: 0.3500, fwdTan: 1.45 },
    knife:   { roll: 0, pitch: 0.000, yaw: 0.000, tanH: 0.240, clear: 0.020, minz: 0.3100, fwdTan: 1.60 },
  },
  knifeRot: [-0.10, 0.50, -0.48],
  zMul: { deagle: 0.90, mosin: 0.90, rem700: 0.90, uzi: 1.24, g3sg1: 0.75, sks: 0.80, p90: 1.16, mp5: 1.08 },
  // classe de ENQUADRAMENTO (≠ STATIC_CLASS do pipeline Tripo, ≠ BALL_CLASS da balística)
  classOf: {
    ak: 'rifle', akm: 'rifle', m4: 'rifle', m92: 'rifle', g3: 'rifle', carbine: 'rifle',
    scar: 'rifle', tavor: 'rifle', famas: 'rifle', lmg: 'rifle', md97: 'rifle',
    mp5: 'smg', uzi: 'smg', p90: 'smg',
    awp: 'sniper', mosin: 'sniper', rem700: 'sniper', m400: 'sniper', svd: 'sniper', g3sg1: 'sniper', sks: 'sniper',
    shotgun: 'shotgun',
    pistol: 'pistol', deagle: 'pistol', revolver38: 'pistol',
    knife: 'knife',
  },
};

// Composição em espaço de câmera dos pacotes autorados. O pacote inteiro move;
// arma, mãos, clipes, ADS e sockets continuam no mesmo referencial.
export const VM_AUTHORED_FRAME = Object.freeze({
  family: Object.freeze({
    ak:       { x: 0.112, y: -0.068, z: -0.199, fov: 84, rotDeg: [0.6, -0.1, -5] },
    ar:       { x: 0.096, y: -0.129, z: -0.198, fov: 84, rotDeg: [-8.0, 0.9, 0] },
    mp5:      { x: 0.091, y: -0.187, z: -0.204, fov: 84, rotDeg: [-10.1, 0, 0] },
    deagle:   { x: 0.089, y: -0.152, z: -0.217, fov: 84, rotDeg: [-15.8, -0.2, 0] },
    smg:      { x: 0.206, y: -0.141, z: -0.462, fov: 84, rotDeg: [15.4, 6.0, 0] },
    p90:      { x: 0.075, y: -0.020, z: -0.141, fov: 84, rotDeg: [0, 0, 0] },
    pistol:   { x: 0.100, y: -0.100, z: -0.220, fov: 55, rotDeg: [0, 15, -5], drawDrop: 0.34 },
    shotgun:  { x: 0.057, y: -0.114, z: -0.159, fov: 84, rotDeg: [-8.9, 0, 0] },
    sniper:   { x: 0.118, y: -0.128, z: 0.029, fov: 84, rotDeg: [-11.9, 0, 0] },
    bolt:     { x: 0.055, y: -0.083, z: -0.254, fov: 84, rotDeg: [-1.6, -0.3, 0] },
    g3:       { x: 0.117, y: -0.062, z: -0.202, fov: 84, rotDeg: [1.0, -0.2, 0] },
    marksman: { x: 0.107, y: -0.070, z: -0.187, fov: 84, rotDeg: [0.5, -0.3, 0] },
    svd:      { x: 0.107, y: -0.060, z: -0.419, fov: 84, rotDeg: [1.9, 0.5, 0] },
    lmg:      { x: 0.153, y: -0.116, z: -0.409, fov: 84, rotDeg: [-5.2, -0.3, 0] },
    revolver: { x: 0.075, y: -0.042, z: -0.110, fov: 84, rotDeg: [0, 0, 0] },
    grenade:  { x: 0.045, y: -0.035, z: -0.080, fov: 84, rotDeg: [0, 0, 0] },
  }),
  goldsrc: Object.freeze({
    awp:        { x: 0.141, y: 0.031, z: -0.100 },
    ak:         { x: 0.092, y: 0.064, z: 0, rotDeg: [0, 0, 4] },
    m4:         { x: 0.092, y: 0.009, z: 0 },
    mp5:        { x: 0.133, y: 0.068, z: 0 },
    shotgun:    { x: 0.355, y: 0.040, z: -0.240 },
    deagle:     { x: 0.012, y: 0.084, z: 0, rotDeg: [0, 0, 31], drawDrop: 0.513 },
    pistol:     { x: 0.061, y: -0.043, z: 0, rotDeg: [0, 0, 41], drawDrop: 0.367 },
    m92:        { x: 0.086, y: 0.012, z: -0.100 },
    akm:        { x: 0.092, y: 0.064, z: 0 },
    g3:         { x: 0.183, y: 0.120, z: -0.080, rotDeg: [0, 0, -19] },
    revolver38: { x: 0.053, y: 0.013, z: 0, rotDeg: [0, 0, 28], drawDrop: 0.333 },
    md97:       { x: 0.064, y: 0.099, z: -0.080, rotDeg: [0, 0, -11] },
    carbine:    { x: 0.117, y: 0.085, z: 0 },
    m400:       { x: 0.141, y: 0.031, z: -0.040, rotDeg: [0, 0, -20] },
    mosin:      { x: 0.221, y: -0.140, z: -0.080 },
    rem700:     { x: 0.221, y: -0.140, z: -0.080 },
    lmg:        { x: 0.356, y: 0.173, z: -0.080, rotDeg: [0, 0, -16] },
    scar:       { x: 0.150, y: 0.013, z: -0.040 },
    tavor:      { x: 0.046, y: 0.005, z: 0 },
    famas:      { x: 0.046, y: 0.005, z: -0.150, rotDeg: [0, 0, 12] },
    uzi:        { x: 0.345, y: 0.177, z: 0, rotDeg: [0, 0, -36], drawDrop: 0.280 },
    p90:        { x: 0.042, y: -0.046, z: 0, rotDeg: [0, 0, 17] },
    svd:        { x: 0.183, y: 0.120, z: -0.080, rotDeg: [0, 0, -21] },
    g3sg1:      { x: 0.183, y: 0.120, z: -0.080, rotDeg: [0, 0, -20] },
    sks:        { x: 0.158, y: 0.078, z: -0.080, rotDeg: [0, 0, -20] },
  }),
});

export const VM_SIDE_CONTRACT = Object.freeze({
  aspects: Object.freeze([16 / 9, 3 / 2]),
  axisDeg: Object.freeze([22, 42]),
  areaPct: Object.freeze([4, 16]),
  contactMaxM: 0.025,
  visibleMin: 0.70,
  profileMin: 0.02,
});

// Foco com `ads.linha` vira ADS automático pela alça e massa; um objeto sobrepõe os pontos.
// ?ads1pfix=0 volta ao foco. Régua: tools/eval/ads1p-linha-check.mjs.
export function adsEfetivo(ads, linha = true) {
  if (!linha || ads?.estilo !== 'foco' || !ads.linha) return ads;
  const { linha: extra, ...resto } = ads;
  return { ...resto, auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], estilo: 'linha', ...(extra === true ? {} : extra) };
}

export function authoredFrameFor(weapon, family, sourceKey = '', cameraFov = 84) {
  if (sourceKey.startsWith('fab#')) {
    return {
      ...VM_FABRICA_FRAME,
      ...(VM_FABRICA_POS[weapon] || {}),
      ...(VM_FABRICA[weapon]?.frame || {}),
    };
  }
  if (sourceKey.startsWith('gold#')) return { x: 0, y: 0, z: 0, fov: cameraFov };
  if (sourceKey.startsWith('rt#')) return { x: 0, y: 0, z: 0, fov: 74 };
  if (sourceKey.startsWith('gs#')) {
    const frame = VM_AUTHORED_FRAME.goldsrc[weapon];
    if (!frame) throw new Error(`sem frame goldsrc para ${weapon}`);
    return { ...frame, fov: 74 };
  }
  const familyFrame = VM_AUTHORED_FRAME.family[family];
  if (!familyFrame) throw new Error(`sem frame de família para ${family}`);
  const measured = VM_WEAPON_FRAME[weapon];
  const override = VM_WEAPON[weapon]?.frame;
  return {
    ...familyFrame,
    ...(measured || {}),
    ...(override && typeof override === 'object' ? override : {}),
  };
}

const PIPELINE_LICENSE = Object.freeze({
  legacy: 'Mint/project asset',
  golden: 'CC0 mold + Mint/project asset',
  goldsrc: 'CC0 mold + Mint/project asset',
  paid: 'Fab Standard License (private runtime)',
  retarget: 'Fab Standard License (private runtime)',
});

export function viewmodelPlan(weapon, source = 'default') {
  const spec = VM_WEAPON[weapon];
  if (!spec) throw new Error(`arma sem contrato 1P: ${weapon}`);
  const family = spec.family;
  const ready = VM_FAMILY[family]?.ready === true && spec.ready !== false;
  let pipeline = 'legacy';
  if (source === 'goldsrc') pipeline = 'goldsrc';
  else if (source === 'retarget') pipeline = 'retarget';
  else if (ready) pipeline = spec.golden ? 'golden' : 'paid';
  const asset = pipeline === 'goldsrc'
    ? `/private-assets/viewmodels/goldsrc-vm/${weapon}-runtime.glb`
    : pipeline === 'retarget'
      ? `/private-assets/viewmodels/retarget-vm/${weapon}-runtime.glb`
      : pipeline === 'golden'
        ? `/models/viewmodels/coro/${weapon}-hires.glb`
        : pipeline === 'paid'
          ? `/private-assets/viewmodels/${family}/${family}-runtime.glb`
          : `/models/weapons/${weapon}.glb`;
  return {
    weapon,
    family,
    pipeline,
    asset,
    license: PIPELINE_LICENSE[pipeline],
    fallback: 'legacy',
    fallbackUsed: pipeline === 'legacy',
    result: pipeline === 'legacy' ? 'fallback-explicito' : 'autorada',
    assetLimit: spec.assetLimit || null,
  };
}

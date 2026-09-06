// Braços de 1ª pessoa DEDICADOS (FASE 2): asset próprio em models/fparms/arms.glb —
// corpo inteiro rigado (4.9k tris, material único pele+manga escura, MESMA nomeação de
// ossos do rig compartilhado: Hips/Spine/…/LeftHand/RightHand). Substitui a FASE 1
// (clone do corpo do personagem + IK = "luvas salsicha", reprovada): as mãos aqui têm
// dedos de verdade já relaxados/fechados na malha (o rig NÃO tem ossos de dedo).
//
// O corpo fica pendurado na câmera (filho de vm.root). Cabeça e as DUAS cadeias de
// perna (UpLeg→Leg→Foot→ToeBase) vão a zero-scale — colapsam fora do quadro; quadril/
// coluna/peito ficam (presença de corpo sob a câmera sem tampar a visão). A pose base
// é o clipe idle compartilhado CONGELADO (bind por nome de osso — os nomes batem) e a
// cada frame o IK CCD do handik.js trava a mão direita no grip e a esquerda no guarda-
// mão da arma visível. Como kick/reloadDip/sway/bob mexem o vm.root inteiro, o IK
// re-trava as mãos na arma depois desses transforms — o recuo lê como braços+arma
// chutando juntos.
//
// Se o asset falhar no load, buildFPArms retorna null e o caller cai nas mãos
// procedurais antigas (fpArm/frontHand do game.js) — ÚNICO fallback restante.
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VERSION } from './version.js';
import { getSharedClips, measurePalmLocal } from './glbchars.js';
import { gripPoints, ONE_HANDED, weaponMetrics } from './weapons.js';
import { solveCCDIK } from './handik.js';

// Escape hatch p/ debug e A-B: ?fpoff=1 força o fallback procedural.
export const FP_OFF = new URLSearchParams(location.search).get('fpoff') === '1';
// O viewmodel de 1ª pessoa são os 26 GLBs da Mint (um por arma, ~250 KB) montados nos
// braços FP. O pipeline Tripo (arms_*.glb de 18 MB, kill-switch ?tripovm=1, G3-R1) foi
// REMOVIDO em 07/08/2026 a pedido do dono: 154 MB no repo/deploy sem nenhum jogador
// baixar. A régua do caminho ativo é tools/eval/vm-mint-audit.mjs.

const qp = new URLSearchParams(location.search);
const _n3 = (s, d) => { const p = (s || '').split(',').map(Number); return p.length === 3 && p.every((n) => !isNaN(n)) ? p : d; };
// Tuning ao vivo: ?fpr=x,y,z (offset do pulso R no espaço da arma, cano +Z, estoque -Z),
// ?fpl=x,y,z (idem mão L relativo ao guarda-mão), ?fpy=/?fpz= (corpo sob a câmera).
const R_OFF = _n3(qp.get('fpr'), [0, -0.02, -0.015]);
const L_OFF = _n3(qp.get('fpl'), [0, -0.03, -0.01]);
// Correção de orientação da mão em espaço da ARMA (graus, Euler XYZ; cano +Z): o
// transplante do rifle-hold deixa o roll em volta do cano livre — estes ângulos fecham
// a mão em volta do grip/guarda-mão de verdade (tunados em capturas 1080p).
const _deg3 = (s, d) => _n3(s, d).map((x) => x * Math.PI / 180);
const R_ROT = _deg3(qp.get('fprrot'), [-90, 0, 0]);
const L_ROT = _deg3(qp.get('fplrot'), [90, 0, 0]);
// Overrides de rotação R por arma. Faca: o roll -45° ("hammer grip") empurrava o pulso
// pra uma pose que o IK não alcançava (gripError r=0.023, lâmina flutuando acima dos
// dedos). Medido em 1080p: rot [0,0,0] (só a orientação base transplantada) converge
// (r=0.0001) e assenta a lâmina na mão. Sem override o default seria o do rifle (-90) —
// que também não converge p/ a faca (r=0.024) — então mantém a entrada própria da faca.
const R_ROT_W = { knife: _deg3(qp.get('fprrot_knife'), [0, 0, 0]) };
// Offset do pulso R por arma (mesmo espaço de R_OFF).
const R_OFF_W = { knife: _n3(qp.get('fpr_knife'), [0, -0.01, 0.02]) };
const BODY_Y = parseFloat(qp.get('fpy')) || -1.48;
const BODY_Z = parseFloat(qp.get('fpz')) || 0.02;
// Guarda-mão: fração do caminho grip→boca onde a mão de apoio agarra, e o quanto ela desce
// abaixo da linha do cano (metros reais). 0.42 é a posição de handguard de rifle; abaixo de
// ~0.3 a mão encosta no grip, acima de ~0.6 ela passa do guarda-mão e "flutua no cano".
// Verificado arma a arma (alcance do ombro esquerdo) em tools/eval/vm-mint-audit.mjs.
const FORE_T = parseFloat(qp.get('fpforet')) || 0.42;
const FORE_DROP = 0.030;
const FROZEN_T = 0.6;          // ponto do clipe idle congelado (pose base do rifle-hold)
const TARGET_HEIGHT = 1.72;    // mesma normalização dos bots (glbchars.js)
// Escala global do corpo FP (proporção na tela: 1.0 deixava as mãos grandes demais,
// tampando a mira — pedido do usuário). Tunável via ?fps=.
const FP_SCALE = parseFloat(qp.get('fps')) || 0.93;

const _t = new THREE.Vector3();
const _eff = new THREE.Vector3();
const _sh = new THREE.Vector3();
const _qg = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qf = new THREE.Quaternion();

// Asset dedicado: carregado 1× via preloadFPArms (startGame), clonado por build.
let _armsTpl = null;
let _loading = null;
const _loader = new GLTFLoader();

// Preload do asset dedicado. Falha → _armsTpl fica null → buildFPArms devolve null →
// fallback procedural (fpArm/frontHand do game.js).
export function preloadFPArms() {
  if (!_loading) {
    _loading = new Promise((res, rej) => _loader.load(`models/fparms/arms.glb?v=${VERSION}`, res, undefined, rej))
      .then((g) => { _armsTpl = g.scene; })
      .catch((e) => { console.warn('[fparms] arms.glb falhou no load — mãos procedurais', e); });
  }
  return _loading;
}

// Alcance de uma cadeia braço→antebraço→mão (+ offset da palma), em metros de MUNDO, medido
// na pose já normalizada. Soma dos segmentos = o máximo que o CCD consegue esticar.
function _reach(sh, arm, fore, hand, palm) {
  if (!arm || !fore || !hand) return 0.55;
  const V = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
  const a = V(arm), f = V(fore), h = V(hand);
  const p = palm ? palm.clone().applyMatrix4(hand.matrixWorld) : h;
  return (sh ? V(sh).distanceTo(a) : 0) + a.distanceTo(f) + f.distanceTo(h) + h.distanceTo(p);
}

// Orienta a mão com rotação fixa no espaço da arma (transplante da pose congelada do
// rifle-hold: anatomicamente correta por construção). A posição vem do IK; a rotação
// NÃO — o CCD torce o antebraço e deixa a palma achatada se depender só dele.
function orientHand(end, qFix) {
  _qf.copy(_qg).multiply(qFix);                          // mundo desejado = arma * fix
  end.parent.getWorldQuaternion(_qp).invert();
  end.quaternion.copy(_qp.multiply(_qf)).normalize();
  end.updateWorldMatrix(false, true);
}

// Posiciona uma mão no alvo: orienta → solve → repete (a palma efetora depende da
// orientação da mão; 2 passadas convergem). Retorna o gripError (mundo, metros).
function poseHand(chain, qFix, tgt) {
  for (let p = 0; p < 2; p++) {
    orientHand(chain.end, qFix);
    solveCCDIK(chain.bones, chain.end, tgt, { iterations: 14, endOffset: chain.endOffset });
  }
  orientHand(chain.end, qFix);
  return _eff.copy(chain.endOffset).applyMatrix4(chain.end.matrixWorld).distanceTo(tgt);
}

// Monta os braços FP a partir do asset dedicado (mesmo p/ todos os personagens em v1).
// Retorna null se o asset/clipe não estiver carregado (caller cai pro fallback
// procedural). Pré-requisito: preloadFPArms() + preloadCharacterAssets() (shared clips).
export function buildFPArms(def) {
  const clips = getSharedClips();
  if (!_armsTpl || !clips || !clips.idle) return null;

  const model = skeletonClone(_armsTpl);
  // LUVA POR TIME (antes a mão era genérica pros 3 times): tinge o material (clonado, pra não
  // vazar entre builds) na cor do time — Petista avermelhado, Bolsonarista verde, Tribos azul.
  // Blend moderado (não recolore a pele toda de roxo): multiplica a cor base pela cor da luva.
  const GLOVE = { E: 0xd83232, B: 0x28c858, U: 0x8a3ffc, C: 0xf0f0f0, M: 0x9d4edd };
  const gloveHex = GLOVE[def && def.team] || 0xbdb6ab;
  const _gc = new THREE.Color(gloveHex);
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    // luva por time: blend MODERADO — acima de ~60% a tinta cobre a textura da mão e vira
    // "bloco colorido" (a reclamação "mão muito feia"). color + emissive (o arms.glb é unlit).
    if (o.material.color) o.material.color.lerp(_gc, 0.55);
    if (o.material.emissive) o.material.emissive.lerp(_gc, 0.55);
  });
  // Normaliza como buildCharacterModel: altura real e pés no y=0 do wrapper.
  model.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(model);
  const h = bbox.max.y - bbox.min.y || 1;
  const s = (TARGET_HEIGHT * FP_SCALE) / h;
  model.scale.setScalar(s);
  model.position.y = -bbox.min.y * s;
  model.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });

  // Wrapper no espaço do vm.root: corpo de frente pra -Z (mesma direção da câmera),
  // olhos ~na altura da câmera (a cabeça some — só os ombros/braços importam).
  const group = new THREE.Group();
  group.add(model);
  group.rotation.y = Math.PI;
  group.position.set(0, BODY_Y, BODY_Z);

  // Ossos (nomes idênticos ao rig compartilhado; regex de resgate por segurança).
  const bone = (exact, re) => {
    let b = null;
    model.traverse((o) => { if (o.isBone && !b && o.name === exact) b = o; });
    if (!b) model.traverse((o) => { if (o.isBone && !b && re.test(o.name)) b = o; });
    return b;
  };
  const head = bone('Head', /head/i);
  const rSh = bone('RightShoulder', /right.?shoulder/i), rArm = bone('RightArm', /right.?arm|r_arm/i),
    rFore = bone('RightForeArm', /right.?forearm/i), rHand = bone('RightHand', /right.?hand|rhand/i);
  const lSh = bone('LeftShoulder', /left.?shoulder/i), lArm = bone('LeftArm', /left.?arm|l_arm/i),
    lFore = bone('LeftForeArm', /left.?forearm/i), lHand = bone('LeftHand', /left.?hand|lhand/i);
  if (!rArm || !rFore || !rHand || !lArm || !lFore || !lHand) return null;
  const legL = bone('LeftUpLeg', /left.?upleg/i), legR = bone('RightUpLeg', /right.?upleg/i);
  // Esconde cabeça e pernas: zero-scale no topo da cadeia colapsa os filhos junto
  // (Leg→Foot→ToeBase, head_end/headfront). O clipe idle não tem track de scale,
  // então o zero segura (re-aplicado por garantia no poseToWeapon).
  if (head) head.scale.setScalar(0.0001);
  if (legL) legL.scale.setScalar(0.0001);
  if (legR) legR.scale.setScalar(0.0001);

  // Pose base: idle compartilhado congelado (braços já chegam perto da arma; o IK refina).
  const mixer = new THREE.AnimationMixer(model);
  const idle = mixer.clipAction(clips.idle);
  idle.play();
  mixer.update(FROZEN_T);
  model.updateMatrixWorld(true);

  // Efetor = centro da palma MEDIDO da malha (ver measurePalmLocal). O rig dedicado não
  // tem ossos Curl → null (a palma é medida só pelos verts com peso no osso Hand).
  const palmR = measurePalmLocal(model, rHand, null);
  const palmL = measurePalmLocal(model, lHand, null);
  // Orientação fixa da mão no espaço da arma = a da pose congelada do rifle-hold.
  // A pose NÃO segura o rifle paralelo a +Z (segura atravessado no peito): mede o eixo
  // real do rifle congelado (linha palma R → palma L = direção do cano) no espaço do
  // modelo e corrige, senão as mãos transplantadas ficam tortas em cima da arma.
  const _qm = model.getWorldQuaternion(new THREE.Quaternion()).invert();
  const qFixR = _qm.clone().multiply(rHand.getWorldQuaternion(new THREE.Quaternion()));
  const qFixL = _qm.clone().multiply(lHand.getWorldQuaternion(new THREE.Quaternion()));
  const _pR = palmR.clone().applyMatrix4(rHand.matrixWorld);
  const _pL = palmL.clone().applyMatrix4(lHand.matrixWorld);
  const axisModel = _pL.sub(_pR).normalize().applyQuaternion(_qm);
  const qCorr = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisModel);
  qFixR.premultiply(qCorr);
  qFixL.premultiply(qCorr);
  // A correção manual (R_ROT/L_ROT/overrides por arma) NÃO entra aqui: compõe por frame
  // no poseToWeapon, que sabe qual arma está na mão.

  const arms = {
    group, model, mixer, head, legs: [legL, legR].filter(Boolean),
    chainR: { bones: [rSh, rArm, rFore].filter(Boolean), end: rHand, endOffset: palmR },
    chainL: { bones: [lSh, lArm, lFore].filter(Boolean), end: lHand, endOffset: palmL },
    // Sem ossos de dedo no asset dedicado: nada de curl por frame (dedos já vêm na malha).
    curlR: null, curlL: null,
    curlBaseR: 0, curlBaseL: 0,
    qFixR, qFixL,
    // ALCANCE REAL de cada braço, medido na pose congelada (mundo, metros). O poseToWeapon
    // usa isso pra NUNCA pedir ao IK um alvo que ele não alcança — alvo inalcançável = CCD
    // parando no limite = mão flutuando no ar, que é o defeito nº1 relatado pelo dono.
    reachR: _reach(rSh, rArm, rFore, rHand, palmR),
    reachL: _reach(lSh, lArm, lFore, lHand, palmL),
    _tgtR: new THREE.Vector3(), _tgtL: new THREE.Vector3(),
    _errR: 0, _errL: null,
    // Métrica objetiva (convenção "medir, não olhar"): distância efetor→alvo IK por mão.
    gripError() { return { r: this._errR, l: this._errL }; },
  };
  return arms;
}

// Trava as mãos na arma visível. Rodar DEPOIS dos transforms do vm.root no update loop.
// weaponGroup = grupo da arma (vm.models[id]); o GLB real dentro dele chama-se 'rw'
// (espaço local: grip na origem, cano +Z — ver weapons.js gripPoints).
export function poseToWeapon(arms, weaponGroup, weaponId) {
  if (!arms || !weaponGroup) return;
  // Repõe a pose congelada (zera drift do CCD entre frames/trocas) e re-esconde cabeça/pernas.
  arms.mixer.setTime(FROZEN_T);
  if (arms.head) arms.head.scale.setScalar(0.0001);
  if (arms.legs) for (const leg of arms.legs) leg.scale.setScalar(0.0001);

  const rw = weaponGroup.getObjectByName('rw') || weaponGroup;
  rw.updateWorldMatrix(true, false);
  rw.getWorldQuaternion(_qg);
  const gp = gripPoints(weaponId);
  // GUARDA-MÃO MEDIDO (G3-R1). O gp.fore vinha de `len·(1-gripZ)` — o lado da CORONHA, não
  // o do cano (gripZ é medido a partir da boca, ver weapons.js) — e ainda misturava metros
  // com unidades locais do wrap: em algumas armas a mão de apoio caía atrás do grip ou no
  // ar à frente da boca. Aqui o alvo é uma fração do caminho grip→BOCA REAL do GLB, já no
  // espaço local do rw (por isso o /norm), então vale pra qualquer arma e qualquer escala.
  const met = weaponMetrics(weaponId);
  if (gp.fore && met) {
    const k = 1 / (met.norm || 1);
    // ALCANCE: em armas longas (awp/mosin/g3/carbine) o guarda-mão a 42% do caminho fica
    // ALÉM do braço esquerdo — medido em vm-mint-audit.mjs, folga negativa. Quando isso
    // acontece o CCD para no limite e a mão fica FLUTUANDO fora da madeira (a reclamação
    // literal do dono). A correção é deslizar o alvo PELO EIXO DA ARMA em direção ao grip
    // até caber no braço: a mão continua agarrando a arma, só mais atrás. Nunca soltar.
    // âncora = RAIZ da cadeia CCD (bones[0] = ombro): é dela que sai todo o alcance.
    const armL = arms.chainL.bones[0] || arms.chainL.end;
    armL.updateWorldMatrix(true, false);
    _sh.setFromMatrixPosition(armL.matrixWorld);
    const reach = (arms.reachL || 0.55) * 0.94;
    let t = FORE_T;
    for (let i = 0; i < 7 && t > 0.14; i++) {
      _t.set(met.muzzle.x * k * t, met.muzzle.y * k * t - FORE_DROP * k, met.muzzle.z * k * t);
      if (rw.localToWorld(_t).distanceTo(_sh) <= reach) break;
      t -= 0.045;
    }
    gp.fore.set(met.muzzle.x * k * t, met.muzzle.y * k * t - FORE_DROP * k, met.muzzle.z * k * t);
    arms._foreT = t;   // exposto p/ debug/telemetria (qual fração coube nesta arma)
  }

  // Correção manual de orientação por arma (espaço da arma, ver R_ROT/L_ROT): composta
  // por frame. A faca segura o cabo na horizontal ("hammer grip"), não o grip vertical.
  const rotR = R_ROT_W[weaponId] || R_ROT;
  _qu.setFromEuler(_eu.set(rotR[0], rotR[1], rotR[2], 'XYZ'));
  _qR.copy(_qu).multiply(arms.qFixR);
  _qu.setFromEuler(_eu.set(L_ROT[0], L_ROT[1], L_ROT[2], 'XYZ'));
  _qL.copy(_qu).multiply(arms.qFixL);

  // Mão R no grip (centro da palma no ponto de empunhadura; dedos fecham por cima).
  const roff = R_OFF_W[weaponId] || R_OFF;
  _t.copy(gp.grip).add(R_OFF_VEC.set(roff[0], roff[1], roff[2]));
  arms._tgtR.copy(rw.localToWorld(_t));
  arms._errR = poseHand(arms.chainR, _qR, arms._tgtR);

  if (gp.fore) {
    // Mão L no guarda-mão.
    _t.copy(gp.fore).add(L_OFF_VEC.set(L_OFF[0], L_OFF[1], L_OFF[2]));
    arms._tgtL.copy(rw.localToWorld(_t));
    arms._errL = poseHand(arms.chainL, _qL, arms._tgtL);
  } else {
    // Arma de 1 mão: braço L relaxado junto ao quadril, fora do quadro (espaço vm.root).
    // Orientação natural (sem transplante) — o braço só desce pra fora do quadro.
    const root = arms.group.parent;
    root.updateWorldMatrix(true, false);
    arms._tgtL.copy(root.localToWorld(_t.set(-0.22, -0.55, -0.30)));
    solveCCDIK(arms.chainL.bones, arms.chainL.end, arms._tgtL, { iterations: 8, endOffset: arms.chainL.endOffset });
    arms._errL = _eff.copy(arms.chainL.endOffset).applyMatrix4(arms.chainL.end.matrixWorld).distanceTo(arms._tgtL);
  }

  // Dedos: o asset dedicado não tem ossos Curl — dedos vêm fechados na malha (no-op).
  const two = !ONE_HANDED.has(weaponId) && !!gp.fore;
  if (arms.curlR) arms.curlR.rotation.x = arms.curlBaseR + 0.85;
  if (arms.curlL) arms.curlL.rotation.x = arms.curlBaseL + (two ? 0.8 : 0.25);
}

const R_OFF_VEC = new THREE.Vector3();
const L_OFF_VEC = new THREE.Vector3();
const _qu = new THREE.Quaternion(), _qR = new THREE.Quaternion(), _qL = new THREE.Quaternion();
const _eu = new THREE.Euler();

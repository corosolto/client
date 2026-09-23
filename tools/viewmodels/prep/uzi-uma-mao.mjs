#!/usr/bin/env node
/**
 * UZI de uma mão (decisão do dono, FILA-CORRECAO L1): mão direita fechada no
 * punho, mão esquerda fora da arma em idle/tiro/inspeção, e recarga PELO PUNHO.
 *
 * Doador: a PT-38 K aprovada (`pistol-runtime.glb`), mesma malha de braços de 67
 * juntas. Tudo é transportado no REFERENCIAL DO POÇO do carregador (origem no fundo
 * do pente, Y subindo pelo punho, X para a boca): a mão direita fica no punho da
 * UZI como fica no da pistola; na recarga a arma gira como a pistola gira, a mão
 * esquerda e o pente fazem o trajeto da pistola, e um IK de dois ossos fecha
 * braço/antebraço. Abaixo do poço, a altura escala pelo comprimento dos pentes
 * (o da UZI é mais longo); acima do topo, desloca pela diferença.
 *
 * Uso: node tools/viewmodels/prep/uzi-uma-mao.mjs --source=<uzi-baked-runtime.glb>
 *        --donor=<pistol-runtime.glb> --output-dir=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, blend, duration, gravarClipe, smooth } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = '353d0384ec60a0e6ffc99ef38b5092a5773c2562e2e4bc401adef1228ef0a9fc';
const DONOR_SHA = '04c126d93148f9cf0ffa07927f4d09cde2067d9abbc9ddcd25d3b811923fa3b8';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('donor') || !option('output-dir')) throw new Error('uso: --source=<uzi> --donor=<pistol> --output-dir=<dir>');
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(path.resolve(option('source')));
const donorBytes = await fs.readFile(path.resolve(option('donor')));
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error(`fonte UZI divergente: ${digest(sourceBytes)}`);
if (digest(donorBytes) !== DONOR_SHA) throw new Error(`doador PT-38 divergente: ${digest(donorBytes)}`);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const uziDoc = await io.read(path.resolve(option('source')));
const pistolDoc = await io.read(path.resolve(option('donor')));
const U = new Pose(uziDoc);
const P = new Pose(pistolDoc);
const V = (...a) => new THREE.Vector3(...a);

// ---- referencial do poço (no espaço da arma), a partir da geometria do pente ----
// `escala` = escala de mundo da arma: o comprimento sai em metros de mundo, a unidade do transporte.
function frameLocal(topo, fundo, boca, massa, escala) {
  const y = topo.clone().sub(fundo).normalize();
  const x = boca.clone().sub(massa); x.sub(y.clone().multiplyScalar(x.dot(y))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  return { rot: new THREE.Matrix4().makeBasis(x, y, z), fundo, topo, comprimento: topo.distanceTo(fundo) * escala };
}
const escalaMundo = (pose, nome) => { const s = V(); pose.world(nome).decompose(V(), new THREE.Quaternion(), s); return s.x; };
// Extremos de uma nuvem ao longo do eixo principal (PCA); o "topo" é o mais perto da massa.
function extremos(pontos, massa) {
  const c = pontos.reduce((acc, p) => acc.add(p), V()).multiplyScalar(1 / pontos.length);
  let eixo = V(1, 1, 1).normalize();
  for (let it = 0; it < 50; it += 1) {
    const n = V();
    for (const p of pontos) { const d = p.clone().sub(c); n.add(d.multiplyScalar(d.dot(eixo))); }
    eixo = n.normalize();
  }
  const proj = pontos.map((p) => p.clone().sub(c).dot(eixo));
  const a = c.clone().add(eixo.clone().multiplyScalar(Math.min(...proj)));
  const b = c.clone().add(eixo.clone().multiplyScalar(Math.max(...proj)));
  return a.distanceTo(massa) < b.distanceTo(massa) ? { topo: a, fundo: b } : { topo: b, fundo: a };
}
function pocoUzi(pose) {
  const gun = pose.world('RIG_WEAPON_SMG').invert();
  const mag = pose.node('MINT_WEAPON_MAG_UZI');
  const pts = [];
  for (const prim of mag.getMesh().listPrimitives()) {
    // Só os vértices indexados: o pente reaproveita o buffer inteiro da malha da UZI.
    const pos = prim.getAttribute('POSITION'); const w = pose.world(mag);
    const usados = new Set(prim.getIndices().getArray());
    for (const i of usados) pts.push(V(...pos.getElement(i, [])).applyMatrix4(w).applyMatrix4(gun));
  }
  const massa = pose.pos('SOCKET_MINT_SIGHT').applyMatrix4(gun);
  const boca = pose.pos('SOCKET_MINT_MUZZLE').applyMatrix4(gun);
  const { topo, fundo } = extremos(pts, massa);
  return frameLocal(topo, fundo, boca, massa, escalaMundo(pose, 'RIG_WEAPON_SMG'));
}
function pocoPistola(pose) {
  const gun = pose.world('RIG_WEAPON_PISTOL').invert();
  const skin = pistolDoc.getRoot().listSkins().find((s) => s.listJoints().some((j) => j.getName() === 'Mag'));
  const juntas = skin.listJoints(); const ji = juntas.findIndex((j) => j.getName() === 'Mag');
  const ibm = skin.getInverseBindMatrices().getArray();
  const bind = new THREE.Matrix4().fromArray(ibm.slice(ji * 16, ji * 16 + 16));
  const magW = pose.world('Mag').multiply(bind);
  const pts = [];
  for (const prim of pose.node('GEO_WEAPON_PISTOL_SK_G18').getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); const J = prim.getAttribute('JOINTS_0'); const W = prim.getAttribute('WEIGHTS_0');
    for (let i = 0; i < pos.getCount(); i += 1) {
      const j = J.getElement(i, []); const w = W.getElement(i, []);
      if (j.some((x, k) => x === ji && w[k] > 0.5)) pts.push(V(...pos.getElement(i, [])).applyMatrix4(magW).applyMatrix4(gun));
    }
  }
  const massa = pose.pos('SOCKET_MINT_SIGHT').applyMatrix4(gun);
  const boca = pose.pos('SOCKET_MINT_MUZZLE').applyMatrix4(gun);
  const { topo, fundo } = extremos(pts, massa);
  return frameLocal(topo, fundo, boca, massa, escalaMundo(pose, 'RIG_WEAPON_PISTOL'));
}
const mundoDoPoco = (pose, gunName, poco) => {
  const g = pose.world(gunName);
  const q = new THREE.Quaternion(); g.decompose(V(), q, V());
  const rot = new THREE.Matrix4().makeRotationFromQuaternion(q).multiply(poco.rot);
  return rot.setPosition(poco.fundo.clone().applyMatrix4(g));
};

U.set('idle', 0); P.set('idle', 0);
const pocoU = pocoUzi(U);
const pocoP = pocoPistola(P);
const k = pocoU.comprimento / pocoP.comprimento;
// Coordenadas no poço da pistola → no poço da UZI (deformação só em Y).
const delta = pocoU.comprimento - pocoP.comprimento;
const deforma = (v) => {
  const L = pocoP.comprimento;
  const y = v.y > L ? v.y + delta : v.y < -L ? v.y - delta : v.y * k;
  return V(v.x, y, v.z);
};
// `topo`: a mão forte fica à mesma distância do TOPO do pente (o punho da UZI é a metade de
// cima do pente; embaixo ele sobra para fora do punho).
const transporta = (mundoP, FP, FU, topo = false) => {
  const rel = FP.clone().invert().multiply(mundoP);
  const t = V(); const q = new THREE.Quaternion(); const s = V(); rel.decompose(t, q, s);
  const p = topo ? V(t.x, t.y + delta, t.z) : deforma(t);
  return FU.clone().multiply(new THREE.Matrix4().compose(p, q, V(1, 1, 1)));
};

// ---- IK de dois ossos (ombro-cotovelo-mão), cotovelo guiado por `polo` ----
function ik(pose, lado, alvo, polo) {
  const up = `upperarm_${lado}`; const lo = `lowerarm_${lado}`; const mao = `hand_${lado}`;
  const S = pose.pos(up); const E = pose.pos(lo); const H = pose.pos(mao);
  const a = S.distanceTo(E); const b = E.distanceTo(H);
  const T = V().setFromMatrixPosition(alvo);
  const d = Math.min(Math.max(S.distanceTo(T), Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const dir = T.clone().sub(S).normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const poloDir = polo.clone().sub(S); poloDir.sub(dir.clone().multiplyScalar(poloDir.dot(dir))).normalize();
  const E2 = S.clone().add(dir.clone().multiplyScalar(a * cosA)).add(poloDir.multiplyScalar(a * Math.sqrt(Math.max(0, 1 - cosA * cosA))));
  const giraMundo = (nome, de, para) => {
    const qd = new THREE.Quaternion().setFromUnitVectors(de.clone().normalize(), para.clone().normalize());
    const w = pose.world(nome); const t = V(); const q = new THREE.Quaternion(); const s = V(); w.decompose(t, q, s);
    pose.override(nome, pose.localFor(nome, new THREE.Matrix4().compose(t, qd.multiply(q), s)));
  };
  giraMundo(up, E.clone().sub(S), E2.clone().sub(S));
  const E3 = pose.pos(lo); const H3 = pose.pos(mao);
  giraMundo(lo, H3.clone().sub(E3), T.clone().sub(E3));
  const qAlvo = new THREE.Quaternion(); alvo.decompose(V(), qAlvo, V());
  const w = pose.world(mao); const s = V(); w.decompose(V(), new THREE.Quaternion(), s);
  pose.override(mao, pose.localFor(mao, new THREE.Matrix4().compose(pose.pos(mao), qAlvo, s)));
  return pose.pos(mao).distanceTo(T);
}

const juntas = (lado) => uziDoc.getRoot().listNodes().map((n) => n.getName())
  .filter((n) => new RegExp(`^((clavicle|upperarm|lowerarm|hand)|(index|middle|ring|pinky|thumb)_0[123]|(upperarm|lowerarm)_twist_01)_${lado}$`).test(n));
const dedos = (lado) => juntas(lado).filter((n) => /^(index|middle|ring|pinky|thumb)/.test(n));
const copiaLocais = (de, para, nomes) => { for (const n of nomes) para.override(n, de.trs(n)); };

// Braço esquerdo abaixado: o quadro da recarga vazia da PT-38 em que a mão esquerda
// está mais baixa na tela (fora do quadro), congelado.
const durPV = duration(P.clip('reload_empty'));
let tBaixo = 0; let yMin = Infinity;
for (let t = 0; t <= durPV; t += 1 / 30) {
  P.set('reload_empty', t);
  const y = P.pos('hand_l').applyMatrix4(P.world('VIEWMODEL_CAMERA').invert()).y;
  if (y < yMin) { yMin = y; tBaixo = t; }
}
P.set('reload_empty', tBaixo);
const bracoBaixo = Object.fromEntries(juntas('l').map((n) => [n, P.trs(n)]));

const relatorio = { comprimentoPente: { uzi: +pocoU.comprimento.toFixed(4), pistola: +pocoP.comprimento.toFixed(4), k: +k.toFixed(3) }, bracoBaixoT: +tBaixo.toFixed(3), clips: {} };
const tempos = (dur) => { const out = []; for (let t = 0; t < dur - 1e-6; t += 1 / 30) out.push(+t.toFixed(5)); out.push(+dur.toFixed(5)); return out; };
const trsQuadro = (pose, nomes) => Object.fromEntries(nomes.map((n) => [n, pose.trs(n)]));

// ---- idle / shoot / inspect: arma e tempo da UZI; mão direita no punho como na pistola ----
P.set('idle', 0);
const FP0 = mundoDoPoco(P, 'RIG_WEAPON_PISTOL', pocoP);
const maoDireitaP = P.world('hand_r');
const dedosDireitaP = Object.fromEntries(dedos('r').map((n) => [n, P.trs(n)]));
const direita = [...juntas('r')];
const esquerda = [...juntas('l')];
for (const nome of ['idle', 'shoot', 'inspect']) {
  const dur = duration(U.clip(nome)); const ts = tempos(dur);
  const faixas = new Map([...direita, ...esquerda].map((n) => [U.node(n), []]));
  let erroMax = 0;
  for (const t of ts) {
    U.set(nome, t);
    for (const [n, trs] of Object.entries(bracoBaixo)) U.override(n, trs);
    // Braço livre fora do quadro também sai da cena (escala zero no ombro): o mixer o
    // devolve na entrada da recarga, ainda abaixado e fora da tela.
    U.override('upperarm_l', { scale: [0, 0, 0] });
    for (const [n, trs] of Object.entries(dedosDireitaP)) U.override(n, trs);
    const FU = mundoDoPoco(U, 'RIG_WEAPON_SMG', pocoU);
    const alvo = transporta(maoDireitaP, FP0, FU, true);
    const polo = U.pos('lowerarm_r');
    erroMax = Math.max(erroMax, ik(U, 'r', alvo, polo));
    for (const n of [...direita, ...esquerda]) faixas.get(U.node(n)).push(U.trs(n));
  }
  gravarClipe(uziDoc, nome, ts, faixas);
  relatorio.clips[nome] = { duracao: +dur.toFixed(3), erroIkMax: +erroMax.toFixed(5) };
}

// ---- recargas: tempo da PT-38 com entrada e saída do braço abaixado ----
// ENTRA s: a mão esquerda sobe do braço abaixado até o fundo do pente (pose t=0 da
// pistola); SAI s: volta a descer. A arma gira no poço como a pistola gira.
const ENTRA = 0.3; const SAI = 0.3;
// Pente (instantes no relógio da pistola): a mão agarra o fundo em PEGA e puxa; em TROCA,
// com a mão fora do quadro, passa a segurar o pente "novo" na pose em que ele encaixa em ENCAIXE.
// SEGURA: instante em que a mão da pistola segura o pente dela (dedos a ~4 cm); a pega do
// pente novo copia essa relação mão↔fundo-do-pente.
const PENTE = { reload_empty: { pega: 0.03, troca: 0.5, segura: 1.2, encaixe: 1.4, desliza: 0.12 }, reload_tactical: { pega: 0.03, troca: 0.55, segura: 1.2, encaixe: 1.4, desliza: 0.12 } };
const magU = U.node('MINT_WEAPON_MAG_UZI');
const boltU = U.node('MINT_MECH_UZI_BOLT');
const gunHand = U.node('ik_hand_gun');
const bracos = uziDoc.getRoot().listSkins().find((sk) => sk.listJoints().some((j) => j.getName() === 'hand_r')).listJoints()
  .map((n) => n.getName()).filter((n) => n !== 'ik_hand_gun');
const cursoOriginal = (() => {
  const ch = U.clip('reload_empty').listChannels().find((c) => c.getTargetNode() === boltU && c.getTargetPath() === 'translation');
  const base = V(...boltU.getTranslation()); let melhor = V();
  const out = ch.getSampler().getOutput().getArray();
  for (let i = 0; i < out.length; i += 3) { const d = V(out[i], out[i + 1], out[i + 2]).sub(base); if (d.length() > melhor.length()) melhor = d; }
  return melhor;
})();
// Monta a pose da UZI no instante `tp` do clipe da pistola (tp < 0 = antes do início).
function poseRecarga(nome, tp, FPi, qPi, FU0) {
  const tc = Math.max(0, tp);
  P.set(nome, tc); U.set('idle', 0);
  for (const n of bracos) U.override(n, P.trs(n));
  const FPt = mundoDoPoco(P, 'RIG_WEAPON_PISTOL', pocoP);
  const qPt = new THREE.Quaternion(); FPt.decompose(V(), qPt, V());
  const qDelta = qPt.clone().multiply(qPi.clone().invert());
  const FUt = new THREE.Matrix4().makeRotationFromQuaternion(qDelta.multiply(new THREE.Quaternion().setFromRotationMatrix(FU0)))
    .setPosition(V().setFromMatrixPosition(FU0).add(V().setFromMatrixPosition(FPt).sub(V().setFromMatrixPosition(FPi))));
  const gunWorld = FUt.clone().multiply(mundoDoPoco(U, 'RIG_WEAPON_SMG', pocoU).invert()).multiply(U.world('RIG_WEAPON_SMG'));
  U.override(gunHand, U.localFor(gunHand, gunWorld.multiply(U.local('RIG_WEAPON_SMG').invert())));
  const FU = mundoDoPoco(U, 'RIG_WEAPON_SMG', pocoU);
  const erroR = ik(U, 'r', transporta(P.world('hand_r'), FPt, FU, true), V().setFromMatrixPosition(transporta(P.world('lowerarm_r'), FPt, FU, true)));
  const erroL = ik(U, 'l', transporta(P.world('hand_l'), FPt, FU), V().setFromMatrixPosition(transporta(P.world('lowerarm_l'), FPt, FU)));
  return { FU, erroR, erroL };
}
const misturaBraco = (peso) => {
  if (peso > 0.999) return;
  for (const n of juntas('l')) {
    const q = new THREE.Quaternion(...bracoBaixo[n].rotation).slerp(new THREE.Quaternion(...U.trs(n).rotation), peso);
    U.override(n, { rotation: [q.x, q.y, q.z, q.w] });
  }
};
for (const nome of ['reload_tactical', 'reload_empty']) {
  const durP = duration(P.clip(nome)); const dur = ENTRA + durP + SAI; const ts = tempos(dur);
  const cfg = PENTE[nome];
  P.set(nome, 0); const FPi = mundoDoPoco(P, 'RIG_WEAPON_PISTOL', pocoP);
  const qPi = new THREE.Quaternion(); FPi.decompose(V(), qPi, V());
  U.set('idle', 0); const FU0 = mundoDoPoco(U, 'RIG_WEAPON_SMG', pocoU);
  const magNoPoco = FU0.clone().invert().multiply(U.world(magU));
  const sliderBase = V(...P.set(nome, 0).trs('Slider').translation);
  let sliderMax = 1e-6;
  for (let t = 0; t <= durP; t += 1 / 30) sliderMax = Math.max(sliderMax, V(...P.set(nome, t).trs('Slider').translation).distanceTo(sliderBase));
  // Relações pente↔mão: na pega (pente ainda encaixado) e no encaixe (pente já no lugar).
  const relacao = (tp) => { const { FU } = poseRecarga(nome, tp, FPi, qPi, FU0); return U.world('hand_l').invert().multiply(FU.clone().multiply(magNoPoco)); };
  const H1 = relacao(cfg.pega);
  P.set(nome, 0); const magRestP = P.world('Mag');
  P.set(nome, cfg.segura);
  const H2 = P.world('hand_l').invert().multiply(P.world('Mag')).multiply(magRestP.invert()).multiply(FPi).multiply(magNoPoco);
  const faixas = new Map([...bracos, 'ik_hand_gun'].map((n) => [U.node(n), []]));
  faixas.set(magU, []); faixas.set(boltU, []);
  let erroMax = 0; const eventos = [];
  for (const t of ts) {
    const tp = Math.min(t - ENTRA, durP);
    const { FU, erroR, erroL } = poseRecarga(nome, tp, FPi, qPi, FU0);
    const peso = Math.min(smooth(t / ENTRA), smooth((dur - t) / SAI));
    if (peso > 0.999) erroMax = Math.max(erroMax, erroL);
    erroMax = Math.max(erroMax, erroR);
    misturaBraco(peso);
    const maoL = U.world('hand_l');
    const encaixado = FU.clone().multiply(magNoPoco);
    let magWorld = encaixado;
    if (tp >= cfg.pega && tp < cfg.troca) magWorld = maoL.clone().multiply(H1);
    else if (tp >= cfg.troca && tp < cfg.encaixe) {
      magWorld = maoL.clone().multiply(H2);
      const u = (tp - (cfg.encaixe - cfg.desliza)) / cfg.desliza;
      if (u > 0) magWorld = blend(magWorld, encaixado, smooth(u));
    }
    const frac = V(...P.trs('Slider').translation).distanceTo(sliderBase) / sliderMax;
    U.override(boltU, { translation: V(...boltU.getTranslation()).add(cursoOriginal.clone().multiplyScalar(nome === 'reload_empty' && tp >= 0 ? frac : 0)).toArray() });
    for (const n of [...bracos, 'ik_hand_gun']) faixas.get(U.node(n)).push(U.trs(n));
    faixas.get(magU).push(U.localFor(magU, magWorld));
    faixas.get(boltU).push(U.trs(boltU));
  }
  const clip = U.clip(nome);
  for (const ch of clip.listChannels()) { const smp = ch.getSampler(); ch.dispose(); smp.dispose(); }
  gravarClipe(uziDoc, nome, ts, faixas);
  relatorio.clips[nome] = { duracao: +dur.toFixed(3), doador: `pistol:${nome}`, entra: ENTRA, sai: SAI, pente: cfg, erroIkMax: +erroMax.toFixed(4), sliderMax: +sliderMax.toFixed(4) };
}

// ---- saque de uma mão: o pacote geral traz as duas mãos; aqui o idle de uma mão sobe
// de baixo do quadro (translação do RIG_FP_ARMS no referencial da câmera) ----
{
  const SAQUE = 0.8; const QUEDA = 0.28; const ts = tempos(SAQUE);
  const idle = U.clip('idle');
  const nos = [...new Set(idle.listChannels().map((ch) => ch.getTargetNode()))].filter((n) => n.getName() !== 'RIG_FP_ARMS');
  const raiz = U.node('RIG_FP_ARMS');
  const faixas = new Map([...nos, raiz].map((n) => [n, []]));
  U.set('idle', 0);
  const cam = U.world('VIEWMODEL_CAMERA');
  const baixo = V(0, -1, 0).transformDirection(cam).multiplyScalar(QUEDA);
  const paiRaiz = U.parent.get(raiz);
  const baixoLocal = paiRaiz ? baixo.clone().transformDirection(U.world(paiRaiz).invert()).multiplyScalar(QUEDA) : baixo;
  for (const t of ts) {
    U.set('idle', Math.min(t, duration(idle)));
    for (const n of nos) faixas.get(n).push(U.trs(n));
    const u = 1 - smooth(t / (SAQUE * 0.85));
    const r = U.trs(raiz);
    faixas.get(raiz).push({ ...r, translation: V(...r.translation).addScaledVector(baixoLocal, u).toArray() });
  }
  gravarClipe(uziDoc, 'equip_rifle', ts, faixas);
  relatorio.clips.equip_rifle = { duracao: SAQUE, queda: QUEDA, base: 'idle de uma mão' };
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'uzi-baked-runtime.glb');
await io.write(output, uziDoc);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'uzi', ...relatorio,
  source: { bytes: sourceBytes.length, sha256: SOURCE_SHA }, donor: { bytes: donorBytes.length, sha256: digest(donorBytes) },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'uzi-uma-mao.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`UZI_UMA_MAO_OK ${JSON.stringify(report)}`);

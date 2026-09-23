#!/usr/bin/env node
// Pegada de apoio no guarda-mão para produtos K herdados do pacote M4.
//
// O pacote M4 da KINEMATION segura um punho vertical que as armas derivadas não
// têm: a mão esquerda fecha no ar abaixo do guarda-mão (fila L1: m92, md97). Aqui
// o punho fechado é girado para que o eixo do punho vire o eixo do cano, com a
// palma por baixo, e o centro do punho vai ao eixo do guarda-mão. O braço segue
// por IK de dois ossos (polo = cotovelo original) em todos os quadros; na recarga
// a correção desvanece quando a mão sai da pose de apoio (ela vai buscar o pente).
//
// Uso: node grip-support.mjs --arma=m92 --in=<glb> --out=<glb> [--relatorio=<json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3, Quaternion, Matrix4 } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// alvo = ponto do eixo do guarda-mão no espaço local da malha da arma (medido nas
// fatias da malha: meio da altura/largura da madeira ou do trilho inferior).
// rolagem = giro em torno do cano (graus): palma por baixo; >0 leva o pulso para a esquerda
// (o antebraço passa na frente do pente em vez de atravessá-lo — md97).
// fecho = fração da curva original dos dedos (1 = como veio; <1 abre o punho).
export const GRIPS = {
  // M92: 2º passe leva o punho direito (fechava ~19 cm à frente, atrás do pente) ao cabo real.
  m92: [{ corpo: 'MINT_WEAPON_M92', alvo: [-0.17, 0.105, 0.021], rolagem: 0, fecho: 0.9, clipes: ['idle', 'reload_tactical', 'reload_empty'],
    dedosDireitosFechados: ['reload_tactical', 'reload_empty'] },
  // O punho direito é rígido na arma em todos os clipes e o ombro fica sobre o cabo: quem anda é a
  // arma (d no espaço dela: centro do punho → cabo a 3,5 cm do guarda-mato); o braço esquerdo vai junto, sem IK.
  { tipo: 'deslocar', corpo: 'MINT_WEAPON_M92', d: [-0.224, -0.038, -0.025], lado: 'l' }],
  // AK e AKM K: o pacote M4 fecha a mão esquerda abaixo do guarda-mão, na frente do pente, e o
  // punho direito ~9 cm à frente do cabo (mesmo braço da M92); a arma anda até o punho.
  ak: [{ corpo: 'MINT_WEAPON_AK', alvo: [-0.15, 0.08, 0.011], rolagem: 0, fecho: 0.9, clipes: ['idle', 'reload_tactical', 'reload_empty'],
    dedosDireitosFechados: ['reload_tactical', 'reload_empty'] },
    { tipo: 'deslocar', corpo: 'MINT_WEAPON_AK', d: [-0.105, -0.038, -0.014], lado: 'l' }],
  akm: [{ corpo: 'MINT_WEAPON_AKM', alvo: [-0.15, 0.08, 0.009], rolagem: 0, fecho: 0.9, clipes: ['idle', 'reload_tactical', 'reload_empty'],
    dedosDireitosFechados: ['reload_tactical', 'reload_empty'] },
    { tipo: 'deslocar', corpo: 'MINT_WEAPON_AKM', d: [-0.117, -0.038, -0.013], lado: 'l' }],
  // Pente MD97 veio sem UV nem textura (0,8 cinza fosco = bloco branco na tela): herda
  // a média do atlas da própria arma (Color 0,32/0,30/0,28 sRGB, ORM rug. 0,48 metal 0,80).
  md97: { corpo: 'MINT_WEAPON_MD97', alvo: [-0.19, 0.049, -0.01], rolagem: 30, fecho: 0.9, clipes: ['idle', 'reload_tactical', 'reload_empty'],
    poloFixo: 'apoio', poloDir: [0.7, -1, 0],
    materiais: { 'MD97 Magazine': { base: [0.084, 0.075, 0.064, 1], metal: 0.8, rugosidade: 0.48 } } },
  // KSG já girada (shotgun-k-fix.mjs): mão esquerda no punho vertical da bomba, presa ao
  // osso da bomba para correr junto no tiro. Alvo em RIG_WEAPON_SHOTGUN (unidades do rig).
  shotgun: { corpo: 'RIG_WEAPON_SHOTGUN', referencia: 'MINT_MECH_SHOTGUN_PUMP', frenteLocal: [0, 0, 1], cimaLocal: [0, 1, 0],
    // No tiro a mão original corre com a bomba virada: fica presa à bomba o clipe inteiro.
    // Punho 1 cm à frente e 0,3 cm abaixo, dedos abertos (fecho 0,7) e polegar girado: as falanges
    // médias entravam 1,7 cm no punho da bomba ("mão enterrada"); ficam 0,7 cm (vm-pegada-k PG11).
    alvo: [0, -2.8, 15.5], eixo: 'vertical', rolagem: -70, fecho: 0.7, sempreNaArma: ['idle', 'shoot', 'inspect', 'equip_rifle'], poloFixo: true,
    clipes: ['idle', 'shoot', 'equip_rifle', 'reload_start', 'reload_loop', 'reload_end', 'inspect'] },
};

const DEDOS = ['index', 'middle', 'ring', 'pinky'];
const curva = (lado) => DEDOS.flatMap((d) => ['01', '02', '03'].map((k) => `${d}_${k}_${lado}`));

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const rot = (m) => { const q = new Quaternion(); m.decompose(new Vector3(), q, new Vector3()); return q; };

// Círculo por mínimos quadrados (Kåsa) no plano ⟂ ao eixo: centro e raio do punho.
function eixoDoPunho(pts, eixo) {
  const u = new Vector3(1, 0, 0);
  if (Math.abs(u.dot(eixo)) > 0.9) u.set(0, 1, 0);
  u.sub(eixo.clone().multiplyScalar(u.dot(eixo))).normalize();
  const v = new Vector3().crossVectors(eixo, u);
  const o = pts.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / pts.length);
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  const n = pts.length;
  for (const p of pts) {
    const d = p.clone().sub(o);
    const x = d.dot(u), y = d.dot(v), z = x * x + y * y;
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * z; syz += y * z; sz += z;
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const b = [sxz, syz, sz];
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(A);
  const sol = [0, 1, 2].map((k) => det3(A.map((row, i) => row.map((c, j) => (j === k ? b[i] : c)))) / D);
  const cx = sol[0] / 2, cy = sol[1] / 2;
  const r = Math.sqrt(sol[2] + cx * cx + cy * cy);
  return { centro: o.clone().add(u.multiplyScalar(cx)).add(v.multiplyScalar(cy)), raio: r };
}

function base(eixo, lado) {
  const x = eixo.clone().normalize();
  const y = lado.clone().sub(x.clone().multiplyScalar(lado.dot(x))).normalize();
  const z = new Vector3().crossVectors(x, y);
  return new Matrix4().makeBasis(x, y, z);
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// IK de dois ossos no espaço de mundo; devolve rotações de mundo novas de braço e antebraço.
export function ik(S, E, H, alvo, qUpper, qLower, polo = null) {
  const L1 = E.distanceTo(S), L2 = H.distanceTo(E);
  const toT = alvo.clone().sub(S);
  const d = Math.min(toT.length(), (L1 + L2) * 0.999);
  const u = toT.normalize();
  const pole = (polo || E).clone().sub(S);
  const v = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const E2 = S.clone().add(u.clone().multiplyScalar(L1 * cosA)).add(v.multiplyScalar(L1 * sinA));
  const H2 = S.clone().add(u.clone().multiplyScalar(d));
  const dq1 = new Quaternion().setFromUnitVectors(E.clone().sub(S).normalize(), E2.clone().sub(S).normalize());
  const qU = dq1.clone().multiply(qUpper);
  const Hmoved = H.clone().sub(S).applyQuaternion(dq1).add(S);
  const dq2 = new Quaternion().setFromUnitVectors(Hmoved.sub(E2).normalize(), H2.clone().sub(E2).normalize());
  const qL = dq2.multiply(dq1.clone().multiply(qLower));
  return { qU, qL, E2, H2, alcance: alvo.distanceTo(S) / (L1 + L2) };
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function twistX(q) {
  const t = new Quaternion(q.x, 0, 0, q.w).normalize();
  return 2 * Math.atan2(t.x, t.w);
}

// A pele do antebraço mora dentro da manga e segue o osso de torção; com o punho girado
// ela vaza entre luva e manga. Some o que tem peso ≥ 0,25 em antebraço/braço (a luva e a
// manga cobrem essa faixa); a mão fica.
function cortarPeleSobManga(pose, limiarPele) {
  const node = pose.node('GEO_FP_SK_Hand');
  const joints = node.getSkin().listJoints().map((j) => j.getName());
  const braco = new Set(['l', 'r'].flatMap((s) => [`lowerarm_${s}`, `lowerarm_twist_01_${s}`, `upperarm_${s}`, `upperarm_twist_01_${s}`]));
  let antes = 0, depois = 0;
  for (const prim of node.getMesh().listPrimitives()) {
    const J = prim.getAttribute('JOINTS_0').getArray();
    const W = prim.getAttribute('WEIGHTS_0').getArray();
    const coberto = (k) => {
      let s = 0;
      for (let q = 0; q < 4; q++) if (braco.has(joints[J[k * 4 + q]])) s += W[k * 4 + q];
      return s >= (limiarPele ?? 0.25);
    };
    const idx = prim.getIndices().getArray();
    const fica = [];
    for (let k = 0; k < idx.length; k += 3) {
      if (!(coberto(idx[k]) && coberto(idx[k + 1]) && coberto(idx[k + 2]))) fica.push(idx[k], idx[k + 1], idx[k + 2]);
    }
    antes += idx.length / 3; depois += fica.length / 3;
    prim.setIndices(pose.doc.createAccessor().setType('SCALAR').setArray(new idx.constructor(fica))
      .setBuffer(pose.doc.getRoot().listBuffers()[0]));
  }
  return { triangulosAntes: antes, triangulosDepois: depois };
}

// Mão do gatilho: no pacote M4 os dedos direitos abrem no meio da recarga (a mão não sai do
// punho, só abre — "mão de gatilho abre", fila L1). Em fuzil AK eles ficam fechados como no idle.
function fecharDedosDireitos(pose, clipes, trsIdle) {
  const dedos = ['index', 'middle', 'ring', 'pinky', 'thumb'].flatMap((d) => ['01', '02', '03'].map((k) => `${d}_${k}_r`));
  let canais = 0;
  for (const clipe of clipes) {
    const anim = pose.anims.get(clipe);
    for (const nome of dedos) {
      const i = pose.byName.get(nome);
      const c = anim.listChannels().find((ch) => ch.getTargetNode() === pose.nodes[i] && ch.getTargetPath() === 'rotation');
      if (!c) continue;
      const out = c.getSampler().getOutput();
      const arr = new Float32Array(out.getArray().length);
      for (let k = 0; k < arr.length; k += 4) arr.set(trsIdle[i].r, k);
      c.getSampler().setOutput(pose.doc.createAccessor().setType('VEC4').setArray(arr).setBuffer(pose.doc.getRoot().listBuffers()[0]));
      canais++;
    }
  }
  return { clipes, canais };
}

// Arma andando `d` no próprio espaço (B' = B·T_d) em todos os clipes; o braço `lado` recebe a mesma
// translação de mundo pela clavícula, então mão, pente e alavanca continuam onde estavam na arma.
export async function deslocar({ arma, entrada, saida, cfg }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const iB = pose.byName.get(cfg.corpo), iC = pose.byName.get(`clavicle_${cfg.lado}`);
  if (iB == null || iC == null) throw new Error(`${arma}: corpo ou clavícula ausente`);
  const [nB, nC] = [pose.nodes[iB], pose.nodes[iC]];
  const d = new Vector3(...cfg.d);
  const novaT = (trs, i, W) => {
    if (i === iB) return new Vector3(...trs[iB].t).add(d.clone().multiply(new Vector3(...trs[iB].s)).applyQuaternion(new Quaternion(...trs[iB].r)));
    const delta = d.clone().applyMatrix4(W[iB]).sub(pos(W[iB]));
    const pai = W[pose.parent[iC]];
    const local = delta.applyQuaternion(rot(pai).invert()).divide(new Vector3().setFromMatrixScale(pai));
    return new Vector3(...trs[iC].t).add(local);
  };
  const relatorio = { arma, tipo: 'deslocar', d: cfg.d, clipes: {} };
  let repouso = null;
  for (const [clipe, anim] of pose.anims) {
    const canal = (n, p) => anim.listChannels().find((c) => c.getTargetNode() === n && c.getTargetPath() === p);
    const alvos = [[iB, nB], [iC, nC]].filter(([, n]) => canal(n, 'translation') || canal(n, 'rotation'));
    if (!alvos.length) continue;
    const tempos = [...new Set([nB, nC].flatMap((n) => ['translation', 'rotation'].map((p) => canal(n, p)).filter(Boolean)
      .flatMap((c) => Array.from(c.getSampler().getInput().getArray()))))].sort((a, b) => a - b);
    const out = [new Float32Array(tempos.length * 3), new Float32Array(tempos.length * 3)];
    tempos.forEach((t, k) => {
      const trs = pose.local(clipe, t);
      const W = pose.mundo(trs);
      out[0].set(novaT(trs, iB, W).toArray(), k * 3);
      out[1].set(novaT(trs, iC, W).toArray(), k * 3);
    });
    const input = doc.createAccessor(`${clipe}_desloca_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
    [nB, nC].forEach((n, j) => {
      const nova = doc.createAnimationSampler(`${clipe}_desloca_${j}`).setInput(input).setInterpolation('LINEAR')
        .setOutput(doc.createAccessor().setType('VEC3').setArray(out[j]).setBuffer(buffer));
      anim.addSampler(nova);
      const c = canal(n, 'translation');
      if (c) {
        const s = c.getSampler();
        c.setSampler(nova);
        if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
      } else anim.addChannel(doc.createAnimationChannel().setTargetNode(n).setTargetPath('translation').setSampler(nova));
    });
    if (clipe === 'idle') repouso = [Array.from(out[0].slice(0, 3)), Array.from(out[1].slice(0, 3))];
    relatorio.clipes[clipe] = { quadros: tempos.length };
  }
  if (repouso) { nB.setTranslation(repouso[0]); nC.setTranslation(repouso[1]); }
  // Clipes que só animam o pacote (tiro, saque, inspeção) usam o repouso: tem de ser o do idle.
  if (!pose.anims.has('idle')) throw new Error(`${arma}: deslocar pede o clipe idle`);
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

export async function aplicar({ arma, entrada, saida, cfg = GRIPS[arma], extra = {} }) {
  if (cfg.tipo === 'deslocar') return deslocar({ arma, entrada, saida, cfg });
  cfg = { ...cfg, ...extra };
  const pose = await carregar(entrada);
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const iBody = I(cfg.corpo);
  const lado = cfg.lado || 'l';
  const CURVA = curva(lado);
  const iU = I(`upperarm_${lado}`), iL = I(`lowerarm_${lado}`), iH = I(`hand_${lado}`), iT = I(`lowerarm_twist_01_${lado}`);
  const iMuzzle = I('SOCKET_MINT_MUZZLE'), iSight = I('SOCKET_MINT_SIGHT');

  // Referência: pose idle.
  const trs0 = pose.local('idle', 0);
  const W0 = pose.mundo(trs0);
  const body = W0[iBody];
  const hand0 = W0[iH];
  const handInv0 = hand0.clone().invert();
  const pts = CURVA.map((n) => pos(W0[I(n)]));
  const knuckleAxis = pos(W0[I(`pinky_01_${lado}`)]).sub(pos(W0[I(`index_01_${lado}`)])).normalize();
  const { centro, raio } = eixoDoPunho(pts, knuckleAxis);
  const centroLocalMao = centro.clone().applyMatrix4(handInv0);
  const palma = pos(hand0).add(pos(W0[I(`middle_01_${lado}`)])).multiplyScalar(0.5).sub(centro);

  // Eixos da arma: frente pelos sockets (boca − alça) ou declarada no nó de referência.
  const iRef = I(cfg.referencia || cfg.corpo);
  const ref0 = W0[iRef];
  const frente = cfg.frenteLocal
    ? new Vector3(...cfg.frenteLocal).transformDirection(body)
    : pos(W0[iMuzzle]).sub(pos(W0[iSight])).normalize();
  const cimaArma = new Vector3(...(cfg.cimaLocal || [0, 1, 0])).transformDirection(body);
  const cima = cimaArma.clone().sub(frente.clone().multiplyScalar(cimaArma.dot(frente))).normalize();
  const giro = (cfg.rolagem * Math.PI) / 180;
  // cano: eixo do punho ao longo do cano (indicador do lado da boca), palma por baixo.
  // vertical: punho vertical (indicador em cima), palma para a culatra girada pela rolagem.
  const [eixoAlvo, palmaAlvo] = cfg.eixo === 'vertical'
    ? [cima.clone().negate(), frente.clone().negate().applyAxisAngle(cima, giro)]
    : [frente.clone().negate(), cima.clone().negate().applyAxisAngle(frente, giro)];
  const R = base(eixoAlvo, palmaAlvo).multiply(base(knuckleAxis, palma).invert());
  // guinada: dedos em diagonal sobre o guarda-mão (graus, em torno do eixo vertical da arma).
  // manterOrientacao: só translada o punho (mão do gatilho que já tem a pegada certa, no lugar errado).
  const qR = cfg.manterOrientacao ? new Quaternion()
    : new Quaternion().setFromAxisAngle(palmaAlvo, ((cfg.guinada || 0) * Math.PI) / 180).multiply(rot(R));
  const alvo = cfg.alvo ? new Vector3(...cfg.alvo).applyMatrix4(body) : null;
  if (!alvo) throw new Error(`${arma}: alvo do guarda-mão não calibrado`);
  // A pegada é rígida no nó de referência (corpo parado, ou a bomba que corre no tiro).
  const refInv0 = ref0.clone().invert();
  const alvoRef = alvo.clone().applyMatrix4(refInv0);
  const qMaoRef = rot(ref0).invert().multiply(qR.clone().multiply(rot(hand0)));
  const centroRef0 = centro.clone().applyMatrix4(refInv0);
  const escala = new Vector3().setFromMatrixScale(W0[I('hand_r')]).x / 0.01;
  // Polo fixo na câmera do pacote: cotovelo para baixo e para fora (esquerda da câmera).
  const cam0 = W0[I('VIEWMODEL_CAMERA')];
  const bracoL = pos(W0[iL]).distanceTo(pos(W0[iU]));
  const poloCamera = new Vector3(...(cfg.poloDir || [-0.4, -1, 0])).transformDirection(cam0).multiplyScalar(bracoL);

  const relatorio = { arma, raioPunhoM: +raio.toFixed(4), alvo: cfg.alvo, rolagem: cfg.rolagem, fecho: cfg.fecho, clipes: {} };
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const nodeU = pose.nodes[iU], nodeL = pose.nodes[iL], nodeH = pose.nodes[iH], nodeT = pose.nodes[iT];
  const fingerNodes = CURVA.map((n) => pose.nodes[I(n)]);
  const repouso = new Map(fingerNodes.map((n) => [n, new Quaternion(...n.getRotation())]));

  for (const clipe of cfg.clipes) {
    const anim = pose.anims.get(clipe);
    if (!anim) throw new Error(`${arma}: clipe ${clipe} ausente`);
    const canal = (node, p) => anim.listChannels().find((c) => c.getTargetNode() === node && c.getTargetPath() === p);
    const alvos = [nodeU, nodeL, nodeH, nodeT, ...fingerNodes].map((n) => canal(n, 'rotation'));
    if (alvos.some((c) => !c)) throw new Error(`${arma}/${clipe}: canal de rotação do braço esquerdo ausente`);
    // Tempos: união dos tempos dos canais do braço (todos amostrados no bake).
    const tempos = [...new Set(alvos.slice(0, 4).flatMap((c) => Array.from(c.getSampler().getInput().getArray())))].sort((a, b) => a - b);
    const out = alvos.map(() => new Float32Array(tempos.length * 4));
    let pesoMax = 0, pesoMin = 1, alcanceMax = 0;
    tempos.forEach((t, k) => {
      const trs = pose.local(clipe, t);
      const W = pose.mundo(trs);
      const centroT = centroLocalMao.clone().applyMatrix4(W[iH]);
      // Peso: 1 com a mão na pose de apoio, 0 quando ela sai (> 8 cm, relativo à arma) para
      // buscar o pente/cartucho; o curso da bomba acompanha a arma e não conta como saída.
      const refT = W[iRef];
      const desvio = centroT.clone().applyMatrix4(refT.clone().invert()).sub(centroRef0)
        .multiply(new Vector3().setFromMatrixScale(refT)).length() / escala;
      const peso = cfg.sempreNaArma?.includes(clipe) ? 1 : 1 - smooth(0.02, 0.08, desvio);
      pesoMax = Math.max(pesoMax, peso); pesoMin = Math.min(pesoMin, peso);
      const qHand = rot(W[iH]);
      const qAlvo = rot(refT).multiply(qMaoRef);
      const qHandNovo = qHand.clone().slerp(qAlvo, peso);
      const qW = qHandNovo.clone().multiply(qHand.clone().invert());
      const novoCentro = centroT.clone().lerp(alvoRef.clone().applyMatrix4(refT), peso);
      const hPos = pos(W[iH]);
      const hPosNovo = hPos.clone().sub(centroT).applyQuaternion(qW).add(novoCentro);
      const S = pos(W[iU]), E = pos(W[iL]);
      // poloFixo: o polo do clipe original (feito para a manga cortada) sobe o cotovelo até a
      // câmera; com a manga inteira isso vira a boca do ombro no quadro. 'apoio' só na pegada.
      const polo = cfg.poloFixo
        ? S.clone().add(hPosNovo).multiplyScalar(0.5).add(poloCamera).lerp(E, cfg.poloFixo === 'apoio' ? 1 - peso : 0)
        : null;
      const { qU, qL, alcance } = ik(S, E, hPos, hPosNovo, rot(W[iU]), rot(W[iL]), polo);
      alcanceMax = Math.max(alcanceMax, alcance);
      const parentU = rot(W[pose.parent[iU]]);
      const qULocal = parentU.clone().invert().multiply(qU);
      // Pronação: metade do giro novo do punho vai ao antebraço e 3/4 ao osso de torção,
      // como no rig UE; sem isso a luva torce 150° no pulso e a pele aparece.
      const qHLocalOld = new Quaternion(...trs[iH].r);
      const dTwist = wrap(twistX(qL.clone().invert().multiply(qHandNovo)) - twistX(qHLocalOld));
      const qL2 = qL.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * (cfg.pronacao?.[0] ?? 0.5)));
      const qLLocal = qU.clone().invert().multiply(qL2);
      const qHLocal = qL2.clone().invert().multiply(qHandNovo);
      const qTOld = new Quaternion(...trs[iT].r);
      const qTLocal = qTOld.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * (cfg.pronacao?.[1] ?? 0.25)));
      const fecho = 1 + (cfg.fecho - 1) * peso;
      const quats = [qULocal, qLLocal, qHLocal, qTLocal, ...fingerNodes.map((n) => {
        const q = new Quaternion(...trs[pose.index.get(n)].r);
        const rest = repouso.get(n).clone();
        // Abre o punho interpolando da pose do clipe para o repouso do osso.
        return rest.clone().slerp(q, fecho);
      })];
      quats.forEach((q, j) => { q.normalize(); out[j].set([q.x, q.y, q.z, q.w], k * 4); });
    });
    const input = doc.createAccessor(`${clipe}_gripfix_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
    alvos.forEach((c, j) => {
      const s = c.getSampler();
      const nova = doc.createAnimationSampler(`${clipe}_gripfix_${j}`)
        .setInput(input)
        .setOutput(doc.createAccessor().setType('VEC4').setArray(out[j]).setBuffer(buffer))
        .setInterpolation(tempos.length > 2 ? 'LINEAR' : s.getInterpolation());
      anim.addSampler(nova);
      c.setSampler(nova);
      if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
    });
    // Clipes que só animam o pacote (shoot, equip, inspect) devolvem o braço ao TRS do nó:
    // o repouso tem de ser a pegada nova, ou a mão volta a flutuar no tiro.
    if (clipe === 'idle') {
      alvos.forEach((c, j) => c.getTargetNode().setRotation(Array.from(out[j].slice(0, 4))));
    }
    relatorio.clipes[clipe] = { quadros: tempos.length, pesoMin: +pesoMin.toFixed(3), pesoMax: +pesoMax.toFixed(3), alcanceMax: +alcanceMax.toFixed(3) };
  }
  if (cfg.dedosDireitosFechados) relatorio.dedosDireitos = fecharDedosDireitos(pose, cfg.dedosDireitosFechados, trs0);
  relatorio.peleCortada = cortarPeleSobManga(pose, cfg.limiarPele);
  for (const [nome, m] of Object.entries(cfg.materiais || {})) {
    const mat = doc.getRoot().listMaterials().find((x) => x.getName() === nome);
    if (!mat) throw new Error(`${arma}: material ${nome} ausente`);
    mat.setBaseColorFactor(m.base).setMetallicFactor(m.metal).setRoughnessFactor(m.rugosidade);
    relatorio.materiais = { ...(relatorio.materiais || {}), [nome]: m };
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const entrada = path.resolve(opt('in'));
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const passos = [GRIPS[arma]].flat();
  const rel = [];
  for (const [k, cfg] of passos.entries()) {
    rel.push(await aplicar({ arma, entrada: k === 0 ? entrada : saida, saida, cfg, extra: JSON.parse(opt('cfg', '{}')) }));
  }
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

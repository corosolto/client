#!/usr/bin/env node
// Braço estável: refaz braço e antebraço por IK de dois ossos mantendo a MÃO onde o clipe a
// põe (posição e rotação de mundo), mas partindo da orientação do braço no idle e com o polo no
// cotovelo do idle. Serve aos pacotes em que o clipe gira o braço inteiro (cotovelo varrendo
// 20–30 cm para fora e para a câmera) para levar a mão ao ferrolho/munição: a manga estendida do
// runtime (`vmsleeve.js`) nasce na boca do deltoide e segue o osso do braço, então cada grau de
// giro do braço vira um tubo de manga atravessando a tela (rem700, fila P9: "braço direito cobre
// 40–60% da tela na recarga/saque").
//
// A mão e os dedos não mudam no mundo (contato com a arma preservado); só o cotovelo muda.
// `limite`: fração do caminho idle→clipe que o cotovelo pode andar (0 = polo do idle puro).
// `arma`: { no, fator } amortece o movimento da arma no clipe (fator = fração do deslocamento
// idle→clipe que fica); as duas mãos vão junto no referencial da arma (pegada preservada) e o IK
// dos braços parte daí. Menos giro da arma = menos giro do braço de apoio = menos tubo de manga.
//
// Uso: node braco-estavel.mjs --arma=rem700 --in=<glb> --out=<glb> [--relatorio=<json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';
import { ik } from './grip-support.mjs';

const { Vector3, Quaternion } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// rem700: a arma gira ~25° na recarga do pacote de ferrolho e leva o braço de apoio junto; fica 35%
// do movimento (vm-palco-offline: manga na tela, pior quadro, 53–64% → 14–17%; idle 5%).
const RECARGA_BOLT = ['reload_empty', 'reload_start', 'reload_loop', 'reload_end', 'shoot'];
export const BRACOS = {
  rem700: { lados: ['r', 'l'], limite: 0, clipes: RECARGA_BOLT, arma: { no: 'ik_hand_gun', fator: 0.35, clipes: RECARGA_BOLT } },
};

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const rot = (m) => { const q = new Quaternion(); m.decompose(new Vector3(), q, new Vector3()); return q; };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const twistX = (q) => { const t = new Quaternion(q.x, 0, 0, q.w).normalize(); return 2 * Math.atan2(t.x, t.w); };

export async function aplicar({ arma, entrada, saida, cfg = BRACOS[arma], pose: dada = null }) {
  const pose = dada || await carregar(entrada);
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const W0 = pose.mundo(pose.local('idle', 0));
  const trs0 = pose.local('idle', 0);
  const relatorio = { arma, receita: 'braco-estavel', limite: cfg.limite, amortece: cfg.arma || null, lados: {}, clipes: {} };
  // Delta de mundo D(t) = arma amortecida · arma original⁻¹, por clipe e instante.
  const deltas = new Map();
  const deltaEm = (clipe, t, W) => {
    if (!cfg.arma || !cfg.arma.clipes?.includes(clipe)) return new THREE.Matrix4();
    const chave = `${clipe}@${t}`;
    if (deltas.has(chave)) return deltas.get(chave);
    const iG = I(cfg.arma.no);
    const G = W[iG], G0 = W0[iG];
    const p = pos(G0).lerp(pos(G), cfg.arma.fator);
    const q = rot(G0).slerp(rot(G), cfg.arma.fator);
    const s = new Vector3().setFromMatrixScale(G);
    const D = new THREE.Matrix4().compose(p, q, s).multiply(G.clone().invert());
    deltas.set(chave, D);
    return D;
  };
  for (const lado of cfg.lados) {
    const iC = I(`clavicle_${lado}`), iU = I(`upperarm_${lado}`), iUT = I(`upperarm_twist_01_${lado}`);
    const iL = I(`lowerarm_${lado}`), iLT = I(`lowerarm_twist_01_${lado}`), iH = I(`hand_${lado}`);
    const nodes = [iU, iUT, iL, iLT, iH].map((i) => pose.nodes[i]);
    // Idle no referencial da clavícula: cotovelo, mão e rotações de mundo de braço/antebraço.
    const cInv0 = W0[iC].clone().invert();
    const E0c = pos(W0[iL]).applyMatrix4(cInv0), H0c = pos(W0[iH]).applyMatrix4(cInv0);
    const qC0inv = rot(W0[iC]).invert();
    const qU0c = qC0inv.clone().multiply(rot(W0[iU])), qL0c = qC0inv.clone().multiply(rot(W0[iL]));
    relatorio.lados[lado] = {};
    for (const clipe of cfg.clipes) {
      const anim = pose.anims.get(clipe);
      if (!anim) continue;
      const canal = (n) => anim.listChannels().find((c) => c.getTargetNode() === n && c.getTargetPath() === 'rotation');
      const alvos = nodes.map(canal);
      if (alvos.some((c) => !c)) throw new Error(`${arma}/${clipe}: canal de rotação do braço ${lado} ausente`);
      const tempos = [...new Set(alvos.flatMap((c) => Array.from(c.getSampler().getInput().getArray())))].sort((a, b) => a - b);
      const out = alvos.map(() => new Float32Array(tempos.length * 4));
      let cotoveloMax = 0, cotoveloAntesMax = 0, erroMao = 0;
      tempos.forEach((t, k) => {
        const trs = pose.local(clipe, t);
        const W = pose.mundo(trs);
        const C = W[iC], qC = rot(C);
        const S = pos(W[iU]);
        const Eidle = E0c.clone().applyMatrix4(C), Hidle = H0c.clone().applyMatrix4(C);
        const qUidle = qC.clone().multiply(qU0c), qLidle = qC.clone().multiply(qL0c);
        const D = deltaEm(clipe, t, W);
        const HW = D.clone().multiply(W[iH]);
        const Hw = pos(HW), qHw = rot(HW);
        const Eorig = pos(W[iL]);
        const polo = Eidle.clone().lerp(Eorig, cfg.limite);
        const { qU, qL, E2 } = ik(S, Eidle, Hidle, Hw, qUidle, qLidle, polo);
        cotoveloMax = Math.max(cotoveloMax, E2.distanceTo(Eidle));
        cotoveloAntesMax = Math.max(cotoveloAntesMax, Eorig.distanceTo(Eidle));
        // Pronação: o giro que falta para a mão chegar à rotação do clipe divide-se entre
        // antebraço (1/2) e osso de torção (1/4), como no grip-support.
        const qHLocalOld = new Quaternion(...trs[iH].r);
        const dTwist = wrap(twistX(qL.clone().invert().multiply(qHw)) - twistX(qHLocalOld));
        const qL2 = qL.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * 0.5));
        const qULocal = rot(W[pose.parent[iU]]).invert().multiply(qU);
        const qUTLocal = new Quaternion(...trs0[iUT].r);
        const qLLocal = qU.clone().invert().multiply(qL2);
        const qLTLocal = new Quaternion(...trs[iLT].r).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * 0.25));
        const qHLocal = qL2.clone().invert().multiply(qHw);
        [qULocal, qUTLocal, qLLocal, qLTLocal, qHLocal].forEach((q, j) => { q.normalize(); out[j].set([q.x, q.y, q.z, q.w], k * 4); });
        // Conferência: a mão nova tem de cair onde estava (alcance do IK).
        const L1 = Eidle.distanceTo(S), L2 = Hidle.distanceTo(Eidle);
        erroMao = Math.max(erroMao, Math.max(0, Hw.distanceTo(S) - (L1 + L2) * 0.999));
      });
      const input = doc.createAccessor(`${clipe}_braco_${lado}_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
      alvos.forEach((c, j) => {
        const s = c.getSampler();
        const nova = doc.createAnimationSampler(`${clipe}_braco_${lado}_${j}`).setInput(input).setInterpolation('LINEAR')
          .setOutput(doc.createAccessor().setType('VEC4').setArray(out[j]).setBuffer(buffer));
        anim.addSampler(nova);
        c.setSampler(nova);
        if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
      });
      relatorio.lados[lado][clipe] = { quadros: tempos.length, cotoveloAntesM: +cotoveloAntesMax.toFixed(3), cotoveloDepoisM: +cotoveloMax.toFixed(3), maoForaDoAlcanceM: +erroMao.toFixed(4) };
    }
  }
  if (cfg.arma) {
    const iG = I(cfg.arma.no), nG = pose.nodes[iG];
    for (const clipe of cfg.arma.clipes) {
      const anim = pose.anims.get(clipe);
      if (!anim) continue;
      const canais = ['translation', 'rotation'].map((p) => anim.listChannels().find((c) => c.getTargetNode() === nG && c.getTargetPath() === p));
      if (canais.some((c) => !c)) throw new Error(`${arma}/${clipe}: ${cfg.arma.no} sem canal`);
      const tempos = [...new Set(canais.flatMap((c) => Array.from(c.getSampler().getInput().getArray())))].sort((a, b) => a - b);
      const T = new Float32Array(tempos.length * 3), R = new Float32Array(tempos.length * 4);
      let giroMax = 0;
      tempos.forEach((t, k) => {
        const W = pose.mundo(pose.local(clipe, t, null, true));
        const Wn = deltaEm(clipe, t, W).clone().multiply(W[iG]);
        const local = W[pose.parent[iG]].clone().invert().multiply(Wn);
        const tt = new Vector3(), q = new Quaternion(), sc = new Vector3();
        local.decompose(tt, q, sc);
        T.set(tt.toArray(), k * 3); R.set([q.x, q.y, q.z, q.w], k * 4);
        giroMax = Math.max(giroMax, rot(W[iG]).angleTo(rot(W0[iG])) * 180 / Math.PI);
      });
      const input = doc.createAccessor(`${clipe}_arma_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
      canais.forEach((c, j) => {
        const s = c.getSampler();
        const nova = doc.createAnimationSampler(`${clipe}_arma_${j}`).setInput(input).setInterpolation('LINEAR')
          .setOutput(doc.createAccessor().setType(j ? 'VEC4' : 'VEC3').setArray(j ? R : T).setBuffer(buffer));
        anim.addSampler(nova);
        c.setSampler(nova);
        if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
      });
      relatorio.clipes[clipe] = { armaGiroOriginalMaxGraus: +giroMax.toFixed(1), fator: cfg.arma.fator };
    }
  }
  if (dada) return relatorio;
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const cfg = { ...BRACOS[arma], ...JSON.parse(opt('cfg', '{}')) };
  const rel = await aplicar({ arma, entrada: path.resolve(opt('in')), saida, cfg });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

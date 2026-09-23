#!/usr/bin/env node
// Re-anima a recarga de um produto K por chaves (receita em `recarga-k.json`), sem Blender.
//
// O clipe doador (pacote M4/P90 da KINEMATION) leva a mão de apoio aonde o pente DELE
// fica; em bullpup, P90 e carabina de alavanca isso vira braço na câmera ou mão que nunca
// chega à peça (fila Blender/clipe B1/B12). Aqui a recarga é refeita do zero sobre o idle:
// a arma faz uma apresentação em eixos de câmera em torno do punho, a mão direita segue a
// arma por IK, a mão esquerda percorre alvos no espaço da arma (ou da câmera) por IK de dois
// ossos com cotovelo para baixo, e a peça (pente, cartucho) viaja presa à mão nas janelas
// pedidas. Clipes fora da receita e canais de mecanismo ficam como vieram.
//
// Uso: node recarga-k.mjs --arma=p90 --in=<glb> --out=<glb fora do Git> [--medir]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';
import { ik } from './grip-support.mjs';
import { frameDa } from './vmpose-preview.mjs';

const { Vector3, Quaternion, Matrix4, Euler } = THREE;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pos = (m) => new Vector3().setFromMatrixPosition(m);
const rot = (m) => { const q = new Quaternion(); m.decompose(new Vector3(), q, new Vector3()); return q; };
const esc = (m) => new Vector3().setFromMatrixScale(m);
const rad = (v) => (v || [0, 0, 0]).map((x) => (x * Math.PI) / 180);
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const twistX = (q) => { const t = new Quaternion(q.x, 0, 0, q.w).normalize(); return 2 * Math.atan2(t.x, t.w); };
const DEDOS = ['index', 'middle', 'ring', 'pinky', 'thumb'];
const FALANGES = (lado) => DEDOS.flatMap((d) => ['01', '02', '03'].map((k) => `${d}_${k}_${lado}`));

// Base ortonormal com x = a e y = b⊥a.
function base(a, b) {
  const x = a.clone().normalize();
  const y = b.clone().sub(x.clone().multiplyScalar(b.dot(x))).normalize();
  return new Matrix4().makeBasis(x, y, new Vector3().crossVectors(x, y));
}

// Interpolação por chaves `u` (fração do clipe) com rampa suave entre vizinhas.
function porChaves(chaves, u, mistura) {
  if (u <= chaves[0].u) return mistura(chaves[0], chaves[0], 0);
  for (let i = 0; i < chaves.length - 1; i += 1) {
    const a = chaves[i], b = chaves[i + 1];
    if (u <= b.u) return mistura(a, b, smooth((u - a.u) / Math.max(1e-6, b.u - a.u)));
  }
  const z = chaves[chaves.length - 1];
  return mistura(z, z, 0);
}

export async function reanimar({ arma, entrada, saida, receita, medir = false }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const frame = { ...(await frameDa(arma)), ...(receita.frame || {}) };
  const iGun = I(receita.corpo);
  const iCam = I('VIEWMODEL_CAMERA');
  const L = 'l', R = 'r';
  const iU = { l: I('upperarm_l'), r: I('upperarm_r') };
  const iLo = { l: I('lowerarm_l'), r: I('lowerarm_r') };
  const iH = { l: I('hand_l'), r: I('hand_r') };
  const iT = { l: I('lowerarm_twist_01_l'), r: I('lowerarm_twist_01_r') };
  const iMid = I('middle_01_l'), iIdx = I('index_01_l'), iPinky = I('pinky_01_l');

  const trs0 = pose.local('idle', 0);
  const W0 = pose.mundo(trs0);
  const gun0 = W0[iGun];
  const gunRot0 = rot(gun0);
  const gunPos0 = pos(gun0);
  // Espaço "arma em metros": origem e giro do nó da arma, sem a escala dele.
  const gunM0 = new Matrix4().compose(gunPos0, gunRot0, new Vector3(1, 1, 1));
  const view0 = pose.camera(W0, frame);
  const camRot0 = rot(view0.clone().invert());
  const escalaBraco = pos(W0[iLo.l]).distanceTo(pos(W0[iU.l]));

  // Âncora da mão esquerda = meio da palma (entre o punho e a base do dedo médio).
  const ancoraLocal = pos(W0[iH.l]).add(pos(W0[iMid])).multiplyScalar(0.5).applyMatrix4(W0[iH.l].clone().invert());
  const eixosMao = (W) => {
    const h = pos(W[iH.l]);
    const dedos = pos(W[iMid]).sub(h).normalize();
    const nos = pos(W[iPinky]).sub(pos(W[iIdx])).normalize();
    const palma = new Vector3().crossVectors(nos, dedos).normalize();
    return { dedos, nos, palma };
  };
  const ex0 = eixosMao(W0);
  const pos0Pinca = (W, lado = 'l') => pos(W[I(`thumb_03_${lado}`)]).add(pos(W[I(`index_02_${lado}`)])).multiplyScalar(0.5);
  // Base (palma, dedos) no espaço da mão: constante do rig.
  const Bl = rot(W0[iH.l]).invert().multiply(rot(base(ex0.palma, ex0.dedos)));
  const paraArma = (v) => v.clone().applyQuaternion(gunRot0.clone().invert());
  const pontoArma = (p) => p.clone().applyMatrix4(gunM0.clone().invert());
  const r3 = (v) => v.toArray().map((x) => +x.toFixed(3));

  if (medir) {
    const marcas = {};
    for (const n of ['grip_r', 'support_l', 'magazine', 'magazine_insert', 'mag_release', 'charging_handle', 'bolt_release', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT', 'shell_eject', receita.peca].filter(Boolean)) {
      const i = pose.byName.get(n); if (i != null) marcas[n] = r3(pontoArma(pos(W0[i])));
    }
    const caixa = (no) => {
      const i = pose.byName.get(no); if (i == null) return null;
      const tris = pose.triangulos(W0).filter((t) => t.no === no);
      const b = new THREE.Box3();
      for (const t of tris) for (let k = 0; k < 9; k += 3) b.expandByPoint(pontoArma(new Vector3(t.p[k], t.p[k + 1], t.p[k + 2])));
      return { min: r3(b.min), max: r3(b.max) };
    };
    const camEixos = { direita: new Vector3(1, 0, 0), cima: new Vector3(0, 1, 0), frente: new Vector3(0, 0, -1) };
    const m = {
      arma, corpo: receita.corpo, escalaCorpo: r3(esc(gun0)),
      camera_em_eixos_da_arma: Object.fromEntries(Object.entries(camEixos).map(([k, v]) => [k, r3(paraArma(v.applyQuaternion(camRot0)))])),
      marcas,
      caixaCorpo: caixa(receita.corpo), caixaPeca: receita.peca ? caixa(receita.peca) : null,
      caixas: Object.fromEntries((receita.medirCaixas || []).map((nome) => [nome, caixa(nome)])),
      maoEsquerdaIdle: { ancora: r3(pontoArma(ancoraLocal.clone().applyMatrix4(W0[iH.l]))), palma: r3(paraArma(ex0.palma)), dedos: r3(paraArma(ex0.dedos)) },
      maoDireitaIdle: r3(pontoArma(pos(W0[iH.r]))),
      ombroEsquerdo: r3(pontoArma(pos(W0[iU.l]))),
      alcanceBraco: +(escalaBraco + pos(W0[iH.l]).distanceTo(pos(W0[iLo.l]))).toFixed(3),
      clipes: Object.fromEntries([...pose.anims.keys()].map((k) => [k, +pose.duracao(k).toFixed(3)])),
    };
    return { medida: m };
  }

  const ancoraIdleM = pontoArma(ancoraLocal.clone().applyMatrix4(W0[iH.l]));
  const alvoMundo = (spec, gunW, view, W) => {
    if (spec.cam) return new Vector3(...spec.cam).applyMatrix4(view.clone().invert());
    const base0 = spec.de ? pos(W[I(spec.de)]).applyMatrix4(gunW.clone().invert()) : null;
    const gunM = new Matrix4().compose(pos(gunW), rot(gunW), new Vector3(1, 1, 1));
    const deslocM = new Vector3(...(spec.arma || [0, 0, 0]));
    if (spec.idle) return deslocM.add(ancoraIdleM).applyMatrix4(gunM);
    if (base0) return base0.clone().applyMatrix4(gunW).add(deslocM.applyQuaternion(rot(gunW)));
    return deslocM.applyMatrix4(gunM);
  };

  // Cartucho procedural (estojo de latão + ponta de chumbo) preso entre polegar e indicador da
  // mão esquerda: filho do osso, escala compensada; repouso escondido (escala 0) fora da recarga.
  let noCartucho = null;
  if (receita.cartucho) {
    const c = receita.cartucho;
    const nSeg = 12;
    const vPos = [], nor = [], idx = [];
    const anel = (y, r) => Array.from({ length: nSeg }, (_, k) => { const a = (k / nSeg) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
    const tubo = (aneis) => {
      for (let j = 0; j < aneis.length - 1; j += 1) {
        const base0 = vPos.length / 3;
        for (const v of [...aneis[j], ...aneis[j + 1]]) { vPos.push(...v); const l = Math.hypot(v[0], v[2]) || 1; nor.push(v[0] / l, 0, v[2] / l); }
        for (let k = 0; k < nSeg; k += 1) { const a = base0 + k, b = base0 + (k + 1) % nSeg, cc = a + nSeg, d = b + nSeg; idx.push(a, cc, b, b, cc, d); }
      }
    };
    const primitiva = (nomeMat, cor, metal, rug) => {
      const bufAcc = (arr, tipo) => doc.createAccessor().setType(tipo).setArray(arr).setBuffer(buffer);
      const mat = doc.createMaterial(nomeMat).setBaseColorFactor(cor).setMetallicFactor(metal).setRoughnessFactor(rug);
      const prim = doc.createPrimitive().setAttribute('POSITION', bufAcc(new Float32Array(vPos), 'VEC3'))
        .setAttribute('NORMAL', bufAcc(new Float32Array(nor), 'VEC3')).setIndices(bufAcc(new Uint16Array(idx), 'SCALAR')).setMaterial(mat);
      vPos.length = 0; nor.length = 0; idx.length = 0;
      return prim;
    };
    const r = c.raio, L = c.comprimento, ponta = c.ponta;
    tubo([anel(0, r * 0.2), anel(0, r * 1.08), anel(0.003, r * 1.08), anel(0.004, r), anel(L - ponta, r * 0.96)]);
    const pLatao = primitiva('CoroSolto_Cartucho_Latao', [0.62, 0.45, 0.2, 1], 0.9, 0.35);
    tubo([anel(L - ponta, r * 0.9), anel(L - ponta * 0.4, r * 0.7), anel(L, r * 0.12)]);
    const pPonta = primitiva('CoroSolto_Cartucho_Ponta', [0.35, 0.33, 0.32, 1], 0.6, 0.5);
    const mesh = doc.createMesh(c.nome).addPrimitive(pLatao).addPrimitive(pPonta);
    const ladoC = c.lado || 'l';
    const iHl = I(`hand_${ladoC}`);
    const escalaMao = esc(W0[iHl]);
    // Eixo do cartucho (Y da malha) ao longo dos nós dos dedos; base no ponto de pinça.
    const qMao = rot(W0[iHl]);
    const nos = pos(W0[I(`pinky_01_${ladoC}`)]).sub(pos(W0[I(`index_01_${ladoC}`)])).normalize();
    const eixo = nos.applyQuaternion(qMao.clone().invert()).normalize();
    const qLocal = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), eixo);
    const pinca = pos0Pinca(W0, ladoC).applyMatrix4(W0[iHl].clone().invert());
    // Repouso escondido no centro da arma (dentro da silhueta: a régua de enquadramento conta vértice
    // de malha com escala 0); nos clipes da receita a translação vai à pinça.
    const centroArma = pos(W0[iGun]).applyMatrix4(W0[iHl].clone().invert());
    noCartucho = doc.createNode(c.nome).setMesh(mesh).setTranslation(centroArma.toArray())
      .setRotation(qLocal.toArray()).setScale([0, 0, 0]);
    pose.nodes[iHl].addChild(noCartucho);
    noCartucho.__escala = [1 / escalaMao.x, 1 / escalaMao.y, 1 / escalaMao.z];
    noCartucho.__pinca = pinca.toArray();
  }

  // Visibilidade do cartucho (degrau) e peças do doador escondidas (`esconder`) neste clipe.
  const gravarCartucho = (anim, nomeClipe, spec, tempos, D) => {
    const degrau = (no, escalas) => {
      for (const ch of [...anim.listChannels()]) if (ch.getTargetNode() === no && ch.getTargetPath() === 'scale') { const sm = ch.getSampler(); ch.dispose(); if (!anim.listChannels().some((x) => x.getSampler() === sm)) sm.dispose(); }
      const inC = doc.createAccessor(`${nomeClipe}_rk_vis_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
      const outC = doc.createAccessor(`${nomeClipe}_rk_vis_${no.getName()}`).setType('VEC3').setArray(new Float32Array(escalas)).setBuffer(buffer);
      const sC = doc.createAnimationSampler().setInput(inC).setOutput(outC).setInterpolation('STEP');
      anim.addSampler(sC).addChannel(doc.createAnimationChannel().setTargetNode(no).setTargetPath('scale').setSampler(sC));
    };
    if (noCartucho) {
      const vis = spec.cartucho || [];
      degrau(noCartucho, tempos.flatMap((t) => ([...vis].reverse().find((j) => t / D >= j.u)?.v ? noCartucho.__escala : [0, 0, 0])));
      const inT = doc.createAccessor(`${nomeClipe}_rk_pinca_t`).setType('SCALAR').setArray(new Float32Array([0, D])).setBuffer(buffer);
      const outT = doc.createAccessor(`${nomeClipe}_rk_pinca`).setType('VEC3').setArray(new Float32Array([...noCartucho.__pinca, ...noCartucho.__pinca])).setBuffer(buffer);
      const sT = doc.createAnimationSampler().setInput(inT).setOutput(outT).setInterpolation('STEP');
      anim.addSampler(sT).addChannel(doc.createAnimationChannel().setTargetNode(noCartucho).setTargetPath('translation').setSampler(sT));
    }
    for (const nome of spec.esconder || []) degrau(pose.nodes[I(nome)], tempos.flatMap(() => [0, 0, 0]));
    // Conjunto de peças do doador (clipe com cartuchos) levado à pinça: cada malha guarda a pose
    // relativa ao osso `ancora` no repouso; o conjunto fica com o giro da arma × `rotArma` e só
    // aparece nas janelas `janela` (fora delas, escala 0 como o doador já fazia).
    const pm = spec.pecasNaMao;
    if (pm) {
      const trsR = pose.nodes.map((n) => ({ t: n.getTranslation().slice(), r: n.getRotation().slice(), s: n.getScale().slice() }));
      const WR = pose.mundo(trsR);
      const iA = I(pm.ancora);
      const escA = esc(WR[iA]);
      const rel = pm.pecas.map((n) => WR[iA].clone().invert().multiply(WR[I(n)]));
      const qFix = new Quaternion().setFromEuler(new Euler(...rad(pm.rotArma), 'XYZ'));
      const quadrosP = pm.pecas.map(() => []);
      for (const t of tempos) {
        const W = pose.mundo(pose.local(anim.getName(), t));
        const vis = [...pm.janela].reverse().find((j) => t / D >= j.u)?.v;
        const A = new Matrix4().compose(pos0Pinca(W, pm.lado || 'r'), rot(W[iGun]).multiply(qFix), escA)
          .multiply(new Matrix4().makeTranslation(...(pm.desloc || [0, 0, 0])));
        pm.pecas.forEach((n, j) => {
          const i = I(n);
          const l = W[pose.parent[i]].clone().invert().multiply(A.clone().multiply(rel[j]));
          const a = new Vector3(), q = new Quaternion(), sc = new Vector3(); l.decompose(a, q, sc);
          quadrosP[j].push({ t: a.toArray(), r: [q.x, q.y, q.z, q.w], s: vis ? sc.toArray() : [0, 0, 0] });
        });
      }
      pm.pecas.forEach((n, j) => {
        const no = pose.nodes[I(n)];
        for (const ch of [...anim.listChannels()]) if (ch.getTargetNode() === no) { const sm = ch.getSampler(); ch.dispose(); if (!anim.listChannels().some((x) => x.getSampler() === sm)) sm.dispose(); }
        const inP = doc.createAccessor(`${nomeClipe}_rk_pecas_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
        for (const [p, tipo, k] of [['translation', 'VEC3', 't'], ['rotation', 'VEC4', 'r'], ['scale', 'VEC3', 's']]) {
          const out = doc.createAccessor(`${nomeClipe}_rk_${n}_${p}`).setType(tipo).setArray(new Float32Array(quadrosP[j].flatMap((x) => x[k]))).setBuffer(buffer);
          const sm = doc.createAnimationSampler().setInput(inP).setOutput(out).setInterpolation(p === 'scale' ? 'STEP' : 'LINEAR');
          anim.addSampler(sm).addChannel(doc.createAnimationChannel().setTargetNode(no).setTargetPath(p).setSampler(sm));
        }
      });
    }
  };

  const resultado = { arma, clipes: {} };
  for (const [nomeClipe, spec] of Object.entries(receita.clipes)) {
    const anim = pose.anims.get(nomeClipe);
    if (!anim) throw new Error(`${arma}: clipe ${nomeClipe} ausente`);
    const D = pose.duracao(nomeClipe);
    const fps = receita.fps || 30;
    const n = Math.round(D * fps);
    const tempos = Array.from({ length: n + 1 }, (_, k) => (D * k) / n);
    // Clipe que só ganha o cartucho na mão (a pose do doador fica): recarga de ferrolho.
    if (spec.somenteCartucho) { gravarCartucho(anim, nomeClipe, spec, tempos, D); resultado.clipes[nomeClipe] = { quadros: tempos.length, somenteCartucho: true }; continue; }
    const chavesArma = spec.arma || [{ u: 0 }, { u: 1 }];
    const chavesMao = spec.mao;
    const iPeca = receita.peca ? I(receita.peca) : null;
    const pecaJanelas = spec.peca || [];
    // Nós reescritos: arma, braços (ombro→mão), torção, dedos esquerdos, peça.
    const alvos = [iGun, iU.l, iLo.l, iH.l, iT.l, iU.r, iLo.r, iH.r, iT.r, ...FALANGES(L).map(I), ...FALANGES(R).map(I)];
    if (iPeca != null) alvos.push(iPeca);
    const doClipe = new Set((spec.doClipe || receita.doClipe || []).map(I));
    // Todo nó com canal TRS no clipe doador é regravado (idle, ou o valor novo); `doClipe` fica como veio.
    const doDoador = anim.listChannels().filter((c) => c.getTargetPath() !== 'weights').map((c) => pose.index.get(c.getTargetNode()));
    for (const nome of Object.keys(spec.mecanismos || {})) if (!alvos.includes(I(nome))) alvos.push(I(nome));
    const extras = [...new Set(doDoador)].filter((i) => !doClipe.has(i) && !alvos.includes(i));
    const quadros = new Map([...alvos, ...extras].map((i) => [i, []]));
    let alcanceMax = 0;
    let pegaH = null;
    const pecaRest = iPeca != null ? { ...trs0[iPeca] } : null;
    const relMaoAlvo = [];

    tempos.forEach((t, k) => {
      const u = t / D;
      // Base: tudo no idle, menos mecanismos animados pelo clipe original.
      const trsClip = pose.local(nomeClipe, t);
      const trs = trs0.map((x) => ({ t: x.t.slice(), r: x.r.slice(), s: x.s.slice() }));
      for (const i of doClipe) trs[i] = trsClip[i];
      // Mecanismos por chave: deslocamento (unidades locais do pai) somado ao repouso do idle.
      for (const [nome, chaves] of Object.entries(spec.mecanismos || {})) {
        const i = I(nome);
        const d = porChaves(chaves, u, (a, b, s) => new Vector3(...(a.d || [0, 0, 0])).lerp(new Vector3(...(b.d || [0, 0, 0])), s));
        trs[i].t = new Vector3(...trs0[i].t).add(d).toArray();
      }
      // 1) Apresentação da arma: giro (graus, eixos de câmera) em torno do punho + translação (m, câmera).
      const ap = porChaves(chavesArma, u, (a, b, s) => ({
        rot: new Vector3(...(a.rot || [0, 0, 0])).lerp(new Vector3(...(b.rot || [0, 0, 0])), s),
        pos: new Vector3(...(a.pos || [0, 0, 0])).lerp(new Vector3(...(b.pos || [0, 0, 0])), s),
      }));
      const pivo = pos(W0[iH.r]);
      const qCam = new Quaternion().setFromEuler(new Euler(...rad(ap.rot.toArray()), 'XYZ'));
      const qMundo = camRot0.clone().multiply(qCam).multiply(camRot0.clone().invert());
      const dMundo = ap.pos.clone().applyQuaternion(camRot0);
      const P = new Matrix4().makeTranslation(pivo.x + dMundo.x, pivo.y + dMundo.y, pivo.z + dMundo.z)
        .multiply(new Matrix4().makeRotationFromQuaternion(qMundo))
        .multiply(new Matrix4().makeTranslation(-pivo.x, -pivo.y, -pivo.z));
      let W = pose.mundo(trs);
      const gunW = P.clone().multiply(W0[iGun]);
      const parentGun = W[pose.parent[iGun]];
      const gl = parentGun.clone().invert().multiply(gunW);
      { const a = new Vector3(), q = new Quaternion(), s = new Vector3(); gl.decompose(a, q, s); trs[iGun] = { t: a.toArray(), r: [q.x, q.y, q.z, q.w], s: s.toArray() }; }
      W = pose.mundo(trs);
      const view = pose.camera(W, frame);

      // 2) Mão direita presa ao punho da arma (mesma relação do idle).
      const hR = P.clone().multiply(W0[iH.r]);
      const resolver = (lado, hAlvo, poloDir, poloPeso) => {
        const S = pos(W[iU[lado]]), E = pos(W[iLo[lado]]), H = pos(W[iH[lado]]);
        const qHandNovo = rot(hAlvo);
        const qHand = rot(W[iH[lado]]);
        const pAlvo = pos(hAlvo);
        let polo = null;
        if (poloDir) {
          const pd = new Vector3(...poloDir).applyQuaternion(rot(view.clone().invert())).multiplyScalar(escalaBraco);
          polo = S.clone().add(pAlvo).multiplyScalar(0.5).add(pd).lerp(E, 1 - (poloPeso ?? 1));
        }
        const { qU, qL, alcance } = ik(S, E, H, pAlvo, rot(W[iU[lado]]), rot(W[iLo[lado]]), polo);
        alcanceMax = Math.max(alcanceMax, alcance);
        const qULocal = rot(W[pose.parent[iU[lado]]]).invert().multiply(qU);
        const qHLocalOld = new Quaternion(...trs[iH[lado]].r);
        const dTwist = wrap(twistX(qL.clone().invert().multiply(qHandNovo)) - twistX(qHLocalOld));
        const qL2 = qL.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * 0.5));
        const qLLocal = qU.clone().invert().multiply(qL2);
        const qHLocal = qL2.clone().invert().multiply(qHandNovo);
        const qTLocal = new Quaternion(...trs[iT[lado]].r).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), dTwist * 0.25));
        trs[iU[lado]].r = qULocal.normalize().toArray();
        trs[iLo[lado]].r = qLLocal.normalize().toArray();
        trs[iH[lado]].r = qHLocal.normalize().toArray();
        trs[iT[lado]].r = qTLocal.normalize().toArray();
        void qHand;
        return alcance;
      };
      resolver(R, hR, receita.poloDireito || null, 1);
      W = pose.mundo(trs);

      // 3) Mão esquerda: alvo (âncora da palma) e orientação por chaves.
      const idleRel = { palma: paraArma(ex0.palma).toArray(), dedos: paraArma(ex0.dedos).toArray() };
      const mao = porChaves(chavesMao, u, (a, b, s) => {
        const pa = alvoMundo(a, gunW, view, W), pb = alvoMundo(b, gunW, view, W);
        const oa = a.palma || a.pecaOri ? a : idleRel, ob = b.palma || b.pecaOri ? b : idleRel;
        // `dedos: "braco"`: os dedos continuam a linha ombro→alvo (punho sem quebra).
        const frameOri = (o, p) => {
          const rq = o.cam ? rot(view.clone().invert()) : rot(gunW);
          const dedos = o.dedos === 'braco' ? p.clone().sub(pos(W[iU.l])).normalize()
            .add(new Vector3(...(o.dedosAjuste || [0, 0, 0])).applyQuaternion(rq)) : new Vector3(...o.dedos).applyQuaternion(rq);
          if (o.pecaOri && pegaH) {
            // Orientação pela peça na mão: eixos locais x/y da peça apontam para `pecaOri.x/y` (câmera).
            const rc = rot(view.clone().invert());
            const Rm = rot(base(new Vector3(...o.pecaOri.x).applyQuaternion(rc), new Vector3(...o.pecaOri.y).applyQuaternion(rc)));
            const Rh = Rm.multiply(rot(pegaH).invert());
            return new Matrix4().makeRotationFromQuaternion(Rh.multiply(Bl));
          }
          return base(new Vector3(...o.palma).applyQuaternion(rq), dedos);
        };
        const qa = rot(frameOri(oa, pa)), qb = rot(frameOri(ob, pb));
        return { p: pa.lerp(pb, s), q: qa.slerp(qb, s), fecho: (a.fecho ?? 1) + ((b.fecho ?? 1) - (a.fecho ?? 1)) * s,
          polo: a.polo || b.polo ? new Vector3(...(a.polo || receita.polo || [-0.4, -1, 0])).lerp(new Vector3(...(b.polo || receita.polo || [-0.4, -1, 0])), s).toArray() : (receita.polo || [-0.4, -1, 0]) };
      });
      // Giro da mão: base (palma, dedos) atual → alvo.
      const exAtual = eixosMao(W);
      const qDelta = rot(base(exAtual.palma, exAtual.dedos)).invert();
      const qHandNovo = mao.q.clone().multiply(qDelta).multiply(rot(W[iH.l]));
      const hPosAtual = pos(W[iH.l]);
      const ancoraAtual = ancoraLocal.clone().applyMatrix4(W[iH.l]);
      const offset = hPosAtual.clone().sub(ancoraAtual).applyQuaternion(rot(W[iH.l]).invert()).applyQuaternion(qHandNovo);
      const hL = new Matrix4().compose(mao.p.clone().add(offset), qHandNovo, esc(W[iH.l]));
      resolver(L, hL, mao.polo, 1);
      // Dedos esquerdos: `fecho` 1 = curva do idle, 0 = repouso do osso (mão aberta).
      for (const nome of FALANGES(L)) {
        const i = I(nome);
        const q = new Quaternion(...pose.nodes[i].getRotation()).slerp(new Quaternion(...trs0[i].r), Math.max(0, Math.min(1.2, mao.fecho)));
        trs[i].r = q.normalize().toArray();
      }
      W = pose.mundo(trs);
      relMaoAlvo.push(+pos(W[iH.l]).distanceTo(pos(hL)).toFixed(4));

      // 4) Peça: 'arma' (repouso), 'mao' (rígida na mão desde a chave de pega), 'fora' (escondida).
      if (iPeca != null) {
        const estado = [...pecaJanelas].reverse().find((j) => u >= j.u)?.estado || 'arma';
        if (estado === 'mao') {
          if (!pegaH) pegaH = W[iH.l].clone().invert().multiply(W[iPeca]);
          const alvo = W[iH.l].clone().multiply(pegaH);
          const l = W[pose.parent[iPeca]].clone().invert().multiply(alvo);
          const a = new Vector3(), q = new Quaternion(), s = new Vector3(); l.decompose(a, q, s);
          trs[iPeca] = { t: a.toArray(), r: [q.x, q.y, q.z, q.w], s: s.toArray() };
        } else if (estado === 'fora') {
          trs[iPeca] = { ...pecaRest, s: [0, 0, 0] };
        } else {
          trs[iPeca] = { ...pecaRest };
          pegaH = null;
        }
      }
      for (const i of quadros.keys()) quadros.get(i).push({ translation: trs[i].t, rotation: trs[i].r, scale: trs[i].s });
    });

    // Grava: troca os canais dos nós reescritos; a chave de forma do punho do doador sai.
    const reescritos = new Set([...quadros.keys()].map((i) => pose.nodes[i]));
    for (const ch of [...anim.listChannels()]) {
      const node = ch.getTargetNode();
      if (doClipe.has(pose.index.get(node))) continue;
      if (reescritos.has(node) || ch.getTargetPath() === 'weights') {
        const s = ch.getSampler(); ch.dispose();
        if (!anim.listChannels().some((c) => c.getSampler() === s)) s.dispose();
      }
    }
    // Chave de forma do punho da manga (cobre a pele do pulso com a mão longe da arma).
    if (spec.punho) {
      const pano = pose.nodes[I(receita.pano || 'GEO_FP_SK_Cloth_01')];
      const nAlvos = pano.getMesh().listPrimitives()[0].listTargets().length;
      const pesos = tempos.flatMap((t) => { const w = porChaves(spec.punho, t / D, (a, b, s) => a.w + (b.w - a.w) * s); return Array(nAlvos).fill(w); });
      const inW = doc.createAccessor(`${nomeClipe}_rk_punho_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
      const outW = doc.createAccessor(`${nomeClipe}_rk_punho`).setType('SCALAR').setArray(new Float32Array(pesos)).setBuffer(buffer);
      const sW = doc.createAnimationSampler().setInput(inW).setOutput(outW).setInterpolation('LINEAR');
      anim.addSampler(sW).addChannel(doc.createAnimationChannel().setTargetNode(pano).setTargetPath('weights').setSampler(sW));
    }
    gravarCartucho(anim, nomeClipe, spec, tempos, D);
    const input = doc.createAccessor(`${nomeClipe}_rk_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
    for (const [i, qs] of quadros) {
      for (const [p, tipo] of [['translation', 'VEC3'], ['rotation', 'VEC4'], ['scale', 'VEC3']]) {
        const out = doc.createAccessor(`${nomeClipe}_rk_${pose.nodes[i].getName()}_${p}`).setType(tipo)
          .setArray(new Float32Array(qs.flatMap((q) => q[p]))).setBuffer(buffer);
        const s = doc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR');
        anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(pose.nodes[i]).setTargetPath(p).setSampler(s));
      }
    }
    resultado.clipes[nomeClipe] = { quadros: tempos.length, alcanceMax: +alcanceMax.toFixed(3), erroMaoMaxM: Math.max(...relMaoAlvo) };
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  resultado.saida = { arquivo: saida, bytes: bytes.length, sha256: sha(bytes) };
  return resultado;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arma = opt('arma');
  const receitas = JSON.parse(fs.readFileSync(opt('receitas', path.join(HERE, 'recarga-k.json')), 'utf8'));
  const receita = receitas[arma];
  if (!receita) throw new Error(`sem receita para ${arma}`);
  const entrada = path.resolve(opt('in'));
  const bytes = fs.readFileSync(entrada);
  if (!flag('medir') && !flag('livre') && sha(bytes) !== receita.sourceSha256) throw new Error(`fonte ${arma} divergente: ${sha(bytes)}`);
  if (flag('medir')) { console.log(JSON.stringify((await reanimar({ arma, entrada, receita, medir: true })).medida, null, 1)); process.exit(0); }
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  if (fs.existsSync(saida)) fs.unlinkSync(saida); // nunca escreve por cima de um hardlink de outra overlay
  const rel = await reanimar({ arma, entrada, saida, receita });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

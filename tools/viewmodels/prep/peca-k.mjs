#!/usr/bin/env node
// Remarca a peça do carregador num produto K: move componentes conexas de malha entre dois nós
// rígidos (corpo ↔ pente) sem mudar nada na tela no idle. Resolve "a recarga tira a peça errada"
// (fila B3: g3sg1 tira o punho, scar tira a placa prateada). Receita em `peca-k.json`: cada passo
// escolhe as componentes cuja caixa (espaço da arma, metros, pose idle) cabe na caixa pedida.
//
// Uso: node peca-k.mjs --arma=g3sg1 --in=<glb> --out=<glb fora do Git> [--listar]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3, Matrix4, Matrix3, Quaternion } = THREE;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// Componentes conexas (por posição soldada) de um primitivo: lista de listas de triângulos.
function componentes(posArr, idx) {
  const chave = (i) => `${Math.round(posArr[i * 3] * 1e5)},${Math.round(posArr[i * 3 + 1] * 1e5)},${Math.round(posArr[i * 3 + 2] * 1e5)}`;
  const pai = new Map();
  const acha = (a) => { while (pai.get(a) !== a) { pai.set(a, pai.get(pai.get(a))); a = pai.get(a); } return a; };
  const une = (a, b) => { a = acha(a); b = acha(b); if (a !== b) pai.set(a, b); };
  const k = (i) => { const c = chave(i); if (!pai.has(c)) pai.set(c, c); return c; };
  for (let t = 0; t < idx.length; t += 3) { const a = k(idx[t]), b = k(idx[t + 1]), c = k(idx[t + 2]); une(a, b); une(b, c); }
  const grupos = new Map();
  for (let t = 0; t < idx.length; t += 3) { const r = acha(chave(idx[t])); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(t / 3); }
  return [...grupos.values()];
}

export async function remarcar({ arma, entrada, saida, receita, listar = false }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const W = pose.mundo(pose.local('idle', 0));
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const gun = W[I(receita.corpo)];
  const q = new Quaternion(), p = new Vector3(); gun.decompose(p, q, new Vector3());
  const paraArma = new Matrix4().compose(p, q, new Vector3(1, 1, 1)).invert();
  const relatorio = { arma, passos: [] };
  const lista = [];
  for (const passo of receita.passos || []) {
    const iDe = I(passo.de), iPara = I(passo.para);
    const noDe = pose.nodes[iDe], noPara = pose.nodes[iPara];
    if (noDe.getSkin() || noPara.getSkin()) throw new Error(`${arma}: só nós rígidos`);
    const deParaArma = paraArma.clone().multiply(W[iDe]);
    const deParaPara = W[iPara].clone().invert().multiply(W[iDe]);
    const normalM = new Matrix3().getNormalMatrix(deParaPara);
    const cx = new THREE.Box3(new Vector3(...passo.caixa.min), new Vector3(...passo.caixa.max));
    let movidos = 0, comps = 0;
    const meshPara = noPara.getMesh();
    for (const prim of noDe.getMesh().listPrimitives()) {
      const posAcc = prim.getAttribute('POSITION');
      const posArr = posAcc.getArray();
      const idx = prim.getIndices().getArray();
      const grupos = componentes(posArr, idx);
      const mover = new Set();
      for (const g of grupos) {
        const b = new THREE.Box3();
        for (const t of g) for (let k = 0; k < 3; k += 1) { const v = idx[t * 3 + k]; b.expandByPoint(new Vector3(posArr[v * 3], posArr[v * 3 + 1], posArr[v * 3 + 2]).applyMatrix4(deParaArma)); }
        if (listar) lista.push({ no: passo.de, tris: g.length, min: b.min.toArray().map((x) => +x.toFixed(3)), max: b.max.toArray().map((x) => +x.toFixed(3)) });
        const cabe = cx.containsBox(b) && (!passo.minTris || g.length >= passo.minTris);
        if (cabe) { g.forEach((t) => mover.add(t)); comps += 1; }
      }
      if (!mover.size || listar) continue;
      const fica = [], vai = [];
      for (let t = 0; t < idx.length / 3; t += 1) (mover.has(t) ? vai : fica).push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(fica)).setBuffer(buffer));
      // Primitivo novo no destino: só os vértices usados, posição/normal levadas ao espaço do nó destino.
      const usados = [...new Set(vai)].sort((a, b) => a - b);
      const novoIdx = new Map(usados.map((v, k) => [v, k]));
      const novo = doc.createPrimitive().setMaterial(prim.getMaterial()).setMode(prim.getMode());
      for (const sem of prim.listSemantics()) {
        const acc = prim.getAttribute(sem); const arr = acc.getArray(); const n = acc.getElementSize();
        const out = new arr.constructor(usados.length * n);
        usados.forEach((v, k) => { for (let c = 0; c < n; c += 1) out[k * n + c] = arr[v * n + c]; });
        if (sem === 'POSITION') for (let k = 0; k < usados.length; k += 1) { const v = new Vector3(out[k * 3], out[k * 3 + 1], out[k * 3 + 2]).applyMatrix4(deParaPara); out.set(v.toArray(), k * 3); }
        if (sem === 'NORMAL') for (let k = 0; k < usados.length; k += 1) { const v = new Vector3(out[k * 3], out[k * 3 + 1], out[k * 3 + 2]).applyMatrix3(normalM).normalize(); out.set(v.toArray(), k * 3); }
        if (sem === 'TANGENT') for (let k = 0; k < usados.length; k += 1) { const v = new Vector3(out[k * 4], out[k * 4 + 1], out[k * 4 + 2]).applyMatrix3(normalM).normalize(); out.set(v.toArray(), k * 4); }
        novo.setAttribute(sem, doc.createAccessor().setType(acc.getType()).setArray(out).setNormalized(acc.getNormalized()).setBuffer(buffer));
      }
      novo.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(vai.map((v) => novoIdx.get(v)))).setBuffer(buffer));
      meshPara.addPrimitive(novo);
      movidos += vai.length / 3;
    }
    relatorio.passos.push({ ...passo, componentes: comps, triangulos: movidos });
    if (!listar && (!movidos || (passo.triangulos && movidos !== passo.triangulos))) throw new Error(`${arma}: passo ${passo.de}→${passo.para} moveu ${movidos} triângulos (esperado ${passo.triangulos ?? '> 0'})`);
  }
  if (listar) return { lista };
  // Zonas de material: cada componente conexa do primitivo vai à primeira zona cuja regra casa
  // (faixa de triângulos e/ou caixa no espaço do nó); o resto fica no material original.
  for (const z of receita.zonas || []) {
    const no = pose.nodes[I(z.no)];
    const materiais = new Map();
    const contagem = {};
    for (const prim of [...no.getMesh().listPrimitives()]) {
      if (z.material && prim.getMaterial()?.getName() !== z.material) continue;
      const posArr = prim.getAttribute('POSITION').getArray();
      const idx = prim.getIndices().getArray();
      const porZona = new Map();
      for (const g of componentes(posArr, idx)) {
        const b = new THREE.Box3();
        for (const t of g) for (let k = 0; k < 3; k += 1) { const v = idx[t * 3 + k]; b.expandByPoint(new Vector3(posArr[v * 3], posArr[v * 3 + 1], posArr[v * 3 + 2])); }
        const tam = b.getSize(new Vector3());
        const zona = z.regras.find((r) => (r.minTris == null || g.length >= r.minTris) && (r.maxTris == null || g.length <= r.maxTris)
          && (!r.caixa || new THREE.Box3(new Vector3(...r.caixa.min), new Vector3(...r.caixa.max)).containsBox(b))
          && (!r.alongado || Math.max(tam.x, tam.y, tam.z) >= r.alongado * Math.min(...[tam.x, tam.y, tam.z].sort((a, c) => a - c).slice(1, 2))));
        const chave = zona ? zona.nome : null;
        if (!porZona.has(chave)) porZona.set(chave, []);
        porZona.get(chave).push(...g);
        contagem[chave || 'original'] = (contagem[chave || 'original'] || 0) + g.length;
      }
      for (const [nome, tris] of porZona) {
        const lista = tris.flatMap((t) => [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]]);
        const acc = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(lista)).setBuffer(buffer);
        if (nome == null) { prim.setIndices(acc); continue; }
        const r = z.regras.find((x) => x.nome === nome);
        if (!materiais.has(nome)) materiais.set(nome, prim.getMaterial().clone().setName(nome).setBaseColorFactor(r.base).setMetallicFactor(r.metal).setRoughnessFactor(r.rugosidade));
        const novo = prim.clone().setIndices(acc).setMaterial(materiais.get(nome));
        no.getMesh().addPrimitive(novo);
      }
      if (!porZona.has(null)) prim.dispose();
    }
    relatorio.zonas = { ...(relatorio.zonas || {}), [z.no]: contagem };
  }
  // Repouso novo para nós que só os clipes de recarga posicionam (fita da LMG reta no idle): o
  // repouso vira a pose do clipe `clipe` em `u`; clipes que animam o nó a partir do repouso antigo
  // (tiro da LMG avança a fita) recebem o mesmo deslocamento sobre o repouso novo.
  for (const rep of receita.repousos || []) {
    const trs = pose.local(rep.clipe, rep.u * pose.duracao(rep.clipe));
    const nomes = pose.nodes.map((n) => n.getName()).filter((n) => new RegExp(rep.nos).test(n));
    let canaisAjustados = 0;
    for (const nome of nomes) {
      const i = I(nome); const no = pose.nodes[i];
      const t0 = new Vector3(...no.getTranslation()), q0 = new Quaternion(...no.getRotation());
      const t1 = new Vector3(...trs[i].t), q1 = new Quaternion(...trs[i].r);
      for (const anim of doc.getRoot().listAnimations()) {
        if (rep.manter?.includes(anim.getName())) continue;
        for (const ch of anim.listChannels()) {
          if (ch.getTargetNode() !== no) continue;
          const sm = ch.getSampler(); const out = sm.getOutput().getArray().slice();
          if (ch.getTargetPath() === 'translation') for (let k = 0; k < out.length; k += 3) out.set(new Vector3(out[k], out[k + 1], out[k + 2]).sub(t0).add(t1).toArray(), k);
          else if (ch.getTargetPath() === 'rotation') for (let k = 0; k < out.length; k += 4) out.set(q1.clone().multiply(q0.clone().invert()).multiply(new Quaternion(out[k], out[k + 1], out[k + 2], out[k + 3])).normalize().toArray(), k);
          else continue;
          sm.setOutput(doc.createAccessor().setType(sm.getOutput().getType()).setArray(out).setBuffer(buffer)); canaisAjustados += 1;
        }
      }
      no.setTranslation(trs[i].t).setRotation(trs[i].r).setScale(trs[i].s);
    }
    relatorio.repousos = { ...(relatorio.repousos || {}), [rep.nos]: { de: `${rep.clipe}@${rep.u}`, nos: nomes.length, canaisAjustados } };
  }
  // Troca a malha da peça por um prisma retangular chanfrado nos eixos principais dela (PCA), com
  // chapa de fundo no extremo longe da arma. Serve para pente que a malha fonte fez roliço (lê tubo).
  for (const tr of receita.prismas || []) {
    const iNo = I(tr.no); const no = pose.nodes[iNo];
    // Tudo em metros no espaço da arma; volta ao espaço do nó no fim.
    const noParaArma = paraArma.clone().multiply(W[iNo]);
    const armaParaNo = noParaArma.clone().invert();
    const pts = [];
    // Só os vértices indexados: o primitivo pode dividir o buffer inteiro da arma.
    for (const pr of no.getMesh().listPrimitives()) { const a = pr.getAttribute('POSITION').getArray(); for (const k of new Set(pr.getIndices().getArray())) pts.push(new Vector3(a[k * 3], a[k * 3 + 1], a[k * 3 + 2]).applyMatrix4(noParaArma)); }
    const media = pts.reduce((acc, v) => acc.add(v), new Vector3()).multiplyScalar(1 / pts.length);
    const covar = (vs, e) => { const c = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const v of vs) { const d = v.clone().sub(media).toArray(); for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) c[i][j] += d[i] * d[j]; } return c; };
    const principal = (c) => { let v = new Vector3(1, 0.3, 0.2).normalize(); for (let k = 0; k < 60; k += 1) { v = new Vector3(c[0][0] * v.x + c[0][1] * v.y + c[0][2] * v.z, c[1][0] * v.x + c[1][1] * v.y + c[1][2] * v.z, c[2][0] * v.x + c[2][1] * v.y + c[2][2] * v.z).normalize(); } return v; };
    const eL = principal(covar(pts));
    const proj = pts.map((v) => v.clone().sub(media).sub(eL.clone().multiplyScalar(v.clone().sub(media).dot(eL))).add(media));
    const eA = principal(covar(proj));
    const eB = new Vector3().crossVectors(eL, eA).normalize();
    const faixa = (e) => { const d = pts.map((v) => v.clone().sub(media).dot(e)); return [Math.min(...d), Math.max(...d)]; };
    const [l0, l1] = faixa(eL), [a0, a1] = faixa(eA), [b0, b1] = faixa(eB);
    // Largura: o prisma roliço tem cantos cortados; a seção útil é `encolhe` × a faixa medida.
    const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, ha = (a1 - a0) / 2 * tr.encolhe, hb = (b1 - b0) / 2 * tr.encolhe;
    // Fundo = extremo mais longe da origem da arma.
    const pAlto = media.clone().add(eL.clone().multiplyScalar(l1)), pBaixo = media.clone().add(eL.clone().multiplyScalar(l0));
    const fundoEmL1 = pAlto.length() > pBaixo.length();
    const P = (l, a, b) => media.clone().add(eL.clone().multiplyScalar(l)).add(eA.clone().multiplyScalar(ca + a)).add(eB.clone().multiplyScalar(cb + b));
    const vPos = [], vNor = [], vIdx = [];
    const quad = (vs, centro) => {
      let nn = new Vector3().subVectors(vs[1], vs[0]).cross(new Vector3().subVectors(vs[2], vs[0])).normalize();
      const meio = vs.reduce((acc, v) => acc.add(v), new Vector3()).multiplyScalar(0.25);
      if (nn.dot(meio.sub(centro)) < 0) { vs = [...vs].reverse(); nn = nn.negate(); }
      const i0 = vPos.length / 3; for (const v of vs) { vPos.push(...v.toArray()); vNor.push(...nn.toArray()); } vIdx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    };
    const bloco = (la, lb, ha2, hb2, ch) => {
      const secao = [[-ha2 + ch, -hb2], [ha2 - ch, -hb2], [ha2, -hb2 + ch], [ha2, hb2 - ch], [ha2 - ch, hb2], [-ha2 + ch, hb2], [-ha2, hb2 - ch], [-ha2, -hb2 + ch]];
      const c = P((la + lb) / 2, 0, 0);
      for (let k = 0; k < 8; k += 1) { const [x0, y0] = secao[k], [x1, y1] = secao[(k + 1) % 8]; quad([P(la, x0, y0), P(la, x1, y1), P(lb, x1, y1), P(lb, x0, y0)], c); }
      for (const l of [la, lb]) { const anel = secao.map(([x, y]) => P(l, x, y)); quad([anel[0], anel[1], anel[2], anel[7]], c); quad([anel[2], anel[3], anel[6], anel[7]], c); quad([anel[3], anel[4], anel[5], anel[6]], c); }
    };
    const ch = Math.min(ha, hb) * (tr.chanfro ?? 0.12);
    const fundo = (l1 - l0) * tr.chapa;
    if (fundoEmL1) { bloco(l0, l1 - fundo, ha, hb, ch); bloco(l1 - fundo, l1, ha * 1.12, hb * 1.12, ch); } else { bloco(l0 + fundo, l1, ha, hb, ch); bloco(l0, l0 + fundo, ha * 1.12, hb * 1.12, ch); }
    const velho = no.getMesh().listPrimitives()[0].getMaterial();
    const mat = velho.clone().setName(tr.material.nome).setBaseColorTexture(null).setMetallicRoughnessTexture(null).setNormalTexture(null)
      .setBaseColorFactor(tr.material.base).setMetallicFactor(tr.material.metal).setRoughnessFactor(tr.material.rugosidade);
    for (const pr of no.getMesh().listPrimitives()) pr.dispose();
    const normalNo = new Matrix3().getNormalMatrix(armaParaNo);
    for (let k = 0; k < vPos.length; k += 3) {
      vPos.splice(k, 3, ...new Vector3(vPos[k], vPos[k + 1], vPos[k + 2]).applyMatrix4(armaParaNo).toArray());
      vNor.splice(k, 3, ...new Vector3(vNor[k], vNor[k + 1], vNor[k + 2]).applyMatrix3(normalNo).normalize().toArray());
    }
    no.getMesh().addPrimitive(doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vPos)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vNor)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(vIdx)).setBuffer(buffer)));
    relatorio.prismas = { ...(relatorio.prismas || {}), [tr.no]: { comprimento: +(l1 - l0).toFixed(4), secao: [+(2 * ha).toFixed(4), +(2 * hb).toFixed(4)], triangulos: vIdx.length / 3 } };
  }
  // Nervuras: tiras em caixa (espaço do nó) sobre a face da peça, com o material dela.
  for (const tira of receita.nervuras || []) {
    const no = pose.nodes[I(tira.no)];
    const base = no.getMesh().listPrimitives()[0];
    const vPos = [], vNor = [], vIdx = [];
    for (const t of tira.tiras) {
      const a = new Vector3(...t.de), b = new Vector3(...t.ate), n = new Vector3(...t.normal).normalize();
      const L = b.clone().sub(a).normalize();
      const w = new Vector3().crossVectors(n, L).normalize().multiplyScalar(t.largura / 2);
      const h = n.clone().multiplyScalar(t.altura);
      const q = [a.clone().sub(w), a.clone().add(w), b.clone().add(w), b.clone().sub(w)];
      const topo = q.map((v) => v.clone().add(h));
      const centro = a.clone().add(b).multiplyScalar(0.5).add(h.clone().multiplyScalar(0.5));
      const quad = (...vs) => {
        let nn = new Vector3().subVectors(vs[1], vs[0]).cross(new Vector3().subVectors(vs[2], vs[0])).normalize();
        const meio = vs.reduce((acc, v) => acc.add(v), new Vector3()).multiplyScalar(0.25);
        if (nn.dot(meio.sub(centro)) < 0) { vs.reverse(); nn = nn.negate(); }
        const i0 = vPos.length / 3; for (const v of vs) { vPos.push(...v.toArray()); vNor.push(...nn.toArray()); } vIdx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      };
      quad(topo[0], topo[1], topo[2], topo[3]);
      for (let k = 0; k < 4; k += 1) { const k2 = (k + 1) % 4; quad(q[k], q[k2], topo[k2], topo[k]); }
    }
    const prim = doc.createPrimitive().setMaterial(base.getMaterial())
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vPos)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(vNor)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(vIdx)).setBuffer(buffer));
    // Nó filho próprio: a peça (achada pelas réguas pelo nome) segue com a malha e a contagem de origem.
    no.addChild(doc.createNode(`${tira.no}_NERVURAS`).setMesh(doc.createMesh(`${tira.no}_NERVURAS`).addPrimitive(prim)));
    relatorio.nervuras = { ...(relatorio.nervuras || {}), [tira.no]: { tiras: tira.tiras.length, triangulos: vIdx.length / 3 } };
  }
  // Material próprio da peça (clone do material da arma com fator de cor/metal/rugosidade novos).
  for (const m of receita.materiais || []) {
    const no = pose.nodes[I(m.no)];
    for (const pr of no.getMesh().listPrimitives()) {
      const novo = pr.getMaterial().clone().setName(m.nome);
      if (m.base) novo.setBaseColorFactor(m.base);
      if (m.metal != null) novo.setMetallicFactor(m.metal);
      if (m.rugosidade != null) novo.setRoughnessFactor(m.rugosidade);
      pr.setMaterial(novo);
    }
    relatorio.materiais = [...(relatorio.materiais || []), m];
  }
  // Primitivo que ficou sem triângulo sai (o runtime não gosta de draw vazio).
  for (const n of pose.nodes) for (const pr of n.getMesh()?.listPrimitives() || []) if (!pr.getIndices()?.getCount()) pr.dispose();
  // Peças que as réguas acham pelo nome da malha (`_MAG$`) têm de continuar com UM primitivo: com
  // dois, o GLTFLoader cria um grupo e a malha filha ganha sufixo. Funde primitivos de mesmo material.
  for (const nome of receita.fundir || []) {
    const mesh = pose.nodes[I(nome)].getMesh();
    const grupos = new Map();
    for (const pr of mesh.listPrimitives()) { const k = `${pr.getMaterial()?.getName()}|${pr.listSemantics().sort().join(',')}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(pr); }
    for (const prims of grupos.values()) {
      if (prims.length < 2) continue;
      const sems = prims[0].listSemantics();
      const dados = Object.fromEntries(sems.map((sem) => [sem, []]));
      const idx = [];
      for (const pr of prims) {
        const usados = [...new Set(pr.getIndices().getArray())].sort((a, b) => a - b);
        const base = dados[sems[0]].length / prims[0].getAttribute(sems[0]).getElementSize();
        const mapa = new Map(usados.map((v, k) => [v, base + k]));
        for (const sem of sems) { const acc = pr.getAttribute(sem); const n = acc.getElementSize(); const arr = acc.getArray(); for (const v of usados) for (let c = 0; c < n; c += 1) dados[sem].push(arr[v * n + c]); }
        for (const v of pr.getIndices().getArray()) idx.push(mapa.get(v));
      }
      const novo = doc.createPrimitive().setMaterial(prims[0].getMaterial());
      for (const sem of sems) { const a0 = prims[0].getAttribute(sem); novo.setAttribute(sem, doc.createAccessor().setType(a0.getType()).setNormalized(a0.getNormalized()).setArray(new (a0.getArray().constructor)(dados[sem])).setBuffer(buffer)); }
      novo.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer));
      mesh.addPrimitive(novo);
      for (const pr of prims) pr.dispose();
    }
    relatorio.fundidos = { ...(relatorio.fundidos || {}), [nome]: mesh.listPrimitives().length };
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: sha(bytes) };
  return relatorio;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arma = opt('arma');
  const receita = JSON.parse(fs.readFileSync(opt('receitas', path.join(HERE, 'peca-k.json')), 'utf8'))[arma];
  if (!receita) throw new Error(`sem receita para ${arma}`);
  const entrada = path.resolve(opt('in'));
  if (process.argv.includes('--listar')) { console.log(JSON.stringify((await remarcar({ arma, entrada, receita, listar: true })).lista)); process.exit(0); }
  if (sha(fs.readFileSync(entrada)) !== receita.sourceSha256) throw new Error(`fonte ${arma} divergente`);
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  if (fs.existsSync(saida)) fs.unlinkSync(saida);
  const rel = await remarcar({ arma, entrada, saida, receita });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

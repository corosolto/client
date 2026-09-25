#!/usr/bin/env node
/**
 * SKS: desfaz a arma invertida e prende o clipe de cartuchos à mão esquerda.
 *
 * Diagnóstico (VM-FIX-MAGS.md): o alinhamento ICP de `precisao-final-build.py`
 * convergiu na solução girada 180° em torno do eixo vertical da arma: a boca da
 * malha ficava na câmera e o socket MUZZLE caía na soleira. Girando 180° em torno
 * do Y local de `GEO_MINT_SKS`, a boca volta a 2 cm do socket, o punho direito cai
 * na empunhadura e o esquerdo no guarda-mão. O ferrolho recortado recebe o mesmo giro.
 *
 * O clipe procedural anda num osso `Clip` deslocado 0,2–1 m das mãos no pacote (o
 * trajeto do osso não é coerente com o braço); aqui ele é redesenhado: chega na mão
 * direita, fica de pé no guia do receptor enquanto os cartuchos descem, sai na mão e
 * some. Fora da recarga vazia fica escondido (idle, tiro, inspeção, saque, loop).
 *
 * Uso: node tools/viewmodels/prep/sks-desvira.mjs --source=<sks-baked-runtime.glb> --output-dir=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, blend, duration, gravarClipe, smooth } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'a52560d382cc9c48804bf879e40f5eeed1e248ada22f9f74fa4c12b1cc19d871';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<sks> --output-dir=<dir>');
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(path.resolve(option('source')));
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error(`fonte SKS divergente: ${digest(sourceBytes)}`);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.resolve(option('source')));
const P = new Pose(doc);
const V = (...a) => new THREE.Vector3(...a);
const relatorio = {};

// ---- 1. arma: giro de 180° em torno do Y local da malha ----
const giro = new THREE.Matrix4().makeRotationY(Math.PI);
const malha = P.node('GEO_MINT_SKS');
const compoe = (node, m) => {
  const t = V(); const q = new THREE.Quaternion(); const s = V(); m.decompose(t, q, s);
  node.setTranslation(t.toArray()).setRotation([q.x, q.y, q.z, q.w]).setScale(s.toArray());
};
P.set('idle', 0);
const mintW = P.world('MINT_WEAPON_SKS');
const localMalha = P.local(malha);
compoe(malha, localMalha.clone().multiply(giro));
// Ferrolho recortado: mesmo giro no referencial da arma, medido na pose de repouso.
const peca = P.node('MINT_SKS_BOLT');
const pecaW = P.world(peca);
const giroMundo = mintW.clone().multiply(localMalha).multiply(giro).multiply(localMalha.clone().invert()).multiply(mintW.clone().invert());
const paiPeca = P.world(P.parent.get(peca));
compoe(peca, paiPeca.clone().invert().multiply(giroMundo).multiply(pecaW));
P.cache = new Map();
relatorio.giro = { eixo: 'Y local de GEO_MINT_SKS', graus: 180 };

// ---- 2. clipe: na mão DIREITA (é ela que carrega no pacote de ferrolho), de pé no guia
// do receptor enquanto o polegar empurra os cartuchos, e escondido fora da recarga ----
const receita = JSON.parse(await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'mag-na-mao.json'), 'utf8')).sks;
const clipe = P.node('Clip');
const balas = [0, 1, 2, 3, 4].map((i) => P.node(`CartridgeClip${i}`));
const avulsa = P.node('Cartridge');
const tempos = (dur) => { const out = []; for (let t = 0; t < dur - 1e-6; t += 1 / 30) out.push(+t.toFixed(5)); out.push(+dur.toFixed(5)); return out; };
const repouso = (node) => ({ translation: node.getTranslation(), rotation: node.getRotation(), scale: [1, 1, 1] });
// Orientação do clipe no guia: a do pacote no meio do trecho encaixado (o giro do rig
// da arma é coerente; só a posição do osso está deslocada), relativa à arma.
const J = receita.janela;
P.set('reload_empty', receita.refOrientacao);
const qRef = new THREE.Quaternion(); P.world('MINT_WEAPON_SKS').invert().multiply(P.world(clipe)).decompose(V(), qRef, V());
// Caixa do conjunto (clipe + 5 cartuchos) no espaço local do osso Clip, para assentar o fundo no guia.
const caixaLocal = new THREE.Box3();
for (const n of [P.node('GEO_PROC_Clip'), ...balas.map((b, i) => P.node(`GEO_PROC_CartridgeClip${i}`))]) {
  const rel = n.getName() === 'GEO_PROC_Clip' ? new THREE.Matrix4()
    : new THREE.Matrix4().compose(V(...P.parent.get(n).getTranslation()), new THREE.Quaternion(...P.parent.get(n).getRotation()), V(1, 1, 1));
  for (const prim of n.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i += 1) caixaLocal.expandByPoint(V(...pos.getElement(i, [])).applyMatrix4(rel)); }
}
const encaixadoEm = (nome, t) => {
  P.set(nome, t);
  const W = P.world('MINT_WEAPON_SKS'); const escPai = V(); P.world(P.parent.get(clipe)).decompose(V(), new THREE.Quaternion(), escPai);
  const qW = new THREE.Quaternion(); W.decompose(V(), qW, V());
  const qExtra = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(receita.giroDeg || [0, 0, 0]).map((g) => THREE.MathUtils.degToRad(g)), 'XYZ'));
  const q = qW.clone().multiply(qExtra).multiply(qRef);
  // fundo do conjunto (mínimo ao longo do "para cima" da arma) no topo do receptor
  const cima = V(0, 1, 0).applyQuaternion(qW);
  const cantos = []; for (const x of [caixaLocal.min.x, caixaLocal.max.x]) for (const y of [caixaLocal.min.y, caixaLocal.max.y]) for (const z of [caixaLocal.min.z, caixaLocal.max.z]) cantos.push(V(x, y, z).multiply(escPai).applyQuaternion(q));
  const fundo = Math.min(...cantos.map((c) => c.dot(cima)));
  const centro = cantos.reduce((acc, c) => acc.add(c), V()).multiplyScalar(1 / 8);
  const alvoTopo = V(...receita.topoReceptor).applyMatrix4(W);
  const pos = alvoTopo.sub(cima.clone().multiplyScalar(fundo)).sub(centro.sub(cima.clone().multiplyScalar(centro.dot(cima))));
  return new THREE.Matrix4().compose(pos, q, escPai);
};
for (const anim of P.root.listAnimations()) {
  const nome = anim.getName();
  const dur = duration(anim); const ts = tempos(dur);
  const faixas = new Map([clipe, ...balas, avulsa].map((n) => [n, []]));
  const ativo = nome === 'reload_empty';
  let Hin = null; let Hout = null; let empurra = V();
  if (ativo) {
    P.set(nome, J.encaixa); Hin = P.world('hand_r').invert().multiply(encaixadoEm(nome, J.encaixa));
    P.set(nome, J.solta); Hout = P.world('hand_r').invert().multiply(encaixadoEm(nome, J.solta));
    const qC = new THREE.Quaternion(); encaixadoEm(nome, J.encaixa).decompose(V(), qC, V());
    const qW = new THREE.Quaternion(); P.set(nome, J.encaixa); P.world('MINT_WEAPON_SKS').decompose(V(), qW, V());
    empurra = V(0, -1, 0).applyQuaternion(qW).applyQuaternion(qC.invert()).multiplyScalar(receita.cursoCartuchosCm);
  }
  for (const t of ts) {
    const visivel = ativo && t >= J.aparece && t <= J.some;
    // Escondido = escala zero ESTACIONADO no guia do receptor: o ponto colapsado fica dentro
    // da silhueta da arma (o osso do pacote está a ~0,7 m, fora da tela, e puxava a caixa da régua).
    const guia = encaixadoEm(nome, t);
    const parque = (node) => ({ ...P.localFor(node, guia), scale: [0, 0, 0] });
    if (!visivel) {
      faixas.get(clipe).push(parque(clipe)); for (const b of balas) faixas.get(b).push(repouso(b)); faixas.get(avulsa).push(parque(avulsa));
      continue;
    }
    P.set(nome, t);
    let mundo;
    if (t < J.encaixa) mundo = blend(P.world('hand_r').multiply(Hin), encaixadoEm(nome, t), smooth((t - (J.encaixa - 0.12)) / 0.12));
    else if (t <= J.solta) mundo = encaixadoEm(nome, t);
    else mundo = P.world('hand_r').multiply(Hout);
    P.set(nome, t);
    faixas.get(clipe).push(P.localFor(clipe, mundo));
    const u = smooth((t - J.empurra[0]) / (J.empurra[1] - J.empurra[0]));
    for (const b of balas) {
      const r = repouso(b);
      if (t > J.empurra[1] + 0.03) faixas.get(b).push({ ...r, scale: [0, 0, 0] });
      else faixas.get(b).push({ ...r, translation: V(...r.translation).add(empurra.clone().multiplyScalar(u)).toArray() });
    }
    faixas.get(avulsa).push(parque(avulsa));
  }
  gravarClipe(doc, nome, ts, faixas);
  relatorio[nome] = ativo ? { clipe: J } : { clipe: 'escondido' };
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'sks-baked-runtime.glb');
await io.write(output, doc);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'sks', ...relatorio, source: { bytes: sourceBytes.length, sha256: SOURCE_SHA },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'sks-desvira.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`SKS_DESVIRA_OK ${JSON.stringify(report)}`);

#!/usr/bin/env node
// Pose de ADS própria de um produto K: clipe `ads` de um quadro que o runtime soma ao idle
// como delta local, pesado pelo ADS (authoredvm.js, _adsPose). Parte do idle no quadro 0:
// a arma anda `avanco` cm para a frente da câmera e `desce` cm para baixo, e sobe `ergue` cm
// dentro das mãos; os dois braços seguem por IK de dois ossos (polo = cotovelo do idle).
//
// Uso: node ads-pose.mjs --arma=revolver38 --in=<glb> --out=<glb> [--relatorio=<json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';
import { ik } from './grip-support.mjs';

const { Vector3, Quaternion, Matrix4 } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// arma = nó que carrega a arma no rig (a mão não é filha dele); ref = nó cujo +Y é o "cima" da arma.
export const ADS = {
  revolver38: { arma: 'ik_hand_gun', ref: 'RIG_WEAPON_REVOLVER', avanco: 13, desce: 0, ergue: 0.5 },
};

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const rot = (m) => { const q = new Quaternion(); m.decompose(new Vector3(), q, new Vector3()); return q; };

export async function posar({ arma, entrada, saida, cfg = ADS[arma] }) {
  const pose = await carregar(entrada);
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  if (pose.anims.has('ads')) throw new Error(`${arma}: produto já tem clipe ads`);
  const trs = pose.local('idle', 0);
  const W = pose.mundo(trs);
  const metro = new Vector3().setFromMatrixScale(W[I('hand_r')]).x / 0.01;
  const cam = W[I('VIEWMODEL_CAMERA')];
  const frente = new Vector3(0, 0, -1).transformDirection(cam);
  const cimaCam = new Vector3(0, 1, 0).transformDirection(cam);
  const cimaArma = new Vector3(0, 1, 0).transformDirection(W[I(cfg.ref)]);
  const cm = (v, x) => v.clone().multiplyScalar((x / 100) * metro);
  const passoMaos = cm(frente, cfg.avanco).add(cm(cimaCam, -cfg.desce));
  const passoArma = passoMaos.clone().add(cm(cimaArma, cfg.ergue));

  const iA = I(cfg.arma);
  const novoA = pos(W[iA]).add(passoArma);
  const paiA = W[pose.parent[iA]];
  const tA = novoA.applyMatrix4(paiA.clone().invert());
  const saidaTrs = new Map([[iA, { t: tA.toArray() }]]);
  const rel = { arma, cfg, alcance: {} };
  for (const lado of ['l', 'r']) {
    const iU = I(`upperarm_${lado}`), iL = I(`lowerarm_${lado}`), iH = I(`hand_${lado}`);
    const S = pos(W[iU]), E = pos(W[iL]), H = pos(W[iH]);
    const { qU, qL, alcance } = ik(S, E, H, H.clone().add(passoMaos), rot(W[iU]), rot(W[iL]), E);
    const qUL = rot(W[pose.parent[iU]]).invert().multiply(qU).normalize();
    const qLL = qU.clone().invert().multiply(qL).normalize();
    const qHL = qL.clone().invert().multiply(rot(W[iH])).normalize();
    saidaTrs.set(iU, { r: qUL.toArray() }); saidaTrs.set(iL, { r: qLL.toArray() }); saidaTrs.set(iH, { r: qHL.toArray() });
    rel.alcance[lado] = +alcance.toFixed(3);
  }
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const anim = doc.createAnimation('ads');
  const input = doc.createAccessor('ads_t').setType('SCALAR').setArray(new Float32Array([0, 1 / 30])).setBuffer(buffer);
  for (const [i, v] of saidaTrs) {
    for (const [caminho, valor] of [['translation', v.t], ['rotation', v.r]]) {
      if (!valor) continue;
      const out = doc.createAccessor().setType(valor.length === 4 ? 'VEC4' : 'VEC3').setArray(new Float32Array([...valor, ...valor])).setBuffer(buffer);
      const s = doc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR');
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(pose.nodes[i]).setTargetPath(caminho).setSampler(s));
    }
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  rel.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return rel;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const arma = opt('arma');
  const rel = await posar({ arma, entrada: path.resolve(opt('in')), saida, cfg: { ...ADS[arma], ...JSON.parse(opt('cfg', '{}')) } });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

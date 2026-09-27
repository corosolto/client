#!/usr/bin/env node
// Saque próprio a partir do idle, para produto K sem clipe `equip_rifle`.
//
// Sem clipe próprio o runtime empresta o `equip_rifle` do General (pacote M4): os ossos do braço
// e o `ik_hand_gun` recebem a pose do M4, que não é a do pacote. Na rem700 isso gira a arma com a
// coronha para a direita e leva o braço direito à câmera, onde a manga estendida (`vmsleeve.js`)
// cobre metade da tela no saque (fila P9). Aqui o saque é o idle da própria arma, com o pacote
// inteiro (`RIG_FP_ARMS`: braços, tronco e arma juntos, a manga não estica) subindo de baixo no
// mesmo arco do saque procedural do runtime (queda `queda` m, inclinação `inclina` rad, ease-out
// cúbico), no espaço da câmera do pacote.
//
// Uso: node saque-do-idle.mjs --arma=rem700 --in=<glb> --out=<glb>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3, Quaternion, Matrix4 } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// duração = a do equip_rifle do General (1 s); queda/inclinação = arco padrão do runtime.
// substitui: o produto tem equip_rifle, mas feito para a arma antes da virada da malha (mosin: arma
// girada de lado no saque e a mão direita escondida atrás da coronha no fim, fila P10).
export const SAQUES = {
  rem700: { duracao: 1.0, queda: 0.22, inclina: 0.24, quadros: 31 },
  mosin: { duracao: 1.0, queda: 0.22, inclina: 0.24, quadros: 31, substitui: true },
};

export async function aplicar({ arma, entrada, saida, cfg = SAQUES[arma] }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  if (pose.anims.has('equip_rifle')) {
    if (!cfg.substitui) throw new Error(`${arma}: já tem equip_rifle`);
    const velho = pose.anims.get('equip_rifle');
    const acessores = new Set(velho.listSamplers().flatMap((s) => [s.getInput(), s.getOutput()]));
    for (const s of velho.listSamplers()) s.dispose();
    velho.dispose();
    for (const a of acessores) if (a && a.listParents().every((p) => p.propertyType === 'Root')) a.dispose();
  }
  const idle = pose.anims.get('idle');
  if (!idle) throw new Error(`${arma}: sem idle`);
  const iRig = pose.byName.get('RIG_FP_ARMS'), iCam = pose.byName.get('VIEWMODEL_CAMERA');
  if (iRig == null || iCam == null) throw new Error(`${arma}: RIG_FP_ARMS/VIEWMODEL_CAMERA ausente`);
  const nRig = pose.nodes[iRig];
  const anim = doc.createAnimation('equip_rifle');
  // Todos os canais do idle (mesmos acessores), menos os do RIG_FP_ARMS, que o arco reescreve.
  for (const c of idle.listChannels()) {
    if (c.getTargetNode() === nRig) continue;
    const s = c.getSampler();
    const nova = doc.createAnimationSampler().setInput(s.getInput()).setOutput(s.getOutput()).setInterpolation(s.getInterpolation());
    anim.addSampler(nova);
    anim.addChannel(doc.createAnimationChannel().setTargetNode(c.getTargetNode()).setTargetPath(c.getTargetPath()).setSampler(nova));
  }
  const W = pose.mundo(pose.local('idle', 0));
  const C = W[iCam], Ci = C.clone().invert();
  const pai = pose.parent[iRig] >= 0 ? W[pose.parent[iRig]] : new Matrix4(), paiInv = pai.clone().invert();
  const rig0 = W[iRig];
  const n = cfg.quadros;
  const tempos = new Float32Array(n), T = new Float32Array(n * 3), R = new Float32Array(n * 4), S = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1);
    const e = 1 - Math.pow(1 - f, 3);
    const arco = new Matrix4().makeTranslation(0, -cfg.queda * (1 - e), 0).multiply(new Matrix4().makeRotationX(cfg.inclina * (1 - e)));
    const local = paiInv.clone().multiply(C).multiply(arco).multiply(Ci).multiply(rig0);
    const t = new Vector3(), q = new Quaternion(), s = new Vector3();
    local.decompose(t, q, s);
    tempos[k] = f * cfg.duracao; T.set(t.toArray(), k * 3); R.set([q.x, q.y, q.z, q.w], k * 4); S.set(s.toArray(), k * 3);
  }
  const input = doc.createAccessor('equip_rifle_saque_t').setType('SCALAR').setArray(tempos).setBuffer(buffer);
  for (const [caminho, arr, tipo] of [['translation', T, 'VEC3'], ['rotation', R, 'VEC4'], ['scale', S, 'VEC3']]) {
    const s = doc.createAnimationSampler().setInput(input).setInterpolation('LINEAR')
      .setOutput(doc.createAccessor().setType(tipo).setArray(arr).setBuffer(buffer));
    anim.addSampler(s);
    anim.addChannel(doc.createAnimationChannel().setTargetNode(nRig).setTargetPath(caminho).setSampler(s));
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  return { arma, receita: 'saque-do-idle', ...cfg, canais: anim.listChannels().length,
    saida: { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  console.log(JSON.stringify(await aplicar({ arma, entrada: path.resolve(opt('in')), saida })));
}

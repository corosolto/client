#!/usr/bin/env node
/* ============================================================================
   vm-funil-luva-check.mjs — "funil da luva" (fila B4, faca no Inspect)
   ----------------------------------------------------------------------------
   Mede, quadro a quadro do clipe, quanto cada vértice da luva (pesado num osso
   do lado pedido) se afasta do pulso em relação ao idle. Luva que vira cone
   estica o punho: vértices do punho (0,66 no osso de torção, 0,34 na mão) se
   afastam do pulso quando o osso de torção dobra junto com a mão.
   Procedência do teto: produto K da integração (knife 93028919ee) mede 13,4 cm
   no Inspect (41 quadros) e o crítico cego reprovou pelo funil (#637 r1/r2); o
   produto de torcao-k.mjs mede 2,3 cm. Teto 3 cm (tools/eval/lib/vm-limiares.mjs
   é da frente de config; este número fica aqui até ela o adotar).
   Uso: node tools/eval/vm-funil-luva-check.mjs [--arma=knife] [--mutante=torcao-dobra]
   (o mutante tem de REPROVAR: `npm run eval:vm-funil-luva` cobra os dois)
   ============================================================================ */
import path from 'node:path';
import { carregar, THREE } from '../viewmodels/prep/vmpose.mjs';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const TETO_CM = 3;
const ALVOS = {
  knife: { file: 'knife/knife-baked-runtime.glb', clipe: 'Inspect', referencia: 'Idle', malha: 'GEO_FP_SK_Glove_01', lado: 'r' },
};
const arma = arg('arma', 'knife');
const alvo = ALVOS[arma];
if (!alvo) throw new Error(`sem alvo para ${arma}`);
const raiz = process.env.CSBRASIL_VM_ASSET_ROOT ? path.join(process.env.CSBRASIL_VM_ASSET_ROOT, 'viewmodels') : path.resolve('public/private-assets/viewmodels');
const pose = await carregar(path.join(raiz, alvo.file));
const mutante = arg('mutante');
// Mutante: o osso de torção volta a dobrar 90° em Y no clipe (o defeito do doador).
if (mutante === 'torcao-dobra') {
  const no = pose.node(`lowerarm_twist_01_${alvo.lado}`);
  for (const ch of pose.anims.get(alvo.clipe).listChannels()) {
    if (ch.getTargetNode() !== no || ch.getTargetPath() !== 'rotation') continue;
    const out = ch.getSampler().getOutput().getArray().slice();
    const d = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    for (let k = 0; k < out.length; k += 4) out.set(new THREE.Quaternion(out[k], out[k + 1], out[k + 2], out[k + 3]).multiply(d).toArray(), k);
    ch.getSampler().getOutput().setArray(out);
  }
} else if (mutante) throw new Error(`mutante desconhecido: ${mutante}`);

const n = pose.node(alvo.malha);
const skin = n.getSkin(); const js = skin.listJoints(); const ibm = skin.getInverseBindMatrices().getArray();
const pulso = `hand_${alvo.lado}`;
const deforma = (W) => {
  const M = js.map((j, k) => W[pose.byName.get(j.getName())].clone().multiply(new THREE.Matrix4().fromArray(ibm, k * 16)));
  const H = new THREE.Vector3().setFromMatrixPosition(W[pose.byName.get(pulso)]);
  const metro = new THREE.Vector3().setFromMatrixScale(W[pose.byName.get(pulso)]).x / 0.01;
  const d = [];
  for (const pr of n.getMesh().listPrimitives()) {
    const P = pr.getAttribute('POSITION').getArray(), J = pr.getAttribute('JOINTS_0').getArray(), Wt = pr.getAttribute('WEIGHTS_0').getArray();
    for (let v = 0; v < P.length / 3; v++) {
      if (![0, 1, 2, 3].some((q) => Wt[v * 4 + q] > 0.01 && js[J[v * 4 + q]].getName().endsWith(`_${alvo.lado}`))) { d.push(null); continue; }
      const x = new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); const acc = new THREE.Vector3();
      for (let q = 0; q < 4; q++) { const w = Wt[v * 4 + q]; if (w > 0) acc.addScaledVector(x.clone().applyMatrix4(M[J[v * 4 + q]]), w); }
      d.push(acc.distanceTo(H) / metro * 100);
    }
  }
  return d;
};
const ref = deforma(pose.mundo(pose.local(alvo.referencia, 0)));
const D = pose.duracao(alvo.clipe);
let pior = 0, piorT = 0;
for (let k = 0; k <= 40; k++) {
  const t = (D * k) / 40;
  const d = deforma(pose.mundo(pose.local(alvo.clipe, t)));
  for (let i = 0; i < d.length; i++) if (d[i] != null && d[i] - ref[i] > pior) { pior = d[i] - ref[i]; piorT = t; }
}
const ok = pior <= TETO_CM;
console.log(`${ok ? 'PASSA' : 'FALHA'} funil-luva/${arma}${mutante ? ` [mutante ${mutante}]` : ''}: luva estica ${pior.toFixed(2)} cm até o pulso (teto ${TETO_CM}) em ${alvo.clipe} t=${piorT.toFixed(2)}s`);
console.log(`VM_FUNIL_LUVA=${JSON.stringify({ ok, arma, mutante: mutante || null, cm: +pior.toFixed(2), teto: TETO_CM })}`);
process.exit(ok ? 0 : 1);

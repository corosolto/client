#!/usr/bin/env node
// Reparte a torção do punho pelo antebraço (fila B4: "funil da luva" no Inspect da faca).
//
// No Inspect doador o osso `lowerarm_twist_01` dobra ~90° junto com o punho (giro fora do eixo do
// antebraço); o punho da luva pesa 0,66 nele e 0,34 na mão e abre em cone de ~8 cm. Aqui o osso de
// torção volta ao idle e recebe só uma fração da torção da mão em X; opcionalmente outra fração vai
// ao `lowerarm` (a mão é compensada e fica igual no mundo). Só antebraço, torção e mão mudam.
//
// Uso: node torcao-k.mjs --arma=knife --in=<glb> --out=<glb fora do Git>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3, Quaternion } = THREE;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const twistX = (q) => { const t = new Quaternion(q.x, 0, 0, q.w).normalize(); return 2 * Math.atan2(t.x, t.w); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const X = new Vector3(1, 0, 0);

export const RECEITAS = {
  knife: { file: 'viewmodels/knife/knife-baked-runtime.glb', sourceSha256: '93028919ee',
    referencia: 'Idle', clipes: ['Inspect'], lados: ['r'], antebraco: 0, torcao: 0.5 },
};

export async function torcao({ arma, entrada, saida, receita }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const relatorio = { arma, clipes: {} };
  for (const lado of receita.lados) {
    const iL = I(`lowerarm_${lado}`), iH = I(`hand_${lado}`), iT = I(`lowerarm_twist_01_${lado}`);
    const ref = pose.local(receita.referencia, 0);
    const tRef = twistX(new Quaternion(...ref[iH].r));
    for (const nome of receita.clipes) {
      const anim = pose.anims.get(nome);
      const canal = (i) => anim.listChannels().find((c) => c.getTargetNode() === pose.nodes[i] && c.getTargetPath() === 'rotation');
      const cL = canal(iL), cH = canal(iH), cT = canal(iT);
      if (!cL || !cH || !cT) throw new Error(`${arma}/${nome}: canais de rotação do antebraço ${lado} ausentes`);
      const tempos = [...new Set([cL, cH, cT].flatMap((c) => Array.from(c.getSampler().getInput().getArray())))].sort((a, b) => a - b);
      const out = [cL, cH, cT].map(() => new Float32Array(tempos.length * 4));
      let maxD = 0;
      tempos.forEach((t, k) => {
        const trs = pose.local(nome, t);
        // O osso de torção do doador dobra junto com o punho (giro em Y, não em X): é o que abre o
        // funil. Ele volta à pose do idle e só recebe a fração de torção em X.
        const qL = new Quaternion(...trs[iL].r), qH = new Quaternion(...trs[iH].r), qT = new Quaternion(...ref[iT].r);
        const d = wrap(twistX(qH) - tRef);
        maxD = Math.max(maxD, Math.abs(d));
        const a = d * receita.antebraco;
        const qL2 = qL.clone().multiply(new Quaternion().setFromAxisAngle(X, a));
        const qH2 = new Quaternion().setFromAxisAngle(X, -a).multiply(qH);
        // O osso de torção é filho do antebraço: desfaz o giro herdado e recebe a sua fração.
        const qT2 = new Quaternion().setFromAxisAngle(X, -a).multiply(qT).multiply(new Quaternion().setFromAxisAngle(X, d * receita.torcao));
        [qL2, qH2, qT2].forEach((q, j) => { q.normalize(); out[j].set([q.x, q.y, q.z, q.w], k * 4); });
      });
      const buffer = doc.getRoot().listBuffers()[0];
      const input = doc.createAccessor(`${nome}_torcao_${lado}_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
      [cL, cH, cT].forEach((c, j) => {
        const s = c.getSampler();
        const novo = doc.createAnimationSampler().setInput(input).setInterpolation('LINEAR')
          .setOutput(doc.createAccessor().setType('VEC4').setArray(out[j]).setBuffer(buffer));
        anim.addSampler(novo); c.setSampler(novo);
        if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
      });
      relatorio.clipes[`${nome}/${lado}`] = { quadros: tempos.length, torcaoMaxGraus: +(maxD * 180 / Math.PI).toFixed(1), antebraco: receita.antebraco, torcao: receita.torcao };
    }
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: sha(bytes) };
  return relatorio;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arma = opt('arma');
  const receita = RECEITAS[arma];
  if (!receita) throw new Error(`sem receita para ${arma}`);
  const entrada = path.resolve(opt('in'));
  if (!sha(fs.readFileSync(entrada)).startsWith(receita.sourceSha256)) throw new Error(`fonte ${arma} divergente`);
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  if (fs.existsSync(saida)) fs.unlinkSync(saida);
  const rel = await torcao({ arma, entrada, saida, receita });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

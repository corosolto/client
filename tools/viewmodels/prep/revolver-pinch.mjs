#!/usr/bin/env node
// Revólver .38 (produto K): pinça do cartucho na recarga vazia.
//
// Medido no produto do catálogo (`reload_empty`): cada cartucho entra no tambor a partir
// do meio das juntas distais do polegar e do indicador esquerdos, mas as pontas desses
// dois dedos ficam a 6,2–6,7 cm uma da outra — o cartucho aparece encostado de lado num
// dedo ("tira no ar" da fila L1). Aqui, enquanto um cartucho está na mão (a < 3 cm do
// ponto de pinça e fora da câmara), polegar e indicador fecham por CCD até as pontas
// ficarem dos dois lados do estojo (≈1,1 cm, diâmetro do .38). Fora dessas janelas os
// dedos ficam exatamente como vieram.
//
// Uso: node revolver-pinch.mjs --in=<glb> --out=<glb> [--relatorio=<json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3, Quaternion, Matrix4 } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

const PONTA = 2.2;          // ponta do dedo além da junta distal (unidades do osso, cm)
const ESTOJO_M = 0.011;     // abertura final entre as pontas (diâmetro do .38 Special)
const NA_MAO_M = 0.05;      // cartucho a menos disto do ponto de pinça conta como "na mão" (arma elevada no punho)
const CADEIAS = {
  indicador: ['index_01_l', 'index_02_l', 'index_03_l'],
  polegar: ['thumb_01_l', 'thumb_02_l', 'thumb_03_l'],
};

const ELEVAR_CM = +(process.env.REVOLVER_ELEVAR_CM ?? 0.8);

const pos = (m) => new Vector3().setFromMatrixPosition(m);

function elevar(pose, cm) {
  const i = pose.byName.get('RIG_WEAPON_REVOLVER');
  const W = pose.mundo(pose.local(null, 0));
  const cima = new Vector3(0, 1, 0).transformDirection(W[i]);
  const metro = new Vector3().setFromMatrixScale(W[pose.byName.get('hand_r')]).x / 0.01;
  const pai = W[pose.parent[i]];
  const escalaPai = new Vector3().setFromMatrixScale(pai).x;
  const dLocal = cima.multiplyScalar((cm / 100) * metro / escalaPai).applyQuaternion(rot(pai).invert());
  const t = new Vector3(...pose.nodes[i].getTranslation()).add(dLocal);
  pose.nodes[i].setTranslation(t.toArray());
  return { cm, no: 'RIG_WEAPON_REVOLVER', translacao: t.toArray().map((v) => +v.toFixed(4)) };
}
const rot = (m) => { const q = new Quaternion(); m.decompose(new Vector3(), q, new Vector3()); return q; };
const ponta = (W, i) => new Vector3(PONTA, 0, 0).applyMatrix4(W[i]);

export async function pinca({ entrada, saida, clipe = 'reload_empty' }) {
  const pose = await carregar(entrada);
  // Arma mais alta no punho: na pose de duas mãos o topo das luvas ficava na linha de mira e
  // cobria o revólver no ADS (fila L1). Antes da pinça, que mira nos cartuchos já deslocados.
  const elevacao = elevar(pose, ELEVAR_CM);
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`nó ${n} ausente`); return i; };
  const anim = pose.anims.get(clipe);
  const cadeias = Object.fromEntries(Object.entries(CADEIAS).map(([k, v]) => [k, v.map(I)]));
  const ossos = [...cadeias.indicador, ...cadeias.polegar];
  const canais = ossos.map((i) => anim.listChannels().find((c) => c.getTargetNode() === pose.nodes[i] && c.getTargetPath() === 'rotation'));
  if (canais.some((c) => !c)) throw new Error('canal de rotação de dedo ausente');
  const tempos = [...new Set(canais.flatMap((c) => Array.from(c.getSampler().getInput().getArray())))].sort((a, b) => a - b);
  const cartuchos = [0, 1, 2, 3, 4, 5].map((c) => I(`Cartridge${c}`));
  const repouso = cartuchos.map((i) => new Vector3(...pose.nodes[i].getTranslation()));
  const iDrum = I('Drum');

  // Peso por quadro: cartucho na mão e fora da câmara; suavizado em ±2 quadros.
  const bruto = tempos.map((t) => {
    const W = pose.mundo(pose.local(clipe, t));
    const pin = pos(W[I('thumb_03_l')]).add(pos(W[I('index_03_l')])).multiplyScalar(0.5);
    const drumInv = W[iDrum].clone().invert();
    let alvo = null, melhor = Infinity;
    cartuchos.forEach((i, c) => {
      const cw = pos(W[i]);
      const naCamara = cw.clone().applyMatrix4(drumInv).distanceTo(repouso[c]) < 0.3;
      const d = cw.distanceTo(pin);
      if (!naCamara && d < NA_MAO_M && d < melhor) { melhor = d; alvo = i; }
    });
    return { alvo, peso: alvo == null ? 0 : 1 };
  });
  const pesos = bruto.map((_, k) => {
    let m = 0;
    for (let d = -2; d <= 2; d++) { const b = bruto[k + d]; if (b?.peso) m = Math.max(m, 1 - Math.abs(d) / 3); }
    return m;
  });
  const alvoDe = (k) => { for (let d = 0; d <= 2; d++) { if (bruto[k + d]?.alvo != null) return bruto[k + d].alvo; if (bruto[k - d]?.alvo != null) return bruto[k - d].alvo; } return null; };

  const out = ossos.map(() => new Float32Array(tempos.length * 4));
  let fechadas = 0;
  let aberturaAntes = 0, aberturaDepois = 0;
  tempos.forEach((t, k) => {
    const trs = pose.local(clipe, t);
    const orig = ossos.map((i) => new Quaternion(...trs[i].r));
    const peso = pesos[k];
    const iAlvo = alvoDe(k);
    if (peso > 0 && iAlvo != null) {
      let W = pose.mundo(trs);
      const c = pos(W[iAlvo]);
      const it = ponta(W, cadeias.indicador[2]), tt = ponta(W, cadeias.polegar[2]);
      aberturaAntes = Math.max(aberturaAntes, it.distanceTo(tt));
      const eixo = it.clone().sub(tt).normalize();
      const alvos = { indicador: c.clone().addScaledVector(eixo, ESTOJO_M / 2), polegar: c.clone().addScaledVector(eixo, -ESTOJO_M / 2) };
      for (let iter = 0; iter < 8; iter++) {
        for (const [nome, cadeia] of Object.entries(cadeias)) {
          for (let j = cadeia.length - 1; j >= 0; j--) {
            const b = cadeia[j];
            const jp = pos(W[b]);
            const ef = ponta(W, cadeia[2]).sub(jp).normalize();
            const to = alvos[nome].clone().sub(jp).normalize();
            let dq = new Quaternion().setFromUnitVectors(ef, to);
            // Passo limitado: dedo fecha, não gira em volta de si.
            const ang = 2 * Math.acos(Math.min(1, Math.abs(dq.w)));
            if (ang > 0.35) dq = new Quaternion().slerp(dq, 0.35 / ang);
            const qw = dq.multiply(rot(W[b]));
            const qp = rot(W[pose.parent[b]]);
            const ql = qp.invert().multiply(qw).normalize();
            trs[b].r = [ql.x, ql.y, ql.z, ql.w];
            W = pose.mundo(trs);
          }
        }
      }
      aberturaDepois = Math.max(aberturaDepois, ponta(W, cadeias.indicador[2]).distanceTo(ponta(W, cadeias.polegar[2])));
      fechadas++;
    }
    ossos.forEach((b, j) => {
      const q = orig[j].clone().slerp(new Quaternion(...trs[b].r), peso).normalize();
      out[j].set([q.x, q.y, q.z, q.w], k * 4);
    });
  });
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const input = doc.createAccessor(`${clipe}_pinca_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
  canais.forEach((c, j) => {
    const s = c.getSampler();
    const nova = doc.createAnimationSampler(`${clipe}_pinca_${j}`).setInput(input).setInterpolation('LINEAR')
      .setOutput(doc.createAccessor().setType('VEC4').setArray(out[j]).setBuffer(buffer));
    anim.addSampler(nova);
    c.setSampler(nova);
    if (s.listParents().filter((p) => p.propertyType === 'AnimationChannel').length === 0) s.dispose();
  });
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  return {
    arma: 'revolver38', clipe, quadros: tempos.length, quadrosComPinca: fechadas, elevacao,
    aberturaPontasCm: { antes: +(aberturaAntes * 100).toFixed(1), depois: +(aberturaDepois * 100).toFixed(1) },
    saida: { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const rel = await pinca({ entrada: path.resolve(opt('in')), saida });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

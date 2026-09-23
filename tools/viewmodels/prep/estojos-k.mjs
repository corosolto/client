#!/usr/bin/env node
// Recarga do revólver: estojo que cai e cartucho que chega pela mão (fila B6).
//
// O clipe doador ejeta os seis cartuchos e os estaciona a 20–35 cm do tambor, girando com ele,
// até cada um voltar à câmara: na tela a recarga fica "sem estojo" e com munição no ar. Aqui,
// por cartucho: a ejeção do doador fica; depois o estojo cai com gravidade (espaço de mundo) e
// some; o cartucho novo aparece na pinça da mão esquerda pouco antes da inserção e vai da pinça
// até a câmara no mesmo intervalo em que o doador o assentava. Só os canais dos cartuchos mudam.
//
// Uso: node estojos-k.mjs --arma=revolver38 --in=<glb> --out=<glb fora do Git> [--relatorio=<json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';

const { Vector3 } = THREE;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pos = (m) => new Vector3().setFromMatrixPosition(m);
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

export const RECEITAS = {
  revolver38: {
    file: 'viewmodels/revolver/revolver-runtime.glb',
    sourceSha256: '40b53e2fba7309ee210f0199f69fd7227c544b197d409904faaa4981231f796e',
    clipe: 'reload_empty', tambor: 'Drum', prefixo: 'Cartridge', n: 6,
    // Ejeção do doador (s de clipe): empurrão do extrator até `fimEjecao`; depois queda até `some`.
    // O clipe de 7,33 s toca em 2,4 s de jogo (×3,05): gravidade e velocidade vão em segundos de clipe.
    fimEjecao: 0.96, some: 1.5, gravidade: 1.05, velocidade: 0.35, fps: 60,
    // Tempo (s) com o cartucho novo na pinça antes de começar a entrar na câmara.
    naMao: 0.5, pincaMaxCm: 4.2,
    // Longe (unidades do tambor) = estacionado pelo doador; perto = chegando à câmara.
    longe: 15,
  },
};

export async function estojos({ arma, entrada, saida, receita }) {
  const pose = await carregar(entrada);
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  const clip = receita.clipe;
  const anim = pose.anims.get(clip);
  const D = pose.duracao(clip);
  const I = (n) => { const i = pose.byName.get(n); if (i == null) throw new Error(`${arma}: nó ${n} ausente`); return i; };
  const iTambor = I(receita.tambor);
  const pinca = (W) => pos(W[I('thumb_03_l')]).add(pos(W[I('index_02_l')])).multiplyScalar(0.5);
  const metro = (W) => new Vector3().setFromMatrixScale(W[I('hand_r')]).x / 0.01;
  const ponta = (W, n) => new Vector3(2.2, 0, 0).applyMatrix4(W[I(n)]);
  const abertura = (W) => ponta(W, 'thumb_03_l').distanceTo(ponta(W, 'index_03_l')) / metro(W) * 100;
  const tempos = []; for (let k = 0; k <= Math.round(D * receita.fps); k += 1) tempos.push(Math.min(D, k / receita.fps));
  const Ws = tempos.map((t) => pose.mundo(pose.local(clip, t)));
  const relatorio = { arma, clipe: clip, cartuchos: {} };
  for (let c = 0; c < receita.n; c += 1) {
    const iC = I(`${receita.prefixo}${c}`);
    const assento = pose.local(clip, 0)[iC];
    const dist = Ws.map((W) => pos(W[iC]).applyMatrix4(W[iTambor].clone().invert()).length());
    // Inserção = última descida de "longe" até o assento.
    let kf = dist.length - 1; while (kf > 0 && dist[kf - 1] <= dist[dist.length - 1] + 0.5) kf -= 1;
    let ks = kf; while (ks > 0 && dist[ks] < receita.longe) ks -= 1;
    const ts = tempos[ks], tf = tempos[kf];
    // Na mão só com a pinça fechada (pontas de polegar e indicador ≤ `pincaMaxCm`, a medida do PG5
    // do eval:vm-pegada-k): o começo recua de `ts` enquanto a pinça segue fechada, até `naMao`.
    let kIni = ks;
    while (kIni > 0 && tempos[kIni - 1] >= ts - receita.naMao && abertura(Ws[kIni - 1]) <= receita.pincaMaxCm) kIni -= 1;
    const tIni = tempos[kIni];
    const k0 = tempos.findIndex((t) => t >= receita.fimEjecao);
    const p0 = pos(Ws[k0][iC]);
    const v0 = p0.clone().sub(pos(Ws[k0 - 2][iC])).multiplyScalar((receita.fps / 2) * receita.velocidade);
    const quadros = [];
    let escondidos = 0;
    tempos.forEach((t, k) => {
      const W = Ws[k];
      const orig = pose.local(clip, t)[iC];
      let alvo = null, s = [1, 1, 1];
      if (t <= receita.fimEjecao) alvo = null;
      else if (t < receita.some) {
        const dt = t - receita.fimEjecao;
        alvo = p0.clone().add(v0.clone().multiplyScalar(dt)).add(new Vector3(0, -0.5 * receita.gravidade * dt * dt, 0));
      } else if (t < tIni) { s = [0, 0, 0]; escondidos += 1; } else if (t <= tf) {
        const seat = new Vector3(...assento.t).applyMatrix4(W[pose.parent[iC]]);
        alvo = pinca(W).lerp(seat, smooth((t - ts) / Math.max(1e-3, tf - ts)));
      }
      let q = { t: orig.t, r: orig.r, s };
      if (alvo) {
        const local = alvo.applyMatrix4(W[pose.parent[iC]].clone().invert());
        q = { t: local.toArray(), r: t > receita.fimEjecao ? assento.r : orig.r, s };
      }
      quadros.push(q);
    });
    // Troca os três canais do cartucho neste clipe.
    for (const ch of [...anim.listChannels()]) if (ch.getTargetNode() === pose.nodes[iC]) { const sm = ch.getSampler(); ch.dispose(); if (!anim.listChannels().some((x) => x.getSampler() === sm)) sm.dispose(); }
    const input = doc.createAccessor(`${clip}_estojo_t`).setType('SCALAR').setArray(new Float32Array(tempos)).setBuffer(buffer);
    for (const [p, tipo, campo] of [['translation', 'VEC3', 't'], ['rotation', 'VEC4', 'r'], ['scale', 'VEC3', 's']]) {
      const out = doc.createAccessor(`${clip}_estojo_${c}_${p}`).setType(tipo).setArray(new Float32Array(quadros.flatMap((q) => q[campo]))).setBuffer(buffer);
      // Escala em degrau: o cartucho some/aparece de uma vez, sem encolher.
      const sm = doc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation(p === 'scale' ? 'STEP' : 'LINEAR');
      anim.addSampler(sm).addChannel(doc.createAnimationChannel().setTargetNode(pose.nodes[iC]).setTargetPath(p).setSampler(sm));
    }
    relatorio.cartuchos[`${receita.prefixo}${c}`] = { naMaoDesde: +tIni.toFixed(2), piorPincaCm: +Math.max(...Ws.slice(kIni, kf + 1).map(abertura)).toFixed(2), entra: +ts.toFixed(2), assenta: +tf.toFixed(2),
      pincaTamborNoAssento: +pinca(Ws[kf]).distanceTo(pos(Ws[kf][iTambor])).toFixed(3), quadrosEscondidos: escondidos };
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
  if (sha(fs.readFileSync(entrada)) !== receita.sourceSha256) throw new Error(`fonte ${arma} divergente`);
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  if (fs.existsSync(saida)) fs.unlinkSync(saida);
  const rel = await estojos({ arma, entrada, saida, receita });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}

#!/usr/bin/env node
/**
 * Pente na mão pela PEGADA: a peça do carregador segue a mão a partir do instante em que a mão a
 * alcança no encaixe, e volta ao encaixe quando a mão a devolve.
 *
 * Diferente do `mag-na-mao.mjs` (pose desenhada no espaço da câmera), aqui não há desenho: no
 * instante-âncora (a mão no encaixe, medido pela distância palma→centro da malha da peça) guarda-se
 * H = mão⁻¹ · peça, e dentro da janela [a, b, c, d] a peça vai de "presa à arma" (clipe original) a
 * "presa à mão" (mão · H) entre a e b, fica na mão até c e volta ao encaixe entre c e d. Serve para
 * pacote em que a mão faz o gesto da troca e a peça ficava parada na arma (svd: `fixaNaArma` do
 * desvira-malha.mjs, fila P3 — "pente preso à arma até existir pose de mão").
 *
 * Uso: node tools/viewmodels/prep/pente-na-mao.mjs --arma=svd --in=<glb> --out=<glb>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, blend, duration, gravarClipe, smooth } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// janelas: frações [a, b, c, d] do clipe; ancora: fração em que a mão pega a peça (palma a ~0,3 palma
// do centro do pente). svd: a mão DIREITA faz a troca (arma virada; o poço fica junto dela); o nó é o
// MINT_SVD_MAG, que o desvira-malha (fixaNaArma) prendeu à arma com canais próprios em todos os clipes.
// pontas: no instante-âncora a peça é levada (só translação) até o meio das pontas de polegar e
// indicador, medida pelo meio dos nós `centro` (shotgun: o cartucho ia a ~1 palma na frente dos dedos
// no laço da recarga desde o #637, fila P8 — eval:vm-carregador "objeto no meio do ar" 0,98 palma).
export const PENTES = {
  shotgun: { no: 'MINT_AMMO_SHOTGUN_GAUGE', mao: 'hand_l', pontas: { dedos: ['thumb_03_l', 'index_03_l'], centro: ['MINT_AMMO_SHOTGUN_GAUGE', 'Gauge_end'] },
    clipes: { reload_loop: { ancora: 0.1, janela: [0, 0, 0.2, 0.3] } } },
  svd: { no: 'MINT_SVD_MAG', mao: 'hand_r', clipes: {
    reload_tactical: { ancora: 0.03, janela: [0.02, 0.05, 0.63, 0.67] },
    reload_empty: { ancora: 0.03, janela: [0.02, 0.05, 0.63, 0.67] } } },
};

export async function aplicar({ arma, entrada, saida, cfg = PENTES[arma] }) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(entrada);
  const P = new Pose(doc);
  const no = P.node(cfg.no);
  const relatorio = { arma, receita: 'pente-na-mao', no: cfg.no, mao: cfg.mao, clipes: {} };
  for (const [clipe, j] of Object.entries(cfg.clipes)) {
    const dur = duration(P.clip(clipe));
    const [a, b, c, d] = j.janela.map((f) => f * dur);
    const tAnc = j.ancora * dur;
    P.set(clipe, tAnc);
    let pecaAnc = P.world(no);
    if (cfg.pontas) {
      const meio = (nomes) => nomes.map((n) => P.pos(n)).reduce((acc, v) => acc.add(v)).multiplyScalar(1 / nomes.length);
      const d = meio(cfg.pontas.dedos).sub(meio(cfg.pontas.centro));
      pecaAnc = pecaAnc.clone().setPosition(P.pos(no).add(d));
    }
    const H = P.world(cfg.mao).invert().multiply(pecaAnc);
    const tempos = [];
    for (let t = 0; t < dur - 1e-6; t += 1 / 30) tempos.push(+t.toFixed(5));
    tempos.push(+dur.toFixed(5));
    const quadros = [];
    let maxSalto = 0, anterior = null;
    for (const t of tempos) {
      P.set(clipe, t);
      let alvo = P.world(no);
      if (t >= a && t <= d) {
        const peso = t < b && b > a ? smooth((t - a) / Math.max(1e-6, b - a)) : t > c ? 1 - smooth((t - c) / Math.max(1e-6, d - c)) : 1;
        alvo = blend(alvo, P.world(cfg.mao).multiply(H), peso);
      }
      quadros.push(P.localFor(no, alvo));
      const p = alvo.elements.slice(12, 15);
      if (anterior) maxSalto = Math.max(maxSalto, Math.hypot(p[0] - anterior[0], p[1] - anterior[1], p[2] - anterior[2]));
      anterior = p;
    }
    gravarClipe(doc, clipe, tempos, new Map([[no, quadros]]));
    relatorio.clipes[clipe] = { duracao: +dur.toFixed(3), ancora: j.ancora, janela: j.janela, amostras: tempos.length, maxSaltoPorQuadro: +maxSalto.toFixed(4) };
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const saida = path.resolve(opt('out'));
  if (!path.relative(REPO, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  console.log(JSON.stringify(await aplicar({ arma, entrada: path.resolve(opt('in')), saida })));
}

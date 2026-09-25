#!/usr/bin/env node
/** Fábrica — enquadramento de um produto contra a AK golden APROVADA.
 *
 *   node tools/fabrica/enquadrar.mjs <id> [--aplicar] [--png=<dir>]
 *
 * Passa o produto pelo cameraSpacePackage REAL (palco offline) e mede no idle, em 3:2:
 * área da arma e do braço, eixo coronha→boca e pixels sobre a cruz. A golden
 * (coro/ak-hires.glb, chave gold#ak) é medida no MESMO palco — a razão não depende
 * de o raster offline bater pixel a pixel com o do jogo.
 *
 * Rotação e FOV do frame são UNIFORMES (VM_FABRICA_FRAME: a composição do pack é a
 * mesma para todas as armas); só a posição (x, y, z) é resolvida por chassi, para a
 * arma ocupar o que a AK aprovada ocupa. A régua que decide é a do jogo
 * (vm-reguas cobertura); isto é o chute inicial reprodutível que ela confere.
 */
import path from 'node:path';

import { VM_FABRICA, arquivoFabrica, montar, pousar, rasterizar } from '../viewmodels/prep/vm-palco-offline.mjs';
import { RAIZ_REPO, gerarVmFabricaJs, gravarJson } from './lib/comum.mjs';

const id = process.argv[2];
const opt = (n, d = '') => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
if (!VM_FABRICA[id]) throw new Error(`uso: node tools/fabrica/enquadrar.mjs <${Object.keys(VM_FABRICA).join('|')}>`);
const TAM = [480, 320];

function metricas(r) {
  const { dono, w, h } = r;
  let arma = 0, braco = 0, cruz = 0, sx = 0, sy = 0;
  const pts = [];
  const raio = 0.03 * w;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const c = dono[y * w + x];
    if (!c) continue;
    if (Math.hypot(x - w / 2, y - h / 2) <= raio) cruz += 1;
    if (c === 4) { arma += 1; sx += x; sy += y; if ((x + y) % 3 === 0) pts.push([x, y]); } else braco += 1;
  }
  // Eixo principal dos pixels da arma (PCA 2D), em graus de tela (0° = direita, y para baixo).
  const mx = sx / Math.max(1, arma), my = sy / Math.max(1, arma);
  let xx = 0, xy = 0, yy = 0;
  for (const [x, y] of pts) { xx += (x - mx) ** 2; xy += (x - mx) * (y - my); yy += (y - my) ** 2; }
  const ang = 0.5 * Math.atan2(2 * xy, xx - yy) * 180 / Math.PI;
  return { arma: arma / (w * h), braco: braco / (w * h), cruz, eixo: ((ang % 180) + 180) % 180, cx: mx / w, cy: my / h };
}

async function medir(palco, frame) {
  Object.assign(palco.entry.frame, frame);
  pousar(palco, 'idle', 0);
  return metricas(await rasterizar(palco, { dono: true, tamanho: TAM }));
}

const golden = await montar('ak', path.join(RAIZ_REPO, 'public/models/viewmodels/coro/ak-hires.glb'), { chave: 'gold#ak' });
golden.clipes.set('idle', golden.clipes.get('Idle'));
const ref = await medir(golden, {});
const palco = await montar(id, arquivoFabrica(id), { fabrica: true });
const base = { ...palco.entry.frame };
const curta = VM_FABRICA[id].familia === 'pistol';

// Alvos com procedência nos limiares do jogo (tools/eval/lib/vm-limiares.mjs): arma na faixa
// 0,8–1,25× da AK (mira o meio, 0,95) e braço abaixo do teto COBERTURA_BRACO_MAX (1,4 — mira 1,3).
const custo = (m) => (curta ? 0 : 8 * (Math.sqrt(m.arma / ref.arma) - 0.95) ** 2)
  + 3 * Math.max(0, m.braco / ref.braco - 1.3) ** 2
  // Braço some do quadro = pose sem mão (P90/Mosin empurradas para fora na 1ª versão): piso 0,6× da AK.
  + 6 * Math.max(0, 0.6 - m.braco / ref.braco) ** 2
  + ((m.eixo - ref.eixo) / 15) ** 2 + (m.cruz > 0 ? 1 + m.cruz / 50 : 0)
  + 2 * ((m.cx - ref.cx) ** 2 + (m.cy - ref.cy) ** 2);

const antes = await medir(palco, base);
let melhor = { frame: { ...base }, m: antes, c: custo(antes) };
if (!curta) {
  // Busca por coordenadas: z (distância) primeiro, depois x/y; três passadas afinando o passo.
  for (const passo of [0.16, 0.08, 0.03, 0.01]) {
    for (const eixo of ['z', 'x', 'y', 'z']) {
      for (const d of [-3, -2, -1, 1, 2, 3]) {
        const f = { ...melhor.frame, [eixo]: +(melhor.frame[eixo] + d * passo).toFixed(4) };
        if (f.z > -0.12) continue;   // o pacote não pode vir para trás do olho
        const m = await medir(palco, f);
        const c = custo(m);
        if (c < melhor.c) melhor = { frame: f, m, c };
      }
    }
  }
}
const png = opt('png');
if (png) {
  Object.assign(palco.entry.frame, melhor.frame); pousar(palco, 'idle', 0);
  await rasterizar(palco, { arquivo: path.join(png, `${id}-enquadrado.png`) });
  pousar(golden, 'idle', 0);
  await rasterizar(golden, { arquivo: path.join(png, 'ak-golden.png') });
}
const r = (m) => ({ tamanhoVsAk: +Math.sqrt(m.arma / ref.arma).toFixed(3), bracoVsAk: +(m.braco / ref.braco).toFixed(3),
  eixo: +m.eixo.toFixed(1), cruz: m.cruz, centro: [+m.cx.toFixed(3), +m.cy.toFixed(3)] });
const saida = {
  id, curta, golden: { eixo: +ref.eixo.toFixed(1), centro: [+ref.cx.toFixed(3), +ref.cy.toFixed(3)] },
  frameBase: base, antes: r(antes), frame: { x: melhor.frame.x, y: melhor.frame.y, z: melhor.frame.z }, depois: r(melhor.m),
};
console.log(JSON.stringify(saida, null, 1));
if (process.argv.includes('--aplicar')) {
  gravarJson(path.join(RAIZ_REPO, 'tools/fabrica/enquadramento', `${id}.json`), saida);
  gerarVmFabricaJs();
}

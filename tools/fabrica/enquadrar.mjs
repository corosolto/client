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
import { pathToFileURL } from 'node:url';

import * as THREE from 'three';

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
  if (frame.fov) palco.entry.cameraFov = frame.fov;   // o raster lê a lente da entrada, não do frame
  pousar(palco, 'idle', 0);
  return metricas(await rasterizar(palco, { dono: true, tamanho: TAM }));
}

// Boca da manga (fim do braço do SK_Arms_Mono) no quadro em QUALQUER clipe: a régua vm-manga-oca
// mede o mesmo. Empurrar o pacote para longe traz o ombro para dentro do quadro (awp/p90, 24/09).
const { sleeveOpenings, SLEEVE_MATERIAL } = await import(pathToFileURL(path.join(RAIZ_REPO, 'public/js/vmsleeve.js')).href);
function preparaManga(palco) {
  const mangas = palco.entry.handMeshes.filter((m) => [m.material].flat().some((x) => SLEEVE_MATERIAL.test(x?.name || '') || /Cloth/i.test(m.userData.__mats?.join(' ') || '')));
  palco.pontas = mangas.map((mesh) => { const { loops, representative } = sleeveOpenings(mesh.geometry); return { mesh, idx: loops.flat().map((w) => representative[w]) }; });
  palco.amostrasManga = [...palco.clipes.keys()].filter((c) => c !== 'ads').flatMap((c) => [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map((f) => [c, f]));
}
function mangaNoQuadro(palco, frame) {
  Object.assign(palco.entry.frame, frame);
  if (frame.fov) palco.entry.cameraFov = frame.fov;
  const e = palco.entry;
  const half = Math.tan(((e.cameraFov * Math.PI) / 180) / 2) * (e.cameraAspect || 16 / 9);   // meia-tangente horizontal
  let pior = 0;
  const v = new THREE.Vector3();
  for (const [c, f] of palco.amostrasManga) {
    pousar(palco, c, f, { saque: c === 'equip_rifle' });
    let n = 0;
    for (const { mesh, idx } of palco.pontas) {
      for (const i of idx) {
        v.fromBufferAttribute(mesh.geometry.attributes.position, i);
        mesh.applyBoneTransform(i, v);
        v.applyMatrix4(mesh.matrixWorld);
        const d = -v.z;
        if (d <= 0.01) continue;
        if (Math.abs(v.x / (d * half)) <= 1 && Math.abs(v.y / (d * half / 1.5)) <= 1) n += 1;   // 3:2
      }
    }
    pior = Math.max(pior, n);
  }
  return pior;
}

const golden = await montar('ak', path.join(RAIZ_REPO, 'public/models/viewmodels/coro/ak-hires.glb'), { chave: 'gold#ak' });
golden.clipes.set('idle', golden.clipes.get('Idle'));
const ref = await medir(golden, {});
const palco = await montar(id, arquivoFabrica(id), { fabrica: true });
const base = { ...palco.entry.frame, rotDeg: [...palco.entry.frame.rotDeg] };
const fovPedido = Number(opt('fov', '0'));   // --fov=N: lente fixa para o chassi (partida da busca)
const fovBase = base.fov;
if (fovPedido) base.fov = fovPedido;
const curta = VM_FABRICA[id].familia === 'pistol';

// Alvos com procedência nos limiares do jogo (tools/eval/lib/vm-limiares.mjs): arma na faixa
// 0,8–1,25× da AK (mira o meio, 0,95) e braço abaixo do teto COBERTURA_BRACO_MAX (1,4 — mira 1,3).
const custo = (m) => (curta ? 0 : 8 * (Math.sqrt(m.arma / ref.arma) - 0.95) ** 2)
  + 3 * Math.max(0, m.braco / ref.braco - 1.3) ** 2
  // Braço some do quadro = pose sem mão (P90/Mosin empurradas para fora na 1ª versão): piso 0,6× da AK.
  + 6 * Math.max(0, 0.6 - m.braco / ref.braco) ** 2
  + ((m.eixo - ref.eixo) / 15) ** 2 + (m.cruz > 0 ? 1 + m.cruz / 50 : 0)
  + 2 * ((m.cx - ref.cx) ** 2 + (m.cy - ref.cy) ** 2)
  + (m.manga > 0 ? 2 + m.manga / 10 : 0);

preparaManga(palco);
const medirTudo = async (frame) => { const m = await medir(palco, frame); m.manga = mangaNoQuadro(palco, frame); return m; };
// --medir=x,y,z[,fov]: só mede estes quadros (separados por ';') e sai — para varrer à mão.
if (opt('medir')) {
  for (const q of opt('medir').split(';')) {
    const [x, y, z, fov] = q.split(',').map(Number);
    const m = await medirTudo({ ...base, x, y, z, ...(fov ? { fov } : {}) });
    console.log(q, JSON.stringify({ tam: +Math.sqrt(m.arma / ref.arma).toFixed(3), braco: +(m.braco / ref.braco).toFixed(3), manga: m.manga, c: +custo(m).toFixed(3) }));
  }
  process.exit(0);
}
const antes = await medirTudo(base);
let melhor = { frame: { ...base }, m: antes, c: custo(antes) };
if (!curta) {
  // Busca por coordenadas: z (distância) primeiro, depois x/y; três passadas afinando o passo.
  for (const passo of [0.16, 0.08, 0.03, 0.01]) {
    // --girar: o chassi cuja pose do pack fica achatada na tela (MGX5: +14° da AK) ganha resíduo de
    // guinada (rotDeg[1]); os outros mantêm a rotação única da fábrica.
    // --lente: a manga só sai do quadro sem encolher a arma com lente mais fechada (awp): busca fov ≤ 57.
    const eixos = ['z', 'x', 'y', ...(process.argv.includes('--girar') ? ['ry'] : []), ...(process.argv.includes('--lente') ? ['fov'] : []), 'z'];
    for (const eixo of eixos) {
      for (const d of [-3, -2, -1, 1, 2, 3]) {
        if (eixo === 'fov' && (melhor.frame.fov + d * passo * 25 > 57 || melhor.frame.fov + d * passo * 25 < 40)) continue;
        const f = eixo === 'fov' ? { ...melhor.frame, fov: +(melhor.frame.fov + d * passo * 25).toFixed(2) } : eixo === 'ry'
          ? { ...melhor.frame, rotDeg: [melhor.frame.rotDeg[0], +(melhor.frame.rotDeg[1] + d * passo * 50).toFixed(2), melhor.frame.rotDeg[2]] }
          : { ...melhor.frame, [eixo]: +(melhor.frame[eixo] + d * passo).toFixed(4) };
        if (f.z > -0.12) continue;   // o pacote não pode vir para trás do olho
        const m = await medirTudo(f);
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
  eixo: +m.eixo.toFixed(1), cruz: m.cruz, mangaNoQuadro: m.manga ?? null, centro: [+m.cx.toFixed(3), +m.cy.toFixed(3)] });
const saida = {
  id, curta, golden: { eixo: +ref.eixo.toFixed(1), centro: [+ref.cx.toFixed(3), +ref.cy.toFixed(3)] },
  frameBase: base, antes: r(antes), frame: { x: melhor.frame.x, y: melhor.frame.y, z: melhor.frame.z, ...(melhor.frame.rotDeg[1] !== base.rotDeg[1] ? { rotDeg: melhor.frame.rotDeg } : {}), ...(melhor.frame.fov !== fovBase ? { fov: melhor.frame.fov } : {}) }, depois: r(melhor.m),
};
console.log(JSON.stringify(saida, null, 1));
if (process.argv.includes('--aplicar')) {
  gravarJson(path.join(RAIZ_REPO, 'tools/fabrica/enquadramento', `${id}.json`), saida);
  gerarVmFabricaJs();
}

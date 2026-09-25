#!/usr/bin/env node
/** Fábrica — folha de quadros SEM navegador (palco offline, tools/viewmodels/prep/vm-palco-offline.mjs):
 * o produto no frame do jogo (VM_FABRICA_FRAME + VM_FABRICA_POS + VM_FABRICA[arma].frame), clipe a clipe.
 * Para iterar as chaves do animador (plano B) enquanto o navegador está ocupado; a palavra final é do
 * jogo real (captura/quadros.mjs) e do crítico cego.
 *
 *   node tools/fabrica/captura/palco-quadros.mjs --arma=carbine --out=<dir>
 *      [--clipes=idle,reload_start,reload_loop,reload_end,pump] [--fracoes=0,0.25,0.5,0.75,1] [--aspecto=3x2]
 * Saída: <out>/<arma>-<clipe>-<fff>.png e <out>/<arma>-palco-folha.png.
 */
import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { arquivoFabrica, montar, pousar, rasterizar } from '../../viewmodels/prep/vm-palco-offline.mjs';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const ARMA = arg('arma');
const OUT = path.resolve(arg('out'));
const ASPECTO = arg('aspecto', '3x2');
const FR = arg('fracoes', '0,0.25,0.5,0.75,1').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });

const palco = await montar(ARMA, arquivoFabrica(ARMA), { fabrica: true });
const clipes = arg('clipes', '') ? arg('clipes').split(',') : ['idle', ...[...palco.clipes.keys()].filter((c) => c !== 'idle')];
const fotos = [];
for (const c of clipes) {
  if (!palco.clipes.has(c)) { console.log(`sem clipe ${c}`); continue; }
  for (const f of (c === 'idle' ? [0] : FR)) {
    pousar(palco, c, f, { saque: c === 'equip_rifle' });
    const arquivo = path.join(OUT, `${ARMA}-${c}-${String(Math.round(f * 100)).padStart(3, '0')}.png`);
    await rasterizar(palco, { aspecto: ASPECTO, arquivo });
    fotos.push({ nome: `${c} ${f}`, arquivo });
  }
}
const L = 480;
const imgs = await Promise.all(fotos.map(async (x) => ({ ...x, buf: await sharp(x.arquivo).resize({ width: L }).toBuffer({ resolveWithObject: true }) })));
const H = imgs[0]?.buf.info.height || 320;
const cols = Math.min(5, FR.length);
const linhas = Math.ceil(imgs.length / cols);
const comp = imgs.map((x, i) => ({ input: x.buf.data, left: (i % cols) * L, top: Math.floor(i / cols) * (H + 22) + 22 }));
const rot = imgs.map((x, i) => ({ input: Buffer.from(`<svg width="${L}" height="22"><text x="4" y="16" font-size="15" font-family="sans-serif" fill="#fff">${x.nome}</text></svg>`),
  left: (i % cols) * L, top: Math.floor(i / cols) * (H + 22) }));
const folha = path.join(OUT, `${ARMA}-palco-folha.png`);
await sharp({ create: { width: cols * L, height: linhas * (H + 22), channels: 3, background: '#222' } }).composite([...comp, ...rot]).png().toFile(folha);
console.log(`PALCO_QUADROS=${JSON.stringify({ n: fotos.length, folha })}`);

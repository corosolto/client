#!/usr/bin/env node
/** Fábrica — quadros no JOGO REAL para iterar o animador (plano B): idle, ADS assentado,
 * tiro no quadril e no ADS, saque e recargas em frações pedidas, numa proporção.
 *
 *   VM_PALCO_QS=vmfabrica=famas node tools/fabrica/captura/quadros.mjs --arma=famas --out=<dir>
 *      [--porta=4681] [--aspecto=3x2|16x9] [--fracoes=0.1,0.3,0.5,0.7,0.9] [--so=idle,ads,tiro,vazia,tatica,saque]
 * Saída: <out>/<arma>-<aspecto>-<cena>.png e uma folha de contato <arma>-<aspecto>-folha.png.
 */
import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import * as P from '../../eval/lib/vm-palco.mjs';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const ARMA = arg('arma');
const OUT = path.resolve(arg('out'));
const ASPECTO = arg('aspecto', '3x2');
const FR = arg('fracoes', '0.1,0.25,0.4,0.55,0.7,0.85').split(',').map(Number);
const SO = new Set(arg('so', 'idle,ads,tiro,vazia,tatica,saque').split(','));
fs.mkdirSync(OUT, { recursive: true });

const srv = await P.subirServidor(arg('porta', '4681'));
const browser = await P.abrirNavegador();
const fotos = [];
try {
  const { page, erros } = await P.abrirJogo(browser, srv.base, ASPECTO);
  const foto = async (nome) => {
    await P.esperarQuadro(page);
    const f = path.join(OUT, `${ARMA}-${ASPECTO}-${nome}.png`);
    await page.screenshot({ path: f });
    fotos.push({ nome, f });
  };
  await P.equipar(page, ARMA);
  await P.segurar(page, true);
  if (SO.has('idle')) await foto('idle');
  if (SO.has('tiro')) {
    await page.evaluate((x) => { const e = window.__authoredVm.entry(x); window.__authoredVm.shoot(x); return e?.state; }, ARMA);
    await P.passo(page, 0.03);
    await foto('tiro-quadril');
    await P.passo(page, 0.6);
  }
  if (SO.has('ads')) {
    const r = await P.entrarAds(page);
    await foto(`ads${r.ads < 0.99 ? `-${r.ads}` : ''}`);
    if (SO.has('tiro')) {
      await page.evaluate((x) => window.__authoredVm.shoot(x), ARMA);
      await P.passo(page, 0.03);
      await foto('tiro-ads');
      await P.passo(page, 0.6);
    }
    await P.sairAds(page);
    await P.segurar(page, true);
  }
  const { WEAPONS } = await import(path.resolve('public/js/data/weapons.js'));
  const dur = WEAPONS[ARMA].reload;
  for (const [cena, mag] of [['vazia', 0], ['tatica', 5]]) {
    if (!SO.has(cena)) continue;
    const ini = await P.iniciarRecarga(page, ARMA, mag);
    if (!ini.ok) throw new Error(`recarga ${cena} não entrou (${ini.clip})`);
    let prev = 0;
    for (const f of FR) {
      await P.passo(page, dur * (f - prev)); prev = f;
      await foto(`${cena}-${String(Math.round(f * 100)).padStart(3, '0')}`);
    }
    await P.passo(page, dur * (1 - prev) + 0.8);
    await page.evaluate(() => { window.__game.player.reloadUntil = 0; });
  }
  if (SO.has('saque')) {
    await P.segurar(page, false);
    await page.evaluate(() => window.__vmPrecisionQa.equip('knife'));
    await page.waitForTimeout(1500);
    await P.segurar(page, true);
    await page.evaluate((x) => window.__vmPrecisionQa.equip(x), ARMA);
    let prev = 0;
    for (const f of [0.15, 0.4, 0.7]) { await P.passo(page, f - prev); prev = f; await foto(`saque-${Math.round(f * 100)}`); }
  }
  if (erros.length) console.log('ERROS', erros.slice(0, 5));
} finally {
  await browser.close();
  srv.kill();
}
// folha de contato 3 colunas, cada quadro a 480 px de largura
const L = 480;
const imgs = await Promise.all(fotos.map(async (x) => ({ ...x, buf: await sharp(x.f).resize({ width: L }).toBuffer({ resolveWithObject: true }) })));
const H = imgs[0]?.buf.info.height || 320;
const cols = 3; const linhas = Math.ceil(imgs.length / cols);
const comp = imgs.map((x, i) => ({ input: x.buf.data, left: (i % cols) * L, top: Math.floor(i / cols) * (H + 22) + 22 }));
const rot = imgs.map((x, i) => ({ input: Buffer.from(`<svg width="${L}" height="22"><text x="4" y="16" font-size="15" font-family="sans-serif" fill="#fff">${x.nome}</text></svg>`),
  left: (i % cols) * L, top: Math.floor(i / cols) * (H + 22) }));
await sharp({ create: { width: cols * L, height: linhas * (H + 22), channels: 3, background: '#222' } })
  .composite([...comp, ...rot]).png().toFile(path.join(OUT, `${ARMA}-${ASPECTO}-folha.png`));
console.log(`QUADROS=${JSON.stringify({ n: fotos.length, folha: path.join(OUT, `${ARMA}-${ASPECTO}-folha.png`) })}`);

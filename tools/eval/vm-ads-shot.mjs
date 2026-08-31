#!/usr/bin/env node
/* vm-ads-shot.mjs — captura o ADS (mira de ferro) de uma arma na trilha cs16 e
   mede se a alça ficou ACIMA do eixo do cano. O defeito de 30/08 punha a mira
   DENTRO do cano: no ADS a câmera olhava para dentro da arma e a tela sumia.
   Uso: node tools/eval/vm-ads-shot.mjs [--arma=ak] [--porta=8250] [--out=dir] */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const ARMA = arg('arma') || 'ak';
const PORTA = arg('porta') || '8250';
const OUT = arg('out') || `/tmp/ads-${ARMA}`;

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore', cwd: ROOT });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORTA}`)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto(`http://127.0.0.1:${PORTA}/?debug=1&auto=E&vmweapon=${ARMA}&map=brasilia&armaslazy=0&cs16=1`,
    { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction((w) => window.__authoredVm?.entry?.(w)?.mint?.active, ARMA, { timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'quadril.png') });

  const medida = await page.evaluate((arma) => {
    const g = window.__game;
    const vm = window.__authoredVm;
    const cam = g.vmCamera;
    const boca = vm.muzzleWorld(arma, cam);
    const alca = vm.sightWorld(arma, cam);
    if (!boca || !alca) return { erro: 'sem sockets' };
    // altura da alça sobre o eixo do cano, em espaço de câmera
    const dir = boca.clone().normalize();
    const proj = dir.clone().multiplyScalar(alca.dot(dir));
    const acima = alca.clone().sub(proj);
    // "para cima" na câmera é +Y
    return {
      alturaSobreCano: +acima.y.toFixed(4),
      bocaCam: [boca.x, boca.y, boca.z].map((v) => +v.toFixed(3)),
      alcaCam: [alca.x, alca.y, alca.z].map((v) => +v.toFixed(3)),
    };
  }, ARMA);
  console.log('SOCKETS=' + JSON.stringify(medida));

  // liga a mira de ferro (ADS) e deixa assentar
  await page.evaluate(() => { window.__game.player.scoped = true; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'ads.png') });
  const ads = await page.evaluate(() => ({
    adsF: +(window.__game.vm.adsF ?? 0).toFixed(2),
    adsAmount: +(window.__authoredVm.adsAmount ?? 0).toFixed(2),
  }));
  console.log('ADS=' + JSON.stringify(ads), '->', OUT);
} finally {
  await browser.close().catch(() => {});
  srv.kill();
}

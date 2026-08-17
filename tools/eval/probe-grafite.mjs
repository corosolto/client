/* probe-grafite.mjs — DESCARTÁVEL. Abre a passada viva de um mapa e despeja os
   contadores de recusa + superfícies + âncoras, para diagnóstico. Não é régua. */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8123';
const id = process.argv[2] || 'loja_h';

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => { window.__grafiteDebug = true; });
await page.goto(`${BASE}/mapview.html?map=${id}&grafite=vivo`, { waitUntil: 'networkidle' });
await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', null, { timeout: 300000 });
const g = await page.evaluate(() => {
  const p = (window.__grafite || {}).pass || {};
  return {
    ancoras: p.ancoras, pecas: p.pecas, alvos: p.alvos,
    recusa: p.recusa, superficies: p.superficies, tempo: p.tempo,
    ancDetalhe: p.ancDetalhe || null,
  };
});
await browser.close();
console.log(JSON.stringify(g, null, 1));

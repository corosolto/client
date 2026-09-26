#!/usr/bin/env node
// Selo de depuração (vm-debug-badge) por arma no jogo real: o que o runtime diz que serve.
// Uso: node tools/fabrica/captura/selo.mjs --armas=ak,m4 [--query=vmfabrica=1] [--porta=4671]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const q = new URLSearchParams({ debug: '1', auto: 'E', map: 'piscina_treta', armaslazy: '0', vmauthored: '1' });
for (const [k, v] of new URLSearchParams(arg('query'))) q.set(k, v);
await page.goto(`http://127.0.0.1:${arg('porta', '4671')}/?${q}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
for (const w of arg('armas', 'ak').split(',')) {
  await page.evaluate((x) => window.__game._switchWeapon(x), w);
  await page.waitForTimeout(4000);
  const r = await page.evaluate((x) => ({ selo: document.getElementById('vm-debug-badge')?.textContent || '',
    chave: window.__authoredVm?.entry?.(x)?.key || '', golden: Boolean(window.__authoredVm?.entry?.(x)?.golden) }), w);
  console.log(`${w.padEnd(8)} ${r.selo} · entry ${r.chave}${r.golden ? ' (golden)' : ''}`);
}
await browser.close();

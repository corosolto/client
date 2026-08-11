// G2-R14A capture: prova visual das 3 correções do dono — (2) viewmodels ~28% MENORES,
// (3) cano ALINHADO ao crosshair (yaw ≤0.09), em 1600×900 e 1512×982 (tela do dono).
// Igual ao g2-capture, mas com espera ADAPTATIVA: o lazy-load (G2-R14A) pode levar
// alguns segundos pra construir o VM estático de uma classe nova — espera o VM visível
// (ou timeout) antes de fotografar, senão a captura pegaria o fallback procedural.
// Uso: node tools/eval/g2r14-capture.mjs <outDir> <W,H> [arma1,arma2,...]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/g2r14';
const [VW, VH] = (process.argv[3] || '1600,900').split(',').map(Number);
const LIST = (process.argv[4] || 'ak,m4,mp5,p90,tavor,famas,uzi,m92,shotgun,md97,awp,svd,deagle,pistol,knife').split(',');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_pool_day`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
await page.waitForFunction(() => { const g = window.__game; if (g.state === 'countdown') g.time += 0.5; return g.state === 'live'; }, null, { timeout: 60000, polling: 200 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
});

for (const id of LIST) {
  const info = await page.evaluate(async (wid) => {
    const g = window.__game;
    g._switchWeapon(wid); g.player.drawUntil = 0;
    g.player.pitch = 0; g.player.vel?.set?.(0, 0, 0);
    // espera o lazy-load construir/mostrar o VM estático da classe (até 25s)
    const t0 = performance.now();
    let vm = null;
    while (performance.now() - t0 < 25000) {
      const vis = Object.entries(g.vm.staticVms).find(([k, m]) => m.visible);
      if (vis) { vm = vis[0]; break; }
      await new Promise(r => setTimeout(r, 250));
    }
    return { vm, waitMs: (performance.now() - t0) | 0 };
  }, id);
  await page.waitForTimeout(450);
  await page.evaluate(() => { const g = window.__game; g.player.drawUntil = 0; g.player.reloadUntil = 0; g.player.pitch = 0; });
  await page.screenshot({ path: `${OUT}/${id}.png` });
  await page.screenshot({ path: `${OUT}/${id}-crop.png`, clip: { x: VW * 0.45, y: VH * 0.45, width: VW * 0.55, height: VH * 0.55 } });
  console.log('shot', id, JSON.stringify(info));
}
const meta = await page.evaluate(() => {
  const g = window.__game;
  return { aspect: +(innerWidth / innerHeight).toFixed(3), vmFov: +g.vmCamera?.fov?.toFixed(1), vms: Object.keys(g.vm.staticVms || {}).length };
});
console.log('meta', JSON.stringify(meta));
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);

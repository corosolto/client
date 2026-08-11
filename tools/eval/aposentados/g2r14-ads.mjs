// G2-R14A — prova do ADS da shotgun (dono: "shotgun não mira"): entra em partida debug,
// equipa a M3, segura o botão direito (scope) e captura hip → ADS. Verifica também o
// estado interno (scoped, adsF, _adsSlide, FOV) e a crosshair de precisão.
// Uso: node tools/eval/g2r14-ads.mjs <outPngPrefix> <W,H>
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PREFIX = process.argv[2] || '/tmp/gauntlet/g2r14-ads';
const [VW, VH] = (process.argv[3] || '1600,900').split(',').map(Number);
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=B,sindicato&map=fy_pool_day`, { waitUntil: 'domcontentloaded', timeout: 120000 });   // sindicato = shotgun de fábrica
await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
await page.waitForFunction(() => { const g = window.__game; if (g.state === 'countdown') g.time += 0.5; return g.state === 'live'; }, null, { timeout: 60000, polling: 200 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
  g._switchWeapon('shotgun'); g.player.drawUntil = 0; g.player.pitch = 0;
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${PREFIX}-shotgun-hip.png` });

// ADS: simula segurar o botão direito (arma sem luneta → _scope(true) enquanto segura)
await page.evaluate(() => { const g = window.__game; g._scope(true); });
// adsF/FOV/slide sobem no update loop com dt real — em swiftshader (~1fps) cada frame
// conta; espera o estado FINAL de ADS (slide completo + zoom fechado), não um timeout fixo.
await page.waitForFunction(() => {
  const g = window.__game;
  return g.player.scoped && (g._adsSlide || 0) > 0.9 && g.camera.fov < 50;
}, null, { timeout: 120000, polling: 500 });
await page.waitForTimeout(400);
const st = await page.evaluate(() => {
  const g = window.__game;
  return {
    scoped: g.player.scoped, adsF: +(g.vm.adsF || 0).toFixed(2), adsSlide: +(g._adsSlide || 0).toFixed(2),
    fov: +g.camera.fov.toFixed(1), precCross: g.el.crosshair.classList.contains('prec'),
    vmVisible: g.vm.root.visible, staticVm: Object.entries(g.vm.staticVms).find(([k, m]) => m.visible)?.[0] || null,
  };
});
console.log('ADS shotgun state:', JSON.stringify(st));
await page.screenshot({ path: `${PREFIX}-shotgun-ads.png` });
// solta: volta ao hip
await page.evaluate(() => { const g = window.__game; g._scope(false); g.vm.adsF = 0; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${PREFIX}-shotgun-back.png` });

const ok = st.scoped && st.adsSlide > 0.5 && st.fov < 50 && st.precCross;
console.log(ok ? 'ADS SHOTGUN OK' : 'ADS SHOTGUN FALHOU');
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(ok && !errors ? 0 : 1);

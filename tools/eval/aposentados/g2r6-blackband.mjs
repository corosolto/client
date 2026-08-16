// G2-R6A: detector de FAIXA PRETA — hook no renderer: após cada frame renderizado,
// lê o framebuffer (amostragem de linhas) e detecta (a) frames quase pretos e
// (b) bandas horizontais pretas contíguas. Roda durante trocas de arma repetidas.
// Uso: node tools/eval/aposentados/g2r6-blackband.mjs [segundosPorCenario]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECS = parseFloat(process.argv[2] || '10');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
  // ---- hook de análise de frame ----
  const r = g.renderer;
  const SW = 128, SH = 84;              // downsample via drawImage (GPU-composited, rápido)
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const DARK = 12;                      // pixel "preto"
  g.__bb = { frames: 0, blackFrames: 0, bandFrames: 0, worst: 0, log: [] };
  // hook via rAF próprio (registrado DEPOIS do loop do jogo → roda após o render,
  // antes do paint — drawImage ainda vê os pixels do frame). NÃO embrulhar
  // renderer.render: o bloom.js reatribui renderer.render a cada frame (raw/patched).
  (function hook() {
    requestAnimationFrame(hook);
    const bb = g.__bb;
    bb.frames++;
    if (bb.frames % 2) return;          // analisa 1 a cada 2 frames (custo)
    cx.drawImage(r.domElement, 0, 0, SW, SH);
    const d = cx.getImageData(0, 0, SW, SH).data;
    let darkRows = 0, run = 0, maxRun = 0;
    for (let y = 0; y < SH; y++) {
      let dark = 0;
      for (let x = 0; x < SW; x++) {
        const i = (y * SW + x) * 4;
        if (d[i] < DARK && d[i + 1] < DARK && d[i + 2] < DARK) dark++;
      }
      if (dark / SW > 0.85) { darkRows++; run++; if (run > maxRun) maxRun = run; }
      else run = 0;
    }
    const bandPct = maxRun / SH;
    if (darkRows / SH > 0.6) { bb.blackFrames++; if (bb.log.length < 30) bb.log.push({ f: bb.frames, kind: 'black', pct: +(darkRows / SH).toFixed(2), w: g.player.weapon, t: +g.time.toFixed(2) }); }
    else if (bandPct > 0.12) { bb.bandFrames++; if (bandPct > bb.worst) bb.worst = +bandPct.toFixed(2); if (bb.log.length < 30) bb.log.push({ f: bb.frames, kind: 'band', pct: +bandPct.toFixed(2), w: g.player.weapon, t: +g.time.toFixed(2) }); }
  })();
});

async function scenario(name, setupFn) {
  await page.evaluate(() => { const g = window.__game; g.__bb.frames = 0; g.__bb.blackFrames = 0; g.__bb.bandFrames = 0; g.__bb.worst = 0; g.__bb.log = []; });
  await page.evaluate(setupFn);
  await page.waitForTimeout(SECS * 1000);
  const r = await page.evaluate(() => window.__game.__bb);
  console.log(`[${name}]`, JSON.stringify(r));
}

// 1) troca repetida de rifle <-> outras (switch seco a cada 700ms)
await scenario('switch-loop', () => {
  const g = window.__game;
  const seq = ['ak', 'pistol', 'm4', 'deagle', 'g3', 'knife', 'mp5', 'pistol'];
  let i = 0;
  g.__swTimer = setInterval(() => { g._switchWeapon(seq[i++ % seq.length]); }, 700);
  setTimeout(() => clearInterval(g.__swTimer), 9000);
});
// 2) pickup real: dropa um rifle nos pés a cada 1.2s e anda por cima (grab path)
await scenario('pickup-loop', () => {
  const g = window.__game;
  const seq = ['ak', 'g3', 'm4', 'scar', 'famas'];
  let i = 0;
  g.__pkTimer = setInterval(() => {
    const w = seq[i++ % seq.length];
    g._dropWeapon(g.player.pos.x, g.player.pos.z, w);
  }, 1200);
  setTimeout(() => clearInterval(g.__pkTimer), 9000);
});
// 3) ADS rifle repetido (AUG-style slide) — hipótese (c)
await scenario('ads-loop', () => {
  const g = window.__game;
  g._switchWeapon('ak'); g.player.drawUntil = 0;
  let on = false;
  g.__adTimer = setInterval(() => { on = !on; g._scope(on, true); }, 900);
  setTimeout(() => clearInterval(g.__adTimer), 9000);
});
await page.screenshot({ path: '/tmp/gauntlet/g2r6-bb-final.png' });
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);

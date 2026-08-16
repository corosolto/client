// Captura 1080p dos braços FP dedicados (FASE 2): roda uma partida debug, troca de
// arma e tira screenshots FULL-FRAME em 1920×1080 (a barra de aceite — julgar qualidade
// em thumbnail pequeno já enganou). Imprime o gripError() objetivo por arma e falha se
// alguma mão estiver fora do alvo (> 0.01 m).
// Usage: node tools/eval/fparms-capture.mjs [outDir] [weapon1,weapon2,...] [char] [scenarios]
//   scenarios: "1" adds reload mid-dip / draw / ADS / look-down shots (arma = 1ª da lista).
//   env QS: query string extra (ex: QS='fpr=0,-0.03,-0.04&fpy=-1.6' ou QS='fpoff=1').
//   env SWEEP: 'qs1|qs2|...' — uma página por candidato (tuning de rotação/offset),
//     arquivo vira <qs-urlenc>/<arma>.png. Sem gripError gate (exploração visual).
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/fparms1080';
const LIST = (process.argv[3] || 'ak,deagle,awp,knife').split(',');
const CHAR = process.argv[4] || 'mst';
const SCEN = process.argv[5] === '1';
const BASE = process.env.BASE || 'http://localhost:8123';
const QS = process.env.QS ? `&${process.env.QS}` : '';
const SWEEP = process.env.SWEEP ? process.env.SWEEP.split('|') : null;
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

// Modo SWEEP: um load por candidato, shots full-frame, sem gate — p/ escolher tuning.
if (SWEEP) {
  for (const cand of SWEEP) {
    const dir = `${OUT}/${encodeURIComponent(cand)}`;
    mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    await page.goto(`${BASE}/?debug=1&auto=P,${CHAR}&${cand}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
    for (const id of LIST) {
      await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; }, id);
      await page.waitForTimeout(500);
      const err = await page.evaluate(() => (window.__game.vm.arms ? window.__game.vm.arms.gripError() : null));
      if (err) console.log(`[${cand}] ${id}: r=${err.r.toFixed(4)} l=${err.l === null ? '-' : err.l.toFixed(4)}`);
      await page.screenshot({ path: `${dir}/${id}.png` });
    }
    console.log('sweep done:', cand);
    await page.close();
  }
  console.log('DONE ->', OUT);
  await browser.close();
  process.exit(0);
}
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,${CHAR}${QS}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
const hasArms = await page.evaluate(() => !!(window.__game.vm && window.__game.vm.arms));
console.log('char', CHAR, '| fpArms:', hasArms ? 'DEDICATED' : 'FALLBACK(procedural)');

let fail = 0;
for (const id of LIST) {
  const ok = await page.evaluate((wid) => {
    const g = window.__game;
    if (g._switchWeapon) { g._switchWeapon(wid); g.player.drawUntil = 0; return true; }   // zera o draw p/ frame estável
    return false;
  }, id);
  await page.waitForTimeout(500);   // deixa o IK convergir e o frame assentar
  const err = await page.evaluate(() => {
    const g = window.__game;
    return g.vm.arms ? g.vm.arms.gripError() : null;
  });
  if (err) {
    const rBad = !(err.r <= 0.01), lBad = err.l !== null && !(err.l <= 0.01);   // NaN reprova
    if (rBad || lBad) fail++;
    console.log(`gripError ${id}: r=${err.r.toFixed(4)} l=${err.l === null ? '-' : err.l.toFixed(4)} ${rBad || lBad ? 'FAIL' : 'ok'}`);
  } else console.log(`gripError ${id}: (sem braços — fallback)`);
  await page.screenshot({ path: `${OUT}/${id}.png` });   // full frame 1920×1080
  console.log(ok ? 'shot' : 'NO MODEL', id);
}

if (SCEN) {
  const id = LIST[0];
  const shot = async (name, ms = 0) => {
    if (ms) await page.waitForTimeout(ms);
    await page.screenshot({ path: `${OUT}/scen-${name}.png` });
    console.log('shot scen-' + name);
  };
  // reload mid-dip
  await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; }, id);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = window.__game; g.player.ammo[g.player.weapon].mag = 1; g._startReload(); });
  await shot('reload', 500);
  const errR = await page.evaluate(() => (window.__game.vm.arms ? window.__game.vm.arms.gripError() : null));
  if (errR) console.log(`gripError reload-mid: r=${errR.r.toFixed(4)} l=${errR.l === null ? '-' : errR.l.toFixed(4)}`);
  await page.evaluate(() => { const g = window.__game; g.player.reloadUntil = 0; });
  // draw (frame no meio da subida, ~100ms após trocar) — timing natural, sem zerar drawUntil
  await page.evaluate((wid) => { const g = window.__game; g._switchWeapon('deagle'); g._switchWeapon(wid); }, id);
  await shot('draw', 100);
  await page.waitForTimeout(500);
  // ADS (iron-sight, sem scope real) — ak segue na tela; awp tem scope real (some a vm, correto)
  await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; }, id);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__game._scope(true));
  await shot('ads', 400);
  const errA = await page.evaluate(() => (window.__game.vm.arms ? window.__game.vm.arms.gripError() : null));
  if (errA) console.log(`gripError ads: r=${errA.r.toFixed(4)} l=${errA.l === null ? '-' : errA.l.toFixed(4)}`);
  await page.evaluate(() => window.__game._scope(false, true));
  // look-down: cabeça/pernas não podem vazar no quadro
  await page.evaluate(() => { window.__game.player.pitch = 1.15; });
  await shot('lookdown', 250);
  await page.evaluate(() => { window.__game.player.pitch = 0; });
}
console.log(fail ? `GRIPERROR FAIL (${fail})` : 'GRIPERROR OK');
console.log('DONE ->', OUT);
await browser.close();
process.exit(fail ? 2 : 0);

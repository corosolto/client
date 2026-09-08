import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8136');
const out = option('out', 'tools/eval/carandiru-performance.json');
const captureDir = option('capture-dir', '');
const baselineRef = option('baseline-ref', '5d5155ba');
const seconds = Number(option('seconds', '8'));
if (!(seconds >= 3 && seconds <= 120)) throw new Error('seconds fora de 3..120');
if (captureDir) mkdirSync(captureDir, { recursive: true });

const sourcePath = 'public/js/map_penitenciaria.js';
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const samples = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  for (const variant of ['baseline', 'candidate']) for (const quality of ['med', 'low']) for (const team of [5, 8]) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [], failed = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${new URL(response.url()).pathname}`); });
    if (variant === 'baseline') await page.route(/\/js\/map_penitenciaria\.js(?:\?|$)/, (route) => route.fulfill({
      status: 200, contentType: 'text/javascript',
      body: execFileSync('git', ['show', `${baselineRef}:public/js/map_penitenciaria.js`], { encoding: 'utf8' }),
    }));
    await page.addInitScript(({ quality, team }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots: team, vol: 0, speech: false }));
      let state = 1977 + team; Math.random = () => { state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    }, { quality, team });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=penitenciaria&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const game = window.__game, info = game.renderer.info;
      game.player.hp = 1e9; game.timeLeft = 1e6; game.ctfMatchLeft = 1e6;
      info.autoReset = false;
      const calls = [], triangles = [], original = game.update;
      game.update = function(...args) {
        const rendered = args[1] !== false;
        if (rendered) info.reset();
        const result = original.apply(this, args);
        if (rendered) { calls.push(info.render.calls); triangles.push(info.render.triangles); }
        return result;
      };
      window.__carandiruPerf = { calls, triangles, started: performance.now() };
    });
    await page.waitForTimeout(seconds * 1000);
    const row = await page.evaluate(({ quality, team, variant }) => {
      const game = window.__game, perf = window.__carandiruPerf;
      const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] || 0;
      game.paused = true;
      return { variant, quality, team, actualBots: game.bots.length, state: game.state,
        elapsedMs: performance.now() - perf.started, frames: perf.calls.length,
        callsPerFrame: perf.calls.length ? perf.calls.reduce((a, b) => a + b, 0) / perf.calls.length : 0,
        callsMedian: median(perf.calls), callsMax: Math.max(0, ...perf.calls),
        trianglesPerFrame: perf.triangles.length ? perf.triangles.reduce((a, b) => a + b, 0) / perf.triangles.length : 0 };
    }, { quality, team, variant });
    row.warnings = [...new Set([...errors, ...failed])];
    row.errors = row.warnings.filter((message) => !message.includes('SUPPORT_URL_BR is not defined')
      && !/^404 \/(?:%7B%60\/)?(?:map-preview\.css|js\/ops\.js)$/.test(message)
      && !/^404 \/(?:api\/geo-lang|audio\/)/.test(message));
    for (const key of ['elapsedMs', 'callsPerFrame', 'trianglesPerFrame']) row[key] = +row[key].toFixed(2);
    samples.push(row);

    if (captureDir && variant === 'candidate' && quality === 'med' && team === 5) {
      const views = [
        ['divineia', [0, 1.62, -40], [0, 2.2, -8]],
        ['radial', [-14, 1.62, -24], [0, 2.4, 0]],
        ['pavilhao-6', [0, 1.62, -8.5], [0, 2.4, 0]],
        ['galeria', [3.25, 5.02, 5.5], [-2.8, 4.5, -4]],
        ['muralha', [36.7, 7.42, -12], [36.7, 6.2, 20]],
        ['guarita-patio', [20, 1.62, 30], [9, 8.2, 45.35]],
      ];
      await page.evaluate(() => {
        const game = window.__game;
        for (const bot of game.bots) bot.mesh.group.visible = false;
        for (const id of ['hud', 'pause-overlay', 'banner', 'crosshair', 'killfeed']) document.getElementById(id)?.classList.add('hidden');
      });
      for (const [name, from, target] of views) {
        const metrics = await page.evaluate(({ from, target }) => {
          const game = window.__game, info = game.renderer.info;
          game.camera.position.set(...from); game.camera.lookAt(...target); game.camera.updateMatrixWorld(true);
          info.reset(); game.renderer.render(game.scene, game.camera);
          return { calls: info.render.calls, triangles: info.render.triangles };
        }, { from, target });
        await page.screenshot({ path: `${captureDir}/${name}.png` });
        writeFileSync(`${captureDir}/${name}.json`, JSON.stringify({ viewport: [1200, 800], from, target, ...metrics }, null, 2) + '\n');
      }
    }
    console.log(JSON.stringify({ variant, quality, team, frames: row.frames, calls: row.callsPerFrame, errors: row.errors.length }));
    await context.close();
  }
} finally { await browser.close(); }

const report = {
  scope: 'Chrome/WebGL real em 1200x800; 5x5 e 8x8 med/low; média de todos os passes por quadro.',
  baseline: { ref: baselineRef, source: 'C1 limpo medido na mesma execução; teto de 15% definido no dossiê @ 24b88b96', ceiling: 1.15 },
  sourceSha256, browser: 'Google Chrome', viewport: [1200, 800], seconds, samples,
};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
if (samples.some((row) => row.errors.length || row.state !== 'live' || row.actualBots !== row.team * 2 - 1 || row.frames < 120)) process.exitCode = 1;

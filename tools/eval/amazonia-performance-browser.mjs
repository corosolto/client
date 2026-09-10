// Evidência real da Amazônia: uma combinação por processo Chrome para não carregar
// cache/JIT de outro tamanho de equipe ou preset. Não é gate universal de FPS.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8172');
const out = option('out', 'artifacts/amazonia-8x8-r2/browser');
const teamSize = Number(option('teams', '8'));
const quality = option('quality', 'med');
const seconds = Number(option('seconds', '30'));
const width = Number(option('width', '1536'));
const height = Number(option('height', '1024'));
const seed = Number(option('seed', '4321'));
if (![5, 8].includes(teamSize) || !['low', 'med'].includes(quality)
  || !(seconds >= 10 && seconds <= 180) || !Number.isInteger(width) || !Number.isInteger(height)
  || width < 960 || height < 540 || !Number.isInteger(seed)) throw new Error('Argumentos inválidos');

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ teamSize, quality, seed }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots: teamSize, vol: 0, speech: false }));
    let state = seed;
    Math.random = () => {
      state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }, { teamSize, quality, seed });
  await page.goto(`${base}/?debug=1&auto=P,mst&map=amazonia&perfilauto=0`, {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
  // GLBs, shaders e shadow map chegam de forma assíncrona; não misturar montagem com amostra.
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    const game = window.__game;
    game.player.hp = 1e9; game.timeLeft = 1e6; game.ctfMatchLeft = 1e6;
    const stats = {}, frames = [], draw = { frames: 0, maxCalls: 0, maxTriangles: 0 };
    for (const name of ['_updateBot', '_losClear', '_collide']) {
      const fn = game[name], row = stats[name] = { calls: 0, ms: 0, max: 0 };
      game[name] = function(...args) {
        const start = performance.now();
        try { return fn.apply(this, args); } finally {
          const elapsed = performance.now() - start;
          row.calls++; row.ms += elapsed; row.max = Math.max(row.max, elapsed);
        }
      };
    }

    const gl = game.renderer.getContext();
    const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const gpu = { available: !!extension, pending: [], samples: [], disjoint: false, renders: 0 };
    const collectGpu = () => {
      if (!extension) return;
      gpu.disjoint ||= !!gl.getParameter(extension.GPU_DISJOINT_EXT);
      gpu.pending = gpu.pending.filter(query => {
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return true;
        gpu.samples.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(query);
        return false;
      });
    };

    const update = game.update;
    stats.update = { calls: 0, ms: 0, max: 0 };
    game.renderer.info.autoReset = false;
    game.update = function(dt, render = true) {
      const sampleGpu = render && extension && (++gpu.renders % 12 === 0);
      const query = sampleGpu ? gl.createQuery() : null;
      if (query) gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
      if (render) game.renderer.info.reset();
      const start = performance.now();
      try { return update.call(this, dt, render); } finally {
        const elapsed = performance.now() - start, row = stats.update;
        row.calls++; row.ms += elapsed; row.max = Math.max(row.max, elapsed);
        if (query) { gl.endQuery(extension.TIME_ELAPSED_EXT); gpu.pending.push(query); }
        collectGpu();
        if (render) {
          draw.frames++;
          draw.maxCalls = Math.max(draw.maxCalls, game.renderer.info.render.calls);
          draw.maxTriangles = Math.max(draw.maxTriangles, game.renderer.info.render.triangles);
        }
      }
    };

    let last = performance.now();
    const tick = time => {
      if (!window.__amazoniaPerf.active) return;
      frames.push(time - last); last = time; requestAnimationFrame(tick);
    };
    window.__amazoniaPerf = {
      active: true, stats, frames, draw, gpu, gl, extension, collectGpu,
      start: performance.now(), renderedStart: game._rafFrames || 0,
    };
    requestAnimationFrame(tick);
  });

  await page.waitForTimeout(seconds * 1000);
  const result = await page.evaluate(() => {
    const game = window.__game, sample = window.__amazoniaPerf;
    sample.active = false;
    sample.gl.finish(); sample.collectGpu();
    const quantile = (values, p) => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? null;
    const frameTimes = sample.frames.slice(1).sort((a, b) => a - b);
    const gpuTimes = sample.gpu.samples.sort((a, b) => a - b);
    const result = {
      map: game._mapId, teamSize: game.settings.bots, actualBots: game.bots.length,
      quality: game.settings.quality, pixelRatio: game.renderer.getPixelRatio(),
      viewport: [innerWidth, innerHeight], drawingBuffer: [sample.gl.drawingBufferWidth, sample.gl.drawingBufferHeight],
      elapsedMs: performance.now() - sample.start, frames: frameTimes.length,
      renderedFrames: (game._rafFrames || 0) - sample.renderedStart,
      frameMs: { p50: quantile(frameTimes, .5), p95: quantile(frameTimes, .95), p99: quantile(frameTimes, .99), max: frameTimes.at(-1) ?? null },
      longFrames: {
        over16_7: frameTimes.filter(value => value > 16.7).length,
        over33_3: frameTimes.filter(value => value > 33.3).length,
        over50: frameTimes.filter(value => value > 50).length,
        over100: frameTimes.filter(value => value > 100).length,
      },
      cpu: sample.stats, draw: sample.draw,
      gpuTimer: {
        available: sample.gpu.available, disjoint: sample.gpu.disjoint,
        samples: gpuTimes.length, p50: quantile(gpuTimes, .5), p95: quantile(gpuTimes, .95), max: gpuTimes.at(-1) ?? null,
      },
      gpu: game.renderer.__csWebgl, state: game.state, simulationTime: game.time,
    };
    game.paused = true;
    // A blindagem usada durante a amostra não deve poluir a captura humana.
    game.player.hp = 100; game._updateHud();
    return result;
  });
  const label = `amazonia-${teamSize}-${quality}-${width}x${height}`;
  result.errors = errors;
  writeFileSync(`${out}/${label}.json`, `${JSON.stringify(result, null, 2)}\n`);
  await page.screenshot({ path: `${out}/${label}.png` });
  await page.evaluate(() => {
    const game = window.__game;
    // Plano fixo: igarapé + palafita/escada, para comparar 3:2 e 16:9 sem a capa
    // baixa de spawn esconder a cena. É evidência visual; fica fora da medição.
    game.camera.position.set(0, 5, -35);
    game.camera.lookAt(14, 2.3, -27);
    game.renderer.render(game.scene, game.camera);
  });
  await page.screenshot({ path: `${out}/${label}-overview.png` });
  console.log(JSON.stringify({ label, pixelRatio: result.pixelRatio, frameMs: result.frameMs,
    longFrames: result.longFrames, gpuTimer: result.gpuTimer, draw: result.draw, errors }));
  const timerInvalid = result.gpuTimer.available && (!result.gpuTimer.samples || result.gpuTimer.disjoint);
  if (errors.length || result.map !== 'amazonia' || result.actualBots !== teamSize * 2 - 1
    || result.gpu?.api !== 'webgl2' || timerInvalid) process.exitCode = 1;
  await context.close();
} finally {
  await browser.close();
}

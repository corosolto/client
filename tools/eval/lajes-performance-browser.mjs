// BUG-141: carga real com GPU, uma página por vez. Tempos são evidência desta máquina.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const out = option('out', 'artifacts/lajes-performance/browser'), base = option('base', 'http://127.0.0.1:8147');
const maps = option('maps', 'piscina_treta,lajes').split(','), teams = option('teams', '5,8').split(',').map(Number);
const seconds = Number(option('seconds', '30')), quality = option('quality', 'med'), linear = process.argv.includes('--linear');
if (!maps.every(m => ['lajes', 'piscina_treta'].includes(m)) || !teams.every(n => [5,8].includes(n)) || !['low','med','high'].includes(quality) || !(seconds >= 5 && seconds <= 180)) throw Error('Argumentos inválidos');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  for (const map of maps) for (const bots of teams) {
    const context = await browser.newContext({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(({ bots, quality }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots, vol: 0, speech: false }));
      let s = 4321; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    }, { bots, quality });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=${map}&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async linear => {
      const g = window.__game;
      if (linear) {
        const THREE = await import('/vendor/three.module.js');
        for (const m of g.world.occluders) if (m.name === 'lajes-alvenaria') m.raycast = THREE.Mesh.prototype.raycast;
        g.world.rayOccluded = undefined;
      }
      g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6;
      const stats = {}, frames = [], draw = { frames: 0, maxCalls: 0, maxTriangles: 0 }, start = performance.now();
      g.renderer.info.autoReset = false;
      for (const name of ['update', '_updateBot', '_losClear', '_collide']) {
        const fn = g[name], row = stats[name] = { calls: 0, ms: 0, max: 0 };
        g[name] = function(...args) {
          const render = name === 'update' && args[1] !== false;
          if (render) g.renderer.info.reset();
          const t = performance.now();
          try { return fn.apply(this, args); } finally {
            const dt = performance.now() - t; row.calls++; row.ms += dt; row.max = Math.max(row.max, dt);
            if (render) { draw.frames++; draw.maxCalls = Math.max(draw.maxCalls, g.renderer.info.render.calls); draw.maxTriangles = Math.max(draw.maxTriangles, g.renderer.info.render.triangles); }
          }
        };
      }
      let last = start;
      const loop = t => { frames.push(t - last); last = t; if (window.__lajesPerf) requestAnimationFrame(loop); };
      window.__lajesPerf = { stats, frames, draw, start, renderedStart: g._rafFrames || 0 };
      requestAnimationFrame(loop);
    }, linear);
    console.log('medindo', map, bots, quality, seconds);
    await page.waitForTimeout(seconds * 1000);
    const result = await page.evaluate(() => {
      const g = window.__game, m = window.__lajesPerf; window.__lajesPerf = null;
      const frames = m.frames.slice(1).sort((a,b) => a-b);
      const result = { elapsed: performance.now()-m.start, frames: frames.length, renderedFrames: (g._rafFrames || 0)-m.renderedStart,
        p50: frames[Math.floor(frames.length*.5)], p95: frames[Math.floor(frames.length*.95)], max: frames.at(-1),
        over100ms: frames.filter(t => t>100).length, stats: m.stats, draw: m.draw, map: g._mapId,
        actualBots: g.bots.length, quality: g.settings.quality, gpu: g.renderer.__csWebgl, state: g.state, simulationTime: g.time };
      g.paused = true; return result;
    });
    const name = `${map}-${bots}-${quality}${linear ? '-linear' : ''}`;
    result.errors = errors; result.linear = linear;
    writeFileSync(`${out}/${name}.json`, JSON.stringify(result, null, 2));
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(JSON.stringify({ name, p50: result.p50, p95: result.p95, max: result.max, over100ms: result.over100ms, errors }));
    if (errors.length || result.frames === 0 || result.actualBots !== bots*2-1) process.exitCode = 1;
    await context.close();
  }
} finally { await browser.close(); }

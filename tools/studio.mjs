// studio — lean game-dev CLI for CS BRASIL (see STUDIO_CONSTITUTION.md).
//   node tools/studio.mjs benchmark [seconds] [map]
//   node tools/studio.mjs validate [char ...]
// Benchmark: FPS avg / p95 frame time / draw calls / triangles in a live match.
// Validate: runs the character eval gates (tools/eval/measure.mjs).
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const [, , cmd, ...args] = process.argv;
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();

async function chromium() {
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  return (_pw.chromium || _pw.default?.chromium);
}

if (cmd === 'benchmark') {
  const SECS = parseFloat(args[0] || '12');
  const AUTO = args[1] || 'P,mst';
  const browser = await (await chromium()).launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  await page.goto(`${BASE}/?debug=1&auto=${encodeURIComponent(AUTO)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
  const r = await page.evaluate(async (secs) => {
    const g = window.__game, rd = window.__renderer || null;
    const times = [];
    let last = performance.now();
    await new Promise(done => {
      const tick = () => {
        const now = performance.now(); times.push(now - last); last = now;
        if (times.length < secs * 60) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    times.sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)];
    const info = g.renderer && g.renderer.info ? { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, geoms: g.renderer.info.memory.geometries, tex: g.renderer.info.memory.textures } : null;
    return { frames: times.length, avgMs: +avg.toFixed(2), fps: +(1000 / avg).toFixed(1), p95Ms: +p95.toFixed(2), info };
  }, SECS);
  console.log(JSON.stringify({ note: 'headless swiftshader (software) — real GPU is much faster', ...r }, null, 1));
  await browser.close();
} else if (cmd === 'validate') {
  const chars = args.join(' ');
  console.log(execSync(`node tools/eval/measure.mjs ${chars}`.trim(), { encoding: 'utf8' }));
} else {
  console.log(`studio — comandos:
  benchmark [segundos] [team,char]   FPS médio / p95 frame time / draw calls (live match)
  validate [personagens...]          gates do eval de personagem (rubrica)
Env: BASE (default http://localhost:8123 — suba antes: node tools/eval/serve.mjs 8123)`);
}

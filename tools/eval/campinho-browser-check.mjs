import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8173');
const out = option('out', 'artifacts/campinho-main-r2/browser');
const teamSize = Number(option('teams', '8'));
const seconds = Number(option('seconds', '15'));
const width = Number(option('width', '1536'));
const height = Number(option('height', '1024'));
if (![5, 8].includes(teamSize) || seconds < 10 || seconds > 120
  || !Number.isInteger(width) || !Number.isInteger(height) || width < 960 || height < 540) {
  throw new Error('Argumentos invalidos');
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
try {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [], consoleErrors = [], failedResponses = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  await page.addInitScript(({ teamSize }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: teamSize, vol: 0.2, speech: false }));
    let state = 53000 + teamSize;
    Math.random = () => {
      state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }, { teamSize });
  await page.goto(`${base}/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1`, {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const game = window.__game;
    game.player.hp = 1e9; game.timeLeft = 1e6; game.ctfMatchLeft = 1e6;
    game.sfx.ensure();
    await game.sfx.ctx?.resume();
    const audio = { calls: {} };
    for (const name of ['shotWeapon', 'step', 'hit', 'roundSound', 'captureSound']) {
      const fn = game.sfx[name];
      if (typeof fn !== 'function') continue;
      audio.calls[name] = 0;
      game.sfx[name] = function(...args) { audio.calls[name]++; return fn.apply(this, args); };
    }
    game.sfx.shotWeapon('pistol');

    const frames = [], draw = { frames: 0, maxCalls: 0, maxTriangles: 0 };
    const update = game.update;
    game.renderer.info.autoReset = false;
    game.update = function(dt, render = true) {
      if (render) game.renderer.info.reset();
      try { return update.call(this, dt, render); } finally {
        if (render) {
          draw.frames++;
          draw.maxCalls = Math.max(draw.maxCalls, game.renderer.info.render.calls);
          draw.maxTriangles = Math.max(draw.maxTriangles, game.renderer.info.render.triangles);
        }
      }
    };
    let last = performance.now();
    const tick = (time) => {
      if (!window.__campinhoProbe.active) return;
      frames.push(time - last); last = time; requestAnimationFrame(tick);
    };
    window.__campinhoProbe = { active: true, audio, frames, draw, start: performance.now() };
    requestAnimationFrame(tick);
  });

  await page.waitForTimeout(seconds * 1000);
  const result = await page.evaluate(() => {
    const game = window.__game, sample = window.__campinhoProbe;
    sample.active = false;
    const quantile = (values, p) => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? null;
    const frameTimes = sample.frames.slice(1).sort((a, b) => a - b);
    const roles = {};
    game.world.root.traverse((object) => {
      if (object.userData.campinhoRole) roles[object.userData.campinhoRole] = (roles[object.userData.campinhoRole] || 0) + 1;
    });
    game.paused = true;
    return {
      map: game._mapId, teamSize: game.settings.bots, actualBots: game.bots.length,
      viewport: [innerWidth, innerHeight], frameMs: {
        p50: quantile(frameTimes, 0.5), p95: quantile(frameTimes, 0.95), max: frameTimes.at(-1) ?? null,
      },
      longFrames: { over33_3: frameTimes.filter((value) => value > 33.3).length, over100: frameTimes.filter((value) => value > 100).length },
      draw: sample.draw, gpu: game.renderer.__csWebgl, roles,
      audio: { ...sample.audio, contextState: game.sfx.ctx?.state || null, disabled: !!game.sfx.disabled, liveSamples: game.sfx._live?.size || 0 },
    };
  });
  const label = `campinho-${teamSize}-${width}x${height}`;
  const optionalMedia404s = failedResponses.filter(({ status, url }) => status === 404
    && /\/(?:audio|img\/decals)\//.test(new URL(url).pathname));
  const hardResponses = failedResponses.filter((entry) => !optionalMedia404s.includes(entry));
  result.pageErrors = pageErrors;
  result.consoleErrors = consoleErrors;
  result.failedResponses = hardResponses;
  result.optionalMedia404s = optionalMedia404s;
  writeFileSync(`${out}/${label}.json`, `${JSON.stringify(result, null, 2)}\n`);
  await page.evaluate(() => {
    const game = window.__game;
    game.camera.position.set(22, 10, 24);
    game.camera.lookAt(0, 1.1, 37);
    game.renderer.render(game.scene, game.camera);
  });
  await page.screenshot({ path: `${out}/${label}.png` });
  console.log(JSON.stringify({ label, frameMs: result.frameMs, draw: result.draw, gpu: result.gpu,
    roles: result.roles, audio: result.audio, pageErrors, failedResponses: hardResponses }));
  if (pageErrors.length || hardResponses.length || result.map !== 'quebrada'
    || result.actualBots !== teamSize * 2 - 1 || result.gpu?.api !== 'webgl2'
    || result.roles['gate-cover'] !== 2 || result.roles['sideline-cover'] !== 11
    || result.roles['sideline-backrest'] !== 2 || result.audio.contextState !== 'running'
    || result.audio.disabled || result.audio.calls.shotWeapon < 1) process.exitCode = 1;
  await context.close();
} finally {
  await browser.close();
}

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').split('=')[1] || '';
const PORT = arg('porta') || '8341';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.resolve(ROOT, arg('saida') || 'artifacts/viewmodels/golden-ak/runtime-final');
const VIEWPORT = { width: Number(arg('largura')) || 1440, height: Number(arg('altura')) || 960 };
const CELL = { width: 720, height: 480 };

const globalRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;

await fs.mkdir(OUT, { recursive: true });
const server = spawn('node', ['tools/eval/serve.mjs', PORT], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let attempt = 0; attempt < 60; attempt += 1) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const cells = [];
const report = {
  viewport: VIEWPORT, source: null, clips: [], materials: [], states: [],
  servedGlb: null, checks: {}, errors: [], networkWarnings: [],
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

async function openMap(map) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on('pageerror', (error) => report.errors.push(`${map}: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const failure = `${map}: HTTP ${response.status()} ${response.url()}`;
    report.networkWarnings.push(failure);
    if (/\/models\/viewmodels\/coro\/ak-hires\.glb|\/js\/(?:authoredvm|data\/vmconfig)\.js/.test(response.url())) {
      report.errors.push(failure);
    }
  });
  page.on('console', (message) => {
    const value = message.text();
    if (message.type() === 'error'
      && !value.startsWith('Failed to load resource:')
      && !value.startsWith('The AudioContext encountered an error')) {
      report.errors.push(`${map}: console: ${value}`);
    }
  });
  await page.goto(
    `${BASE}/?debug=1&auto=E&vmweapon=ak&map=${map}&armaslazy=0&vmgolden=1`,
    { waitUntil: 'domcontentloaded', timeout: 180000 },
  );
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction(() => window.__authoredVm?.entry?.('ak')?.golden === true, null, { timeout: 120000 });
  await page.waitForTimeout(1800);
  return page;
}

async function snapshot(page, label, metadata = {}) {
  const file = `${String(cells.length).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  const png = await page.screenshot({ type: 'png' });
  await fs.writeFile(path.join(OUT, file), png);
  cells.push({ label, file, png });
  report.states.push({ label, file, ...metadata });
}

async function startAction(page, kind) {
  return page.evaluate((kind) => {
    const game = window.__game;
    const vm = window.__authoredVm;
    if (kind === 'draw') {
      game.player.weapon = 'knife';
      game._switchWeapon('ak');
    } else if (kind === 'fire') {
      game.player.reloadUntil = 0;
      game.player.nextShotAt = 0;
      game.player.drawUntil = 0;
      game.mouseDown0 = true;
      game._tryShoot();
      game.mouseDown0 = false;
    } else if (kind === 'reload') {
      const ammo = game.player.ammo.ak;
      ammo.mag = Math.min(ammo.mag, 23);
      game.player.reloadUntil = 0;
      const ammoBefore = { ...ammo };
      game._startReload();
      game.__goldenAkQaReload = {
        duration: Math.max(0, game.player.reloadUntil - game.time),
        ammoBefore,
      };
    }
    const entry = vm.entry('ak');
    return { state: entry.state, clip: entry.action?.getClip?.().name || null };
  }, kind);
}

async function actionPose(page, kind, fraction) {
  return page.evaluate(({ kind, fraction }) => {
    const game = window.__game;
    const entry = window.__authoredVm.entry('ak');
    const action = entry.action;
    const duration = action?.getClip?.().duration || 0;
    const playbackRate = Math.abs(action?.timeScale || 0);
    const effectiveDuration = playbackRate ? duration / playbackRate : null;
    const reloadQa = game.__goldenAkQaReload;
    if (kind === 'reload' && reloadQa) {
      Object.assign(game.player.ammo.ak, reloadQa.ammoBefore);
      game.player.reloadUntil = game.time + reloadQa.duration * (1 - fraction);
    }
    if (action && duration) {
      action.paused = false;
      action.time = Math.min(duration - 1e-4, Math.max(0, duration * fraction));
      entry.mixer.update(1e-6);
      action.paused = true;
      game.update(0, true);
    }
    return {
      state: entry.state,
      clip: action?.getClip?.().name || null,
      clipDuration: duration,
      timeScale: action?.timeScale || 0,
      effectiveDuration,
      clipTime: action?.time || 0,
      gameReloadDuration: kind === 'reload' ? reloadQa?.duration ?? null : null,
      gameReloadRemaining: Math.max(0, game.player.reloadUntil - game.time),
      reloadSyncError: kind === 'reload' && effectiveDuration != null && reloadQa
        ? Math.abs(effectiveDuration - reloadQa.duration) : null,
      ammo: { ...game.player.ammo.ak },
    };
  }, { kind, fraction });
}

async function capturePoseSeries(page, kind, fractions) {
  await startAction(page, kind);
  for (const fraction of fractions) {
    const state = await actionPose(page, kind, fraction);
    await snapshot(page, `${kind}-${String(Math.round(fraction * 100)).padStart(3, '0')}`, state);
  }
}

try {
  console.log('runtime: abrindo Brasília');
  const open = await openMap('brasilia');
  const asset = await open.evaluate(async () => {
    const game = window.__game;
    const entry = window.__authoredVm.entry('ak');
    const modelUrl = '/models/viewmodels/coro/ak-hires.glb?v=golden-ak-4';
    const response = await fetch(modelUrl, { cache: 'no-store' });
    const modelBytes = await response.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', modelBytes));
    const sha256 = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const materials = [];
    entry.scene.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material || materials.some((item) => item.uuid === material.uuid)) continue;
        materials.push({
          uuid: material.uuid,
          name: material.name,
          color: material.color?.getHexString?.() || null,
          map: material.map?.name || material.map?.image?.currentSrc || null,
          normalMap: material.normalMap?.name || null,
          roughness: material.roughness,
          metalness: material.metalness,
        });
      }
    });
    return {
      source: entry.key,
      servedGlb: { url: response.url, status: response.status, bytes: modelBytes.byteLength, sha256 },
      clips: [...entry.clips.entries()].map(([alias, clip]) => ({ alias, name: clip.name, duration: clip.duration })),
      camera: { fov: game.vmCamera.fov, aspect: game.vmCamera.aspect },
      materials,
    };
  });
  report.source = asset.source;
  report.servedGlb = asset.servedGlb;
  report.clips = asset.clips;
  report.camera = asset.camera;
  report.materials = asset.materials;

  await snapshot(open, 'idle-inicio', { state: 'idle' });
  await open.waitForTimeout(3400);
  await snapshot(open, 'idle-prolongado', { state: 'idle', elapsed: 3.4 });

  const walkAttempts = [];
  for (const code of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
    const from = await open.evaluate((key) => {
      const game = window.__game;
      game.player.vel.x = 0;
      game.player.vel.z = 0;
      game.keys[key] = true;
      return [game.player.pos.x, game.player.pos.y, game.player.pos.z];
    }, code);
    await open.waitForTimeout(700);
    const to = await open.evaluate((key) => {
      const game = window.__game;
      game.keys[key] = false;
      return [game.player.pos.x, game.player.pos.y, game.player.pos.z];
    }, code);
    const distance = Math.hypot(to[0] - from[0], to[2] - from[2]);
    walkAttempts.push({ code, from, to, distance });
    if (distance >= 0.5) break;
  }
  report.checks.walkDistance = Math.max(...walkAttempts.map((attempt) => attempt.distance));
  await snapshot(open, 'corrida', { attempts: walkAttempts, distance: report.checks.walkDistance });

  const jumpStart = await open.evaluate(() => {
    const game = window.__game;
    game._spaceHeld = false;
    game.keys.Space = true;
    const y = game.player.pos.y;
    game._updatePlayer(1 / 60);
    return { y, velocityAfterInput: game.player.vel.y, groundedAfterInput: game.player.grounded };
  });
  await open.waitForTimeout(90);
  await open.evaluate(() => {
    const game = window.__game;
    game.keys.Space = false;
  });
  const jumpState = await open.evaluate(() => ({ y: window.__game.player.pos.y, grounded: window.__game.player.grounded }));
  report.checks.jumpRise = jumpState.y - jumpStart.y;
  await snapshot(open, 'salto', { startY: jumpStart.y, ...jumpStart, ...jumpState, rise: report.checks.jumpRise });

  await capturePoseSeries(open, 'draw', [0, 0.25, 0.5, 0.75, 0.999]);
  await capturePoseSeries(open, 'fire', [0, 0.25, 0.5, 0.75, 0.999]);
  await capturePoseSeries(open, 'reload', [0, 0.2, 0.36, 0.52, 0.6, 0.68, 0.76, 0.84, 0.999]);
  await open.evaluate(() => {
    const entry = window.__authoredVm.entry('ak');
    entry.action.paused = false;
    entry.action.time = Math.max(0, entry.action.getClip().duration - 0.02);
    entry.mixer.update(0.1);
  });
  await open.waitForTimeout(450);
  const postReload = await open.evaluate(() => {
    const game = window.__game;
    const entry = window.__authoredVm.entry('ak');
    return {
      state: entry.state,
      clip: entry.action?.getClip?.().name || null,
      gameReloadRemaining: Math.max(0, game.player.reloadUntil - game.time),
      ammo: { ...game.player.ammo.ak },
    };
  });
  await snapshot(open, 'pos-recarga', postReload);
  await open.close();

  console.log('runtime: abrindo espaço estreito');
  const tight = await openMap('piscina_treta');
  await snapshot(tight, 'espaco-estreito', { map: 'piscina_treta' });
  const wall = await tight.evaluate(() => {
    const game = window.__game;
    const p = game.player;
    const bound = game.world.bounds.maxX;
    p.pos.x = bound - 0.4;
    p.yaw = -Math.PI / 2;
    p.vel.set(0, 0, 0);
    game._collide(p.pos, 0.38);
    const before = [p.pos.x, p.pos.y, p.pos.z];
    game.keys.KeyW = true;
    return { before, bound };
  });
  await tight.waitForTimeout(900);
  const wallEnd = await tight.evaluate(() => {
    const game = window.__game;
    const p = game.player;
    game.keys.KeyW = false;
    return [p.pos.x, p.pos.y, p.pos.z];
  });
  report.checks.wallDistance = wall.bound - wallEnd[0];
  report.checks.wallBlockedTravel = Math.hypot(wallEnd[0] - wall.before[0], wallEnd[2] - wall.before[2]);
  await snapshot(tight, 'junto-a-parede', { map: 'piscina_treta', ...wall, after: wallEnd, ...report.checks });
  await tight.close();

  const labelled = await Promise.all(cells.map(async ({ label, png }) => sharp(png)
    .resize(CELL.width, CELL.height)
    .composite([{ input: Buffer.from(
      `<svg width="${CELL.width}" height="52"><rect width="100%" height="52" fill="#071019dd"/>` +
      `<text x="16" y="36" font-family="monospace" font-size="25" fill="#f4f7fa">${escapeXml(label)}</text></svg>`,
    ), top: 0, left: 0 }])
    .png().toBuffer()));
  const columns = 4;
  const rows = Math.ceil(labelled.length / columns);
  const sheet = await sharp({
    create: { width: CELL.width * columns, height: CELL.height * rows, channels: 3, background: '#071019' },
  }).composite(labelled.map((input, index) => ({
    input,
    left: (index % columns) * CELL.width,
    top: Math.floor(index / columns) * CELL.height,
  }))).png().toBuffer();
  await fs.writeFile(path.join(OUT, 'contact-sheet.png'), sheet);
  await fs.writeFile(path.join(OUT, 'runtime-report.json'), JSON.stringify(report, null, 2));
  console.log(`runtime: ${path.relative(ROOT, path.join(OUT, 'contact-sheet.png'))}`);
} finally {
  await browser.close();
  server.kill();
}

if (report.source !== 'gold#ak') throw new Error(`fonte inesperada: ${report.source}`);
if (!/^[a-f0-9]{64}$/.test(report.servedGlb?.sha256 || '')) throw new Error('SHA do GLB servido ausente');
if (report.states.some((state) => state.state === 'reload' && (state.reloadSyncError || 0) > 0.03)) {
  throw new Error('cadência de reload diverge entre gameplay e clip');
}
if (report.errors.length) process.exitCode = 1;
if ((report.checks.walkDistance || 0) < 0.5) process.exitCode = 1;
if ((report.checks.jumpRise || 0) < 0.05) process.exitCode = 1;
if ((report.checks.wallDistance || 99) > 0.6) process.exitCode = 1;

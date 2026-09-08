/* Evidência C4 no Game real: três travessias renderizadas 1200x800 sobre as
   polilinhas cuja cápsula, piso e largura são medidos por CAR4. O vídeo mostra
   continuidade visual; não substitui locomação humana nem aprovação do dono. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8136');
const out = option('out', 'artifacts/carandiru-c4/final');
const receiptPath = option('receipt', 'tools/eval/carandiru-c4-browser.json');
const sourcePath = 'public/js/map_penitenciaria.js';
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const viewport = { width: 1200, height: 800 };
const routeIds = ['radial-interna', 'externa-oeste', 'muralha-leste'];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const pngMeta = (path) => {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`PNG inválido: ${path}`);
  return { file: path, bytes: bytes.length, sha256: sha256(path), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const videoMeta = (path) => {
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,duration',
    '-show_entries', 'format=duration', '-of', 'json', path], { encoding: 'utf8' }));
  const stream = probe.streams?.find((item) => item.width && item.height) || {};
  return { file: path, bytes: statSync(path).size, sha256: sha256(path), width: stream.width || 0,
    height: stream.height || 0, durationSecs: +Number(stream.duration || probe.format?.duration || 0).toFixed(2) };
};
const trimVideo = (rawPath, finalPath, seconds) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
  '-sseof', `-${seconds.toFixed(3)}`, '-i', rawPath, '-an', '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0',
  '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p', finalPath]);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const samplePolyline = (points) => {
  const samples = [];
  for (let segment = 1; segment < points.length; segment++) {
    const a = points[segment - 1], b = points[segment];
    const length = distance(a, b), count = Math.max(1, Math.ceil(length / .45));
    for (let i = segment === 1 ? 0 : 1; i <= count; i++) {
      const t = i / count;
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return samples;
};
const unique = (values) => [...new Set(values)];
const allowedWarning = (message) => message.includes('SUPPORT_URL_BR is not defined')
  || /^404 \/(?:%7B%60\/)?(?:map-preview\.css|js\/ops\.js)$/.test(message)
  || /^404 \/(?:api\/geo-lang|audio\/)/.test(message);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const routes = [], warnings = [], errors = [];

async function openGame(context) {
  const page = await context.newPage(), pageErrors = [], failed = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: 5, vol: 0, speech: false }));
    let state = 1992; Math.random = () => { state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  });
  await page.goto(`${base}/?debug=1&auto=P,mst&map=penitenciaria&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '#hud,#pause-overlay,#round-banner,#banner,#killfeed { visibility:hidden !important }' });
  const prepared = await page.evaluate(() => {
    const game = window.__game;
    game.player.hp = 1e9; game.player.invuln = 1e9; game.timeLeft = 1e6; game.ctfMatchLeft = 1e6;
    game._updateBot = () => {}; game._updateCTF = () => {}; game._updatePickups = () => {};
    for (const bot of game.bots) { bot.mesh.group.visible = false; if (bot._mark?.halo) bot._mark.halo.visible = false; }
    game.paused = true;
    return { state: game.state, routes: game.world.carandiru.routes.map((route) => ({ id: route.id, points: route.points })) };
  });
  const collect = () => {
    const all = unique([...pageErrors, ...failed]); warnings.push(...all); errors.push(...all.filter((message) => !allowedWarning(message)));
  };
  return { page, prepared, collect };
}

try {
  for (const routeId of routeIds) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: out, size: viewport } });
    const { page, prepared, collect } = await openGame(context);
    const points = prepared.routes.find((route) => route.id === routeId)?.points;
    if (!points?.length) throw new Error(`rota ausente: ${routeId}`);
    const samples = samplePolyline(points);

    const captures = [];
    for (const [label, ratio] of [['inicio', 0], ['meio', .5], ['fim', 1]]) {
      const index = Math.round((samples.length - 1) * ratio);
      await page.evaluate(({ samples, index }) => {
        const game = window.__game, point = samples[index], last = samples.length - 1;
        const near = samples[index === last ? Math.max(0, index - 5) : Math.min(index + 5, last)];
        const next = index === last ? [point[0] * 2 - near[0], point[1] * 2 - near[1], point[2] * 2 - near[2]] : near;
        game.camera.position.set(point[0], point[1] + 1.62, point[2]);
        game.camera.lookAt(next[0], next[1] + 1.62, next[2]); game.camera.updateMatrixWorld(true);
        game.renderer.render(game.scene, game.camera);
      }, { samples, index });
      await page.waitForTimeout(180);
      const path = `${out}/${routeId}-${label}.png`; await page.screenshot({ path }); captures.push(pngMeta(path));
    }

    const trace = await page.evaluate(async ({ samples }) => {
      const game = window.__game, started = performance.now();
      let collisionCorrections = 0, maxCorrection = 0;
      for (let i = 0; i < samples.length; i++) {
        const point = samples[i], last = samples.length - 1, nextSample = samples[Math.min(i + 5, last)];
        const previous = samples[Math.max(0, i - 5)];
        const next = i === last ? [point[0] * 2 - previous[0], point[1] * 2 - previous[1], point[2] * 2 - previous[2]] : nextSample;
        const rise = Math.max(-.3, Math.min(.3, next[1] - point[1]));
        const probe = game.player.pos.clone().set(...point); game._collide(probe, .38);
        const correction = probe.distanceTo(game.player.pos.clone().set(...point));
        if (correction > 1e-3) collisionCorrections++;
        maxCorrection = Math.max(maxCorrection, correction);
        game.player.pos.set(...point); game.player.vel.set(0, 0, 0);
        game.camera.position.set(point[0], point[1] + 1.62, point[2]);
        game.camera.lookAt(next[0], point[1] + 1.62 + rise, next[2]); game.camera.updateMatrixWorld(true);
        game.renderer.render(game.scene, game.camera);
        await new Promise((resolve) => setTimeout(resolve, Math.abs(rise) > .005 ? 55 : 30));
      }
      return { collisionCorrections, maxCorrection, motionDurationMs: performance.now() - started };
    }, { samples });
    const video = page.video(); collect(); await context.close();
    const rawVideoPath = `${out}/${routeId}-raw.webm`, videoPath = `${out}/${routeId}.webm`;
    await video.saveAs(rawVideoPath); await video.delete();
    trimVideo(rawVideoPath, videoPath, trace.motionDurationMs / 1000 + .15); rmSync(rawVideoPath);
    const steps = samples.slice(1).map((point, i) => distance(point, samples[i]));
    const ys = samples.map((point) => point[1]);
    routes.push({ id: routeId, method: 'camera-over-CAR4-capsule-validated-polyline', continuous: true,
      points: points.length, traceSamples: samples.length,
      startErrorM: +distance(samples[0], points[0]).toFixed(4),
      endErrorM: +distance(samples.at(-1), points.at(-1)).toFixed(4),
      maxStepM: +Math.max(...steps).toFixed(4), collisionCorrections: trace.collisionCorrections,
      maxCollisionCorrectionM: +trace.maxCorrection.toFixed(4),
      motionDurationSecs: +(trace.motionDurationMs / 1000).toFixed(2),
      verticalRangeM: +(Math.max(...ys) - Math.min(...ys)).toFixed(2), video: videoMeta(videoPath), captures });
    console.log(`${routeId}: ${samples.length} amostras, ${routes.at(-1).video.durationSecs}s, correções=${trace.collisionCorrections}`);
  }

  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const { page, prepared, collect } = await openGame(context);
  const wallCaptures = [];
  for (const distanceM of [10, 20, 30]) {
    const actor = await page.evaluate(({ distanceM }) => {
      const game = window.__game, bot = game.bots[0], cameraZ = -14, targetZ = cameraZ + distanceM;
      const y = game.world.groundHeightAt(36.7, targetZ, 5.8);
      bot.pos.set(36.7, y, targetZ); bot.mesh.group.position.copy(bot.pos); bot.mesh.group.rotation.y = Math.PI;
      bot.mesh.group.visible = true;
      game.camera.position.set(36.7, 7.42, cameraZ); game.camera.lookAt(36.7, y + 1.4, targetZ);
      game.camera.updateMatrixWorld(true); game.renderer.render(game.scene, game.camera);
      return { actorId: bot.def?.id || null, actorGLB: !!bot.mesh?.isGLB, camera: game.camera.position.toArray(), actor: bot.pos.toArray() };
    }, { distanceM });
    await page.waitForTimeout(180);
    const path = `${out}/muralha-personagem-${distanceM}m.png`; await page.screenshot({ path });
    wallCaptures.push({ distanceM, ...actor, ...pngMeta(path) });
  }
  collect(); await context.close();

  const receipt = { sourceSha256, browser: 'Google Chrome', viewport: [viewport.width, viewport.height], aspectRatio: '3:2',
    state: prepared.state, evidenceMethod: 'Travessia contínua renderizada em visão de jogador sobre as polilinhas medidas por CAR4; cada amostra também chama Game._collide. Não é playtest humano.',
    routes, wallReadability: { distancesM: [10, 20, 30], captures: wallCaptures,
      assessment: 'pending-independent-and-human-review', humanGameplay: 'pending' },
    warnings: unique(warnings), errors: unique(errors), humanVisualApproval: 'pending' };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  if (receipt.errors.length || routes.some((route) => route.collisionCorrections || route.video.width !== 1200 || route.video.height !== 800)) process.exitCode = 1;
} finally {
  await browser.close();
}

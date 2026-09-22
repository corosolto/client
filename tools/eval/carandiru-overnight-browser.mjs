/* Aceite WebGL real do Carandiru em 3:2/5x5 e 16:9/8x8. Mede o contrato
   estrutural, atividade dos bots, CTF e travessias; aprovação humana segue separada. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8156');
const out = option('out', 'artifacts/carandiru-overnight/final');
const receiptPath = option('receipt', 'tools/eval/carandiru-overnight-browser.json');
const sourcePath = 'public/js/map_penitenciaria.js';
const sourceSha256 = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
const cases = [
  { id: '3x2-5x5', viewport: { width: 1200, height: 800 }, aspectRatio: '3:2', team: 5 },
  { id: '16x9-8x8', viewport: { width: 1280, height: 720 }, aspectRatio: '16:9', team: 8 },
];
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const pngMeta = (path) => {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`PNG inválido: ${path}`);
  return { file: path, bytes: bytes.length, sha256: sha256(path), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const unique = (values) => [...new Set(values)];
const allowedWarning = (message) => message.includes('SUPPORT_URL_BR is not defined')
  || /^404 \/(?:%7B%60\/)?(?:map-preview\.css|js\/ops\.js)$/.test(message)
  || /^404 \/(?:api\/geo-lang|audio\/)/.test(message);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const results = [];
try {
  for (const testCase of cases) {
    const context = await browser.newContext({ viewport: testCase.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage(), pageErrors = [], failedResponses = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await page.addInitScript(({ team }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: team, vol: 0, speech: false }));
      let state = 1977 + team; Math.random = () => { state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    }, { team: testCase.team });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=penitenciaria&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1500);

    const start = await page.evaluate(() => {
      const game = window.__game;
      game.player.alive = false; game.player.hp = 0; game.player.respawnAt = 1e12;
      game.timeLeft = 1e6; game.ctfMatchLeft = 1e6; game._enemyOf = () => [];
      for (const bot of game.bots) { bot.target = null; bot.hp = 1e9; bot.invuln = 1e9; }
      return game.bots.map((bot, index) => ({ index, team: bot.team, alive: bot.alive, pos: bot.pos.toArray() }));
    });
    await page.waitForTimeout(6000);
    const activity = await page.evaluate((startRows) => {
      const game = window.__game;
      const bots = game.bots.map((bot, index) => {
        const from = startRows[index]?.pos || bot.pos.toArray(), to = bot.pos.toArray();
        return { index, team: bot.team, alive: bot.alive, from, to,
          movedM: Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) };
      });
      const moved = bots.map((bot) => bot.movedM);
      return { actualBots: bots.length, activeBots: bots.filter((bot) => bot.movedM >= .75).length,
        minMovedM: Math.min(...moved), maxMovedM: Math.max(...moved),
        teams: Object.fromEntries(['E', 'B'].map((team) => [team, bots.filter((bot) => bot.team === team).length])) };
    }, start);

    const scene = await page.evaluate(async () => {
      const game = window.__game, c = game.world.carandiru;
      const mint = game.world.root.getObjectByName('carandiru-viatura-mint');
      const fallback = game.world.root.getObjectByName('carandiru-viatura-fallback');
      const vehicleResponse = await fetch('/models/props/carandiru_viatura_1990.glb');
      return {
        state: game.state, wallAccesses: c.wallAccesses.length, wallWalkways: c.wallWalkways.length,
        guardEntries: c.guardEntries.length, guardRoutes: c.guardRoutes.length,
        pavilionPassages: c.pavilionPassages.length, pavilionStairs: c.pavilionStairs.length,
        pavilionWindows: c.pavilionWindows.length, pavilionWindowSupports: c.pavilionWindowSupports.length,
        strategicRoutes: c.routes.map((route) => route.id), ctfPoints: game.world.ctfPoints.map((point) => ({ id: point.id, label: point.label })),
        waypoints: game.world.waypoints.nodes.length, drawCalls: game.renderer.info.render.calls,
        triangles: game.renderer.info.render.triangles, vehicle: { source: c.vehicleSource, visible: !!mint?.visible,
          fallbackVisible: !!fallback?.visible, httpStatus: vehicleResponse.status },
      };
    });

    const traversal = await page.evaluate(() => {
      const game = window.__game, player = game.player;
      game.paused = true; game._updateBot = () => {}; game._updateCTF = () => {}; game._updatePickups = () => {};
      const follow = (id, points) => {
        const start = points[0]; player.pos.set(...start); player.vel.set(0, 0, 0); player.yaw = 0;
        player.grounded = true; player.crouchF = 0; player.weapon = 'pistol'; player._spaceHeld = false;
        player.jumpBufferedUntil = 0; player.coyoteUntil = 0;
        let frames = 0, targetIndex = 1, minY = player.pos.y, maxY = player.pos.y;
        while (targetIndex < points.length && frames < 7200) {
          const target = points[targetIndex], dx = target[0] - player.pos.x, dz = target[2] - player.pos.z;
          if (Math.hypot(dx, dz) < .42 && Math.abs(player.pos.y - target[1]) < .58) { targetIndex++; continue; }
          game.time += 1 / 60; frames++;
          game._moveEntity(player, { ax: dx, az: dz, shift: true, crouch: false, jump: false }, 1 / 60);
          minY = Math.min(minY, player.pos.y); maxY = Math.max(maxY, player.pos.y);
        }
        const endTarget = points.at(-1), endErrorM = Math.hypot(player.pos.x - endTarget[0], player.pos.y - endTarget[1], player.pos.z - endTarget[2]);
        return { id, frames, targetIndex, points: points.length, minY, maxY, endErrorM,
          reached: targetIndex === points.length && endErrorM <= .65 };
      };
      const guards = [];
      for (const route of game.world.carandiru.guardRoutes) {
        guards.push(follow(`${route.name}-patio-guarita`, route.points));
        guards.push(follow(`${route.name}-guarita-patio`, [...route.points].reverse()));
      }
      const stair = game.world.carandiru.pavilionStairs[0], direction = Math.sign(stair.dx);
      const topX = stair.x0 + stair.dx * (stair.heights.length - 1);
      const points = [[stair.x0 - direction * .9, 0, stair.z], ...stair.heights.map((y, index) => [stair.x0 + index * stair.dx, y, stair.z]),
        [topX + direction * .55, 3.4, stair.z], [0, 3.4, 1.7]];
      return { guards, pavilion: [follow(`${stair.name}-patio-galeria`, points), follow(`${stair.name}-galeria-patio`, [...points].reverse())] };
    });

    const summarizeTraversal = (rows) => ({ attempts: rows.length, reached: rows.filter((row) => row.reached).length,
      maxEndErrorM: Math.max(...rows.map((row) => row.endErrorM)),
      maxVerticalRangeM: Math.max(...rows.map((row) => row.maxY - row.minY)), ids: rows.map((row) => row.id) });
    const traversalSummary = { guards: summarizeTraversal(traversal.guards), pavilion: summarizeTraversal(traversal.pavilion) };
    await page.addStyleTag({ content: '#hud,#pause-overlay,#round-banner,#banner,#killfeed { visibility:hidden !important }' });
    const views = [
      { id: 'muralha-escada', camera: [35.6, 1.62, -24], target: [35.6, 3.1, -32.65] },
      { id: 'guarita-interior', camera: [33.5, 7.42, -43.5], target: [36.4, 7.1, -40.35] },
      { id: 'pavilhao-fachada', camera: [14, 6.3, 13], target: [0, 4.8, 0] },
      { id: 'pavilhao-galeria', camera: [0, 5.02, 1.7], target: [4.6, 4.8, 1.7] },
    ];
    const captures = [];
    for (const view of views) {
      await page.evaluate(({ camera, target }) => {
        const game = window.__game; game.camera.position.set(...camera); game.camera.lookAt(...target);
        game.camera.updateMatrixWorld(true); game.renderer.render(game.scene, game.camera);
      }, view);
      await page.waitForTimeout(150);
      const path = `${out}/${testCase.id}-${view.id}.png`; await page.screenshot({ path });
      captures.push({ id: view.id, ...pngMeta(path) });
    }
    const warnings = unique([...pageErrors, ...failedResponses]);
    const errors = warnings.filter((message) => !allowedWarning(message));
    results.push({ id: testCase.id, viewport: [testCase.viewport.width, testCase.viewport.height], aspectRatio: testCase.aspectRatio,
      team: testCase.team, expectedBots: testCase.team * 2 - 1, scene, activity, traversal: traversalSummary, captures, warnings, errors });
    console.log(`${testCase.id}: bots ${activity.activeBots}/${activity.actualBots}; guaritas ${traversalSummary.guards.reached}/12; pavilhão ${traversalSummary.pavilion.reached}/2`);
    await context.close();
  }
  const receipt = { sourceSha256, browser: 'Google Chrome', url: `${base}/?debug=1&auto=P,mst&map=penitenciaria&perfilauto=0&ctf=1`,
    cases: results, humanVisualApproval: 'pending', humanGameplayApproval: 'pending' };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  const invalid = results.some((row) => row.errors.length || row.scene.state !== 'live'
    || row.activity.actualBots !== row.expectedBots || row.activity.activeBots < Math.ceil(row.expectedBots / 2)
    || row.scene.wallAccesses < 4 || row.scene.wallWalkways < 4 || row.scene.guardEntries < 6 || row.scene.guardRoutes < 6
    || row.scene.pavilionPassages < 2 || row.scene.pavilionStairs < 1 || row.scene.pavilionWindows !== 12
    || row.scene.pavilionWindowSupports !== 12 || row.scene.strategicRoutes.length !== 3 || row.scene.ctfPoints.length !== 3
    || row.scene.vehicle.source !== 'mint' || !row.scene.vehicle.visible || row.scene.vehicle.httpStatus < 200 || row.scene.vehicle.httpStatus >= 300
    || row.traversal.guards.attempts !== 12 || row.traversal.guards.reached !== 12 || row.traversal.guards.maxEndErrorM > .65
    || row.traversal.pavilion.attempts !== 2 || row.traversal.pavilion.reached !== 2 || row.traversal.pavilion.maxEndErrorM > .65
    || row.captures.length !== 4 || row.captures.some((capture) => capture.width !== row.viewport[0]
      || capture.height !== row.viewport[1] || !/^[a-f0-9]{64}$/.test(capture.sha256)));
  if (invalid) process.exitCode = 1;
} finally {
  await browser.close();
}

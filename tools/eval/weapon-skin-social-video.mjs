import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const BASE = process.env.BASE || 'http://127.0.0.1:9478';
const CDP_URL = process.env.CDP_URL || null;
const SKIN_ID = process.env.SKIN_ID || 'ondas-cariocas';
const SKINS = Object.freeze({
  'ondas-cariocas': { title: 'Ondas Cariocas', weaponId: 'm4', subtitle: 'prévia ingame' },
  'mosaico-paulista': { title: 'Mosaico Paulista', weaponId: 'scar', subtitle: 'prévia ingame' },
  'nacao-rubro-negra': { title: 'AK Flamengo', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'alvinegra-paulista': { title: 'AK Corinthians', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'celeste-mineira': { title: 'AK Cruzeiro', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'tricolor-gaucha': { title: 'AK Grêmio', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'tricolor-baiana': { title: 'AK Bahia', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'verde-alviverde': { title: 'AK Palmeiras', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'tricolor-morumbi': { title: 'AK São Paulo', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
  'alvinegra-praiana': { title: 'AK Santos', weaponId: 'ak', subtitle: 'licença pendente', officialMark: true },
});
const SKIN = SKINS[SKIN_ID];
if (!SKIN) throw new Error(`skin desconhecida: ${SKIN_ID}`);
const WEAPON_ID = SKIN.weaponId;
const OUT = process.env.SOCIAL_OUT || path.resolve(ROOT, `../../launch-media/2026-10-18-${SKIN_ID}`);
const FPS = 12;
const FRAMES = 72;
const FORMATS = [
  { id: 'horizontal', width: 1280, height: 720 },
  { id: 'vertical', width: 720, height: 1280 },
];
const knownHttp = ({ status, url }) => status === 404 && (
  url.includes('/.astro/eval-vite/')
  || url.endsWith('/api/geo-lang')
  || /\/api\/(?:social-auth|treta)(?:\?|$)/.test(url)
  || /\/audio\/(manifest(?:\.default)?\.json|menu-music\/m\d+\.mp3|ambiente\/(?:vento|hum-indoor|cidade|buzina|latido-[12]|passaro(?:s|-[12])|galo)\.mp3)(?:\?|$)/.test(url)
);
const knownRequestFailure = ({ url }) => (
  /^https:\/\/csbrasil-backend[^/]*\.run\.app\//.test(url)
  || url.includes('/.astro/eval-vite/')
);
const knownPageError = (message) => message.includes('Failed to fetch dynamically imported module:')
  && message.includes('/.astro/eval-vite/');
const knownConsole = (message) => (
  /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test(message)
  || /^Failed to load resource: net::ERR_FAILED$/.test(message)
  || /^WebSocket connection to 'ws:\/\/127\.0\.0\.1:(?:9478|0)\//.test(message)
  || message.startsWith('[vite] failed to connect to websocket.')
  || (message.includes('Failed to fetch dynamically imported module:') && message.includes('/.astro/eval-vite/'))
  || (/^Access to fetch at 'https:\/\/csbrasil-backend[^']+\.run\.app\//.test(message) && message.includes('blocked by CORS policy'))
);
mkdirSync(OUT, { recursive: true });
const globalRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = CDP_URL
  ? await chromium.connectOverCDP(CDP_URL)
  : await chromium.launch({
      executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
    });
const receipt = { schemaVersion: 'cs-social-video/1', skinId: SKIN_ID, weaponId: WEAPON_ID, mapId: 'parque_treta', fps: FPS, frames: FRAMES, outputs: {} };

for (const format of FORMATS) {
  const frames = mkdtempSync(path.join(tmpdir(), `${SKIN_ID}-${format.id}-`));
  const context = CDP_URL
    ? browser.contexts()[0]
    : await browser.newContext({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  if (CDP_URL) await page.setViewportSize({ width: format.width, height: format.height });
  const pageErrors = [];
  const consoleMessages = [];
  const failedResponses = [];
  const requestFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleMessages.push(message.text()); });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), reason: request.failure()?.errorText || 'unknown' }));
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', allyBots: 0, enemyBots: 1, menuMusic: false, speech: false, bloom: false, motionBlur: false }));
  });
  const query = `?debug=1&auto=E,mst&map=parque_treta&vmweapon=${encodeURIComponent(WEAPON_ID)}&weaponskin=${encodeURIComponent(SKIN_ID)}&armaslazy=0&bloom=0`;
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.addStyleTag({ content: `
    astro-dev-toolbar,#crash-overlay,#vm-debug-badge,#boot-splash,#aviso-software,#pause-menu,#match-end,#round-banner,#radio-menu,#chat-wrap{display:none!important}
    #social-skin-title{position:fixed;z-index:9999;left:5vw;top:6vh;padding:14px 18px;border-left:5px solid #c4ff46;background:#080a0dcc;color:white;font:900 clamp(22px,4vw,48px)/.95 system-ui,sans-serif;letter-spacing:.02em;text-transform:uppercase;transition:opacity .2s}
    #social-skin-title small{display:block;margin-top:8px;color:#c4ff46;font:700 clamp(10px,1.2vw,15px)/1.1 monospace;letter-spacing:.1em}
  ` });
  const setup = await page.evaluate(({ titleText, subtitle, weaponId, skinId }) => {
    const game = window.__game;
    game.player.hp = 1e9;
    game.player.alive = true;
    game.player.ammo[weaponId].mag = 30;
    game.player.ammo[weaponId].res = 90;
    game._switchWeapon(weaponId);
    game.player.drawUntil = 0;
    game.player.nextShotAt = 0;
    game.camView = 'first';
    for (const bot of game.bots) { bot.alive = false; bot.target = null; if (bot.mesh?.group) bot.mesh.group.visible = false; }
    const title = document.createElement('div');
    title.id = 'social-skin-title';
    title.innerHTML = `${titleText}<small>${weaponId.toUpperCase()} · ${subtitle} · Coro Solto</small>`;
    document.body.append(title);
    const originalUpdate = game.update.bind(game);
    game.update = () => {};
    window.__skinSocial = {
      game,
      originalUpdate,
      title,
      step(frame) {
        const p = game.player;
        p.hp = 1e9; p.alive = true;
        p.yaw += frame < 48 ? 0.0018 : -0.0008;
        if ([20, 24, 28].includes(frame)) { p.nextShotAt = 0; game._tryShoot(); }
        if (frame === 38) { p.ammo[weaponId].mag = Math.min(12, p.ammo[weaponId].mag); game._startReload(); }
        if (frame === 54 && game.camView === 'first') {
          game.setCamView('shoulder');
          game._tpOrbitYaw = 0.72;
          game._tpOrbitPitch = -0.06;
        }
        originalUpdate(1 / 12, true);
        title.style.opacity = frame < 14 ? String(1 - Math.max(0, frame - 8) / 6) : '0';
      },
    };
    const rw = game.vm.models[weaponId]?.getObjectByName('rw');
    return {
      weapon: game.player.weapon,
      skin: rw?.userData?.weaponSkin || null,
      mark: !!rw?.getObjectByName(`club-mark-${skinId}-right`),
      state: game.state,
      authored: !!game.vm.authored?.active(weaponId),
    };
  }, { titleText: SKIN.title, subtitle: SKIN.subtitle, weaponId: WEAPON_ID, skinId: SKIN_ID });
  if (setup.weapon !== WEAPON_ID || setup.skin !== SKIN_ID || setup.state !== 'live' || setup.authored || (SKIN.officialMark && !setup.mark)) {
    throw new Error(`${format.id}: setup inválido ${JSON.stringify(setup)}`);
  }
  for (let frame = 0; frame < FRAMES; frame++) {
    await page.evaluate((index) => window.__skinSocial.step(index), frame);
    await page.screenshot({ path: path.join(frames, `f${String(frame).padStart(3, '0')}.png`) });
  }
  const output = path.join(OUT, `${SKIN_ID}-${WEAPON_ID}-${format.id}.mp4`);
  execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%03d.png'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
  const poster = path.join(OUT, `${SKIN_ID}-${WEAPON_ID}-${format.id}.jpg`);
  execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-ss', '1', '-i', output, '-frames:v', '1', '-q:v', '2', poster]);
  const thirdPersonPoster = path.join(OUT, `${SKIN_ID}-${WEAPON_ID}-${format.id}-third-person.jpg`);
  execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-ss', '4.75', '-i', output, '-frames:v', '1', '-q:v', '2', thirdPersonPoster]);
  const consoleErrors = consoleMessages.filter((message) => !knownConsole(message));
  const knownConsoleNoise = consoleMessages.filter(knownConsole);
  const unexpectedPageErrors = pageErrors.filter((message) => !knownPageError(message));
  const knownPageErrors = pageErrors.filter(knownPageError);
  const unexpectedResponses = failedResponses.filter((row) => !knownHttp(row));
  const unexpectedRequests = requestFailures.filter((row) => !knownRequestFailure(row));
  receipt.outputs[format.id] = {
    file: output,
    poster,
    thirdPersonPoster,
    width: format.width,
    height: format.height,
    bytes: statSync(output).size,
    consoleErrors,
    pageErrors: unexpectedPageErrors,
    unexpectedResponses,
    unexpectedRequests,
    knownCaptureNoise: {
      page: knownPageErrors,
      console: knownConsoleNoise,
      responses: failedResponses.filter(knownHttp),
      requests: requestFailures.filter(knownRequestFailure),
    },
  };
  await page.close();
  if (!CDP_URL) await context.close();
  rmSync(frames, { recursive: true, force: true });
  const unexpected = [...unexpectedPageErrors, ...consoleErrors, ...unexpectedResponses, ...unexpectedRequests];
  if (unexpected.length) throw new Error(`${format.id}: falhas inesperadas ${JSON.stringify(unexpected)}`);
}
if (!CDP_URL) await browser.close();
writeFileSync(path.join(OUT, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`weapon-skin social: ${SKIN_ID} ${Object.keys(receipt.outputs).join(', ')} -> ${OUT}`);
if (CDP_URL) process.exit(0);

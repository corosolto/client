import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://127.0.0.1:4339';
const OUT = path.resolve(process.argv[2] || 'artifacts/viewmodels/visual-matrix');
const ALL_IDS = ['awp', 'ak', 'm4', 'mp5', 'shotgun', 'deagle', 'pistol', 'knife',
  'm92', 'akm', 'g3', 'revolver38', 'md97', 'carbine', 'm400', 'mosin', 'rem700',
  'lmg', 'scar', 'tavor', 'famas', 'uzi', 'p90', 'svd', 'g3sg1', 'sks'];
const IDS = (process.env.WEAPON ? process.env.WEAPON.split(',') : ALL_IDS)
  .map((id) => id.trim()).filter(Boolean);
const VIEWPORT = { width: 1440, height: 900 };

fs.mkdirSync(OUT, { recursive: true });

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

async function contactSheet(states, output) {
  if (!states.length) return;
  const columns = Math.min(4, states.length);
  const rows = Math.ceil(states.length / columns);
  const cellWidth = 480;
  const cellHeight = 300;
  const composites = [];
  for (let index = 0; index < states.length; index++) {
    const state = states[index];
    const image = await sharp(state.file).resize(cellWidth, cellHeight, { fit: 'cover' }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cellWidth}" height="42">
      <rect width="100%" height="100%" fill="rgba(0,0,0,.76)"/>
      <text x="18" y="28" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="white">${escapeXml(state.label)}</text>
    </svg>`);
    composites.push({ input: image, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight });
    composites.push({ input: label, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight });
  }
  await sharp({
    create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#111318' },
  }).composite(composites).jpeg({ quality: 91 }).toFile(output);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: VIEWPORT });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);
const cdp = await page.context().newCDPSession(page);
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && message.text().includes('[authored-vm]')) runtimeErrors.push(message.text());
});

await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_piscina_treta&hands=1`, { waitUntil: 'domcontentloaded' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game?.vm?.authored, null, { timeout: 120000 });
await page.evaluate(() => {
  const game = window.__game;
  if (game.state === 'countdown') {
    game.time = game.stateUntil;
    game.update(0.016);
  }
});
await page.waitForFunction(() => window.__game?.vm?.authored?.entries?.size > 0, null, { timeout: 90000 });

await page.evaluate(() => {
  const game = window.__game;
  game.player.hp = 1e9;
  game.player.pitch = 0;
  for (const bot of game.bots) bot.hp = 1e9;
});

async function selectWeapon(id) {
  return page.evaluate(async (weapon) => {
    const game = window.__game;
    await game.vm.authored.ensureSkin(weapon);
    game.player.reloadUntil = 0;
    game.player.drawUntil = 0;
    game.player.nextShotAt = 0;
    game.player.pitch = 0;
    game.player.weapon = weapon;
    if (weapon !== 'knife') game.player.ammo[weapon] = { mag: 30, res: 90 };
    game.vm.authored.setWeapon(weapon);
    game._applyVmVisibility();
    game.vm.authored.setAim(weapon, 0);
    const entry = game.vm.authored.entry(weapon);
    const idle = ['idle', 'idle1', 'idle2', 'idle3'].find((name) => entry?.clips.has(name));
    if (idle) game.vm.authored._playModel(entry.model, idle, { loop: true });
    for (let index = 0; index < 4; index++) game.update(0.016);
    return {
      active: game.vm.authored.active(weapon),
      model: entry?.model || '',
      selfContained: Boolean(entry?.selfContained),
      clips: [...(entry?.clips?.keys() || [])],
      fov: game.vmCamera.fov,
    };
  }, id);
}

async function forceClip(id, candidates, fraction, loop = false) {
  return page.evaluate(({ weapon, names, at, shouldLoop }) => {
    const game = window.__game;
    const entry = game.vm.authored.entry(weapon);
    const name = names.find((candidate) => entry?.clips.has(candidate));
    if (!entry || !name) return { captured: false, clip: '', duration: 0, fraction: at };
    game.vm.authored._playModel(entry.model, name, { loop: shouldLoop, fade: 0 });
    const action = entry.action;
    const clip = action.getClip();
    const targetTime = Math.max(0, Math.min(clip.duration, clip.duration * at));
    // Setting Action.time while the action is paused does not force Three.js to
    // re-evaluate the property bindings. Advance by an epsilon once, then freeze.
    // This makes every screenshot represent the requested animation phase rather
    // than the first frame of the clip.
    action.paused = false;
    action.timeScale = 1;
    action.time = 0;
    // `_playModel` resets the action at the mixer's current clock. Advance the
    // mixer from that fresh zero instead of assigning Action.time directly;
    // this evaluates every PropertyBinding exactly as normal gameplay does.
    entry.mixer.update(targetTime || 1e-6);
    action.paused = true;
    entry.scene.updateMatrixWorld(true);
    if (!entry.selfContained) game.vm.authored._syncSkin(entry, weapon);
    game.scene.updateMatrixWorld(true);
    return { captured: true, clip: name, duration: clip.duration, fraction: at, targetTime };
  }, { weapon: id, names: candidates, at: fraction, shouldLoop: loop });
}

async function capture(states, weaponDir, slug, label) {
  const file = path.join(weaponDir, `${slug}.png`);
  await page.waitForTimeout(120);
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  states.push({ slug, label, file });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  viewport: VIEWPORT,
  visualStatus: 'not_evaluated',
  note: 'Estas capturas são evidência para revisão humana/visual; nenhum resultado é aprovado automaticamente.',
  weapons: [],
  runtimeErrors,
};

for (const id of IDS) {
  const weaponDir = path.join(OUT, id);
  fs.mkdirSync(weaponDir, { recursive: true });
  const metadata = await selectWeapon(id);
  const states = [];
  const samples = [];

  samples.push({ state: 'idle', ...(await forceClip(id, ['idle', 'idle1', 'idle2', 'idle3'], 0.2, true)) });
  await capture(states, weaponDir, 'idle', 'REPOUSO');

  if (id === 'knife') {
    samples.push({ state: 'draw', ...(await forceClip(id, ['draw', 'equip'], 0.5)) });
    await capture(states, weaponDir, 'draw-peak', 'SAQUE — PICO');
    // The authored knife pilot exports a single `slash` clip. Sample the same
    // key pose used by its approved runtime proof (frame 9 of 22).
    samples.push({ state: 'slash', ...(await forceClip(id, ['slash', 'slash1', 'slash2'], 9 / 22)) });
    await capture(states, weaponDir, 'slash-peak', 'CORTE — PICO');
    // Stab's readable forward pose is frame 10 of 24; later frames are already
    // returning toward idle and can hide a valid animation in the contact sheet.
    samples.push({ state: 'stab', ...(await forceClip(id, ['stab', 'stab_miss'], 10 / 24)) });
    await capture(states, weaponDir, 'stab-peak', 'ESTOCADA — PICO');
    samples.push({ state: 'return', ...(await forceClip(id, ['idle', 'idle1'], 0.2, true)) });
    await capture(states, weaponDir, 'return-idle', 'RETORNO AO REPOUSO');
  } else {
    samples.push({ state: 'fire-rest', ...(await forceClip(id, ['shoot1', 'shoot', 'shoot2', 'shoot3'], 0.02)) });
    await capture(states, weaponDir, 'fire-rest', 'DISPARO — INÍCIO');
    samples.push({ state: 'fire-peak', ...(await forceClip(id, ['shoot1', 'shoot', 'shoot2', 'shoot3'], 0.55)) });
    await capture(states, weaponDir, 'fire-peak', 'DISPARO — PICO');

    // Fractions are anchored to the approved pistol reload: release, carry,
    // insertion, seating and return. This avoids sampling empty transition
    // frames that can make a broken reload look static or falsely correct.
    const reloadStates = [
      ['reload-release', 'RECARGA — SOLTAR', 0.27],
      ['reload-carry', 'RECARGA — TRANSPORTAR', 0.425],
      ['reload-insert', 'RECARGA — INSERIR', 0.58],
      ['reload-seat', 'RECARGA — ASSENTAR', 0.74],
      ['reload-final', 'RECARGA — RETORNO', 0.925],
    ];
    for (const [slug, label, fraction] of reloadStates) {
      samples.push({ state: slug, ...(await forceClip(id, ['reload', 'insert'], fraction)) });
      await capture(states, weaponDir, slug, label);
    }

    await page.evaluate((weapon) => {
      const game = window.__game;
      game.vm.authored.setAim(weapon, 1);
      game._scope(true);
      for (let index = 0; index < 12; index++) game.update(0.016);
    }, id);
    await capture(states, weaponDir, 'ads', 'MIRA / ADS');
    await page.evaluate((weapon) => {
      const game = window.__game;
      game._scope(false, true);
      game.vm.authored.setAim(weapon, 0);
    }, id);
  }

  const sheet = path.join(weaponDir, `${id}-visual-matrix.jpg`);
  await contactSheet(states, sheet);
  manifest.weapons.push({
    id,
    ...metadata,
    visualStatus: 'not_evaluated',
    samples,
    states: states.map(({ slug, label, file }) => ({ slug, label, file: path.relative(OUT, file) })),
    contactSheet: path.relative(OUT, sheet),
  });
  console.log(`CAPTURADO ${id}: ${sheet}`);
}

manifest.runtimeErrors = runtimeErrors;
fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await browser.close();

console.log(`MATRIZ VISUAL (não avaliada): ${OUT}`);
if (runtimeErrors.length) {
  console.error('ERROS DE RUNTIME:', JSON.stringify(runtimeErrors, null, 2));
  process.exitCode = 1;
}

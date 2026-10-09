#!/usr/bin/env node
// Browser gate for PR #773: orbit changes the camera while movement and shots retain player aim.
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://127.0.0.1:8124';
const character = process.env.CHAR || 'dama';
const side = process.env.SIDE || 'E';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?debug=1&auto=${side},${character}&map=brasilia&bots=0&bloom=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game?.player?.alive, null, { timeout: 120000 });
  const result = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    g.setCamView('third');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const before = { yaw: p.yaw, pitch: p.pitch, x: p.pos.x, z: p.pos.z, ammo: p.ammo[p.weapon]?.mag };
    const s = g.settings.sens * 0.0021;
    const orbitInput = () => {
      const event = new MouseEvent('mousemove', { altKey: true, bubbles: true });
      Object.defineProperties(event, { movementX: { value: -Math.PI / (2 * s) }, movementY: { value: 0 } });
      document.dispatchEvent(event);
    };
    orbitInput();
    g.keys.KeyW = true;
    await new Promise(resolve => setTimeout(resolve, 400));
    g.keys.KeyW = false;
    const side = {
      yaw: p.yaw, pitch: p.pitch, orbit: g._tpOrbitYaw,
      distance: Math.hypot(p.pos.x - before.x, p.pos.z - before.z),
      reticle: getComputedStyle(g.el.crosshair).visibility,
    };
    orbitInput();
    await new Promise(resolve => setTimeout(resolve, 100));
    const front = { orbit: g._tpOrbitYaw, reticle: getComputedStyle(g.el.crosshair).visibility };
    const shots = [];
    const original = g._fireHitscan;
    g._fireHitscan = function (...args) { shots.push({ from: args[1].clone(), dir: args[2].clone() }); return original.apply(this, args); };
    p.nextShotAt = 0;
    p.drawUntil = 0;
    g._tryShoot();
    g._fireHitscan = original;
    const after = { yaw: p.yaw, pitch: p.pitch, ammo: p.ammo[p.weapon]?.mag };
    const shot = shots[0];
    const aim = shot && new g._tpFwd.constructor(0, 0, -1).applyEuler(g._tpAimEul).normalize();
    return {
      character: g.playerCharId, modelLoaded: !!g.playerTP?.isGLB,
      before, side, front, after, shots: shots.length,
      shotAimDot: shot && aim ? shot.dir.dot(aim) : null,
      cameraForwardDotShot: shot ? shot.dir.dot(new g._tpFwd.constructor(0, 0, -1).applyQuaternion(g.camera.quaternion)) : null,
    };
  });
  if (errors.length) throw new Error(`pageerror: ${errors.join('; ')}`);
    if (result.character !== character || !result.modelLoaded) throw new Error(`personagem 3D não carregou: ${JSON.stringify(result)}`);
  if (Math.abs(result.side.orbit - Math.PI / 2) > .03 || Math.abs(result.front.orbit - Math.PI) > .03)
    throw new Error(`órbita não chegou em lado/frente: ${JSON.stringify(result)}`);
  if (Math.abs(result.side.yaw - result.before.yaw) > .001 || Math.abs(result.side.pitch - result.before.pitch) > .001)
    throw new Error(`órbita mudou a mira do jogador: ${JSON.stringify(result)}`);
  if (result.side.distance < .1) throw new Error(`movimento parou durante órbita: ${JSON.stringify(result)}`);
  if (result.front.reticle !== 'hidden') throw new Error(`retículo de tiro oculto deveria sumir ao olhar o rosto: ${JSON.stringify(result)}`);
  if (result.shots < 1 || result.after.ammo >= result.before.ammo || result.shotAimDot < .95)
    throw new Error(`tiro não seguiu a mira do jogador: ${JSON.stringify(result)}`);
  if (result.cameraForwardDotShot > .5) throw new Error(`tiro seguiu a câmera orbitada: ${JSON.stringify(result)}`);
  if (process.env.CAPTURE) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'OK')?.click());
    await page.evaluate(() => { window.__game._tpOrbitYaw = Math.PI / 2; });
    await page.waitForTimeout(300);
    result.sideCapture = await page.evaluate(() => ({ camera: window.__game.camera.position.toArray(), player: window.__game.player.pos.toArray?.() || { ...window.__game.player.pos }, orbit: window.__game._tpOrbitYaw }));
    await page.screenshot({ path: `${process.env.CAPTURE}-side.png` });
    await page.evaluate(() => { window.__game._tpOrbitYaw = Math.PI; });
    await page.waitForTimeout(300);
    result.frontCapture = await page.evaluate(() => ({ camera: window.__game.camera.position.toArray(), player: window.__game.player.pos.toArray?.() || { ...window.__game.player.pos }, orbit: window.__game._tpOrbitYaw }));
    await page.screenshot({ path: `${process.env.CAPTURE}-front.png` });
  }
  result.firstAgain = await page.evaluate(() => {
    const g = window.__game;
    g.setCamView('first');
    g._updateCrosshairParallax();
    return { orbit: g._tpOrbitYaw, reticle: getComputedStyle(g.el.crosshair).visibility };
  });
  if (result.firstAgain.orbit !== 0 || result.firstAgain.reticle !== 'visible')
    throw new Error(`retorno à primeira pessoa falhou: ${JSON.stringify(result)}`);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} finally {
  await browser.close();
}

#!/usr/bin/env node
// Evidência no jogo real para o candidato PT-38. O diretório padrão é privado e
// externo ao Git. Os clipes são pausados em tempos determinísticos.
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = process.argv[2] || '4401';
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(process.env.CSBRASIL_VM_EVIDENCE_DIR
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/pistols-pt38-20260914');
const errors = [];
const records = [];
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const localPlaywright = path.join(ROOT, 'node_modules/playwright/index.js');
const playwrightEntry = fs.existsSync(localPlaywright) ? localPlaywright
  : `${execSync('npm root -g').toString().trim()}/playwright/index.js`;
const playwright = await import(pathToFileURL(playwrightEntry).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [aspect, width, height] of [['3x2', 1440, 960], ['16x9', 1440, 810]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (event) => errors.push({ aspect, kind: 'pageerror', message: event.message }));
  page.on('console', (event) => {
    if (event.type() === 'error' && !/favicon/i.test(event.text())) errors.push({ aspect, kind: 'console', message: event.text().slice(0, 500) });
  });
  const query = 'debug=1&auto=P,mst&vmready=pistol&vmweapon=pistol&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision';
  await page.goto(`${BASE}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#vm-debug-badge{display:none!important}' });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa, null, { timeout: 180000 });
  if (!await page.evaluate(() => window.__vmPrecisionQa.equip('pistol'))) throw new Error(`${aspect}: PT-38 não equipou`);
  await page.waitForFunction(() => window.__authoredVm?.entry?.('pistol')?.mint?.active, null, { timeout: 120000 });
  await page.evaluate(() => {
    for (const bot of window.__game?.bots || []) { bot.nextShotAt = Infinity; bot.target = null; }
    window.__game.player.hp = 100; window.__game.player.alive = true;
  });
  await page.waitForTimeout(800);

  const snap = async (state) => {
    const file = path.join(OUT, `pistol-${state}-${aspect}.png`);
    const runtime = await page.evaluate(() => {
      const entry = window.__authoredVm.entry('pistol');
      return { weapon: window.__authoredVm.weapon, visible: entry.mount.visible,
        mint: entry.mint.active.name, clips: [...entry.clips.keys()],
        adsAmount: window.__authoredVm.adsAmount, scoped: window.__game.player.scoped,
        vmRootVisible: window.__game.vm.root.visible,
        scopeCovered: Boolean(window.__game._vmVisibility?.scopeCovered) };
    });
    await page.screenshot({ path: file });
    records.push({ aspect, width, height, state, runtime, file: path.basename(file),
      bytes: fs.statSync(file).size, sha256: sha256(file) });
  };
  const pose = async (clipName, fraction) => page.evaluate(({ clipName, fraction }) => {
    const vm = window.__authoredVm;
    const entry = vm.entry('pistol');
    if (vm.__pt38QaUpdate) vm.update = vm.__pt38QaUpdate;
    vm.setAim('pistol', 0);
    entry.drawTime = entry.drawDuration;
    vm.update(0, { ads: 0, sway: 0, speed: 0 });
    entry.mixer.stopAllAction();
    const clip = entry.clips.get(clipName);
    const action = entry.mixer.clipAction(clip);
    action.reset().play(); action.paused = true;
    action.time = Math.min(clip.duration * fraction, clip.duration - 1e-4);
    entry.action = action; entry.mixer.update(0);
    if (!vm.__pt38QaUpdate) vm.__pt38QaUpdate = vm.update;
    vm.update = () => {};
  }, { clipName, fraction });
  const drawAt = async (fraction) => page.evaluate((fraction) => {
    const vm = window.__authoredVm;
    if (!vm.__pt38QaUpdate) vm.__pt38QaUpdate = vm.update;
    else vm.update = vm.__pt38QaUpdate;
    vm.setAim('pistol', 0);
    vm.draw('pistol', 1);
    let remaining = fraction;
    while (remaining > 0) {
      const step = Math.min(1 / 60, remaining);
      vm.__pt38QaUpdate.call(vm, step, { ads: 0, sway: 0, speed: 0 });
      remaining -= step;
    }
    vm.update = () => {};
  }, fraction);

  await pose('idle', 0); await snap('idle');
  for (const fraction of [0.25, 0.60]) { await drawAt(fraction); await snap(`draw-${fraction * 100}`); }
  await pose('shoot', 0.50); await snap('shoot-50');
  for (const clip of ['reload_tactical', 'reload_empty']) {
    for (const fraction of [0.40, 0.70]) { await pose(clip, fraction); await snap(`${clip}-${fraction * 100}`); }
  }
  await pose('inspect', 0.50); await snap('inspect-50');
  // ADS físico com muzzle/sight medidos no produto baked.
  await pose('idle', 0);
  await page.evaluate(() => {
    const vm = window.__authoredVm;
    vm.update = vm.__pt38QaUpdate || vm.update;
    vm.setAim('pistol', 1);
    vm.update(0, { ads: 1, sway: 0, speed: 0 });
    vm.setAim = () => true;
    vm.update = () => {};
  });
  // O transform já está correto neste ponto, mas o compositor WebGL pode ainda
  // expor o framebuffer do idle, sobretudo ao criar a segunda viewport 16:9.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await page.waitForTimeout(100);
  await snap('ads');
  await page.close();
  console.log(`PT-38_CAPTURE ${aspect} ok`);
}
await browser.close();
const fatalErrors = errors.filter((item) => item.kind === 'pageerror'
  || /\[paid-viewmodel\]|THREE\.WebGLProgram|WebGL creation failed/i.test(item.message));
fs.writeFileSync(path.join(OUT, 'capture.json'), `${JSON.stringify({ schemaVersion: 1,
  kind: 'real-browser-pistol-pt38-capture', revision: execSync('git rev-parse HEAD').toString().trim(),
  base: BASE, records, errors, fatalErrors }, null, 2)}\n`);
console.log(JSON.stringify({ ok: fatalErrors.length === 0, captures: records.length, errors: errors.length,
  fatalErrors: fatalErrors.length, output: OUT }));
if (fatalErrors.length) process.exitCode = 1;

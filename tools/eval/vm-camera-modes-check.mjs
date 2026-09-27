#!/usr/bin/env node
// Câmera da fábrica no jogo real: HUD, preferência, corpo TP e retorno das mãos FP.
// O mutante apaga o viewmodel ao voltar para 1ª pessoa; a régua deve reprová-lo.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback = '') => process.argv.find((v) => v.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const mutant = arg('mutante');
if (mutant && mutant !== 'sem-retorno') throw new Error(`mutante desconhecido: ${mutant}`);
const port = arg('porta', '4713');
const base = `http://127.0.0.1:${port}`;
const captureDir = path.join(ROOT, 'artifacts/vm-camera');
fs.mkdirSync(captureDir, { recursive: true });

const globalRoot = (await import('node:child_process')).execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(path.join(globalRoot, 'playwright/index.js')).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', port], { cwd: ROOT, stdio: 'ignore' });
let browser;
const failures = [];
const check = (name, ok, evidence = '') => {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${name}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) failures.push(name);
};
const snapshot = async (page) => page.evaluate(() => {
  const g = window.__game;
  return {
    mode: g?.camView,
    weapon: g?.player?.weapon,
    tp: Boolean(g?.playerTP?.group?.visible),
    tpGLB: Boolean(g?.playerTP?.isGLB),
    tpWeapon: g?._tpWeapon,
    root: Boolean(g?.vm?.root?.visible),
    authored: Boolean(g?._vmVisibility?.authored),
    badge: document.getElementById('vm-debug-badge')?.textContent || '',
  };
});
const settle = (page) => page.waitForTimeout(350);

try {
  let up = false;
  for (let i = 0; i < 80; i += 1) {
    try { up = (await fetch(base)).ok; if (up) break; } catch { /* servidor subindo */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!up) throw new Error('servidor de revisão não subiu');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const url = `${base}/?debug=1&auto=E&vmauthored=1&vmfabrica=1&vmweapon=m4&map=brasilia&armaslazy=0&vmqa=precision&bloom=0`;
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction(() => window.__authoredVm?.entry?.('m4'), null, { timeout: 120000 });
  if (await page.locator('#aviso-software button').count()) await page.locator('#aviso-software button').click();
  await page.waitForTimeout(1200);
  await settle(page);

  const shortcuts = await page.locator('#hud-shortcuts').innerText();
  const cameraSelect = page.locator('#set-camera');
  check('CAM1 atalho no HUD', shortcuts.includes('B CÂMERA'), shortcuts);
  check('CAM2 opção com três modos', await cameraSelect.count() === 1
    && JSON.stringify(await cameraSelect.locator('option').evaluateAll((items) => items.map((el) => el.value)))
      === JSON.stringify(['first', 'third', 'shoulder']));

  const first = await snapshot(page);
  check('CAM3 fábrica na primeira pessoa', first.mode === 'first' && first.weapon === 'm4'
    && first.root && first.authored && first.badge.includes('AUTORADO m4'), JSON.stringify(first));
  await page.screenshot({ path: path.join(captureDir, 'first.png') });

  await page.keyboard.press('b');
  await settle(page);
  const third = await snapshot(page);
  check('CAM4 corpo e arma no rig TP', third.mode === 'third' && third.tp && third.tpGLB && third.tpWeapon === 'm4'
    && !third.root && !third.authored, JSON.stringify(third));
  await page.screenshot({ path: path.join(captureDir, 'third.png') });

  await page.evaluate(() => window.__game._toggleCamView());
  await settle(page);
  const shoulder = await snapshot(page);
  check('CAM5 ombro TP', shoulder.mode === 'shoulder' && shoulder.tp && shoulder.tpGLB && shoulder.tpWeapon === 'm4'
    && !shoulder.root, JSON.stringify(shoulder));
  await page.screenshot({ path: path.join(captureDir, 'shoulder.png') });

  if (mutant === 'sem-retorno') await page.evaluate(() => {
    const g = window.__game;
    const original = g._syncVmPresentation.bind(g);
    g._syncVmPresentation = (...args) => {
      const value = original(...args);
      if (g.camView === 'first') g.vm.root.visible = false;
      return value;
    };
  });
  await page.evaluate(() => window.__game._toggleCamView());
  await settle(page);
  const returned = await snapshot(page);
  check('CAM6 retorno das mãos FP', returned.mode === 'first' && !returned.tp && returned.root
    && returned.authored, JSON.stringify(returned));

  if (!mutant) {
    if (await cameraSelect.count()) {
      await page.evaluate(() => window.__game.onOpenSettings());
      await page.locator('.set-tab[data-tab="gameplay"]').click();
      await cameraSelect.selectOption('shoulder');
      const selected = await snapshot(page);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('awpbr_settings') || '{}').camView);
      check('CAM7 seletor aplica e salva', selected.mode === 'shoulder' && saved === 'shoulder',
        JSON.stringify({ selected, saved }));
      await page.reload({ waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
      await settle(page);
      const reloaded = await snapshot(page);
      check('CAM8 preferência restaurada', reloaded.mode === 'shoulder' && reloaded.tp,
        JSON.stringify(reloaded));
    } else {
      check('CAM7 seletor aplica e salva', false, 'seletor ausente');
      check('CAM8 preferência restaurada', false, 'seletor ausente');
    }
  }
  check('CAM9 sem erro de página', pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
} catch (error) {
  check('CAM0 execução', false, error.stack || String(error));
} finally {
  await browser?.close();
  server.kill();
}

if (mutant) {
  const bit = failures.includes('CAM6 retorno das mãos FP');
  console.log(`MUTANTE ${mutant} ${bit ? 'MORDEU' : 'CEGO'} · ${failures.join(', ') || 'sem falhas'}`);
  process.exitCode = bit ? 0 : 1;
} else {
  console.log(`vm-camera: ${failures.length} falha(s)`);
  process.exitCode = failures.length ? 1 : 0;
}

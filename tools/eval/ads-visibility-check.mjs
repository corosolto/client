#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = process.argv.includes('--mutante=ads-antigo');
const remote = process.argv.find((value) => value.startsWith('--base='))?.slice('--base='.length).replace(/\/$/, '');
const out = path.join(root, 'artifacts/vm-ads-visibility');
fs.mkdirSync(out, { recursive: true });
const playwrightRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(path.join(playwrightRoot, 'playwright/index.js')).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const port = remote ? null : await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const selected = probe.address().port;
    probe.close(() => resolve(selected));
  });
});
const base = remote || `http://127.0.0.1:${port}`;
const server = remote ? null : spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
const failures = [];
const check = (name, pass, details) => {
  console.log(`${pass ? 'PASSA' : 'FALHA'} ${name}: ${JSON.stringify(details)}`);
  if (!pass) failures.push(name);
};
try {
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    try { ready = (await fetch(base)).ok; if (ready) break; } catch { /* boot */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('servidor local não subiu');
  console.log(`jogo: ${base}`);
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on('pageerror', (error) => console.log(`pageerror: ${error.message.slice(0, 180)}`));
  if (mutant) {
    const source = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
    const broken = source.replace('m4: 56,', 'm4: 42,').replace('1 + 0.30 * a', '1 + 0 * a');
    if (source === broken || !broken.includes('m4: 42,') || !broken.includes('1 + 0 * a')) throw new Error('mutante não aplicou');
    await page.route('**/js/game.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: broken }));
  }
  await page.goto(`${base}/?debug=1&auto=E&vmauthored=1&vmfabrica=1&vmweapon=m4&map=brasilia&armaslazy=1&vmqa=precision&bloom=0`, { waitUntil: 'load', timeout: 180000 });
  console.log('página carregada');
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 90000 });
  console.log('partida live');
  await page.evaluate(() => window.__game._ensureVmPrecisionQa());
  if (await page.locator('#aviso-software button').count()) await page.locator('#aviso-software button').click({ force: true });
  await page.evaluate(() => document.querySelector('#crash-overlay')?.remove());
  const read = () => page.evaluate(() => {
    const g = window.__game;
    const eye = g._eyeWorld, cam = g.camera;
    const right = g._tpRight;
    const delta = cam.position.clone().sub(eye);
    return {
      mode: g.camView, weapon: g.player.weapon, scoped: g.player.scoped,
      authored: g.vm.authored?.active(g.player.weapon),
      fov: cam.fov, vmFov: g.vmCamera.fov, vmHipFov: g.vm.authored?.fov(g.player.weapon, g.vmCamera.aspect),
      side: Math.abs(delta.dot(right)), distance: Math.hypot(delta.x, delta.z),
      mask: g._scopeMask || 0, vmVisible: g.vm.root.visible,
    };
  });
  const equip = async (weapon) => {
    await page.evaluate((id) => { window.__vmPrecisionQa.equip(id); }, weapon);
    await page.waitForFunction((id) => window.__game?.player.weapon === id && window.__game.vm.authored?.active(id), weapon, { timeout: 120000 });
    await page.waitForTimeout(500);
  };
  const aim = async (on) => {
    await page.evaluate((wanted) => {
      const g = window.__game;
      g._scope(wanted, true);
    }, on);
    await page.waitForTimeout(300);
  };
  for (const weapon of ['m4', 'p90', 'revolver38']) {
    await equip(weapon);
    await page.evaluate(() => window.__game.setCamView('first'));
    await aim(false);
    await aim(true);
    const ads = await read();
    await page.screenshot({ path: path.join(out, `${weapon}-first-ads.png`) });
    const vmScale = Math.tan(ads.vmFov * Math.PI / 360) / Math.tan(ads.vmHipFov * Math.PI / 360);
    check(`${weapon} primeira pessoa: janela do alvo`, ads.authored && ads.scoped && ads.fov >= 54 && vmScale >= 1.2,
      { fov: ads.fov, vmFov: ads.vmFov, vmHipFov: ads.vmHipFov, vmScale });
    if (weapon === 'm4') {
      for (const mode of ['third', 'shoulder']) {
        await page.evaluate((m) => window.__game.setCamView(m), mode);
        await page.waitForTimeout(300);
        const view = await read();
        await page.screenshot({ path: path.join(out, `m4-${mode}-ads.png`) });
        check(`m4 ${mode}: corpo fora da mira`, view.mode === mode && view.fov >= 54 && view.side >= 0.48,
          { fov: view.fov, side: view.side, distance: view.distance });
      }
    }
  }
  await equip('lmg');
  await page.evaluate(() => window.__game.setCamView('first'));
  await aim(true);
  const scope = await read();
  await page.screenshot({ path: path.join(out, 'lmg-scope.png') });
  check('MGX5: luneta limpa', scope.mask >= 0.88 && !scope.vmVisible, scope);
} catch (error) {
  check('execução', false, error.stack || String(error));
} finally {
  await browser?.close();
  server?.kill();
}
if (mutant) {
  const bit = failures.includes('m4 primeira pessoa: janela do alvo');
  console.log(`MUTANTE ads-antigo ${bit ? 'MORDEU' : 'CEGO'}`);
  process.exitCode = bit ? 0 : 1;
} else {
  console.log(`ads-visibility: ${failures.length} falha(s)`);
  process.exitCode = failures.length ? 1 : 0;
}

#!/usr/bin/env node
// Captura o runtime real dos candidatos de precisão em 3:2 e 16:9.
// Requer o preview local já preparado: npm run preview:vm-precision
// Uso: BASE=http://127.0.0.1:4401 node tools/eval/viewmodel-precision-capture.mjs [saída]
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = path.resolve(process.argv[2] || 'artifacts/viewmodels/integration/precision/captures');
const BASE = process.env.BASE || 'http://127.0.0.1:4401';
const gRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const dimensions = [[1440, 960], [1440, 810]];
const records = [];
const errors = [];
const sha256 = (file) => crypto.createHash('sha256').update(readFileSync(file)).digest('hex');
const repo = process.cwd();
const sourceFiles = ['public/js/game.js', 'public/js/authoredvm.js', 'public/js/vmvisibility.js',
  'public/js/data/vmconfig.js', 'tools/viewmodels/precision-candidates.json'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

for (const [width, height] of dimensions) {
  const label = `${width}x${height}`;
  const dir = path.join(OUT, label);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push({ viewport: label, kind: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon/i.test(message.text())) {
      errors.push({ viewport: label, kind: 'console', message: message.text().slice(0, 500) });
    }
  });
  const url = `${BASE}/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks&vmqa=precision`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#vm-debug-badge{display:none!important}' });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa,
    null, { timeout: 120000 });
  await page.evaluate(() => {
    const game = window.__game;
    for (const bot of game.bots || []) { bot.nextShotAt = Number.POSITIVE_INFINITY; bot.target = null; }
    game.player.hp = 100; game.player.alive = true;
  });

  const snap = async (weapon, state, wait = 0) => {
    if (wait) await page.waitForTimeout(wait);
    const before = await page.evaluate(() => window.__vmPrecisionQa.state());
    const file = path.join(dir, `${weapon}-${state}.png`);
    await page.screenshot({ path: file });
    records.push({ viewport: { width, height }, weapon, state, runtime: before,
      file: path.relative(OUT, file), bytes: readFileSync(file).length, sha256: sha256(file) });
  };
  const equip = async (weapon, expected = 'authored') => {
    const equipped = await page.evaluate((id) => window.__vmPrecisionQa.equip(id), weapon);
    if (!equipped) throw new Error(`${label}/${weapon}: não equipou`);
    await page.waitForFunction(({ id, expectedMode }) => {
      const state = window.__vmPrecisionQa?.state();
      return state?.weapon === id && Boolean(state?.[expectedMode]);
    }, { id: weapon, expectedMode: expected }, { timeout: 120000 });
    await page.waitForTimeout(750);
  };

  await equip('ak');
  await snap('ak', 'idle');
  await page.evaluate(() => window.__vmPrecisionQa.shoot());
  await snap('ak', 'shoot', 55);

  await equip('knife', 'melee');
  await snap('knife', 'idle');
  await page.evaluate(() => window.__vmPrecisionQa.knife('heavy'));
  await snap('knife', 'heavy-contact', 210);

  await equip('pistol', 'fallback');
  await snap('fallback', 'pistol-idle');
  await page.evaluate(() => window.__vmPrecisionQa.shoot());
  await snap('fallback', 'pistol-shoot', 55);

  for (const weapon of ['mosin', 'svd', 'sks']) {
    await equip(weapon);
    await snap(weapon, 'idle');
    await page.evaluate(() => window.__vmPrecisionQa.shoot());
    await snap(weapon, 'shoot-contact', 75);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__vmPrecisionQa.reload());
    await snap(weapon, 'reload-contact', 650);
    await page.evaluate(() => {
      window.__game.player.reloadUntil = 0;
      window.__vmPrecisionQa.ads();
    });
    await snap(weapon, 'ads-entry', 90);
    await snap(weapon, 'ads-covered', 450);
    await page.evaluate(() => { if (window.__game.player.scoped) window.__vmPrecisionQa.ads(); });
  }
  await context.close();
}

await browser.close();
// O localhost não pertence à allowlist do backend e também não serve alguns sons opcionais.
// Eles ficam no recibo, mas só o runtime WebGL/viewmodel pode reprovar esta captura.
const fatalErrors = errors.filter((entry) => entry.kind === 'pageerror'
  || /\[paid-viewmodel\]|THREE\.WebGLProgram|WebGL creation failed/i.test(entry.message));
const manifest = {
  schemaVersion: 1,
  kind: 'real-browser-viewmodel-capture',
  revision: execSync('git rev-parse HEAD').toString().trim(),
  sources: Object.fromEntries(sourceFiles.map((file) => [file, sha256(path.join(repo, file))])),
  base: BASE,
  query: 'debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks&vmqa=precision',
  records,
  errors,
  fatalErrors,
};
writeFileSync(path.join(OUT, 'capture.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: fatalErrors.length === 0, captures: records.length,
  viewports: dimensions.map(([width, height]) => `${width}x${height}`), errors: errors.length,
  fatalErrors: fatalErrors.length, output: OUT }));
if (fatalErrors.length) process.exitCode = 1;

#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const port = process.argv.find((arg) => arg.startsWith('--porta='))?.split('=')[1] || '8358';
const requestedBase = process.argv.find((arg) => arg.startsWith('--base='))?.slice('--base='.length);
const requestedOut = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
const base = requestedBase || `http://127.0.0.1:${port}`;
const server = requestedBase ? null : spawn('npx', ['astro', 'dev', '--port', port], { stdio: 'ignore' });
process.on('exit', () => server?.kill());

let ready = false;
for (let attempt = 0; attempt < 120; attempt += 1) {
  try {
    if ((await fetch(base)).ok) { ready = true; break; }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) throw new Error(`Servidor smoke não respondeu em ${base}`);

const globalRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(`${base}/?debug=1&nav=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(
    () => {
      const prompt = document.querySelector('#splash-enter');
      return !!prompt && !prompt.classList.contains('hidden');
    }, null, { timeout: 120000 },
  );
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, cancelable: true, pointerType: 'mouse',
  })));
  await page.waitForFunction(() => !document.querySelector('#boot-splash'), null, { timeout: 5000 });
  await page.locator('.cs-item[data-act="ranking"]').waitFor({ state: 'visible', timeout: 120000 });
  await page.click('.cs-item[data-act="ranking"]');
  await page.waitForFunction(() => !document.querySelector('#ranking-panel')?.classList.contains('hidden'));
  await page.click('#ranking-back');
  await page.click('.cs-item[data-act="sp"]');
  await page.waitForFunction(() => document.querySelector('#menu-setup')?.classList.contains('open'));
  await page.locator('#map-screen').waitFor({ state: 'visible' });
  await page.click('#ms-back');
  await page.locator('#btn-profile').waitFor({ state: 'visible' });
  await page.click('#btn-profile');
  await page.fill('#nick-input', 'SMOKE_AK');
  await page.click('#profile-ok');
  await page.click('#btn-jogar');
  await page.waitForFunction(() => !document.querySelector('#team-select')?.classList.contains('hidden'));
  await page.locator('.team-card[data-ready="1"]:not(.faction-excluded)').first().click();
  await page.waitForFunction(() => !document.querySelector('#char-select')?.classList.contains('hidden'), null, { timeout: 120000 });
  await page.locator('#char-list .char-row').first().click();
  await page.click('#char-confirm');
  await page.waitForFunction(() => document.querySelector('#team-select')?.dataset.step === 'enemy');
  await page.locator('.team-card[data-ready="1"]:not(.faction-excluded)').first().click();
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  const result = await page.evaluate(() => ({
    mainMenu: !!document.querySelector('#main-menu'),
    ranking: !!document.querySelector('#ranking-panel'),
    team: !!document.querySelector('#team-select'),
    character: !!document.querySelector('#char-select'),
    hudVisible: !document.querySelector('#hud')?.classList.contains('hidden'),
    state: window.__game?.state || null,
  }));
  const report = { ...result, errors };
  if (requestedOut) {
    await fs.mkdir(path.dirname(requestedOut), { recursive: true });
    await fs.writeFile(requestedOut, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (!result.hudVisible || result.state !== 'live' || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  server?.kill();
}

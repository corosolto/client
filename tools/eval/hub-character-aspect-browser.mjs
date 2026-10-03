#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
const out = process.env.OUT || '/tmp/cs-hub-character-aspect';
const mutant = process.argv.includes('--mutante=esticar-canvas');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 2234, height: 1224 } });
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_nick', 'RUBAO');
    localStorage.setItem('cs_lang', 'pt');
    localStorage.setItem('csbr-home-character', 'blackmetal');
  });
  await page.goto(`${base}/?home=hub&map=amazonia&debug=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('#char-preview[data-glb="1"]:not(.hidden)', { timeout: 120000 });
  await page.waitForTimeout(500);
  if (mutant) await page.addStyleTag({ content: '.hub-character #char-preview{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important}' });

  for (const [width, height, name] of [
    [2234, 1224, 'user-display'], [1536, 1024, '3x2'], [1920, 1080, '16x9'],
    [2560, 1080, 'ultrawide'], [1280, 720, '720p'], [1024, 768, '4x3'],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const size = await page.evaluate(() => {
      const c = document.querySelector('#char-preview');
      const r = c.getBoundingClientRect();
      return { cssWidth: r.width, cssHeight: r.height, pixelWidth: c.width, pixelHeight: c.height };
    });
    const distortion = (size.cssHeight / size.cssWidth) / (size.pixelHeight / size.pixelWidth);
    const ok = Number.isFinite(distortion) && Math.abs(distortion - 1) <= 0.02;
    console.log(`${name}: canvas ${Math.round(size.cssWidth)}×${Math.round(size.cssHeight)} CSS / ${size.pixelWidth}×${size.pixelHeight} pixels, vertical factor ${distortion.toFixed(2)} — ${ok ? 'PASS' : 'FAIL'}`);
    await page.screenshot({ path: `${out}/${name}.png` });
    if (!ok) failed = true;
  }
} finally {
  await browser.close();
}
process.exitCode = Number(failed);

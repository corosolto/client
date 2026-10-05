#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_nick', 'RUBAO');
    localStorage.setItem('cs_lang', 'pt');
  });
  await page.goto(`${process.env.BASE || 'http://127.0.0.1:4339'}/?home=hub&debug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
  await page.keyboard.press('Space');
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
  if (process.argv.includes('--mutante=ignorar-confirmacao')) {
    await page.evaluate(() => {
      document.getElementById('btn-jogar').addEventListener('pointerdown', () => {
        window.__gameLaunch.begin('menu', 3000, () => false);
      });
    });
  }
  await page.click('#btn-jogar');
  await page.waitForTimeout(250);
  await page.click('#hub-quick-close');
  await page.waitForTimeout(3300);
  const state = await page.evaluate(() => ({
    confirmClosed: document.getElementById('hub-quick').hidden,
    errorVisible: !document.getElementById('launch-error').classList.contains('hidden'),
  }));
  const ok = state.confirmClosed && !state.errorVisible;
  console.log(`Hub confirm after watchdog window: ${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(state)}`);
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
}

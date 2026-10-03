#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
const out = process.env.OUT || '/tmp/cs-hub-visual-audit';
const width = Number(process.env.WIDTH || 1536);
const height = Number(process.env.HEIGHT || 1024);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
try {
  const page = await browser.newPage({ viewport: { width, height } });
  const pageErrors = [];
  page.on('pageerror', (error) => { pageErrors.push(error.message); console.error(`PAGEERROR ${error.message}`); });
  await page.addInitScript(() => {
    localStorage.setItem('cs_lang', 'pt');
    localStorage.setItem('awpbr_nick', 'RUBAO');
    localStorage.setItem('csbr-home-character', 'blackmetal');
  });
  await page.goto(`${base}/?home=hub&map=amazonia&debug=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
  await page.keyboard.press('Space');
  if (width >= 760) await page.waitForSelector('#char-preview[data-glb="1"]:not(.hidden)', { timeout: 120000 });

  const shot = async (name) => {
    await page.waitForTimeout(650);
    if (pageErrors.length) throw new Error(`Browser errors before ${name}: ${pageErrors.join(' | ')}`);
    if (await page.locator('#launch-error:not(.hidden)').count()) throw new Error(`Unexpected launch error before ${name}`);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(`${name}: ${new URL(page.url()).search}`);
  };
  await shot('01-play');
  await page.click('#hub-map-change'); await shot('02-map-modal'); await page.click('#hub-map-close');
  await page.click('#hub-change-character'); await shot('03-character-modal'); await page.click('#hub-roster-close');
  await page.click('#btn-jogar'); await shot('04-confirm'); await page.click('#hub-quick-close');
  await page.click('#hub-mp'); await shot('05-mp-public');
  await page.click('#hub-mp-private'); await shot('06-mp-private');
  for (const [tab, name] of [
    ['ranking', '07-ranking'], ['sobre', '08-about'], ['feedback', '09-feedback'], ['apoie', '10-support'],
  ]) {
    await page.click(`.hub-tabs [data-hub-tab="${tab}"]`);
    await shot(name);
  }
  await page.click('.hub-tabs [data-hub-tab="jogar"]');
  await page.click('#hub-sp');
  await page.click('#hub-profile'); await shot('11-profile');
  await page.click('#profile-back');
  await page.click('#hub-settings'); await shot('12-settings');
} finally {
  await browser.close();
}

#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
const out = process.env.OUT || '/tmp/cs-hub-layout';
const mutant = process.argv.includes('--mutante=sem-limite');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

let failed = false;
try {
  for (const [width, height, name] of [
    [1536, 1024, '3x2'], [1920, 1080, '16x9'], [2234, 1224, 'user-display'], [2560, 1080, 'ultrawide'],
    [1280, 720, '720p'], [1024, 768, '4x3'], [390, 844, 'mobile'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => {
      localStorage.setItem('cs_lang', 'pt');
      localStorage.setItem('awpbr_nick', 'EMERSON');
    });
    await page.goto(`${base}/?home=hub&tela=01&debug=1&nav=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hub-ui:not([hidden])');
    if (mutant) await page.addStyleTag({ content: 'html[data-home-ui="hub"] #menu-setup{width:60vw!important} .hub-character{width:34vw!important}' });
    const m = await page.evaluate(() => {
      const rect = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return {
        setup: rect('#menu-setup'), map: rect('.map-picker'), title: rect('#map-name'),
        change: rect('#hub-map-change'), play: rect('#btn-jogar'), character: rect('.hub-character'),
        footer: rect('.hub-footer'), scrollWidth: document.documentElement.scrollWidth,
        imageFit: getComputedStyle(document.querySelector('#map-thumb')).objectFit,
      };
    });
    await page.screenshot({ path: `${out}/${name}.png` });
    const issues = [];
    if (m.scrollWidth > width + 1) issues.push('horizontal overflow');
    if (m.imageFit !== 'cover') issues.push('map image does not crop with cover');
    if (width >= 1000 && height >= 768) {
      if (m.map.width > 1000) issues.push('map wider than central panel');
      if (m.map.width / m.map.height < 1.45 || m.map.width / m.map.height > 2.05) issues.push('map aspect outside desktop range');
      if (m.character.width > 640) issues.push('character too wide');
    }
    // Captura fornecida: borda esquerda do cartaz em ~20% da largura da tela.
    if (name === 'user-display' && (m.map.x / width < 0.17 || m.map.x / width > 0.23)) issues.push('game column shifted from supplied screen composition');
    if (width < 760) {
      if (m.map.width < width - 40) issues.push('mobile map does not fill safe width');
      if (m.map.height > 310) issues.push('mobile map too tall');
      if (m.title.x < m.change.right && m.title.right > m.change.x && m.title.y < m.change.bottom && m.title.bottom > m.change.y) issues.push('map title overlaps change button');
    }
    if (m.play.bottom > m.footer.y && m.setup.height <= height - m.setup.y - (height - m.footer.y)) issues.push('play button behind footer');
    console.log(`${name}: map ${Math.round(m.map.width)}×${Math.round(m.map.height)}, character ${Math.round(m.character.width)} px${issues.length ? ` — FAIL: ${issues.join(', ')}` : ' — PASS'}`);
    if (issues.length) failed = true;
    await page.close();
  }
} finally {
  await browser.close();
}
process.exitCode = Number(failed);

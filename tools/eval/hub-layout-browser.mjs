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
const clippedArrowsMutant = process.argv.includes('--mutante=setas-cortadas');
const hiddenMobileCharacterMutant = process.argv.includes('--mutante=elenco-mobile-oculto');
const desktopMultiplayerMutant = process.argv.includes('--mutante=mp-colunas-desktop');
const clippedSettingsMutant = process.argv.includes('--mutante=config-mobile-cortada');
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
    if (clippedArrowsMutant) await page.addStyleTag({ content: 'html[data-home-ui="hub"] #menu-setup .map-arrows{left:-24px!important;right:-24px!important}' });
    if (hiddenMobileCharacterMutant) await page.addStyleTag({ content: '@media(max-width:760px){.hub-character-card{display:none!important}}' });
    const m = await page.evaluate(() => {
      const rect = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return {
        setup: rect('#menu-setup'), map: rect('.map-picker'), title: rect('#map-name'),
        previousArrow: rect('#map-prev'), nextArrow: rect('#map-next'),
        change: rect('#hub-map-change'), play: rect('#btn-jogar'), character: rect('.hub-character'),
        characterCard: rect('.hub-character-card'),
        footer: rect('.hub-footer'), scrollWidth: document.documentElement.scrollWidth,
        imageFit: getComputedStyle(document.querySelector('#map-thumb')).objectFit,
        characterCardVisible: getComputedStyle(document.querySelector('.hub-character-card')).display !== 'none',
      };
    });
    await page.screenshot({ path: `${out}/${name}.png` });
    const issues = [];
    if (m.scrollWidth > width + 1) issues.push('horizontal overflow');
    if (m.imageFit !== 'cover') issues.push('map image does not crop with cover');
    if (m.previousArrow.x < m.map.x - 1 || m.nextArrow.right > m.map.right + 1) issues.push('map carousel arrows clipped by card');
    if (m.previousArrow.width < 44 || m.nextArrow.width < 44) issues.push('map carousel click target under 44 px');
    if (width >= 1000 && height >= 768) {
      if (m.map.width > 1000) issues.push('map wider than central panel');
      if (m.map.width / m.map.height < 1.45 || m.map.width / m.map.height > 2.05) issues.push('map aspect outside desktop range');
      if (m.character.width > 640) issues.push('character too wide');
    }
    // Captura fornecida: borda esquerda do cartaz em ~20% da largura da tela.
    if (name === 'user-display' && (m.map.x / width < 0.17 || m.map.x / width > 0.23)) issues.push('game column shifted from supplied screen composition');
    if (width < 760) {
      if (!m.characterCardVisible || m.characterCard.bottom > m.map.y - 4) issues.push('mobile character selection hidden or overlapping map');
      if (m.map.width < width - 40) issues.push('mobile map does not fill safe width');
      if (m.map.height > 310) issues.push('mobile map too tall');
      if (m.title.x < m.change.right && m.title.right > m.change.x && m.title.y < m.change.bottom && m.title.bottom > m.change.y) issues.push('map title overlaps change button');
    }
    if (m.play.bottom > m.footer.y && m.setup.height <= height - m.setup.y - (height - m.footer.y)) issues.push('play button behind footer');
    const mapBefore = await page.locator('#map-name').textContent();
    await page.click('#map-next');
    const mapAfter = await page.locator('#map-name').textContent();
    if (mapBefore === mapAfter) issues.push('map carousel next button did not change map');
    if (width < 760) {
      await page.click('#hub-mp');
      if (desktopMultiplayerMutant) await page.addStyleTag({ content: 'html[data-home-ui="hub"] #hub-mp-host .mp-grid{display:grid!important;grid-template-columns:minmax(240px,320px) minmax(0,1fr)!important}' });
      const multiplayer = await page.evaluate(() => {
        const grid = document.querySelector('#hub-mp-host .mp-grid');
        const quick = document.getElementById('mp-quick').getBoundingClientRect();
        return { gridWidth: grid.clientWidth, scrollWidth: grid.scrollWidth, quickLeft: quick.left, quickRight: quick.right };
      });
      if (multiplayer.scrollWidth > multiplayer.gridWidth + 1 || multiplayer.quickLeft < 0 || multiplayer.quickRight > width) issues.push('mobile multiplayer columns clipped');
      await page.click('#hub-mp-private');
      await page.locator('#mp-criar').scrollIntoViewIfNeeded();
      const createRoom = await page.evaluate(() => {
        const button = document.getElementById('mp-criar').getBoundingClientRect();
        const footer = document.querySelector('.hub-footer').getBoundingClientRect();
        return { top: button.top, bottom: button.bottom, footerTop: footer.top };
      });
      if (createRoom.top < 0 || createRoom.bottom > createRoom.footerTop - 2) issues.push('mobile private room action unreachable');
      await page.click('#hub-settings');
      if (clippedSettingsMutant) await page.addStyleTag({ content: '#settings-panel .set-actions{flex-direction:row!important;padding:18px 32px!important} #settings-panel .set-actions>div{display:flex!important;gap:12px!important} #settings-panel .set-secondary,#settings-panel .set-apply,#settings-panel .set-save{width:auto!important;flex:none!important;padding:11px 30px!important}' });
      const settings = await page.evaluate(() => {
        const save = document.getElementById('settings-back').getBoundingClientRect();
        const wrap = document.querySelector('#settings-panel .settings-wrap');
        return { saveRight: save.right, wrapScroll: wrap.scrollWidth, wrapWidth: wrap.clientWidth };
      });
      if (settings.saveRight > width - 8 || settings.wrapScroll > settings.wrapWidth + 1) issues.push('mobile settings actions clipped');
    }
    console.log(`${name}: map ${Math.round(m.map.width)}×${Math.round(m.map.height)}, character ${Math.round(m.character.width)} px${issues.length ? ` — FAIL: ${issues.join(', ')}` : ' — PASS'}`);
    if (issues.length) failed = true;
    await page.close();
  }
} finally {
  await browser.close();
}
process.exitCode = Number(failed);

#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baseUrl = arg('--url', 'http://127.0.0.1:4321');
const out = arg('--out', 'artifacts/ui-regression');
const selected = new Set((arg('--scenes', 'home-3x2,home-16x9,hub-map,settings,character,victory,hud')).split(','));
const scenes = [
  { name: 'home-3x2', size: [1200, 800], query: 'tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-ui', '.hub-header', '#map-preview', '#btn-jogar', '#hub-change-character', '.hub-footer'] },
  { name: 'home-16x9', size: [1280, 720], query: 'tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-ui', '.hub-header', '#map-preview', '#btn-jogar', '#hub-change-character', '.hub-footer'] },
  { name: 'hub-map', size: [1200, 800], query: 'tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-map-modal', '#hub-map-filters', '#hub-map-grid', '#hub-map-close'] },
  { name: 'settings', size: [1200, 800], query: 'tela=07', screen: 'settings', ready: '#settings-panel', keys: ['#settings-panel', '.settings-wrap', '#set-quality', '#settings-back'] },
  { name: 'character', size: [1200, 800], query: 'tela=personagem&time=E&char=mst', screen: 'character', ready: '#char-select', keys: ['#char-select', '#char-info-name', '#char-confirm', '#char-list', '#char-preview', '#char-preview-static'] },
  { name: 'victory', size: [1200, 800], query: 'tela=vitoria&time=E&char=mst', screen: 'victory', ready: '#match-end.win', keys: ['#match-end', '#match-title', '#match-stats', '#me-hero'] },
  { name: 'hud', size: [1200, 800], query: 'tela=hud&vmlab=1&map=praca_poderes&time=E&char=mst', screen: 'hud', ready: '#hud', keys: ['#hud', '#hud-top', '#crosshair', '#hp-num', '#hud-bottom-right', '#weapon-hud'] },
].filter((scene) => selected.has(scene.name));

await mkdir(out, { recursive: true });
const manifest = { version: 1, source: baseUrl, capturedAt: new Date().toISOString(), scenes: {} };
for (const scene of scenes) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = { viewport: scene.size, errors: [], assets404: [], elements: {}, mediaReady: null, failed: null };
    manifest.scenes[scene.name] = result;
    let browser; let page;
    try {
      browser = await chromium.launch({
        headless: true,
        ...(process.env.UI_CHROME_BIN ? { executablePath: process.env.UI_CHROME_BIN } : {}),
        args: ['--mute-audio'],
      });
      page = await browser.newPage({ viewport: { width: scene.size[0], height: scene.size[1] }, deviceScaleFactor: 1 });
      page.on('pageerror', (error) => result.errors.push(String(error.message).slice(0, 300)));
      page.on('response', (response) => {
        if (response.status() !== 404 || !response.url().startsWith(baseUrl)) return;
        result.assets404.push(new URL(response.url()).pathname);
      });
      await page.addInitScript(() => {
        let randomState = 0x4c534349;
        Math.random = () => {
          randomState ^= randomState << 13;
          randomState ^= randomState >>> 17;
          randomState ^= randomState << 5;
          return (randomState >>> 0) / 0x100000000;
        };
        localStorage.setItem('awpbr_nick', 'EMERSON');
        localStorage.setItem('cs_lang', 'pt');
        localStorage.setItem('cs_aviso_software', 'ok');
      });
      await page.goto(`${baseUrl}/?${scene.query}`, { waitUntil: 'commit', timeout: 45_000 });
      await page.waitForFunction((screen) => document.documentElement.dataset.inspectScreen === screen, scene.screen, { timeout: scene.name === 'hud' ? 180_000 : 90_000 });
      await page.locator(scene.ready).waitFor({ state: 'visible', timeout: 60_000 });
      if (scene.name === 'hub-map') {
        await page.locator('#hub-map-change').click();
        await page.locator('#hub-map-modal').waitFor({ state: 'visible', timeout: 20_000 });
      }
      if (scene.name === 'character') await page.getByRole('option', { name: 'Líder do MST' }).click();
      if (scene.name === 'hud') await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180_000 });
      if (scene.name.startsWith('home') || scene.name === 'character') {
        const media = (kind) => {
          const canvas = document.getElementById('char-preview');
          const image = document.getElementById('char-preview-static');
          const video = document.getElementById('char-preview-video');
          const character = canvas?.dataset.glb === '1'
            || (image && !image.classList.contains('hidden') && image.complete && image.naturalWidth > 0)
            || (video && !video.classList.contains('hidden') && video.readyState >= 2);
          const map = document.getElementById('map-thumb');
          return !!character && (kind === 'character' || (map?.complete && map.naturalWidth > 0));
        };
        await page.waitForFunction(media, scene.name === 'character' ? 'character' : 'home', { timeout: 60_000 }).catch(() => {});
        result.mediaReady = await page.evaluate(media, scene.name === 'character' ? 'character' : 'home');
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      result.elements = await page.evaluate((keys) => Object.fromEntries(keys.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [selector, { visible: false, missing: true }];
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return [selector, { visible, rect: [box.x, box.y, box.width, box.height].map((v) => Math.round(v * 10) / 10), text: (element.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100) }];
      })), scene.keys);
      await page.screenshot({ path: join(out, `${scene.name}.png`), animations: 'disabled', timeout: 45_000 });
      await page.addStyleTag({ content: `
        *,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}
        #main-menu,#map-screen,#char-select,#match-end{background:#101014!important}
        .cs-wallpaper,.cs-vignette,.scanlines,.hub-character,#map-preview img,#char-preview,#char-preview-video,#char-preview-static,.ms-bg,#me-hero{visibility:hidden!important}
        #settings-panel{background:#101014!important;backdrop-filter:none!important}
        #hud{background:#101014!important}
        #radar,#round-time,#rounds-row,#round-banner{visibility:hidden!important}
        #hub-online-n,#hub-tip-text{visibility:hidden!important}
      ` });
      await page.screenshot({ path: join(out, `${scene.name}.stable.png`), animations: 'disabled', timeout: 45_000 });
      result.assets404 = [...new Set(result.assets404)].sort();
      result.attempts = attempt;
      console.log(`${scene.name}: capturado na tentativa ${attempt} (${result.errors.length} erros JS, ${result.assets404.length} 404 locais)`);
      break;
    } catch (error) {
      result.failed = String(error.message || error).replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(0, 400);
      await page?.screenshot({ path: join(out, `${scene.name}.failure-${attempt}.png`), timeout: 10_000 }).catch(() => {});
      console.log(`${scene.name}: tentativa ${attempt} falhou: ${result.failed}`);
    } finally {
      await browser?.close().catch(() => {});
    }
  }
}
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

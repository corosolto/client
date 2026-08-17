#!/usr/bin/env node
/* ============================================================================
   loading-wallpaper-check.mjs — O WALLPAPER CONTINUA INTEIRO EM 3:2/16:9 E DPR 1/2?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     Issue #292: "em telas de alta resolução o wallpaper da tela de loading/splash
     está quebrando — a imagem não cobre/proporciona direito".

   O QUE MEDE
     Abre splash e loading reais. A camada superior precisa usar `contain` (nenhum
     corte ou esticamento) e a inferior `cover` (nenhuma faixa vazia). Confere ainda
     o backing da captura em DPR 1/2 e grava as quatro combinações para inspeção.

   Uso: BASE=http://localhost:4322 OUT=/tmp/loading-wall node tools/eval/loading-wallpaper-check.mjs
   ============================================================================ */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:4321';
const OUT = process.env.OUT || '/tmp/loading-wallpaper';
mkdirSync(OUT, { recursive: true });

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const casos = [
  { nome: '16x9-dpr1', width: 1920, height: 1080, dpr: 1 },
  { nome: '16x9-dpr2', width: 1920, height: 1080, dpr: 2 },
  { nome: '3x2-dpr1', width: 1536, height: 1024, dpr: 1 },
  { nome: '3x2-dpr2', width: 1536, height: 1024, dpr: 2 },
];
const falhas = [];

for (const caso of casos) {
  for (const tela of ['splash', 'loading']) {
    const context = await browser.newContext({
      viewport: { width: caso.width, height: caso.height },
      deviceScaleFactor: caso.dpr,
    });
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', (error) => erros.push(error.message));
    await page.goto(`${BASE}/?tela=${tela}&time=B`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__CS_MAIN_READY__, null, { timeout: 120000 });
    const selector = tela === 'splash' ? '#boot-splash' : '#load-overlay';
    await page.waitForSelector(`${selector}:not(.hidden)`, { timeout: 30000 });
    await page.evaluate(({ selector }) => {
      const el = document.querySelector(selector);
      el.style.setProperty('--loading-wall', "url('/img/loading-1.webp')");
    }, { selector });
    await page.waitForTimeout(250);

    const medida = await page.locator(selector).evaluate((el) => {
      const cover = getComputedStyle(el, '::before');
      const art = getComputedStyle(el, '::after');
      const r = el.getBoundingClientRect();
      return {
        artImage: art.backgroundImage,
        artSize: art.backgroundSize,
        coverImage: cover.backgroundImage,
        coverSize: cover.backgroundSize,
        coverFilter: cover.filter,
        width: r.width,
        height: r.height,
      };
    });
    const arquivo = `${OUT}/${tela}-${caso.nome}.png`;
    await page.screenshot({ path: arquivo });
    const meta = await sharp(arquivo).metadata();
    const artSizes = medida.artSize.split(',').map((parte) => parte.trim());
    const artUrls = (medida.artImage.match(/url\(/g) || []).length;
    const coverUrls = (medida.coverImage.match(/url\(/g) || []).length;
    const ok = artSizes.includes('contain') && medida.coverSize === 'cover'
      && artUrls >= 1 && coverUrls >= 1 && medida.coverFilter.includes('blur(18px)')
      && Math.abs(medida.width - caso.width) < 1 && Math.abs(medida.height - caso.height) < 1
      && meta.width === caso.width * caso.dpr && meta.height === caso.height * caso.dpr
      && erros.length === 0;
    console.log(`${ok ? '✓' : '✗'} LW ${tela} ${caso.nome} · CSS ${caso.width}×${caso.height} · PNG ${meta.width}×${meta.height} · arte=${medida.artSize} · fundo=${medida.coverSize} ${medida.coverFilter}`);
    if (!ok) falhas.push(`${tela}/${caso.nome}`);
    await context.close();
  }
}

await browser.close();
if (falhas.length) {
  console.error(`✗ LW1 · wallpaper cortável ou quadro/DPR incorreto: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log('✓ LW1 · splash/loading preservam a arte inteira sobre preenchimento cover nos quatro enquadramentos');

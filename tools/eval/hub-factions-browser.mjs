#!/usr/bin/env node
// Relato de 14/10/2026: o SOBRE O JOGO do lobby mostrava 6 grupos, sem os Políticos,
// enquanto o elenco jogável (public/js/characters.js) tem 7. A grade de grupos do
// painel GERAL precisa listar exatamente os grupos que têm personagem no jogo, e
// caber em 390, 780 e 1536 px sem card estourado nem nome por cima do vizinho.
// Uso: BASE=http://127.0.0.1:4562 node tools/eval/hub-factions-browser.mjs [--mutante=lista-fixa|--mutante=brasoes-58]
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';


const playwright = await import('playwright')
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice('--mutante='.length) ?? null;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const failures = [];
try {
  for (const width of [1536, 780, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width > 800 ? 1024 : 844 } });
    await context.addInitScript(() => {
      localStorage.setItem('awpbr_nick', 'RUBAO');
      localStorage.setItem('cs_lang', 'pt');
    });
    // Mutante lista-fixa: serve o main.js com a lista de grupos à mão que existia antes.
    if (mutant === 'lista-fixa') await context.route(/\/js\/main\.js(\?|$)/, async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const reverted = source.replace(/const groups = \[\.\.\.new Set\(CHARACTERS[\s\S]*?\);\n/, "const groups = ['E', 'B', 'U', 'C', 'F', 'M'];\n");
      if (reverted === source) throw new Error('mutante lista-fixa não aplicou');
      await route.fulfill({ response, body: reverted });
    });
    const page = await context.newPage();
    await page.goto(`${base}/?home=hub&secao=sobre`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hub-factions > *', { state: 'attached', timeout: 120000 });
    // Mutante brasoes-58: o tamanho de brasão do desktop em todas as larguras (o estouro relatado).
    if (mutant === 'brasoes-58') await page.addStyleTag({ content: '.hub-factions img{width:58px!important;height:58px!important}.hub-faction-crests img+img{margin-left:-14px!important}.hub-factions>div{gap:18px!important;padding:18px!important;font-size:21px!important}' });
    await page.waitForSelector('#hub-about:not([hidden])', { timeout: 120000 });
    await page.waitForTimeout(300);
    const result = await page.evaluate(async () => {
      const { CHARACTERS } = await import('/js/characters.js');
      const counts = {};
      for (const c of CHARACTERS) counts[c.team] = (counts[c.team] || 0) + 1;
      const cards = [...document.querySelectorAll('#hub-factions > *')];
      const shown = cards.map((item) => {
        const box = item.getBoundingClientRect();
        const spill = [...item.querySelectorAll('*')].map((child) => child.getBoundingClientRect()).some((r) => r.width && (r.right > box.right + 1 || r.left < box.left - 1));
        // overflow-wrap:anywhere evita o estouro, mas palavra partida ao meio também é defeito.
        const label = item.querySelector(':scope > span:last-child');
        const style = getComputedStyle(label);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.letterSpacing = style.letterSpacing;
        const longest = Math.max(...label.textContent.trim().split(/\s+/).map((word) => ctx.measureText(word).width));
        return {
          broken: longest > label.clientWidth + 1, longest: Math.round(longest), labelWidth: label.clientWidth,
          id: item.dataset.faction || null, name: item.textContent.trim(),
          images: [...item.querySelectorAll('img')].map((img) => img.getAttribute('src')),
          overflow: item.scrollWidth > item.clientWidth + 1 || spill, width: Math.round(box.width), content: item.scrollWidth,
        };
      });
      return { counts, total: CHARACTERS.length, shown, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const expected = Object.keys(result.counts).sort();
    const shown = result.shown.map((item) => item.id ?? '?').sort();
    const at = `${width}px`;
    if (result.shown.length !== expected.length) failures.push(`${at}: grade com ${result.shown.length} grupos, o jogo tem ${expected.length}`);
    else if (expected.join() !== shown.join()) failures.push(`${at}: grade mostra [${shown}] mas o jogo tem [${expected}] (data-faction)`);
    for (const item of result.shown) {
      if (!item.name) failures.push(`${at} ${item.id}: sem nome`);
      if (!item.images.length) failures.push(`${at} ${item.id}: sem brasão`);
      if (item.broken) failures.push(`${at} ${item.name}: palavra de ${item.longest}px partida em ${item.labelWidth}px`);
      if (item.overflow) failures.push(`${at} ${item.name}: conteúdo ${item.content}px estoura o card de ${item.width}px`);
    }
    if (result.pageOverflow) failures.push(`${at}: rolagem horizontal na página`);
    if (width === 1536) {
      for (const src of new Set(result.shown.flatMap((item) => item.images))) {
        const response = await page.request.get(new URL(src, base).href);
        if (!response.ok()) failures.push(`brasão ${src} responde ${response.status()}`);
      }
      console.log(`Elenco: ${result.total} personagens em ${expected.length} grupos (${expected.map((id) => `${id}=${result.counts[id]}`).join(' ')})`);
    }
    console.log(`  ${at}: ${result.shown.map((item) => `${item.name} ${item.content}/${item.width}`).join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
}
for (const failure of failures) console.error(`✗ ${failure}`);
console.log(`Grupos do SOBRE O JOGO: ${failures.length ? 'FAIL' : 'PASS'}${mutant ? ` (mutante ${mutant})` : ''}`);
process.exitCode = failures.length ? 1 : 0;

#!/usr/bin/env node
// Relato de 14/10/2026: no SOBRE O JOGO do lobby, PRIVACIDADE e TERMOS DE USO
// tiravam o jogador do jogo. Cada link do painel GERAL e do rodapé do hub precisa
// abrir no próprio lobby (iframe ?embed=1, sem o cabeçalho do site) ou, se for de
// outra origem, em nova aba. Os links DENTRO do documento embutido também contam:
// "ABRIR AS CONFIGURAÇÕES DE PRIVACIDADE" leva à COMUNIDADE > PRIVACIDADE do hub
// (LGPD: a escolha tem que ser alcançável), e o mailto de exclusão não abre aba.
// A régua clica de verdade, como o jogador.
// Uso: BASE=http://127.0.0.1:4561 node tools/eval/hub-about-links-browser.mjs [--mutante=<nome>]
// Mutantes revertem o código servido de /js/site-links.js:
//   paginas-fora  links sem subtab (legais, clãs) voltam a sair do jogo
//   secao-jogar   /?secao=... dentro do documento volta a cair em JOGAR
//   mailto-aba    mailto: volta a ganhar target=_blank
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';


const playwright = await import('playwright')
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice('--mutante='.length) ?? null;
const mutations = {
  'paginas-fora': [/if \(!tab && !documentGuide\(url\.pathname\)\) return;/, 'if (!tab) return;'],
  'secao-jogar': [/const section = url\.searchParams\.get\('secao'\);/, 'const section = null;'],
  'mailto-aba': [/if \(url\.protocol !== 'http:' && url\.protocol !== 'https:'\) return;/, ''],
};
if (mutant && !mutations[mutant]) throw new Error(`mutante desconhecido: ${mutant}`);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  await context.addInitScript(() => {
    localStorage.setItem('awpbr_nick', 'RUBAO');
    localStorage.setItem('cs_lang', 'pt');
  });
  if (mutant) await context.route(/\/js\/site-links\.js(\?|$)/, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const [pattern, replacement] = mutations[mutant];
    const reverted = source.replace(pattern, replacement);
    if (reverted === source) throw new Error(`mutante ${mutant} não aplicou`);
    await route.fulfill({ response, body: reverted });
  });
  const page = await context.newPage();
  const openAbout = async () => {
    await page.goto(`${base}/?home=hub`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
    for (let i = 0; i < 120 && await page.$('#boot-splash'); i++) {
      await page.evaluate(() => document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      await page.waitForTimeout(500);
    }
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
    await page.click('[data-hub-tab="sobre"]');
    await page.waitForSelector('#hub-about-overview:not([hidden])');
  };
  const guideState = (pathname) => page.waitForFunction((wanted) => {
    const frame = document.getElementById('hub-guide-frame');
    const doc = frame?.contentDocument;
    if (location.pathname !== '/') return { left: location.pathname };
    if (!frame?.src || frame.hidden || !doc?.body || new URL(frame.contentWindow.location.href).pathname !== wanted) return null;
    const src = new URL(frame.src);
    const header = doc.querySelector('body > header');
    return {
      path: src.pathname, embed: src.searchParams.get('embed'),
      embedded: doc.documentElement.dataset.embedded === 'true',
      siteHeader: Boolean(header && getComputedStyle(header).display !== 'none'),
      panel: !document.getElementById('hub-about-content').hidden,
    };
  }, pathname, { timeout: 45000 }).then((handle) => handle.jsonValue()).catch(() => {
    const current = new URL(page.url()).pathname;
    return current === '/' ? { stuck: true } : { left: current };
  });
  // Painel GERAL inteiro + rodapé do hub. /docs/ é a documentação de desenvolvimento
  // (Docusaurus, outro app), fora do lobby de propósito.
  const selector = '#hub-about-overview a[href], #hub-ui .hub-footer > a[href]:not([href^="/docs"])';
  await openAbout();
  const links = await page.$$eval(selector, (items) => items.map((a, index) => ({ index, href: a.href, label: a.textContent.trim().replace(/\s+/g, ' ') })));
  if (links.length < 15) failures.push(`painel GERAL + rodapé com ${links.length} links; esperado ao menos 15`);
  if (!links.some((link) => new URL(link.href).pathname === '/clans')) failures.push('link CLÃS ausente do painel');
  for (const link of links) {
    await openAbout();
    const url = new URL(link.href);
    const popup = context.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await page.locator(selector).nth(link.index).click({ noWaitAfter: true });
    if (url.origin !== new URL(base).origin) {
      const opened = await popup;
      const stayed = new URL(page.url()).pathname === '/';
      if (!opened || !stayed) failures.push(`${link.label}: link externo deveria abrir em nova aba`);
      else console.log(`  ok ${link.label}: nova aba (${url.host})`);
      await opened?.close();
      continue;
    }
    await page.waitForTimeout(400);
    const state = await guideState(url.pathname);
    if (state.left) failures.push(`${link.label}: saiu do jogo para ${state.left}`);
    else if (state.stuck) failures.push(`${link.label}: ficou no lobby, mas o guia não abriu`);
    else if (!state.panel || state.path !== url.pathname || state.embed !== '1') failures.push(`${link.label}: iframe em ${state.path}?embed=${state.embed}`);
    else if (!state.embedded || state.siteHeader) failures.push(`${link.label}: página aberta no lobby com o cabeçalho do site`);
    else console.log(`  ok ${link.label}: lobby ${state.path}?embed=1`);
  }

  // Dentro da Privacidade embutida: o atalho para as configurações abre COMUNIDADE > PRIVACIDADE.
  await openAbout();
  await page.click('#hub-about-overview a[href="/privacidade"]');
  if ((await guideState('/privacidade')).path !== '/privacidade') failures.push('Privacidade embutida não abriu');
  else {
    await page.frameLocator('#hub-guide-frame').locator('a[href="/?secao=comunidade&social=settings"]').click({ noWaitAfter: true });
    const settings = await page.waitForFunction(() => {
      const community = document.getElementById('hub-community');
      const view = document.getElementById('community')?.dataset.view;
      if (location.pathname !== '/' || !community || community.hidden || view !== 'settings') return null;
      return { view, secao: new URLSearchParams(location.search).get('secao') };
    }, null, { timeout: 15000 }).then((handle) => handle.jsonValue()).catch(() => page.evaluate(() => ({
      secao: new URLSearchParams(location.search).get('secao'), path: location.pathname, view: document.getElementById('community')?.dataset.view,
    })).catch(() => ({ path: new URL(page.url()).pathname })));
    if (settings.view !== 'settings' || settings.secao !== 'comunidade') failures.push(`Privacidade > CONFIGURAÇÕES DE PRIVACIDADE: foi para secao=${settings.secao} view=${settings.view}${settings.path && settings.path !== '/' ? ` path=${settings.path}` : ''}`);
    else console.log('  ok Privacidade > CONFIGURAÇÕES DE PRIVACIDADE: COMUNIDADE > PRIVACIDADE no hub');
  }

  // Dentro de Excluir dados: o mailto fica com o navegador, sem aba em branco nem target=_blank.
  await openAbout();
  await page.click('#hub-ui .hub-footer > a[href="/excluir-dados"]');
  if ((await guideState('/excluir-dados')).path !== '/excluir-dados') failures.push('Excluir dados embutido não abriu');
  else {
    const frame = page.frameLocator('#hub-guide-frame');
    const mail = frame.locator('a[href^="mailto:"].legal-request');
    // O clique real abriria o cliente de e-mail; o handler roda e o default é cancelado depois dele.
    await mail.evaluate((a) => a.addEventListener('click', (event) => event.preventDefault()));
    const popup = context.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await mail.click({ noWaitAfter: true });
    const opened = await popup;
    const target = await mail.getAttribute('target');
    if (opened || target === '_blank') failures.push(`PEDIR EXCLUSÃO POR EMAIL: ${opened ? 'abriu aba' : 'ganhou target=_blank'}`);
    else console.log('  ok PEDIR EXCLUSÃO POR EMAIL: mailto sem aba nova');
    await opened?.close();
  }
} finally {
  await browser.close();
}
for (const failure of failures) console.error(`✗ ${failure}`);
console.log(`Links do SOBRE O JOGO dentro do jogo: ${failures.length ? 'FAIL' : 'PASS'}${mutant ? ` (mutante ${mutant})` : ''}`);
process.exitCode = failures.length ? 1 : 0;

#!/usr/bin/env node
/* rotas-browser.mjs: o deep-link de cada rota fixa abre a tela certa, o link antigo vira
   o caminho novo e o voltar do navegador refaz a tela anterior (docs/adr/0008-rotas-fixas.md).
   Mede no navegador de verdade, porque o defeito que mais custa aqui só existe nele: fora
   da raiz, o importmap relativo resolvia `three` para /jogar/vendor/three.module.js (404)
   e o hub não subia. A metade em node é tools/eval/rotas-check.mjs.

   Uso: BASE=http://127.0.0.1:<porta> node tools/eval/rotas-browser.mjs [--fotos=<pasta>] [--mutante=sem-base|query|loja-fixa]
     sem-base  tira o <base href="/"> da resposta: /jogar/multiplayer tem que reprovar.
     query     o hubNavigate volta a gravar só a query: o clique na LOJA tem que reprovar.
     loja-fixa a aba da loja deixa de ir para o caminho: o clique em QUESTS tem que reprovar. */
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';


const playwright = await import('playwright')
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE;
if (!base) { console.error('BASE obrigatório (porta própria; a 8123 é de outra sessão)'); process.exit(2); }
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const fotos = (process.argv.find((a) => a.startsWith('--fotos=')) || '').split('=')[1] || '';
if (fotos) mkdirSync(fotos, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const falhas = [];
const ok = (msg) => console.log(`  ok ${msg}`);
try {
  const abrir = async (viewport) => {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => { localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', 'pt'); });
    // Comunidade de convidado: sem isto ela mostra "fora do ar" e nunca desenha a aba pedida.
    await context.route(/\/api\/social-auth/, (route) => route.fulfill({ json: { authenticated: false, providers: [] } }));
    await context.route(/\/api\/social(?:\?|$)/, (route) => route.fulfill({ json: {} }));
    if (mutante === 'sem-base') await context.route((url) => !url.pathname.includes('.') && !url.pathname.startsWith('/api/'), async (route) => {
      const resposta = await route.fetch();
      const corpo = await resposta.text();
      const novo = corpo.replace('<base href="/">', '');
      if (novo === corpo && resposta.headers()['content-type']?.includes('html')) throw new Error('MUTANTE sem-base NÃO APLICOU');
      await route.fulfill({ response: resposta, body: novo });
    });
    if (mutante === 'loja-fixa') await context.route(/\/js\/treta-store\.js/, async (route) => {
      const resposta = await route.fetch();
      const corpo = await resposta.text();
      const novo = corpo.replace("history.pushState(null,'',url);", 'void url;');
      if (novo === corpo) throw new Error('MUTANTE loja-fixa NÃO APLICOU');
      await route.fulfill({ response: resposta, body: novo });
    });
    if (mutante === 'query') await context.route(/\/js\/main\.js/, async (route) => {
      const resposta = await route.fetch();
      const corpo = await resposta.text();
      const novo = corpo.replace('const url = urlDoEstado(estado, location.href);', 'const url = new URL(location.href); for (const [k, v] of Object.entries(changes)) { if (v == null) url.searchParams.delete(k); else url.searchParams.set(k, v); }');
      if (novo === corpo) throw new Error('MUTANTE query NÃO APLICOU');
      await route.fulfill({ response: resposta, body: novo });
    });
    const page = await context.newPage();
    const quebrados = [];
    page.on('response', (r) => { if (r.status() === 404 && /\/(js|vendor)\//.test(new URL(r.url()).pathname)) quebrados.push(new URL(r.url()).pathname); });
    // A barra de dev do Astro (/.astro/eval-vite) não passa pelo serve.mjs, na raiz também; não é do jogo.
    page.on('pageerror', (e) => { if (!e.message.includes('/.astro/')) quebrados.push(`erro: ${e.message.slice(0, 120)}`); });
    return { context, page, quebrados };
  };
  const entrar = async (page, caminho) => {
    await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 90000 })
      .catch(() => { throw new Error(`o hub não subiu em ${caminho} (main.js nunca ficou pronto): importmap ou módulo quebrado fora da raiz?`); });
    for (let i = 0; i < 60 && await page.$('#boot-splash'); i++) {
      await page.evaluate(() => document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(300);
    // Convites de conta e da loja abrem por cima do hub no boot; não são o que se mede aqui.
    await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  };
  const tela = (page) => page.evaluate(() => {
    const menu = document.getElementById('main-menu').dataset;
    const guia = document.querySelector('.hub-content-tabs [aria-selected="true"]')?.dataset.guide || null;
    const q = new URLSearchParams(location.search);
    return { caminho: location.pathname, utm: q.get('utm_source'), telaNaQuery: ['secao', 'partida', 'servidor', 'janela', 'social', 'guia'].some((k) => q.has(k)), aba: menu.hubTab, rede: menu.hubNet, sala: menu.hubMpTab,
      social: document.getElementById('community')?.dataset.view || null, guia,
      lojaAba: document.querySelector('[data-treta-view][aria-selected="true"]')?.dataset.tretaView || null,
      configuracoes: !document.getElementById('settings-panel').classList.contains('hidden'),
      modal: ['hub-map-modal', 'hub-roster-modal', 'hub-quick'].find((id) => !document.getElementById(id).hidden) || null,
      canonical: document.querySelector('link[rel=canonical]')?.href, robots: document.querySelector('meta[name=robots]')?.content,
      three: typeof window.__CS_MAIN_LOADED !== 'undefined' };
  });
  const confere = (rotulo, visto, esperado) => {
    const errado = Object.entries(esperado).filter(([k, v]) => visto[k] !== v);
    if (errado.length) falhas.push(`${rotulo}: ${errado.map(([k, v]) => `${k}=${JSON.stringify(visto[k])} (esperado ${JSON.stringify(v)})`).join(', ')}`);
    else ok(rotulo);
  };

  for (const [nome, viewport] of [['desktop', { width: 1536, height: 960 }], ['mobile', { width: 390, height: 844 }]]) {
    const { context, page, quebrados } = await abrir(viewport);
    // 1. Deep-link de cada tipo de tela.
    const casos = [
      ['/jogar/multiplayer', { aba: 'jogar', rede: 'mp', sala: 'public' }],
      ['/jogar/multiplayer/privado', { aba: 'jogar', rede: 'mp', sala: 'private' }],
      ['/jogar/mapas', { aba: 'jogar', rede: 'sp', modal: 'hub-map-modal' }],
      ['/loja', { aba: 'loja', lojaAba: 'skins' }],
      ['/loja/quests', { aba: 'loja', lojaAba: 'quests' }],
      ['/ranking', { aba: 'ranking' }],
      ['/comunidade/amigos', { aba: 'comunidade', social: 'friends' }],
      ['/guia/mapas', { aba: 'sobre', guia: 'mapas' }],
      ['/configuracoes', { configuracoes: true }],
      ['/feedback', { aba: 'feedback' }],
    ];
    for (const [caminho, esperado] of (nome === 'desktop' ? casos : casos.filter(([c]) => ['/jogar/multiplayer', '/loja', '/comunidade/amigos'].includes(c)))) {
      await entrar(page, caminho);
      if (nome === 'desktop' && caminho === '/comunidade/amigos') await page.waitForFunction(() => document.getElementById('community')?.dataset.view === 'friends', null, { timeout: 8000 }).catch(() => {});
      confere(`${nome} deep-link ${caminho}`, await tela(page), { caminho, ...esperado });
      if (fotos && ['/jogar/multiplayer', '/loja', '/comunidade/amigos'].includes(caminho)) {
        await page.waitForTimeout(1500);
        await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
        await page.screenshot({ path: `${fotos}/${nome}${caminho.replaceAll('/', '_')}.png` });
      }
    }
    if (nome === 'mobile') { await context.close(); if (quebrados.length) falhas.push(`${nome}: ${[...new Set(quebrados)].slice(0, 4).join('; ')}`); continue; }

    // 2. Link antigo vira o caminho novo, sem perder parâmetro que não é tela.
    await entrar(page, '/?secao=jogar&partida=multiplayer&servidor=privado&utm_source=zap');
    confere('link antigo ?secao=jogar&partida=multiplayer&servidor=privado', await tela(page), { caminho: '/jogar/multiplayer/privado', utm: 'zap', telaNaQuery: false, rede: 'mp', sala: 'private' });
    await entrar(page, '/?secao=comunidade&social=settings');
    confere('link antigo ?secao=comunidade&social=settings', await tela(page), { caminho: '/comunidade/configuracoes', aba: 'comunidade' });

    // 3. Cliques empilham caminhos e o voltar do navegador refaz cada tela.
    await entrar(page, '/');
    await page.click('[data-hub-tab="loja"]');
    confere('clique LOJA', await tela(page), { caminho: '/loja', aba: 'loja' });
    await page.click('[data-treta-view="quests"]');
    confere('clique aba QUESTS', await tela(page), { caminho: '/loja/quests', lojaAba: 'quests' });
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para SKINS', await tela(page), { caminho: '/loja', lojaAba: 'skins' });
    await page.click('[data-hub-tab="ranking"]');
    confere('clique RANKING', await tela(page), { caminho: '/ranking', aba: 'ranking' });
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para LOJA depois do RANKING', await tela(page), { caminho: '/loja', aba: 'loja' });
    await page.click('[data-hub-tab="comunidade"]');
    confere('clique COMUNIDADE', await tela(page), { caminho: '/comunidade', aba: 'comunidade' });
    await page.click('.social-tabs button[data-tab="friends"]');
    confere('clique aba AMIGOS', await tela(page), { caminho: '/comunidade/amigos' });
    await page.click('[data-hub-tab="jogar"]');
    await page.click('#hub-mp');
    confere('clique MULTIPLAYER', await tela(page), { caminho: '/jogar/multiplayer', rede: 'mp' });
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para JOGAR', await tela(page), { caminho: '/', aba: 'jogar', rede: 'sp' });
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para AMIGOS', await tela(page), { caminho: '/comunidade/amigos', aba: 'comunidade' });
    await page.goBack(); await page.waitForTimeout(300);
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para LOJA', await tela(page), { caminho: '/loja', aba: 'loja' });
    await page.goForward(); await page.waitForTimeout(300);
    confere('avançar para COMUNIDADE', await tela(page), { caminho: '/comunidade', aba: 'comunidade' });
    await page.click('[data-hub-tab="sobre"]');
    await page.click('.hub-content-tabs [data-guide="armas"]');
    confere('clique guia ARMAS', await tela(page), { caminho: '/guia/armas', aba: 'sobre', guia: 'armas' });
    await page.goBack(); await page.waitForTimeout(300);
    confere('voltar para o GUIA', await tela(page), { caminho: '/guia', aba: 'sobre', guia: 'overview' });

    // 4. Head de cada cópia (o dev server renderiza a mesma página que o build).
    await entrar(page, '/loja');
    confere('head /loja', await tela(page), { canonical: 'https://www.corosolto.com.br/loja', robots: 'index, follow, max-image-preview:large' });
    await entrar(page, '/jogar/multiplayer');
    confere('head /jogar/multiplayer', await tela(page), { canonical: 'https://www.corosolto.com.br/jogar/multiplayer', robots: 'noindex, follow' });
    if (quebrados.length) falhas.push(`${nome}: módulo ou erro ao subir fora da raiz: ${[...new Set(quebrados)].slice(0, 4).join('; ')}`);
    await context.close();
  }
} catch (erro) {
  falhas.push(`parou: ${erro.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
for (const f of falhas) console.error(`✗ ${f}`);
console.log(`Rotas fixas no navegador: ${falhas.length ? 'FAIL' : 'PASS'}${mutante ? ` (mutante ${mutante})` : ''}`);
process.exitCode = falhas.length ? 1 : 0;

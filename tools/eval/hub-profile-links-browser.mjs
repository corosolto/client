#!/usr/bin/env node
// Relato de 14/10/2026: o perfil de jogador (/u/<nick>) abria fora do jogo. Dentro do
// lobby, todo link para /u/<id> deve abrir o perfil na COMUNIDADE do hub, sem sair do
// jogo. O link de fora (/u/<nick> compartilhado) continua sendo a página pública; o
// botão dela leva a /?secao=comunidade&social=profile&perfil=<id>, que também é medido.
// As APIs são simuladas: a régua mede o roteamento do cliente, não o backend.
// Uso: BASE=http://127.0.0.1:4563 node tools/eval/hub-profile-links-browser.mjs [--mutante=ranking-fora|perfil-na-query]
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const base = process.env.BASE || 'http://127.0.0.1:4339';
// Mutante: o clique no nick do ranking volta a seguir a navegação do navegador.
const mutant = process.argv.includes('--mutante=ranking-fora');
// Mutante: o perfil volta a morar só na query (/?perfil=), sem a rota fixa /u/<perfil>.
const mutantQuery = process.argv.includes('--mutante=perfil-na-query');
const ID = '11111111-2222-4333-8444-555555555555';
const player = { id: ID, nick: 'RUBENMARCUS', public_handle: 'rubenmarcus', points: 120, kills: 100, deaths: 50, kd: 2, position: 1 };
const profile = { ...player, handle: 'rubenmarcus', url: '/u/rubenmarcus', visibility: 'public', bio: 'Perfil da régua.', level: 3, next_level_points: 10, settings: {}, socials: [], achievements: [], favorites: [], history: [], matches: 10, round_wins: 5, round_losses: 5, play_seconds: 3600, presence: null };
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  await context.addInitScript((mutate) => {
    localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_treta_intro', '1');
    localStorage.setItem('cs_lang', 'pt');
    if (mutate) document.addEventListener('click', (event) => {
      if (event.target.closest?.('#hub-rank-global a[href^="/u/"]')) event.stopImmediatePropagation();
    }, true);
  }, mutant);
  if (mutantQuery) await context.route(/\/js\/main\.js/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const changed = body.replace('perfilNoCaminho: window.top === window.self', 'perfilNoCaminho: false');
    if (changed === body) throw new Error('MUTANTE perfil-na-query NÃO APLICOU');
    await route.fulfill({ response, body: changed });
  });
  const profileRequests = [];
  // 22/10: a tabela do hub passou a ler /api/social?action=ranking (fonte que filtra exclusão);
  // o stub do endpoint legado fica porque a tela de ranking do menu antigo ainda o usa.
  await context.route('**/api/leaderboard*', (route) => route.fulfill({ json: { players: [player] } }));
  // Convidado: sem a resposta de conta a comunidade mostra "fora do ar" e nunca desenha o perfil.
  await context.route(/\/api\/social-auth/, (route) => route.fulfill({ json: { authenticated: false, providers: [] } }));
  await context.route(/\/api\/social(?:\?|$)/, (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') === 'profile') {
      profileRequests.push(url.searchParams.get('id'));
      return route.fulfill({ json: { profile } });
    }
    if (url.searchParams.get('action') === 'ranking') return route.fulfill({ json: { players: [player], own: null, total: 1 } });
    return route.fulfill({ status: 401, json: { error: 'not_authenticated' } });
  });
  // A página pública /u/* não é o que se mede aqui; se o clique sair do jogo, ela aparece vazia.
  await context.route(/\/u\//, (route) => route.fulfill({ contentType: 'text/html', body: '<title>pagina publica</title>' }));
  const page = await context.newPage();
  const enter = async (query) => {
    profileRequests.length = 0;
    await page.goto(`${base}/?home=hub${query}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
    for (let i = 0; i < 120 && await page.$('#boot-splash'); i++) {
      await page.evaluate(() => document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      await page.waitForTimeout(500);
    }
    // Marca o documento do hub: se um clique sair do jogo, a marca some (rota fixa /u/<perfil> não é saída).
    await page.waitForTimeout(1500);
    await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); window.__hubVivo = true; });
  };
  const profileInHub = async (label, wanted, caminho = `/u/${wanted}`) => {
    const state = await page.waitForFunction((nick) => {
      if (!window.__hubVivo) return { left: location.pathname };
      const pane = document.getElementById('hub-community');
      const shown = pane && !pane.hidden && pane.textContent.includes(nick);
      return shown ? { ok: true } : null;
    }, player.nick, { timeout: 20000 }).then((h) => h.jsonValue()).catch(async () => ({ left: await page.evaluate(() => window.__hubVivo ? null : location.pathname).catch(() => new URL(page.url()).pathname) }));
    if (state.left) failures.push(`${label}: saiu do jogo para ${state.left}`);
    else if (!state.ok) failures.push(`${label}: ficou no lobby, mas a comunidade não mostrou o perfil`);
    else if (!profileRequests.includes(wanted)) failures.push(`${label}: comunidade pediu o perfil [${profileRequests}] e não ${wanted}`);
    else if (new URL(page.url()).pathname !== caminho) failures.push(`${label}: URL ${new URL(page.url()).pathname}, esperado a rota fixa ${caminho} (ADR 0008)`);
    else console.log(`  ok ${label}: perfil de ${player.nick} na comunidade do hub`);
  };
  // A v3 esconde a .hub-tabs antiga e desenha a sua própria barra: abrir a seção pelo DOM vale nas duas.
  const abrirSecao = (id) => page.evaluate((t) => (document.querySelector(`[data-tp-aba="${t}"]`) || document.querySelector(`[data-hub-tab="${t}"]`))?.click(), id);

  // 1. Nick no RANKING do hub (tabela global).
  await enter('');
  await abrirSecao('ranking');
  const nickLink = page.locator('#hub-rank-global a[href^="/u/"]').first();
  await nickLink.waitFor({ timeout: 20000 });
  await nickLink.click({ noWaitAfter: true });
  await profileInHub('RANKING > nick', 'rubenmarcus');

  // 2. Link de jogo dentro do hub para /?secao=comunidade&perfil=<id> (o CTA da página pública).
  await enter('');
  await page.evaluate((id) => {
    const a = document.createElement('a'); a.href = `/?secao=comunidade&social=profile&perfil=${id}`; a.textContent = 'perfil';
    document.getElementById('hub-about').prepend(a);
  }, ID);
  await abrirSecao('sobre');
  await page.click(`#hub-about a[href*="perfil=${ID}"]`);
  await profileInHub('link ?perfil= dentro do hub', ID);

  // 3. Chegada pelo CTA "VER PERFIL NO JOGO" da página pública.
  await enter(`&secao=comunidade&social=profile&perfil=${ID}`);
  await profileInHub('chegada por ?perfil=', ID);

  // 4. Trocar de aba social limpa o perfil=, senão recarregar volta ao perfil alheio.
  await page.click('.social-tabs button[data-tab="friends"]');
  await page.waitForTimeout(300);
  const after = new URL(page.url());
  if (after.searchParams.has('perfil') || after.pathname !== '/comunidade/amigos') failures.push(`aba AMIGOS deixou a URL em ${after.pathname}${after.search}, esperado /comunidade/amigos`);
  else console.log('  ok aba AMIGOS foi para /comunidade/amigos sem perfil=');
  // 5. Voltar do navegador reabre o perfil pela rota fixa.
  await page.goBack(); await page.waitForTimeout(400);
  await profileInHub('voltar para /u/<perfil>', ID);
} finally {
  await browser.close();
}
for (const failure of failures) console.error(`✗ ${failure}`);
console.log(`Perfis abrem no hub: ${failures.length ? 'FAIL' : 'PASS'}${mutant ? ' (mutante ranking-fora)' : mutantQuery ? ' (mutante perfil-na-query)' : ''}`);
process.exitCode = failures.length ? 1 : 0;

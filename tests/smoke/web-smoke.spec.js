import { test, expect } from '@playwright/test';

// ?nav=1 mede somente as transições; web-assets.spec.js cobre GLBs reais.

const MUTANTE = process.env.SMOKE_MUTANTE || '';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  testInfo.setTimeout(testInfo.timeout + 10_000);
  await page.screenshot({
    path: `test-results/${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
    fullPage: true,
  });
});

// Top 10 sintético com o formato de produção: o CI não tem Supabase e o painel nunca cresce (#822).
const TOP10 = Array.from({ length: 10 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`, nick: `Fixture${i + 1}`, avatar_url: null, social_link: null,
  socials: ['instagram', 'linkedin', 'github'].map((net) => ({ net, url: `https://example.com/${net}/fixture${i + 1}` })),
  points: 50000 - i * 1000, kills: 50000 - i * 1000, kd: 40.5, account_verified: false,
}));

test('ranking com top 10 cheio mantém o VOLTAR alcançável em 1280×720', async ({ page }, testInfo) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  await page.setViewportSize({ width: 1280, height: 720 });
  if (MUTANTE === 'semrolagem') {
    testInfo.annotations.push({ type: 'mutação', description: 'semrolagem — tira a rolagem das telas de conteúdo; a régua DEVE reprovar' });
    await page.route('**/style.css*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      await rota.fulfill({ status: 200, contentType: 'text/css', body: corpo.replace('.screen:not(#map-screen){overflow-y:auto;justify-content:safe center}', '') });
    });
  }
  await page.route('**/api/leaderboard*', (rota) => rota.fulfill({ json: { players: TOP10 } }));
  await page.goto(`${base}/?debug=1&nav=1&home=legacy&ui=legacy`);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  await page.locator('.cs-item[data-act="ranking"]').click();
  await expect(page.locator('#rank-global tbody tr')).toHaveCount(10);
  await expect(page.locator('#ranking-panel h2')).toBeInViewport();
  await page.locator('#ranking-back').click({ timeout: 10_000 });
  await expect(page.locator('#main-menu')).toBeVisible();
});

test('hub legado abre o ranking e volta para jogar', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  await page.goto(`${base}/?debug=1&nav=1&ui=legacy`);
  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  await expect(page.locator('#hub-ui')).toBeVisible();
  await page.locator('[data-hub-tab="ranking"]').click();
  await expect(page.locator('#hub-ranking')).toBeVisible();
  await page.locator('[data-hub-tab="jogar"]').click();
  await expect(page.locator('#hub-play')).toBeVisible();
});

test('menu, ranking, map, teams, character and initial hud boot', async ({ page }, testInfo) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  const t0 = Date.now();
  const marcas = {};
  const marcar = (nome) => { marcas[nome] = Date.now() - (marcas._ult || t0); marcas._ult = Date.now(); };

  if (MUTANTE === 'nocharselect') {
    testInfo.annotations.push({ type: 'mutação', description: 'nocharselect — remove show(\'char-select\') servido; a régua DEVE reprovar' });
    await page.route('**/js/main.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      await rota.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: corpo.replace("show('char-select');", ''),
      });
    });
  } else if (MUTANTE === 'nomapscreen') {
    testInfo.annotations.push({ type: 'mutação', description: 'nomapscreen — pula a escolha fullscreen; a régua DEVE reprovar' });
    await page.route('**/js/main.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      await rota.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: corpo.replace("show('map-screen');", "show('main-menu');"),
      });
    });
  }

  await page.goto(`${base}/?debug=1&nav=1&home=legacy&ui=legacy`);

  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  let idioma;

  await expect(page.locator('#main-menu')).toBeVisible();
  await page.locator('.cs-item[data-act="ranking"]').click();
  await expect(page.locator('#ranking-panel')).toBeVisible();
  await page.locator('#ranking-back').click();
  await expect(page.locator('#main-menu')).toBeVisible();

  await page.locator('.cs-item[data-act="single-player"]').click();
  await page.locator('.cs-item[data-act="sp"]:visible').click();
  await expect(page.locator('#map-screen')).toBeVisible();
  await page.locator('#ms-continue').click();
  await expect(page.locator('#team-select')).toBeVisible();
  await expect(page.locator('#menu-setup')).not.toHaveClass(/open/);
  await expect(page.locator('#nick-input')).toHaveValue('');
  marcar('team-select');

  await page.locator('#btn-team-e').click();
  await expect(page.locator('#char-select')).toBeVisible();
  idioma = (await page.locator('#char-faction-tag').innerText()).includes('TIME') ? 'pt' : 'en';
  const characters = page.locator('#char-list .char-row');
  await expect(characters.first()).toBeVisible();
  marcar('char-select');

  await page.locator('#char-confirm').click();
  marcar('partida');

  await expect(page.locator('#hud')).toBeVisible({ timeout: 60_000 });
  marcar('hud');

  await page.evaluate(() => {
    const game = window.__game;
    const accept = game._acceptInput;
    game.testMode = false;
    game._acceptInput = () => true;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    document.dispatchEvent(new Event('pointerlockchange'));
    game._acceptInput = accept;
    game.testMode = true;
  });
  await expect(page.locator('#char-select')).toBeVisible();
  await expect(page.locator('#pause-menu')).toBeHidden();
  // M abre a seleção do OUTRO lado (Direita); o nome é TIME B até o rename de #767 entrar.
  await expect(page.locator('#char-faction-tag')).toContainText(idioma === 'pt' ? /DIREITA|TIME B/ : /RIGHT|TEAM B/);
  expect(await page.locator('.screen:not(.hidden)').evaluateAll((els) => els.map((el) => el.id))).toEqual(['char-select']);

  await page.locator('#char-back').click();
  await expect(page.locator('#char-select')).toBeHidden();
  await expect(page.locator('#pause-menu')).toBeHidden();
  expect(await page.evaluate(() => window.__game.paused)).toBe(false);

  // O artefato separa a duração por tela para localizar lentidão no runner compartilhado.
  const timings = { total_ms: Date.now() - t0, etapas: { ...marcas } };
  await testInfo.attach('navegacao-timings.json', { body: JSON.stringify(timings, null, 2), contentType: 'application/json' });
  console.log('NAVEGAÇÃO', JSON.stringify(timings));
});

test('queda do nó mostra estado de reconexão e permite entrar de novo', async ({ page }, testInfo) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  if (MUTANTE === 'sem-aviso-reconexao') {
    testInfo.annotations.push({ type: 'mutação', description: 'sem-aviso-reconexao — esconde o aviso depois do onClose; a régua DEVE reprovar' });
    await page.route('**/js/main.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const mutado = corpo.replace("abrirMultiplayer().then(() => mpErro('A conexão com o servidor caiu. Entre de novo.'));", 'abrirMultiplayer();');
      if (mutado === corpo) throw new Error('mutante sem-aviso-reconexao não encontrou o aviso de onClose');
      await rota.fulfill({ status: 200, contentType: 'application/javascript', body: mutado });
    });
  }
  await page.route('**/health', (rota) => {
    const host = new URL(rota.request().url()).hostname;
    if (host !== 'fixture.invalid') return rota.abort();
    return rota.fulfill({ json: { regiao: 'url', players: 1, rooms: 1, salaConvite: true, soloVerified: true } });
  });
  await page.route('http://fixture.invalid/rooms', (rota) => rota.fulfill({ json: { rooms: [{
    id: 'smoke', name: 'SALA SMOKE', map: 'praca_poderes', mapId: 'praca_poderes', mode: 'rounds',
    oficial: true, private: false, players: 1, max: 10, livre: { E: 4, B: 5 }, convite: 'BR-SMOKE',
  }] } }));
  await page.addInitScript(() => {
    const sockets = [];
    class WebSocketSmoke {
      constructor(url) {
        this.url = url;
        this.protocol = 'coro-snapshot-v8';
        this.readyState = 0;
        sockets.push(this);
        setTimeout(() => {
          this.readyState = 1;
          this.onopen?.();
          this.onmessage?.({ data: JSON.stringify({
            type: 'welcome', protocolVersion: 8, yourEnt: 1, yourTeam: 'E', espectador: false,
            map: 'praca_poderes', roster: [], faccaoE: 'E', faccaoB: 'B', ctf: false,
            partida: 1, room: 'smoke', regiao: 'url', teamSize: 1, roundsMax: 1, recursos: [],
          }) });
        }, 20);
      }
      send() {}
      close() {
        if (this.readyState === 3) return;
        this.readyState = 3;
        setTimeout(() => this.onclose?.(), 0);
      }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, writable: true, value: WebSocketSmoke });
    window.__mpSmokeSockets = sockets;
  });

  await page.goto(`${base}/?debug=1&nav=1&home=legacy&ui=legacy&mp=fixture.invalid`);
  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  await page.locator('.cs-item[data-act="mp"]').click();
  await expect(page.locator('.mp-sala .mp-entrar[data-lado="E"]')).toBeVisible({ timeout: 25_000 });
  await page.locator('.mp-sala .mp-entrar[data-lado="E"]').click();
  await expect(page.locator('#mp-estado')).toHaveText(/NA SALA/, { timeout: 25_000 });

  // Fecha DEPOIS do welcome: o NetClient já aceitou a sessão e o onClose de produção é obrigatório.
  await page.evaluate(() => window.__mpSmokeSockets[0].close());
  await expect(page.locator('#mp-panel')).toBeVisible();
  await expect(page.locator('#mp-erro')).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('#mp-erro')).toHaveText('A conexão com o servidor caiu. Entre de novo.');
  await expect(page.locator('.mp-sala .mp-entrar[data-lado="E"]')).toBeVisible({ timeout: 25_000 });

  // Não é só texto: a lista continua utilizável e uma segunda tentativa abre outro socket.
  await page.locator('.mp-sala .mp-entrar[data-lado="E"]').click();
  await expect.poll(() => page.evaluate(() => window.__mpSmokeSockets.length)).toBe(2);
  await expect(page.locator('#mp-estado')).toHaveText(/NA SALA/, { timeout: 25_000 });
  await expect(page.locator('#mp-erro')).toBeHidden();
});

import { mkdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

/* SMOKE DO CHAT DE SALA (#686, docs/chat-de-sala.md §11). Página real, jogo real em
   single player e um `net` falso montado dentro da página: o que se mede é o painel
   (ARIA, Y/Enter/Esc, prisão e devolução de foco, IME, XSS e RTL como texto) e a
   geometria contra a ZONA_MIRA de tools/eval/ui-check.mjs e o #crosshair em cinco
   viewports. Mutantes por page.route: painel-largo (a largura do CSS estoura a zona) e
   innerhtml (o texto da linha vai por innerHTML); os dois DEVEM reprovar.
   Uso local: CHROME_BIN=/caminho/do/chrome npx playwright test -c playwright.smoke.config.mjs tests/smoke/chat-sala.spec.js
   Figuras: CHAT_FIGURAS=/pasta guarda os PNG abertos e fechados de cada viewport. */

const MUTANTE = process.env.SMOKE_MUTANTE || '';
const FIGURAS = process.env.CHAT_FIGURAS || 'test-results/chat-sala';
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';

// no CI o Chromium é o do Playwright; local, CHROME_BIN aponta para o navegador instalado
test.use({ launchOptions: { executablePath: process.env.CHROME_BIN || undefined }, actionTimeout: 20_000, navigationTimeout: 60_000 });

const META = {
  v: 1, eu: { h: 'K3F' }, pode: 1, canais: ['sala', 'time'], max: 160, epoca: 'QX9W2A7B',
  denuncia: ['ofensa', 'odio', 'assedio', 'spam', 'outro'],
};
const XSS = '<img src=x onerror=alert(1)>';
const RTL = 'שלום hello';
const VIEWPORTS_DESKTOP = [[1600, 900], [1500, 1000], [1008, 655], [390, 844]];

/* A mesma fórmula da ZONA_MIRA de tools/eval/ui-check.mjs (fov 70°, alvo de 1,72 m a
   13,7 m, e no mínimo a marca de acerto de ±30 px). Copiada, não importada: o ui-check
   roda ao ser importado. */
function zonaMira(VW, VH) {
  const fovV = 70 * Math.PI / 180, asp = VW / VH;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * asp);
  const D = 13.7, H = 1.72, W = 0.259 * 1.72;
  const fracY = (2 * Math.atan((H / 2) / D)) / fovV;
  const fracX = Math.max((2 * Math.atan((W / 2) / D)) / fovH, (2 * 30) / VW);
  return { x0: (0.5 - fracX / 2) * VW, y0: (0.5 - fracY / 2) * VH, x1: (0.5 + fracX / 2) * VW, y1: (0.5 + fracY / 2) * VH };
}
const cruza = (a, b) => a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  testInfo.setTimeout(testInfo.timeout + 10_000);
  await page.screenshot({ path: `test-results/${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` });
});

async function aplicarMutante(page, testInfo) {
  if (MUTANTE === 'painel-largo') {
    testInfo.annotations.push({ type: 'mutação', description: 'painel-largo: width:min(34vw,420px) vira min(90vw,1400px); a geometria DEVE reprovar' });
    await page.route('**/style.css*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const mutado = corpo.replace('width:min(34vw,420px)', 'width:min(90vw,1400px)');
      if (mutado === corpo) throw new Error('mutante painel-largo não aplicou: a largura do #chat-sala mudou de forma');
      await rota.fulfill({ status: 200, contentType: 'text/css', body: mutado });
    });
  } else if (MUTANTE === 'innerhtml') {
    testInfo.annotations.push({ type: 'mutação', description: 'innerhtml: o texto da linha em chat-painel.js vai por innerHTML; o vetor de XSS DEVE reprovar' });
    await page.route('**/js/chat-painel.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const mutado = corpo.replace('txt.textContent = String(msg.txt', 'txt.innerHTML = String(msg.txt');
      if (mutado === corpo) throw new Error('mutante innerhtml não aplicou: montarLinha mudou de forma');
      await rota.fulfill({ status: 200, contentType: 'application/javascript', body: mutado });
    });
  } else if (MUTANTE === 'foco-preso') {
    testInfo.annotations.push({ type: 'mutação', description: 'foco-preso: devolverFoco não tira o foco de uma linha do painel; depois de denunciar e fechar, Y e W DEVEM reprovar' });
    await page.route('**/js/chat-painel.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const mutado = corpo.replace('else if (ativo && sec.contains(ativo)', 'else if (false && sec.contains(ativo)');
      if (mutado === corpo) throw new Error('mutante foco-preso não aplicou: devolverFoco mudou de forma');
      await rota.fulfill({ status: 200, contentType: 'application/javascript', body: mutado });
    });
  } else if (MUTANTE) {
    throw new Error(`mutante desconhecido: ${MUTANTE}`);
  }
}

async function bootarPartida(page) {
  await page.goto(`${base}/?debug=1&nav=1&home=legacy`);
  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  await expect(page.locator('#main-menu')).toBeVisible();
  await page.locator('.cs-item[data-act="single-player"]').click();
  await page.locator('.cs-item[data-act="sp"]:visible').click();
  await expect(page.locator('#map-screen')).toBeVisible();
  await page.locator('#ms-continue').click();
  await expect(page.locator('#menu-setup')).toHaveAttribute('data-step', 'profile');
  await page.locator('#nick-input').fill('ALFA');
  await page.locator('#profile-ok').click();
  await page.locator('#btn-jogar').click();
  await expect(page.locator('#team-select')).toBeVisible();
  await page.locator('#btn-team-e').click();
  await expect(page.locator('#char-select')).toBeVisible();
  await page.locator('#char-confirm').click();
  await expect(page.locator('#team-select')).toHaveAttribute('data-step', 'enemy');
  await page.locator('#btn-team-f').click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#chat-sala')).toBeHidden();
}

/* O `net` falso: ecoa o que envia como o nó faria (id crescente, rótulo do servidor,
   cid só na cópia de quem mandou) e expõe `entregar` para injetar frames. */
async function montarChat(page, { comMeta = true } = {}) {
  await page.evaluate(async ({ meta }) => {
    const [{ montarChatSala }, i18n] = await Promise.all([import('/js/chat-painel.js'), import('/js/i18n.js')]);
    const net = {
      meta: meta ? { chat: meta } : {}, espectador: false, yourEnt: 1, onChat: null, _chatFila: [],
      enviados: [], denuncias: [], proximoId: 100, modoNack: '',
      drenarChat() { return []; },
      enviarChat(ch, txt, cid) {
        if (!this.meta.chat) return false;
        this.enviados.push({ ch, txt, cid });
        if (this.modoNack) { const motivo = this.modoNack; setTimeout(() => this.onChat?.({ type: 'chat_nack', cid, motivo, espera: 1200 }), 20); return true; }
        const id = this.proximoId++;
        setTimeout(() => this.onChat?.({ type: 'chat', id, t: Date.now(), ch, aud: 'todos', h: 'K3F', esp: 0, time: 'E', txt, cid }), 20);
        return true;
      },
      denunciarChat(id, motivo) {
        this.denuncias.push({ id, motivo });
        setTimeout(() => this.onChat?.({ type: 'chat_denuncia', id, estado: 'recebida' }), 20);
        return true;
      },
      entregar(m) { this.onChat?.(m); },
    };
    window.__chatNet = net;
    window.__tiros = 0;
    const g = window.__game;
    const tiro0 = g._tryShoot.bind(g);
    g._tryShoot = (...a) => { window.__tiros++; return tiro0(...a); };
    window.__chat = montarChatSala({
      net, obterJogo: () => window.__game, tr: i18n.tr, frase: i18n.frase, convite: 'SMOKE',
      toque: matchMedia('(pointer: coarse)').matches,
    });
    g.onAbrirChat = (ch) => window.__chat.abrir(ch);
    window.__chat.aoTrocarJogo(g);
  }, { meta: comMeta ? META : null });
}

const entregar = (page, m) => page.evaluate((f) => window.__chatNet.entregar(f), m);
/* Y/U só valem com o jogo em 'live' ou 'countdown' e sem pausa (game.js, _kd). O round dura
   99 s e a troca (roundEnd, 4 s) cai no meio do teste: espera o jogo voltar antes da tecla. */
async function teclaChat(page, tecla) {
  await page.waitForFunction(() => { const g = window.__game; return !!g && g.state === 'live' && !g.paused; }, null, { timeout: 30_000 });
  await page.keyboard.press(tecla);
}
const linhas = (page) => page.locator('#chat-log .chat-linha');
const chatAberto = (page) => page.evaluate(() => window.__chat.aberto());
const estadoJogo = (page) => page.evaluate(() => {
  const g = window.__game;
  return { travada: !!g._entradaTravada, keys: { ...g.keys }, paused: !!g.paused, mouseDown0: !!g.mouseDown0, tiros: window.__tiros, ativo: document.activeElement?.id || document.activeElement?.tagName };
});

/* Uma caixa por elemento que o chat desenha (a seção, os descendentes visíveis e o botão
   de toque), o retângulo do #crosshair e a zona da mira do viewport atual. Uma caixa por
   elemento, não a união: no toque o botão fica no canto oposto ao painel. */
async function geometria(page) {
  return page.evaluate(() => {
    const cx = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const sec = document.getElementById('chat-sala');
    const els = [sec, ...sec.querySelectorAll('*'), document.getElementById('chat-toque')].filter((e) => e && e.getClientRects().length);
    const caixas = [];
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      caixas.push({ nome: e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}.${e.className}`, ...cx(r) });
    }
    const mira = document.getElementById('crosshair');
    return { caixas, mira: mira && mira.getClientRects().length ? cx(mira.getBoundingClientRect()) : null, VW: innerWidth, VH: innerHeight, linhas: sec.querySelectorAll('.chat-linha').length };
  });
}
async function cobrarGeometria(page, nome, aberto) {
  const g = await geometria(page);
  const zona = zonaMira(g.VW, g.VH);
  const rotulo = `${nome} ${aberto ? 'aberto' : 'fechado'}`;
  expect(g.linhas, `${nome}: o log precisa ter linhas para a geometria valer`).toBeGreaterThan(0);
  expect(g.caixas.length, `${rotulo}: o painel tem caixa`).toBeGreaterThan(0);
  expect(g.mira, `${rotulo}: o #crosshair está na tela`).not.toBeNull();
  for (const c of g.caixas) {
    const dentro = c.x0 >= 0 && c.y0 >= 0 && c.x1 <= g.VW + 1 && c.y1 <= g.VH + 1;
    expect(dentro, `${rotulo}: ${c.nome} ${JSON.stringify(c)} cabe em ${g.VW}x${g.VH}`).toBe(true);
    expect(cruza(c, zona), `${rotulo}: ${c.nome} ${JSON.stringify(c)} cruza a ZONA_MIRA ${JSON.stringify(zona)}`).toBe(false);
    expect(cruza(c, g.mira), `${rotulo}: ${c.nome} ${JSON.stringify(c)} cruza o #crosshair ${JSON.stringify(g.mira)}`).toBe(false);
  }
}
async function figura(page, nome) {
  mkdirSync(FIGURAS, { recursive: true });
  await page.screenshot({ path: `${FIGURAS}/${nome}.png` });
}

test.describe('chat de sala', () => {
  test('desktop: ARIA, Y/Enter/Esc, foco, IME, XSS e RTL, bloqueio, denúncia e geometria', async ({ page }, testInfo) => {
    test.slow();
    const errosDePagina = [];
    page.on('pageerror', (e) => errosDePagina.push(String(e)));
    await aplicarMutante(page, testInfo);
    await page.setViewportSize({ width: 1600, height: 900 });
    await bootarPartida(page);

    await test.step('sem meta.chat o cliente é inerte: Y não abre nada', async () => {
      await montarChat(page, { comMeta: false });
      await teclaChat(page, 'y');
      await expect(page.locator('#chat-sala')).toBeHidden();
      expect(await chatAberto(page)).toBe(false);
      await page.evaluate((meta) => { window.__chatNet.meta = { chat: meta }; window.__chat.aoMudarMeta(window.__chatNet.meta); }, META);
      expect(await page.evaluate(() => document.getElementById('chat-sala').hidden)).toBe(false);
      expect(await chatAberto(page)).toBe(false);
      await expect(page.locator('#hud-atalho-chat')).toHaveText('Y/U CHAT');
    });

    await test.step('ARIA: log vivo, campo com rótulo, seção nomeada', async () => {
      const log = page.locator('#chat-log');
      await expect(log).toHaveAttribute('role', 'log');
      await expect(log).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('#chat-sala')).toHaveAttribute('aria-label', /.+/);
      await expect(page.locator('#chat-sala')).toHaveAttribute('data-entrada-propria', '');
      await expect(page.locator('label[for="chat-entrada"]')).toHaveCount(1);
      await expect(page.locator('#chat-entrada')).toHaveAttribute('maxlength', '640');
      await expect(page.locator('#chat-entrada')).toHaveAttribute('enterkeyhint', 'send');
    });

    await test.step('histórico e mensagens: rótulo do servidor, XSS e RTL como texto, nick do navegador nunca aparece', async () => {
      await entregar(page, { type: 'chat_hist', list: [
        { type: 'chat', id: 1, t: 1, ch: 'sala', aud: 'todos', h: 'ABC', esp: 0, time: 'E', txt: 'primeira do histórico' },
        { type: 'chat', id: 2, t: 2, ch: 'sala', aud: 'todos', h: 'DEF', nk: 'Rubao', esp: 0, time: 'B', txt: 'segunda do histórico' },
      ] });
      await entregar(page, { type: 'chat', id: 3, t: 3, ch: 'sala', aud: 'todos', h: 'GHI', esp: 1, time: null, txt: XSS });
      await entregar(page, { type: 'chat', id: 4, t: 4, ch: 'sala', aud: 'todos', h: 'JKL', esp: 0, time: 'E', txt: RTL });
      await entregar(page, { type: 'chat', id: 5, t: 5, ch: 'time', aud: 'time', h: 'MNO', esp: 0, time: 'E', txt: 'só o time vê' });
      await expect(linhas(page)).toHaveCount(5);
      await expect(page.locator('#chat-log .chat-divisor')).toHaveCount(1);
      await expect(page.locator('#chat-log')).toHaveAttribute('aria-busy', 'false');
      const xss = page.locator('#chat-log .chat-linha[data-id="3"]');
      await expect(xss.locator('img')).toHaveCount(0);
      await expect(xss.locator('bdi.chat-txt')).toHaveText(XSS);
      await expect(xss.locator('bdi.chat-quem')).toHaveText('Anônimo #GHI');
      await expect(xss.locator('bdi[dir="auto"]')).toHaveCount(2);
      const rtl = page.locator('#chat-log .chat-linha[data-id="4"]');
      await expect(rtl.locator('bdi.chat-txt')).toHaveText(RTL);
      await expect(rtl.locator('bdi.chat-txt')).toHaveAttribute('dir', 'auto');
      await expect(page.locator('#chat-log .chat-linha[data-id="2"] bdi.chat-quem')).toHaveText(/^Rubao \S$/);
      await expect(page.locator('#chat-log .chat-linha[data-id="5"] .chat-tag')).toHaveText('TIME');
      const texto = await page.locator('#chat-log').textContent();
      expect(texto).not.toContain('ALFA');
      expect(texto).not.toContain('SmokeBot');
    });

    for (const [w, h] of VIEWPORTS_DESKTOP) {
      await test.step(`geometria ${w}x${h}: fechado e aberto fora da ZONA_MIRA e do #crosshair`, async () => {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(150);
        await cobrarGeometria(page, `${w}x${h}`, false);
        await figura(page, `${w}x${h}-fechado`);
        await teclaChat(page, 'y');
        expect(await chatAberto(page)).toBe(true);
        await cobrarGeometria(page, `${w}x${h}`, true);
        await figura(page, `${w}x${h}-aberto`);
        await page.keyboard.press('Escape');
        expect(await chatAberto(page)).toBe(false);
      });
    }
    await page.setViewportSize({ width: 1600, height: 900 });

    await test.step('Y abre com o foco no campo e trava o jogo; teclas e clique no campo não chegam ao jogo; perder o lock não pausa', async () => {
      await teclaChat(page, 'y');
      expect(await chatAberto(page)).toBe(true);
      let s = await estadoJogo(page);
      expect(s.ativo).toBe('chat-entrada');
      expect(s.travada).toBe(true);
      await page.keyboard.type('www ');
      await page.keyboard.press('r');
      await page.locator('#chat-entrada').click();
      await page.evaluate(() => document.dispatchEvent(new Event('pointerlockchange')));
      s = await estadoJogo(page);
      expect(s.keys.KeyW).toBeFalsy();
      expect(s.keys.Space).toBeFalsy();
      expect(s.keys.KeyR).toBeFalsy();
      expect(s.mouseDown0).toBe(false);
      expect(s.tiros).toBe(0);
      expect(s.paused).toBe(false);
      await expect(page.locator('#pause-menu')).toBeHidden();
      await expect(page.locator('#chat-entrada')).toHaveValue('www r');
      await expect(page.locator('#chat-contador')).toHaveText('5/160');
    });

    await test.step('Enter envia pelo net, o eco desenha a própria linha, o compositor fecha e devolve o foco', async () => {
      await page.locator('#chat-entrada').fill('  oi   galera  ');
      await page.keyboard.press('Enter');
      const enviados = await page.evaluate(() => window.__chatNet.enviados);
      expect(enviados).toHaveLength(1);
      expect(enviados[0].ch).toBe('sala');
      expect(enviados[0].txt).toBe('oi galera');
      expect(enviados[0].cid).toMatch(/^[A-Za-z0-9_-]{1,12}$/);
      expect(await chatAberto(page)).toBe(false);
      const s = await estadoJogo(page);
      expect(s.travada).toBe(false);
      expect(s.ativo).not.toBe('chat-entrada');
      const propria = page.locator('#chat-log .chat-linha.propria');
      await expect(propria).toHaveCount(1);
      await expect(propria.locator('bdi.chat-quem')).toHaveText('Anônimo #K3F');
      await expect(propria.locator('bdi.chat-txt')).toHaveText('oi galera');
      await expect(page.locator('#chat-entrada')).toHaveValue('');
    });

    await test.step('Esc fecha e devolve o foco; clique fora fecha sem atirar', async () => {
      await teclaChat(page, 'y');
      await expect(page.locator('#chat-entrada')).toBeFocused();
      await page.keyboard.press('Escape');
      expect(await chatAberto(page)).toBe(false);
      await expect(page.locator('#chat-entrada')).not.toBeFocused();
      expect((await estadoJogo(page)).travada).toBe(false);
      await teclaChat(page, 'y');
      await page.mouse.click(1200, 700);
      expect(await chatAberto(page)).toBe(false);
      expect((await estadoJogo(page)).tiros).toBe(0);
    });

    await test.step('Tab fica preso no painel, nos dois sentidos', async () => {
      await teclaChat(page, 'y');
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.getElementById('chat-sala').contains(document.activeElement))).toBe(true);
      }
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Shift+Tab');
        expect(await page.evaluate(() => document.getElementById('chat-sala').contains(document.activeElement))).toBe(true);
      }
      expect(await page.evaluate(() => window.__game._showScoreboard && document.getElementById('scoreboard').classList.contains('hidden'))).toBe(true);
      await page.keyboard.press('Escape');
    });

    await test.step('IME: Enter com isComposing ou keyCode 229 não envia; Enter real envia', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-entrada').fill('composição');
      await page.evaluate(() => {
        const alvo = document.getElementById('chat-entrada');
        alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, isComposing: true }));
        alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, keyCode: 229 }));
        alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, isComposing: true }));
      });
      expect(await page.evaluate(() => window.__chatNet.enviados.length)).toBe(1);
      expect(await chatAberto(page)).toBe(true);
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => window.__chatNet.enviados.length)).toBe(2);
      expect(await chatAberto(page)).toBe(false);
    });

    await test.step('nack devolve o rascunho ao campo e mostra o motivo', async () => {
      await page.evaluate(() => { window.__chatNet.modoNack = 'rapido'; });
      await teclaChat(page, 'y');
      await page.locator('#chat-entrada').fill('recusada');
      await page.keyboard.press('Enter');
      await expect(page.locator('#chat-aviso')).toContainText('2 s');
      expect(await chatAberto(page)).toBe(false);
      await teclaChat(page, 'y');
      await expect(page.locator('#chat-entrada')).toHaveValue('recusada');
      await page.evaluate(() => { window.__chatNet.modoNack = ''; });
      await page.locator('#chat-entrada').fill('');
      await page.keyboard.press('Escape');
    });

    await test.step('vazia e longa não saem do cliente', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-entrada').fill('   ');
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => window.__chatNet.enviados.length)).toBe(3);
      await expect(page.locator('#chat-aviso')).toHaveText(/vazia/i);
      await page.locator('#chat-entrada').fill('a'.repeat(161));
      await expect(page.locator('#chat-contador')).toHaveClass(/estourou/);
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => window.__chatNet.enviados.length)).toBe(3);
      await expect(page.locator('#chat-aviso')).toHaveText(/longa/i);
      await page.locator('#chat-entrada').fill('');
      await page.keyboard.press('Escape');
    });

    await test.step('ArrowUp percorre as linhas; Enter abre BLOQUEAR/DENUNCIAR; bloquear esconde e BLOQUEADOS desbloqueia', async () => {
      await teclaChat(page, 'y');
      await page.keyboard.press('ArrowUp');
      expect(await page.evaluate(() => document.activeElement?.classList.contains('chat-linha'))).toBe(true);
      const idFocada = await page.evaluate(() => document.activeElement.dataset.id);
      expect(idFocada).toBe(await page.evaluate(() => [...document.querySelectorAll('#chat-log .chat-linha')].at(-1).dataset.id));
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      const id = await page.evaluate(() => document.activeElement.dataset.id);
      await page.keyboard.press('Enter');
      await expect(page.locator('#chat-acoes')).toBeVisible();
      await expect(page.locator('#chat-bloquear')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.locator('#chat-acoes')).toBeHidden();
      expect(await chatAberto(page)).toBe(true);
      await page.locator(`#chat-log .chat-linha[data-id="${id}"]`).click();
      await expect(page.locator('#chat-acoes')).toBeVisible();
      const h = await page.locator(`#chat-log .chat-linha[data-id="${id}"]`).getAttribute('data-h');
      await page.locator('#chat-bloquear').click();
      await expect(page.locator(`#chat-log .chat-linha[data-h="${h}"]`)).toHaveCount(0);
      await entregar(page, { type: 'chat', id: 50, t: 50, ch: 'sala', aud: 'todos', h, esp: 0, time: 'E', txt: 'bloqueado falando' });
      await expect(page.locator('#chat-log .chat-linha[data-id="50"]')).toHaveCount(0);
      expect(await page.evaluate((chave) => JSON.parse(sessionStorage.getItem(chave) || '[]'), `cs_chat_bloq:SMOKE:${META.epoca}`)).toContain(h);
      await page.locator('#chat-bloqueados').click();
      await expect(page.locator('#chat-lista-bloqueados')).toBeVisible();
      await expect(page.locator('#chat-lista-bloqueados-ul')).toContainText(`#${h}`);
      await page.locator('#chat-lista-bloqueados-ul button').first().click();
      await expect(page.locator(`#chat-log .chat-linha[data-h="${h}"]`)).toHaveCount(2);
      await page.locator('#chat-lista-fechar').click();
      await page.keyboard.press('Escape');
    });

    await test.step('a própria linha não abre ações; denúncia sai sem texto livre e oferece bloquear', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-log .chat-linha.propria').first().click();
      await expect(page.locator('#chat-acoes')).toBeHidden();
      await expect(page.locator('#chat-aviso')).toHaveText(/sua/i);
      await page.locator('#chat-log .chat-linha[data-id="3"]').click();
      await page.locator('#chat-denunciar').click();
      await expect(page.locator('#chat-motivos')).toBeVisible();
      await expect(page.locator('#chat-motivos input[type="radio"]')).toHaveCount(5);
      await expect(page.locator('#chat-motivos textarea, #chat-motivos input[type="text"]')).toHaveCount(0);
      await page.locator('#chat-motivos input[value="spam"]').check();
      await page.locator('#chat-motivos-enviar').click();
      expect(await page.evaluate(() => window.__chatNet.denuncias)).toEqual([{ id: 3, motivo: 'spam' }]);
      await expect(page.locator('#chat-aviso')).toHaveText(/recebida/i);
      await expect(page.locator('#chat-bloquear-tambem')).toBeVisible();
      await page.locator('#chat-bloquear-tambem').click();
      await expect(page.locator('#chat-log .chat-linha[data-id="3"]')).toHaveCount(0);
      await page.keyboard.press('Escape');
    });

    /* Depois da denúncia o foco volta para a linha denunciada (fecharAcoes). Fechar com Esc
       nesse estado deixava o foco preso numa linha do painel, e entradaPropria() em game.js
       engolia toda tecla: nem Y reabria, nem W andava (achado pelo eval:chat-mp, CE5). */
    await test.step('depois de denunciar, Esc devolve o foco ao jogo: W anda e Y reabre', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-log .chat-linha[data-id="4"]').click();
      await page.locator('#chat-denunciar').click();
      await page.locator('#chat-motivos input[value="ofensa"]').check();
      await page.locator('#chat-motivos-enviar').click();
      await expect(page.locator('#chat-aviso')).toHaveText(/recebida/i);
      expect(await page.evaluate(() => document.activeElement?.classList.contains('chat-linha'))).toBe(true);
      await page.keyboard.press('Escape');
      expect(await chatAberto(page)).toBe(false);
      expect(await page.evaluate(() => document.getElementById('chat-sala').contains(document.activeElement)), 'o foco não pode ficar preso numa linha do painel fechado').toBe(false);
      await page.keyboard.down('w');
      expect((await estadoJogo(page)).keys.KeyW, 'W precisa chegar ao jogo com o chat fechado').toBeTruthy();
      await page.keyboard.up('w');
      await teclaChat(page, 'y');
      expect(await chatAberto(page)).toBe(true);
      await page.keyboard.press('Escape');
    });

    await test.step('OCULTAR silencia o log e conta as não lidas', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-ocultar').click();
      await expect(page.locator('#chat-log')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('#chat-log')).toHaveAttribute('aria-live', 'off');
      await entregar(page, { type: 'chat', id: 60, t: 60, ch: 'sala', aud: 'todos', h: 'PQR', esp: 0, time: 'E', txt: 'escondida' });
      await expect(page.locator('#chat-nao-lidas')).toBeVisible();
      await expect(page.locator('#chat-nao-lidas')).toHaveText('1 nova');
      await expect(page.locator('#chat-log .chat-linha[data-id="60"]')).toBeHidden();
      await page.locator('#chat-ocultar').click();
      await expect(page.locator('#chat-nao-lidas')).toBeHidden();
      await expect(page.locator('#chat-log .chat-linha[data-id="60"]')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('U abre no canal time; espectador só tem sala', async () => {
      await teclaChat(page, 'u');
      expect(await page.evaluate(() => window.__chat.canal())).toBe('time');
      await expect(page.locator('#chat-canal')).toHaveText('TIME');
      await page.keyboard.press('Escape');
      await page.evaluate(() => { window.__chatNet.espectador = true; window.__chat.aoMudarSlot({ espectador: true }); });
      await teclaChat(page, 'u');
      expect(await page.evaluate(() => window.__chat.canal())).toBe('sala');
      await expect(page.locator('#chat-canal')).toBeDisabled();
      await expect(page.locator('#chat-aviso')).toHaveText(/sala/i);
      await page.keyboard.press('Escape');
      await page.evaluate(() => { window.__chatNet.espectador = false; window.__chat.aoMudarSlot({ espectador: false }); });
    });

    await test.step('destruir apaga log, rascunho e fila', async () => {
      await teclaChat(page, 'y');
      await page.locator('#chat-entrada').fill('rascunho');
      await page.evaluate(() => window.__chat.destruir());
      await expect(page.locator('#chat-sala')).toBeHidden();
      await expect(linhas(page)).toHaveCount(0);
      await expect(page.locator('#chat-entrada')).toHaveValue('');
      expect((await estadoJogo(page)).travada).toBe(false);
      await teclaChat(page, 'y');
      await expect(page.locator('#chat-sala')).toBeHidden();
    });

    expect(errosDePagina, `pageerror: ${errosDePagina.join(' | ')}`).toEqual([]);
  });

  test.describe('toque 844x390', () => {
    test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    test('botão de toque, #touch-ui some com o chat aberto e a geometria não cruza a mira', async ({ page }, testInfo) => {
      test.slow();
      const errosDePagina = [];
      page.on('pageerror', (e) => errosDePagina.push(String(e)));
      await aplicarMutante(page, testInfo);
      await bootarPartida(page);
      await expect(page.locator('#touch-ui')).toHaveCount(1);
      await montarChat(page);
      await page.evaluate((meta) => { window.__chat.aoMudarMeta({ chat: meta }); }, META);
      expect(await page.evaluate(() => document.getElementById('chat-sala').hidden)).toBe(false);
      await expect(page.locator('#chat-toque')).toBeVisible();
      await entregar(page, { type: 'chat', id: 1, t: 1, ch: 'sala', aud: 'todos', h: 'ABC', esp: 0, time: 'E', txt: 'no celular' });
      await entregar(page, { type: 'chat', id: 2, t: 2, ch: 'sala', aud: 'todos', h: 'DEF', esp: 0, time: 'B', txt: XSS });
      await expect(linhas(page)).toHaveCount(2);
      await expect(page.locator('#chat-log .chat-linha[data-id="2"] img')).toHaveCount(0);
      await cobrarGeometria(page, '844x390 toque', false);
      await figura(page, '844x390-toque-fechado');
      await page.locator('#chat-toque').tap();
      expect(await chatAberto(page)).toBe(true);
      await expect(page.locator('#touch-ui')).toHaveClass(/chat/);
      await expect(page.locator('#touch-ui')).toBeHidden();
      expect((await estadoJogo(page)).travada).toBe(true);
      await expect(page.locator('#chat-entrada')).toBeFocused();
      await cobrarGeometria(page, '844x390 toque', true);
      await figura(page, '844x390-toque-aberto');
      await page.locator('#chat-entrada').fill('do toque');
      await page.locator('#chat-enviar').tap();
      expect(await page.evaluate(() => window.__chatNet.enviados.map((e) => e.txt))).toEqual(['do toque']);
      expect(await chatAberto(page)).toBe(false);
      await expect(page.locator('#touch-ui')).not.toHaveClass(/chat/);
      await expect(page.locator('#touch-ui')).toBeVisible();
      expect((await estadoJogo(page)).tiros).toBe(0);
      expect(errosDePagina, `pageerror: ${errosDePagina.join(' | ')}`).toEqual([]);
    });
  });
});

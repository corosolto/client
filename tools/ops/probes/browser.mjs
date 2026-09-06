/* ============================================================================
   browser.mjs — O MAIN.JS AVALIA? (opcional: precisa de Playwright + Chromium)
   ----------------------------------------------------------------------------
   Tudo que boot.mjs mede sem navegador para no parse. Esta sonda abre a rota
   real com `?debug=1` (testMode: nenhum beacon de telemetria sai — a sonda não
   pode virar jogador no painel) e prova o boot pelo EFEITO, como o eval:boot:
   `__CS_MAIN_READY__` ligou e `#btn-jogar` tem onclick. Junta o que a página
   contou (pageerror, console.error, requestfailed, respostas ≥ 400) e o
   `window.__csbOps.snapshot()` do public/js/ops.js quando ele existe.

   `--partida`: navega com `?debug=1&auto=E`, espera `__game.state === 'live'`
   e deixa o ops.js amostrar FPS por alguns segundos. Em headless sem GPU
   (SwiftShader) o FPS não representa jogador — o relatório marca `headless`.

   Como acha o Playwright (nessa ordem): PLAYWRIGHT_MODULE, `playwright` e
   `playwright-core` resolvíveis da árvore, depois `npm root -g` (o padrão do
   eval:boot na máquina do dono). CHROME_BIN aponta o executável; sem ele usa o
   Chromium empacotado do Playwright.
   ============================================================================ */
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function carregaPlaywright() {
  const candidatos = [];
  if (process.env.PLAYWRIGHT_MODULE) candidatos.push(process.env.PLAYWRIGHT_MODULE);
  candidatos.push('playwright', 'playwright-core');
  try {
    const gRoot = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    candidatos.push(join(gRoot, 'playwright/index.js'), join(gRoot, 'playwright-core/index.js'));
  } catch { /* sem npm global */ }
  const tentativas = [];
  for (const c of candidatos) {
    try {
      const m = await import(c.startsWith('/') ? pathToFileURL(c).href : c);
      const chromium = m.chromium || m.default?.chromium;
      if (chromium) return { chromium, origem: c };
      tentativas.push(`${c}: sem export chromium`);
    } catch (e) { tentativas.push(`${c}: ${String(e.message).split('\n')[0].slice(0, 80)}`); }
  }
  return { chromium: null, tentativas };
}

export async function sondaNavegador(base, { partida = false, timeoutMs = 45_000, gpu = false, amostraFpsMs = 8000 } = {}) {
  const r = { sonda: 'navegador', alvo: base, headless: true, indisponivel: false, motivo: null, mainLoaded: null, mainReady: null, btnJogar: null, webgl2: null, webgl1: null, readyMs: null, pageErrors: [], consoleErros: [], requestsFalhas: [], ops: null, partida: null, versaoHtml: null };
  const pw = await carregaPlaywright();
  if (!pw.chromium) { r.indisponivel = true; r.motivo = `Playwright não encontrado (${(pw.tentativas || []).join(' · ')})`; return r; }
  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true, executablePath: process.env.CHROME_BIN || undefined,
      args: gpu ? ['--ignore-gpu-blocklist'] : ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
    });
  } catch (e) { r.indisponivel = true; r.motivo = `Chromium não abriu: ${String(e.message).split('\n')[0].slice(0, 160)}`; return r; }
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const caminho = (u) => u.replace(base, '').split('?')[0];
    const ignoravel = (u) => /\/favicon\.ico$/.test(caminho(u));
    page.on('pageerror', (e) => r.pageErrors.push(String(e.message || e).slice(0, 300)));
    // "Failed to load resource" já entra por requestsFalhas; repetir no console só duplicaria o achado
    page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) r.consoleErros.push(m.text().slice(0, 300)); });
    page.on('requestfailed', (req) => { if (!ignoravel(req.url())) r.requestsFalhas.push(`${caminho(req.url())} ${req.failure()?.errorText || 'falhou'}`); });
    page.on('response', (resp) => { if (resp.status() >= 400 && !ignoravel(resp.url())) r.requestsFalhas.push(`${caminho(resp.url())} ${resp.status()}`); });
    const url = `${base}/?debug=1${partida ? '&auto=E' : ''}`;
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    try { await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: timeoutMs }); r.readyMs = Date.now() - t0; } catch { /* boot não pronto: lido abaixo */ }
    // o ops.js registra o marco no próximo tick de 250 ms; sem esperar, o snapshot sai vazio
    await page.waitForFunction(() => window.__csbOps?.snapshot?.().marcos?.main_ready != null, null, { timeout: 3000 }).catch(() => {});
    Object.assign(r, await page.evaluate(() => {
      const o = {};
      o.mainLoaded = !!window.__CS_MAIN_LOADED; o.mainReady = window.__CS_MAIN_READY__ === true;
      const b = document.getElementById('btn-jogar'); o.btnJogar = !!(b && b.onclick);
      try { const c = document.createElement('canvas'); o.webgl2 = !!c.getContext('webgl2'); o.webgl1 = !!c.getContext('webgl'); } catch { o.webgl2 = false; o.webgl1 = false; }
      try { const l = document.querySelector('link[rel=stylesheet][href*="?v="]'); o.versaoHtml = l ? l.getAttribute('href').split('?v=')[1] : null; } catch { o.versaoHtml = null; }
      return o;
    }));
    if (partida) {
      const p = { chegouLive: false, ms: null, erro: null };
      const t1 = Date.now();
      try {
        await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: timeoutMs });
        p.chegouLive = true; p.ms = Date.now() - t1;
        await page.waitForTimeout(amostraFpsMs);
      } catch (e) { p.erro = String(e.message).split('\n')[0].slice(0, 200); }
      r.partida = p;
    }
    r.ops = await page.evaluate(() => { try { return window.__csbOps ? window.__csbOps.snapshot() : null; } catch { return null; } });
  } catch (e) {
    r.motivo = `sonda interrompida: ${String(e.message).split('\n')[0].slice(0, 200)}`;
    if (r.mainReady == null) r.mainReady = false;
  } finally {
    await browser.close().catch(() => {});
  }
  return r;
}

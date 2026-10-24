#!/usr/bin/env node
// Reproduz a remoção da splash antes de um evento de áudio tardio; --mutante=sem-guarda deve falhar.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const mutante = process.argv.includes('--mutante=sem-guarda');
const arquivos = {
  '/js/splash-v3.js': 'public/js/splash-v3.js',
  '/js/i18n.js': 'public/js/i18n.js',
};
const html = `<!doctype html><html><body>
<button id="hub-music-toggle" aria-pressed="true"></button>
<div id="boot-splash"><span id="boot-status">CARREGANDO</span><span id="boot-pct">0%</span>
<div id="splash-enter" class="hidden"></div><span id="splash-ver">v0</span>
<div class="tp-splash"><div data-etapa="lobby"></div><div data-etapa="personagem"></div>
<div data-etapa="audio"></div><button id="tp-splash-jogar" disabled>JOGAR</button>
<p id="tp-splash-convidado" data-vazio></p><button id="tp-splash-som"></button>
<span id="tp-splash-ver" data-vazio></span></div></div></body></html>`;
const guarda = "    if (!raiz.isConnected) {\n      observa.disconnect();\n      window.removeEventListener('cs-musica-pronta', sincroniza);\n      return;\n    }\n";

const server = createServer(async (req, res) => {
  try {
    const arquivo = arquivos[req.url];
    if (!arquivo) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    let corpo = await readFile(arquivo, 'utf8');
    if (mutante && req.url === '/js/splash-v3.js') {
      if (!corpo.includes(guarda)) throw new Error('mutante sem-guarda não aplicou');
      corpo = corpo.replace(guarda, '');
    }
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    res.end(corpo);
  } catch (erro) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(erro));
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  const normal = await page.evaluate(async () => {
    const { ligarSplashV3 } = await import('/js/splash-v3.js');
    ligarSplashV3();
    document.getElementById('splash-enter').classList.remove('hidden');
    await new Promise((resolve) => setTimeout(resolve, 30));
    return {
      enabled: !document.getElementById('tp-splash-jogar').disabled,
      guest: document.getElementById('tp-splash-convidado').textContent.trim().length > 0
        && !document.getElementById('tp-splash-convidado').hasAttribute('data-vazio'),
    };
  });
  if (!normal.enabled || !normal.guest || errors.length) throw new Error(`fluxo normal: ${JSON.stringify({ normal, errors })}`);

  await page.goto(base);
  await page.evaluate(async () => {
    const { ligarSplashV3 } = await import('/js/splash-v3.js');
    ligarSplashV3();
    document.getElementById('boot-splash').remove();
    window.dispatchEvent(new Event('cs-musica-pronta'));
  });
  await page.waitForTimeout(40);
  if (errors.length) throw new Error(`evento após remoção: ${errors.join(' | ')}`);
  console.log('SPLASH-LIFECYCLE: fluxo normal e remoção tardia sem erro');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

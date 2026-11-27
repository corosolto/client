#!/usr/bin/env node
/* compartilhar-browser.mjs: no hub de verdade, o botão COMPARTILHAR do fim de partida e do
   ranking abre o Web Share no celular com a URL certa, e no computador copia o link.
   A metade em node é tools/eval/compartilhar-check.mjs.

   Uso: BASE=http://127.0.0.1:<porta> node tools/eval/compartilhar-browser.mjs [--fotos=<pasta>] [--mutante=sem-share]
     sem-share  compartilhar.js ignora o Web Share: o celular tem que reprovar. */
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
  for (const [nome, viewport, comShare] of [['mobile', { width: 390, height: 844 }, true], ['desktop', { width: 1536, height: 960 }, false]]) {
    const context = await browser.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'] });
    await context.addInitScript((comShare) => {
      localStorage.setItem('awpbr_nick', 'RUBAO'); localStorage.setItem('cs_lang', 'pt'); localStorage.setItem('cs_treta_intro', '1');
      window.__shares = [];
      if (comShare) { navigator.share = async (d) => { window.__shares.push(d); }; navigator.canShare = () => true; }
      else { delete Navigator.prototype.share; }
    }, comShare);
    await context.route(/\/api\/social-auth/, (route) => route.fulfill({ json: { authenticated: false, providers: [] } }));
    if (mutante === 'sem-share') await context.route(/\/js\/compartilhar\.js/, async (route) => {
      const resposta = await route.fetch();
      const corpo = await resposta.text();
      const novo = corpo.replace("typeof nav?.share === 'function'", 'false');
      if (novo === corpo) throw new Error('MUTANTE sem-share NÃO APLICOU');
      await route.fulfill({ response: resposta, body: novo });
    });
    const page = await context.newPage();
    const entrar = async (caminho) => {
      await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 90000 });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
    };
    const confere = async (rotulo, botao, esperado) => {
      await page.evaluate(() => { window.__shares = []; });
      await page.click(botao);
      await page.waitForTimeout(400);
      const visto = await page.evaluate(async (botao) => ({ shares: window.__shares, rotulo: document.querySelector(botao).textContent, copiado: await navigator.clipboard.readText().catch(() => '') }), botao);
      const url = comShare ? visto.shares[0]?.url : visto.copiado;
      const erros = [];
      if (comShare && visto.shares.length !== 1) erros.push(`Web Share chamado ${visto.shares.length} vez(es)`);
      if (!comShare && visto.rotulo !== 'LINK COPIADO') erros.push(`botão disse "${visto.rotulo}", esperado LINK COPIADO`);
      let u = null; try { u = new URL(url); } catch { erros.push(`URL inválida: ${url}`); }
      if (u && (u.pathname !== esperado.caminho || u.searchParams.get('utm_medium') !== esperado.ponto || u.searchParams.get('utm_source') !== 'compartilhar')) erros.push(`URL ${url}`);
      if (u && esperado.map && !u.searchParams.get('map')) erros.push('fim de partida sem o mapa');
      if (comShare && esperado.texto && !esperado.texto.test(visto.shares[0]?.text || '')) erros.push(`texto "${visto.shares[0]?.text}"`);
      if (erros.length) falhas.push(`${nome} ${rotulo}: ${erros.join('; ')}`); else ok(`${nome} ${rotulo}: ${url}`);
    };
    await entrar('/?tela=vitoria');
    if (fotos) await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); }).then(() => page.screenshot({ path: `${fotos}/${nome}_fim_de_partida.png` }));
    await confere('fim de partida', '#btn-share-match', { caminho: '/', ponto: 'fim-de-partida', map: true, texto: /^Ganhei uma treta em / });
    await entrar('/?secao=ranking');
    await confere('ranking', '#hub-rank-share', { caminho: '/comunidade/ranking', ponto: 'ranking' });
    if (fotos) await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); }).then(() => page.screenshot({ path: `${fotos}/${nome}_ranking.png` }));
    await context.close();
  }
} catch (erro) {
  falhas.push(`parou: ${erro.message.split('\n')[0]}`);
} finally {
  await browser.close();
}
for (const f of falhas) console.error(`✗ ${f}`);
console.log(`Compartilhar no navegador: ${falhas.length ? 'FAIL' : 'PASS'}${mutante ? ` (mutante ${mutante})` : ''}`);
process.exitCode = falhas.length ? 1 : 0;

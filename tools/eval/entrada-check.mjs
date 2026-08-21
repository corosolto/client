#!/usr/bin/env node
/* ============================================================================
   entrada-check.mjs — O GESTO QUE ENTRA NO JOGO NÃO APERTA BOTÃO DO MENU
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido no runner do #368, 20/08/2026)
   O smoke ficou 15 min preso clicando em MATA-MATA e morreu com "element is not
   visible". O trace do CI mostra a causa ANTES do clique do teste: o botão JOGAR
   já estava `aria-expanded="true" class="cs-item is-open"`. Ou seja, a tecla que
   tirou a splash VAZOU para o menu por baixo e apertou o item que tinha acabado
   de receber foco (`focusMenu` roda 120 ms depois de `dismissSplash`); o clique
   seguinte — do teste ou do jogador — FECHOU o submenu em vez de abrir.

   Em máquina rápida a ordem dos eventos esconde isso. Em máquina lenta (o runner,
   e o hardware de 98% das sessões abaixo de 30 FPS) ela aparece: o jogador aperta
   uma tecla para entrar e o menu responde sozinho — a primeira interação do funil
   inteiro fica mentindo.

   O QUE ELA MEDE (navegador de verdade, sem simulação)
   Reproduz a ordem hostil de propósito: com a splash pronta, põe o foco no 1º item
   do menu e manda o Enter REAL. Depois disso:
   (a) a splash TEM de sair (o conserto não pode prender o jogador lá);
   (b) nenhum item do menu pode ter sido ativado — `aria-expanded` false,
       sem `aria-current`, submenu `hidden`, nenhum painel aberto.

   Mutante `sem-guarda` tira a guarda do main.js servido: ENTRADA1b tem de acender.

   Uso: node tools/eval/entrada-check.mjs [--mutante=sem-guarda] [--porta=8131]
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
const PORTA = arg('porta') || '8131';
const BASE = `http://127.0.0.1:${PORTA}`;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
const vivo = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return true; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};
if (!(await vivo())) { console.log(`  \x1b[31m✗\x1b[0m ENTRADA1 servidor não subiu na ${PORTA} (porta ocupada?)`); process.exit(1); }

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

if (MUT === 'sem-guarda') {
  // desfaz o conserto NO ARQUIVO SERVIDO: a guarda de entrada some, o resto fica igual
  await page.route('**/js/main.js*', async (rota) => {
    const r = await rota.fetch();
    let corpo = await r.text();
    corpo = corpo
      .replace(/e\?\.preventDefault\?\.\(\);\s*e\?\.stopPropagation\?\.\(\);/, '')
      .replace(/if \(performance\.now\(\) - _entradaEm < ENTRADA_MS\) return;/, '');
    await rota.fulfill({ status: 200, contentType: 'application/javascript', body: corpo });
  });
}

const falhas = [];
try {
  await page.goto(`${BASE}/?debug=1&assetcheck=1`, { waitUntil: 'load', timeout: 180000 });
  await page.locator('#splash-enter').waitFor({ state: 'visible', timeout: 90000 });
  // a ordem hostil do runner lento, forçada: o foco já está no menu quando a tecla chega
  await page.evaluate(() => document.querySelector('.cs-item[data-act="jogar"]')?.focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  const estado = await page.evaluate(() => ({
    splash: !!document.getElementById('boot-splash'),
    subHidden: document.getElementById('cs-modos')?.hidden,
    expanded: document.querySelector('.cs-item[data-act="jogar"]')?.getAttribute('aria-expanded'),
    ativados: [...document.querySelectorAll('.cs-item[aria-current="true"], .cs-item.is-open')].map((b) => b.dataset.act),
    paineis: [...document.querySelectorAll('#settings-panel,#howto-panel,#feedback-panel,#ranking-panel')]
      .filter((p) => !p.classList.contains('hidden')).map((p) => p.id),
  }));

  if (estado.splash) falhas.push('ENTRADA1a a splash NÃO saiu com o gesto de entrada (jogador preso na porta)');
  if (estado.subHidden === false || estado.expanded === 'true' || estado.ativados.length)
    falhas.push(`ENTRADA1b o gesto de entrada APERTOU o menu por baixo (ativados: ${estado.ativados.join(',') || 'submenu aberto'})`);
  if (estado.paineis.length)
    falhas.push(`ENTRADA1b o gesto de entrada ABRIU painel sozinho (${estado.paineis.join(',')})`);
} catch (e) {
  falhas.push(`ENTRADA1 não deu para medir: ${String(e).split('\n')[0]}`);
}

await browser.close();
srv.kill();
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m ENTRADA1 o gesto que entra tira a splash e NÃO aperta nada no menu');
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length ? 1 : 0);

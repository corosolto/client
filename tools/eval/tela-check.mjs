#!/usr/bin/env node
/* ============================================================================
   tela-check.mjs — TEMPO ATÉ O JOGADOR VER O ELENCO NA TELA
   ----------------------------------------------------------------------------
   POR QUE EXISTE (22/08/2026, custou dois PRs reprovados pelo dono)
   Duas vezes seguidas uma régua minha aprovou mudança que o dono reprovou jogando, porque ela
   media a grandeza VIZINHA e não o defeito:
     · #413 media desvio angular de keyframe; o que quebrou foi CONTATO DE PÉ (boneco deslizando);
     · #417 media VRAM; o que quebrou foi TEMPO DE TELA (KTX2 transcodifica na CPU, e a tela de
       personagens carrega o elenco inteiro de uma vez).
   VRAM e bytes são baratos de medir e por isso sedutores. O que o jogador sente é o relógio.

   O QUE MEDE (navegador de verdade, com os GLBs reais via ?assetcheck=1)
   TELA1 milissegundos do clique no time até a PRIMEIRA linha do elenco aparecer.

   PROCEDÊNCIA DO TETO — não é chute, e essa é a lição das duas reprovações:
   a medição varia sozinha ±8% (4 corridas na main: 6083, 6607, 6854, 7086 ms). O teto de
   9300 ms é ~1,4× a mediana: cinco vezes o ruído observado, e bem abaixo do 12557 ms que o
   KTX2 no elenco produziu (1,9×). Ou seja: passa ruído, morde regressão real.

   Mutante `lento` estrangula a CPU em 4× via CDP — a régua tem de acender.
   Uso: node tools/eval/tela-check.mjs [--mutante=lento] [--porta=8155]
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && MUT !== 'lento') throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8155';
const BASE = `http://127.0.0.1:${PORTA}`;
const TETO_MS = 9300;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
if (MUT === 'lento') await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });

const falhas = [];
let ms = null, linhas = 0;
try {
  await page.goto(`${BASE}/?debug=1&assetcheck=1`, { waitUntil: 'load', timeout: 180000 });
  await page.locator('#splash-enter').waitFor({ state: 'visible', timeout: 90000 });
  await page.keyboard.press('Enter');
  await page.locator('#boot-splash').waitFor({ state: 'detached', timeout: 30000 });
  await page.locator('.cs-item[data-act="jogar"]').click();
  await page.locator('.cs-item[data-act="sp"]').click();
  await page.locator('#ms-continue').click();
  await page.locator('#nick-input').fill('MED');
  await page.locator('#profile-ok').click();
  await page.locator('#btn-jogar').click();
  const t0 = Date.now();
  await page.locator('#btn-team-e').click();
  for (let i = 0; i < 80 && ms === null; i++) {
    linhas = await page.locator('#char-list .char-row').count();
    if (linhas > 0) ms = Date.now() - t0; else await page.waitForTimeout(500);
  }
} catch (e) {
  falhas.push(`TELA não deu para medir: ${String(e).split('\n')[0]}`);
}

if (ms === null && !falhas.length) falhas.push(`TELA1 o elenco NÃO apareceu em 40 s — a tela não funciona`);
else if (ms !== null && ms > TETO_MS) falhas.push(`TELA1 elenco levou ${ms} ms para aparecer (teto ${TETO_MS})`);

console.log(`  TELA1 primeira linha do elenco: ${ms === null ? 'não apareceu' : ms + ' ms'} (teto ${TETO_MS}) · ${linhas} linhas`);
await browser.close();
srv.kill();
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m TELA elenco na tela dentro do tempo medido na main');
/* Mesma forma do telemetry-check: ANUNCIA e só então empurra na lista. Anunciar
   depois do laço que imprime as falhas deixava o aviso mudo, e sair por
   `falhas.length` — zero por definição no caso cego — saía VERDE (MC1). */
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);

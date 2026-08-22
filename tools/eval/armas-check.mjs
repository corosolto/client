#!/usr/bin/env node
/* ============================================================================
   armas-check.mjs — A PARTIDA CARREGA AS ARMAS DELA, E NENHUM BOT SEGURA CAIXA
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido em 21/08/2026)
   `preloadWeapons()` baixava as 26 armas, BLOQUEANDO, antes de construir o Game — 7,5 MB de
   download e ~164 MB de VRAM para uma partida que usa ~9. Era a mesma doença do elenco, que o
   #368 já tinha curado nos personagens e ninguém tinha olhado nas armas.

   O QUE ELA NÃO PODE DEIXAR PASSAR
   Cortar o preload é fácil; cortar E deixar bot empunhando CAIXA procedural é trocar espera por
   feiura. `weaponModel()` cai em `buildRifle()` quando o GLB não está em memória, e isso não
   aparece em erro nenhum — some calado dentro da cena. Por isso ARM2 cobra a cena, não o código.

   O QUE MEDE (jogo real, ?auto=, rede de verdade)
   ARM1 GLBs de arma no preload BLOQUEANTE <= TETO (12). Janela: do goto até `window.__game`
        existir — o Game só nasce depois do `await` do preload. Antes do conserto: 26.
   ARM2 todo bot em campo tem arma com malha GLB (zero caixa procedural).
   ARM3 o resto das armas CHEGA em ocioso — sem isso, o drop do chão no meio da partida vira
        caixa. Sonda até 60 s; o contrato é existência, não velocidade.

   Mutantes (kill-switches reais do jogo): sem-lazy (?armaslazy=0) acende ARM3.
   Uso: node tools/eval/armas-check.mjs [--mutante=sem-lazy] [--porta=8137]
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && MUT !== 'sem-lazy') throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8137';
const BASE = `http://127.0.0.1:${PORTA}`;
const TETO = 12;

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
const ARMA_GLB = /\/models\/weapons\/([a-z0-9-]+)\.glb/;
const pedidas = [];
page.on('request', (r) => { const m = ARMA_GLB.exec(r.url()); if (m) pedidas.push({ id: m[1], t: Date.now() }); });

const falhas = [];
try {
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta${MUT === 'sem-lazy' ? '&armaslazy=0' : ''}`,
    { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  const bloqueante = new Set(pedidas.map((p) => p.id)).size;

  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  /* glbchars nomeia a peça: 'arma-glb' quando o GLB entrou, 'arma-caixa' no fallback. */
  const cena = await page.evaluate(() => {
    const g = window.__game;
    const semGlb = g.bots.filter((b) => b.mesh?.group?.getObjectByName('arma-caixa')).map((b) => b.weapon);
    return { bots: g.bots.length, semGlb: [...new Set(semGlb)] };
  });

  let esperou = 0, total = new Set(pedidas.map((p) => p.id)).size;
  while (total < 20 && esperou < 60000) {
    await page.waitForTimeout(2000); esperou += 2000;
    total = new Set(pedidas.map((p) => p.id)).size;
  }

  console.log(`  ARM1 armas no bloqueante (<= ${TETO}): ${bloqueante}  ${bloqueante <= TETO ? 'OK' : 'FALHOU'}`);
  console.log(`  ARM2 bots com arma de caixa (== 0):  ${cena.semGlb.length} de ${cena.bots} bots${cena.semGlb.length ? ` — ${cena.semGlb.join(', ')}` : ''}`);
  console.log(`  ARM3 armas carregadas ao todo:       ${total} em ${(esperou / 1000).toFixed(0)}s`);
  if (bloqueante > TETO) falhas.push(`ARM1 preload bloqueante com ${bloqueante} armas (teto ${TETO})`);
  if (cena.semGlb.length) falhas.push(`ARM2 ${cena.semGlb.length} bot(s) empunhando caixa: ${cena.semGlb.join(', ')}`);
  if (total <= bloqueante) falhas.push(`ARM3 carga tardia não chegou: parou em ${total} armas`);
} catch (e) {
  falhas.push(`ARM não deu para medir: ${String(e).split('\n')[0]}`);
}

await browser.close();
srv.kill();
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m ARM partida carrega as armas dela, nenhum bot com caixa e o resto chega em ocioso');
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length ? 1 : 0);

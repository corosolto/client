#!/usr/bin/env node
/* vm-troca-sem-legado-browser.mjs — a 1ª troca para a secundária não mostra o legado.
   Playtest 06/11: a PT-38 abria o viewmodel antigo e só depois o autorado com a mão,
   porque o pacote da secundária só era montado na troca. O jogo agora monta oculto
   (prime) a primária e a secundária do inventário. Navegador real, catálogo local.
   Uso: node tools/eval/vm-troca-sem-legado-browser.mjs [--porta=9177] [--mutante=sem-prime] */
import assert from 'node:assert/strict';
import * as P from './lib/vm-palco.mjs';

const arg = (n, d = '') => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const MUTANTE = arg('mutante');
if (MUTANTE && MUTANTE !== 'sem-prime') throw new Error(`mutante desconhecido: ${MUTANTE}`);
const srv = await P.subirServidor(arg('porta', '9177'));
const browser = await P.abrirNavegador();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
  const qs = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', perfilauto: '0', economia: '0',
    ...(MUTANTE === 'sem-prime' ? { vmprime: '0' } : {}) });
  await page.goto(`${srv.base}/?${qs}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game.vm?.authored, null, { timeout: 240000 });
  // Primária m4 em mãos, secundária deagle nunca usada: só o prime pode montá-la antes da troca.
  await page.evaluate(() => {
    const g = window.__game;
    g.player.primary = 'm4'; g.player.secondary = 'deagle';
    g._switchWeapon('m4');
  });
  if (!MUTANTE) await page.waitForFunction(() => window.__game._vmVisibility?.authored === true, null, { timeout: 120000 });
  await page.waitForFunction((mut) => mut || Boolean(window.__game.vm.authored.entry('deagle')), MUTANTE, { timeout: 120000 });
  await page.waitForTimeout(MUTANTE ? 3000 : 300);
  // O estado no instante da troca decide o próximo render: sem pacote montado, o legado
  // entra antes de qualquer quadro (o nº de quadros depois varia com a máquina).
  const { troca, quadros } = await page.evaluate(() => new Promise((resolve) => {
    const g = window.__game, amostras = [];
    g._switchWeapon('deagle');
    const v0 = g._vmVisibility || {};
    const troca = { legado: Boolean(v0.fallback), autorado: Boolean(v0.authored) };
    const passo = () => {
      const v = g._vmVisibility || {};
      amostras.push({ legado: Boolean(v.fallback), autorado: Boolean(v.authored) });
      if (amostras.length >= 90) resolve({ troca, quadros: amostras }); else requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }));
  const legado = quadros.filter((q) => q.legado).length;
  console.log(JSON.stringify({ mutante: MUTANTE || null, troca, quadros: quadros.length, legado, autoradoNoFim: quadros.at(-1).autorado, erros }));
  if (MUTANTE) {
    assert.ok(troca.legado && !troca.autorado, 'mutante sem-prime já tinha o autorado na troca: a régua não morde');
    console.log('✓ mutante sem-prime reprovado: sem prime a troca entra no legado');
  } else {
    assert.deepEqual(erros, [], 'erros de página');
    assert.ok(troca.autorado && !troca.legado, `na troca o autorado não estava pronto: ${JSON.stringify(troca)}`);
    assert.equal(legado, 0, `1ª troca para a secundária mostrou o legado em ${legado} quadro(s)`);
    assert.ok(quadros.at(-1).autorado, 'a secundária não terminou no viewmodel autorado');
    console.log('✓ 1ª troca para a secundária vai direto ao autorado, sem o legado');
  }
} finally {
  await browser.close();
  srv.kill();
}

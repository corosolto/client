#!/usr/bin/env node
/* vm-troca-sem-legado-browser.mjs — a 1ª troca para a secundária não mostra o legado.
   Playtest 06/11: a PT-38 abria o viewmodel antigo e só depois o autorado com a mão,
   porque o pacote da secundária só era montado na troca. O jogo agora monta oculto
   (prime) a primária e a secundária do inventário. Navegador real, catálogo local.
   Uso: node tools/eval/vm-troca-sem-legado-browser.mjs [--porta=9177] [--mutante=sem-prime]
   EGO_TASK_SPACE=<id> EGO_PAGE=p1 usa uma página vazia própria no Ego, sem lançar outro Chromium. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as P from './lib/vm-palco.mjs';

const arg = (n, d = '') => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const MUTANTE = arg('mutante');
if (MUTANTE && MUTANTE !== 'sem-prime') throw new Error(`mutante desconhecido: ${MUTANTE}`);

async function medirTroca(page, { url, mutante }) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game.vm?.authored, null, { timeout: 240000 });
  // Primária m4 em mãos, secundária deagle nunca usada: só o prime pode montá-la antes da troca.
  await page.evaluate(() => {
    const g = window.__game;
    g.player.primary = 'm4'; g.player.secondary = 'deagle';
    g._switchWeapon('m4');
  });
  if (!mutante) {
    await page.waitForFunction(() => window.__game._vmVisibility?.authored === true, null, { timeout: 120000 });
    await page.waitForFunction(() => Boolean(window.__game.vm.authored.entry('deagle')), null, { timeout: 120000 });
  }
  await page.waitForTimeout(mutante ? 3000 : 300);
  // O estado no instante da troca decide o próximo render: sem pacote montado, o legado
  // entra antes de qualquer quadro (o nº de quadros depois varia com a máquina).
  return page.evaluate(() => new Promise((resolve) => {
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
}

function medirNoEgo(space, label, input) {
  const comando = `
const { space, label, input } = ${JSON.stringify({ space, label, input })};
const profile = (await listTaskSpaces()).find(s => s.id === space);
if (profile?.ownership !== 'agent' || !['rubenmarcus.dev','ruben marcus'].includes(profile.profileName?.toLowerCase())) {
  throw Error('TaskSpace Ego deve pertencer ao agente no perfil CORO SOLTO');
}
const task = await taskSpace(space);
const tab = (await task.tabs()).find(t => t.label === label);
if (tab?.openedBy !== 'agent' || !['about:blank','chrome://newtab/'].includes(tab.url)) {
  throw Error('Use uma página vazia aberta pelo agente nesta tarefa');
}
const page = task.page(label);
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
try {
  await page.cdp('Runtime.enable');
  await page.events();
  const medida = await (${medirTroca.toString()})(page, input);
  const erros = (await page.events()).filter(e => e.method === 'Runtime.exceptionThrown').map(e => {
    const d = e.params.exceptionDetails;
    return String(d.exception?.description || d.text).split('\\n')[0].slice(0, 200);
  });
  console.log('VM_TROCA_EGO=' + JSON.stringify({ ...medida, erros }));
} finally {
  await page.goto('about:blank');
  await page.cdp('Emulation.clearDeviceMetricsOverride');
  await page.cdp('Runtime.disable');
}
`;
  const run = spawnSync('ego-browser', ['nodejs'], { input: comando, encoding: 'utf8', timeout: 630000, maxBuffer: 4 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  if (run.error || run.status !== 0) throw Error(`Ego falhou: ${run.error?.message || output.trim().slice(-1800)}`);
  const receipt = output.split('\n').find(line => line.startsWith('VM_TROCA_EGO='));
  if (!receipt) throw Error('Ego não devolveu o recibo da troca');
  return JSON.parse(receipt.slice('VM_TROCA_EGO='.length));
}

const ego = Object.hasOwn(process.env, 'EGO_TASK_SPACE');
const space = Number(process.env.EGO_TASK_SPACE);
const label = process.env.EGO_PAGE ?? 'p1';
if (ego && (!Number.isSafeInteger(space) || space <= 0 || !/^p\d+$/.test(label))) {
  throw Error('EGO_TASK_SPACE deve ser inteiro positivo e EGO_PAGE deve ser pN');
}
const srv = await P.subirServidor(arg('porta', ego && MUTANTE ? '9178' : '9177'));
let browser;
try {
  const qs = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', perfilauto: '0', economia: '0',
    ...(MUTANTE === 'sem-prime' ? { vmprime: '0' } : {}) });
  const input = { url: `${srv.base}/?${qs}`, mutante: MUTANTE };
  let medida;
  if (ego) {
    medida = medirNoEgo(space, label, input);
  } else {
    browser = await P.abrirNavegador();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
    medida = { ...await medirTroca(page, input), erros };
  }
  const { troca, quadros, erros } = medida;
  const legado = quadros.filter((q) => q.legado).length;
  assert.equal(quadros.length, 90, 'a troca não devolveu os 90 quadros');
  console.log(JSON.stringify({ navegador: ego ? 'ego' : 'playwright', mutante: MUTANTE || null, troca, quadros: quadros.length, legado, autoradoNoFim: quadros.at(-1).autorado, erros }));
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
  try { await browser?.close(); } finally { srv.kill(); }
}

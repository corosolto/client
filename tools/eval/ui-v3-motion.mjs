#!/usr/bin/env node
/* ============================================================================
ui-v3-motion.mjs — O MOVIMENTO OBEDECE AO MAPA DA TELA 39?

POR QUE EXISTE (22/10/2026)
O movimento nasceu espalhado: 24 `@keyframes` em três lugares, cada tela com a
sua duração, e nenhum dono. O mapa `design/treta-pop-2026-10-14/telas/
39-transicoes-mapa.html` diz que cada troca tem um tipo e uma duração; sem régua,
a próxima tela inventa a sua e ninguém percebe até o dono ver o corte seco.

O QUE ELE MEDE, no navegador de verdade:
  MV1  o módulo liga em ?ui=v3 e marca a raiz
  MV2  os 4 overlays do HUD (morte, round, placar, pausa) viram animáveis
  MV3  overlay entra em 180 e sai em 280, pelos tokens (não por número solto)
  MV4  o placar do topo fica ACIMA de qualquer overlay (regra do pacote)
  MV5  a cortina de cena existe, é lima e inclinada
  MV6  toast usa o `.tp-toasts` do kit, sai sozinho e nunca vira modal
  MV7  com movimento reduzido não há cortina nem deslocamento
  MV8  ?ui=legacy continua sem nada disto

Uso:
  node tools/eval/ui-v3-motion.mjs              # mede
  node tools/eval/ui-v3-motion.mjs --mutantes   # prova que cada cláusula morde
============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9486';
const SO = process.env.SO || '';
const quer = (...ids) => !SO || ids.some((id) => SO === id);

/* Mutante reescreve o que o SERVIDOR entrega. Glob em vez de regex: a folha vem
   com `?v=<hash>` e o regex cru deixava três mutantes passarem cegos. */
const MUTANTES = {
  'sem-modulo': ['**/js/tp/ligar.js*', (t) => t.replace("import { ligar as movimento } from '../ui-motion.js';", 'const movimento = () => {};')],
  'overlay-seco': ['**/css/tp/motion.css*', (t) => t.replace(/transition:opacity var\(--tp-d-painel\)[^;]*;/g, '')],
  'placar-coberto': ['**/css/tp/motion.css*', (t) => t.replace('#hud-top{z-index:60}', '#hud-top{z-index:1}')],
  'cortina-reta': ['**/css/tp/motion.css*', (t) => t.replace(/rotate\(-14deg\)/g, 'rotate(0deg)')],
  'duracao-solta': ['**/css/tp/motion.css*', (t) => t.replace(/var\(--tp-d-cena\) var\(--tp-ease-cena\)/g, '900ms linear')],
};

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default.chromium;

const casos = [];
const add = (id, ok, msg) => casos.push({ id, ok, msg });

async function abrir(browser, { legado = false, reduzido = false, mutante = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  if (reduzido) await page.emulateMedia({ reducedMotion: 'reduce' });
  if (mutante) {
    const [alvo, troca] = MUTANTES[mutante];
    await page.route(alvo, async (rota) => {
      const res = await rota.fetch();
      rota.fulfill({ response: res, body: troca(await res.text()) });
    });
  }
  await page.addInitScript(() => {
    localStorage.setItem('cs_treta_intro', 'v1');
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
  });
  await page.goto(`${BASE}/?ui=${legado ? 'legacy' : 'v3'}&lang=pt`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6000);
  return page;
}

const medir = (page) => page.evaluate(() => {
  const raiz = document.documentElement;
  const alvo = (id) => document.getElementById(id);
  const ids = ['respawn-overlay', 'round-banner', 'scoreboard', 'pause-menu'];
  const vestidos = ids.filter((id) => alvo(id)?.classList.contains('tp-overlay'));
  /* Duração vem do token, então medimos o token resolvido e a transição aplicada. */
  const sb = alvo('scoreboard');
  const estiloEscondido = sb ? getComputedStyle(sb) : null;
  const tokens = {
    rapido: getComputedStyle(raiz).getPropertyValue('--tp-d-rapido').trim(),
    painel: getComputedStyle(raiz).getPropertyValue('--tp-d-painel').trim(),
    cena: getComputedStyle(raiz).getPropertyValue('--tp-d-cena').trim(),
    mov: getComputedStyle(raiz).getPropertyValue('--tp-mov').trim(),
  };
  const zIndex = (sel) => {
    const el = document.querySelector(sel);
    return el ? Number(getComputedStyle(el).zIndex) || 0 : null;
  };
  return {
    ligou: raiz.dataset.tpMotion === '1',
    vestidos,
    saiEm: estiloEscondido?.transitionDuration || '',
    display: estiloEscondido?.display || '',
    tokens,
    zTopo: zIndex('#hud-top'),
    zOverlay: sb ? Number(getComputedStyle(sb).zIndex) || 0 : null,
  };
});

/* Lê a folha SERVIDA pela própria página: lendo do disco, o mutante que altera
   a resposta do servidor passava cego e a cláusula não provava nada. */
const cortinaServida = (page) => page.evaluate(async () => {
  const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /css\/tp\/motion\.css/.test(l.href));
  if (!link) return null;
  const css = await fetch(link.href).then((r) => r.text());
  return {
    lima: /\.tp-cortina\{[^}]*var\(--tp-lima\)/.test(css),
    inclinada: /\.tp-cortina\{[^}]*rotate\(-1[0-9]deg\)/.test(css),
    porToken: /var\(--tp-d-cena\) var\(--tp-ease-cena\)/.test(css),
    semCortinaReduzido: /data-motion="reduzido"\] \.tp-cortina\{display:none\}/.test(css)
      && /prefers-reduced-motion[\s\S]{0,160}\.tp-cortina\{display:none\}/.test(css),
  };
});

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const mutante = process.argv.includes('--mutantes') ? (process.env.MUT || '') : '';
try {
  const page = await abrir(browser, { mutante });
  const m = await medir(page);
  const folha = (await cortinaServida(page)) || { lima: false, inclinada: false, porToken: false, semCortinaReduzido: false };

  if (quer('MV1')) add('MV1', m.ligou, m.ligou ? 'módulo de movimento ligado em ?ui=v3' : 'módulo não ligou (data-tp-motion ausente)');
  if (quer('MV2')) add('MV2', m.vestidos.length === 4, `${m.vestidos.length}/4 overlays animáveis: ${m.vestidos.join(', ') || 'nenhum'}`);
  if (quer('MV3')) {
    const ok = m.tokens.rapido === '180ms' && m.tokens.painel === '280ms' && m.tokens.cena === '480ms'
      && /0\.28s|280ms/.test(m.saiEm) && folha.porToken;
    add('MV3', ok, `tokens ${m.tokens.rapido}/${m.tokens.painel}/${m.tokens.cena}; saída do placar ${m.saiEm || 'sem transição'}`);
  }
  if (quer('MV4')) {
    /* Camada, não pixel: o overlay tem z própria (50) e o placar do topo tem de
       ficar acima dela. Medir pixel no lobby pegava o canvas, não a regra. */
    const ok = m.zOverlay >= 50 && m.zTopo > m.zOverlay;
    add('MV4', ok, `placar do topo z=${m.zTopo} sobre overlay z=${m.zOverlay}`);
  }
  if (quer('MV5')) add('MV5', folha.lima && folha.inclinada, `cortina lima=${folha.lima} inclinada=${folha.inclinada}`);
  if (quer('MV6')) {
    const r = await page.evaluate(async () => {
      const mod = await import('/js/ui-motion.js');
      mod.toast('prova de régua', { tempo: 300 });
      await new Promise((ok) => setTimeout(ok, 60));
      const host = document.querySelector('.tp-toasts');
      const vivo = !!host?.querySelector('.tp-toast[data-visivel]');
      const modal = !!document.querySelector('dialog[open] .tp-toast');
      await new Promise((ok) => setTimeout(ok, 900));
      return { vivo, modal, sobrou: host?.querySelectorAll('.tp-toast').length ?? -1 };
    });
    add('MV6', r.vivo && !r.modal && r.sobrou === 0, `toast apareceu=${r.vivo}, virou modal=${r.modal}, sobrou=${r.sobrou}`);
  }
  await page.close();

  if (quer('MV7')) {
    const pr = await abrir(browser, { reduzido: true, mutante });
    const mr = await pr.evaluate(() => ({
      mov: getComputedStyle(document.documentElement).getPropertyValue('--tp-mov').trim(),
      painel: getComputedStyle(document.documentElement).getPropertyValue('--tp-d-painel').trim(),
    }));
    add('MV7', mr.mov === '0' && mr.painel === '120ms' && folha.semCortinaReduzido,
      `reduzido: mov=${mr.mov} painel=${mr.painel} cortina escondida=${folha.semCortinaReduzido}`);
    await pr.close();
  }

  if (quer('MV8')) {
    const pl = await abrir(browser, { legado: true, mutante });
    const ml = await pl.evaluate(() => ({
      ligou: document.documentElement.dataset.tpMotion === '1',
      vestidos: ['respawn-overlay', 'round-banner', 'scoreboard', 'pause-menu']
        .filter((id) => document.getElementById(id)?.classList.contains('tp-overlay')).length,
    }));
    add('MV8', !ml.ligou && ml.vestidos === 0, `legado: módulo ligou=${ml.ligou}, overlays vestidos=${ml.vestidos}`);
    await pl.close();
  }
} finally {
  await browser.close();
}

let sair = 0;
for (const c of casos) {
  if (mutante) console.log(`${c.ok ? 'CEGO ' : 'MORDE'} ${c.id} (${mutante}) ${c.msg}`);
  else { console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id} ${c.msg}`); if (!c.ok) sair = 1; }
}
if (mutante) {
  const cegos = casos.filter((c) => c.ok).length;
  console.log(`mutante ${mutante}: ${casos.length - cegos}/${casos.length} mordem`);
  process.exit(cegos === casos.length ? 1 : 0);
}
console.log(`movimento v3: ${casos.filter((c) => c.ok).length}/${casos.length}`);
process.exit(sair);

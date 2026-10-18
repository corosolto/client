#!/usr/bin/env node
/* Régua do splash Treta Pop (tela 01 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9417 node tools/eval/ui-v3-splash.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/ui-v3-splash). Um navegador por vez. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://127.0.0.1:9417';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-splash';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720], [844, 390]];
/* Letras do logo em cada public/img/loading-N.webp (1664×936), em fração da arte: x0..x1 e topo,
   com meio ponto de margem. Medidas por pixel em recortes ampliados com régua de 1% (15/10/2026);
   a primeira leitura a olho errou 3 pontos e deixou o "A" de TRETA cortado na arte 1. */
const LOGO = { 1: [0.70, 0.94, 0.09], 2: [0.72, 0.945, 0.09], 3: [0.73, 0.945, 0.08], 4: [0.71, 0.955, 0.08], 5: [0.72, 0.95, 0.08], 6: [0.06, 0.24, 0.055] };
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Mutantes reescrevem o HTML ou o CSS servido; cada um prova que aplicou. */
async function preparar(page, mutante) {
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  if (mutante === 'arte-contain') await reescreve(/\/style\.css/, (t) => t.replace('--tp-splash-ajuste:cover', '--tp-splash-ajuste:contain'));
  if (mutante === 'etapa-mentirosa') await reescreve((u) => u.pathname === '/', (t) => t.replace('data-etapa="personagem"', 'data-etapa="personagem" data-feito'));
  if (mutante === 'foco-centrado') await reescreve(/\/style\.css/, (t) => t.replace("loading-3.webp');--tp-splash-foco:75% 25%", "loading-3.webp');--tp-splash-foco:50% 25%"));
  if (mutante === 'pelicula') await reescreve(/\/style\.css/, (t) => t.replace('#tp-splash-jogar[data-auto-foco]:focus-visible::after{opacity:0}', ''));
  if (mutante === 'salta') await reescreve(/\/style\.css/, (t) => t.replace('.tp-splash [data-vazio]{visibility:hidden}', '.tp-splash [data-vazio]{display:none}'));
  if (mutante === 'degrade-baixo') await reescreve(/\/style\.css/, (t) => t.replace('rgba(9,7,4,0) 15%,rgba(9,7,4,.82) 50%', 'rgba(9,7,4,0) 50%,rgba(9,7,4,.82) 82%'));
  if (mutante === 'arena-sem-tr') await reescreve(/\/js\/i18n\.js/, (t) => t.replace("'ARENA PRONTA': 'ARENA READY',", ''));
}

async function medir(mutante = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

  /* SP1/SP2: primeiro quadro sem nenhum módulo JS (só HTML, CSS e os scripts inline do <head>). */
  const cru = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await preparar(cru, mutante);
  await cru.route(/\/js\/.*\.js/, (rt) => rt.abort());
  await cru.goto(`${BASE}/`, { waitUntil: 'load', timeout: 120000 });
  await cru.waitForTimeout(800);
  const f0 = await cru.evaluate(() => {
    const s = document.getElementById('boot-splash');
    const cs = s && getComputedStyle(s, '::after');
    const jogar = document.getElementById('tp-splash-jogar');
    /* vírgula só separa camada fora de parênteses: o gradiente tem rgba() aninhado */
    const camadas = []; let fundo = 0, atual = '';
    for (const ch of cs?.backgroundImage || '') {
      if (ch === '(') fundo++; else if (ch === ')') fundo--;
      if (ch === ',' && !fundo) { camadas.push(atual); atual = ''; } else atual += ch;
    }
    camadas.push(atual);
    const iArte = camadas.findIndex((c) => /loading-\d\.webp/.test(c));
    const tamanhos = (cs?.backgroundSize || '').split(',').map((t) => t.trim());
    return {
      arte: iArte >= 0 ? camadas[iArte] : '', ajuste: iArte >= 0 ? (tamanhos[iArte] || '') : '',
      nEtapas: document.querySelectorAll('.tp-splash__etapas [data-etapa]').length,
      jogarVisivel: !!jogar?.checkVisibility?.(), jogarDesligado: !!jogar?.disabled, jogarTopo: jogar?.getBoundingClientRect().top ?? -1,
      feitas: [...document.querySelectorAll('.tp-splash__etapas [data-feito]')].map((e) => e.dataset.etapa),
    };
  });
  mkdirSync(OUT, { recursive: true });
  if (!mutante) await cru.screenshot({ path: `${OUT}/primeiro-quadro.png` });
  await cru.close();
  add('SP1', /loading-\d\.webp/.test(f0.arte) && f0.jogarVisivel && f0.jogarDesligado,
    `primeiro quadro sem JS: arte ${(f0.arte.match(/loading-\d\.webp/) || ['ausente'])[0]}, JOGAR ${f0.jogarVisivel ? 'visível' : 'ausente'}${f0.jogarDesligado ? ' e desligado' : ''}`);
  /* Tarja: o legado desenha a arte com contain e sobra faixa nas laterais ou no topo. */
  add('SP2', f0.ajuste === 'cover', `camada da arte no primeiro quadro: ${f0.ajuste || 'sem arte'} (quer cover)`);
  add('SP3', f0.nEtapas >= 3 && !f0.feitas.length,
    f0.nEtapas < 3 ? `${f0.nEtapas} etapas no primeiro quadro (quer 3+)` : f0.feitas.length ? `etapa marcada sem sinal: ${f0.feitas.join(', ')}` : `${f0.nEtapas} etapas, nenhuma marcada antes de carregar`);

  /* SP4-SP6: boot real em PT e EN. */
  const vivo = {};
  for (const lang of ['pt', 'en']) {
    const p = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    await preparar(p, mutante);
    await p.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => !document.getElementById('tp-splash-jogar')?.disabled, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(4000);
    vivo[lang] = await p.evaluate(() => {
      const etapas = Object.fromEntries([...document.querySelectorAll('.tp-splash__etapas [data-etapa]')].map((e) => [e.dataset.etapa, e.hasAttribute('data-feito')]));
      const sinais = { lobby: !document.getElementById('splash-enter')?.classList.contains('hidden'), personagem: document.getElementById('char-preview')?.dataset.glb === '1', audio: !!window.__csMusicaPronta };
      const raiz = document.querySelector('.tp-splash');
      const j = document.getElementById('tp-splash-jogar');
      const fundo = [...document.querySelectorAll('.tp-splash__etapas [data-etapa]')].filter((e) => !e.hidden && !e.hasAttribute('data-feito')).map((e) => [e.dataset.etapa, e.hasAttribute('data-fundo')]);
      return { etapas, sinais, fundo, texto: raiz?.innerText || '', foco: document.activeElement?.id || '', jogar: j?.disabled === false,
        topo: j?.getBoundingClientRect().top ?? -1, pelicula: j ? getComputedStyle(j, '::after').opacity : '' };
    });
    if (lang === 'pt' && !mutante) await p.screenshot({ path: `${OUT}/pronto-1536x1024.png` });
    if (lang === 'pt') {
      await p.keyboard.press('Enter');
      await p.waitForTimeout(900);
      vivo.saiu = await p.evaluate(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); });
    }
    await p.close();
  }
  const pt = vivo.pt;
  const mente = Object.keys(pt.sinais).filter((k) => k in pt.etapas && pt.etapas[k] !== pt.sinais[k]);
  add('SP4', Object.keys(pt.etapas).length >= 3 && !mente.length,
    mente.length ? `etapa diverge do sinal: ${mente.map((k) => `${k} marcada=${pt.etapas[k]} sinal=${pt.sinais[k]}`).join(', ')}`
      : `etapas = sinais: ${Object.entries(pt.etapas).map(([k, v]) => `${k}:${v ? 'ok' : 'carregando'}`).join(' ')}`);
  const semAviso = pt.fundo.filter(([, f]) => !f).map(([k]) => k);
  add('SP4b', pt.jogar && !semAviso.length, semAviso.length ? `JOGAR liberado e etapa girando sem "em segundo plano": ${semAviso.join(', ')}` : `pendentes com aviso de segundo plano: ${pt.fundo.map(([k]) => k).join(', ') || 'nenhuma'}`);
  add('SP10', pt.pelicula === '0', `película de hover no JOGAR em repouso: opacidade ${pt.pelicula} (quer 0; 1 clareia o lima para #BDDE47)`);
  add('SP11', f0.jogarTopo > 0 && Math.abs(pt.topo - f0.jogarTopo) <= 2, `topo do JOGAR: ${f0.jogarTopo.toFixed(0)} px no primeiro quadro, ${pt.topo.toFixed(0)} px pronto`);
  add('SP5', pt.jogar && pt.foco === 'tp-splash-jogar' && vivo.saiu,
    `JOGAR ${pt.jogar ? 'ligado' : 'desligado'}, foco em #${pt.foco || '?'}, ENTER ${vivo.saiu ? 'entra' : 'não entra'}`);
  const PT_VAZA = /\b(ARENA PRONTA|CARREGANDO|SEU PERSONAGEM|Você entra|já tenho conta|trocar nick|SOM LIGADO|JOGAR)\b/i;
  const EN_VAZA = /\b(PLAY|LOADING|READY|YOUR CHARACTER|You enter|change nick|SOUND ON)\b/;
  const vazaEn = (vivo.en.texto.match(PT_VAZA) || [])[0];
  const vazaPt = (pt.texto.match(EN_VAZA) || [])[0];
  add('SP6', pt.texto && vivo.en.texto && !vazaEn && !vazaPt, !pt.texto ? 'splash v3 sem texto para medir' : vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : 'PT e EN sem string do outro idioma');

  /* SP7: quatro telas do dono; JOGAR inteiro na tela e sem encostar na dica. */
  const falhas = [], cortes = [], contraste = []; let piorContraste = 99;
  for (const [w, h] of VIEWPORTS) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await preparar(p, mutante);
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForTimeout(2500);
    const g = await p.evaluate(() => {
      const caixa = (sel) => { const e = document.querySelector(sel); if (!e || !e.checkVisibility()) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      return { jogar: caixa('#tp-splash-jogar'), dica: caixa('.tp-splash__dica'), centro: caixa('.tp-splash__centro'), vw: innerWidth, vh: innerHeight };
    });
    if (!mutante) await p.screenshot({ path: `${OUT}/splash-${w}x${h}.png` });
    /* SP9: para cada arte, a janela visível do cover precisa conter as letras do logo. */
    const janelas = await p.evaluate(async () => {
      const raiz = document.documentElement, out = {};
      for (let n = 1; n <= 6; n++) {
        raiz.dataset.splashArte = String(n);
        const cs = getComputedStyle(document.getElementById('boot-splash'), '::after');
        const pos = cs.backgroundPosition.split(',').map((t) => t.trim().split(/\s+/).map(parseFloat));
        const [px, py] = pos[pos.length - 1].map((v) => v / 100);
        const vw = innerWidth, vh = innerHeight, k = Math.max(vw / 1664, vh / 936), W = 1664 * k, H = 936 * k;
        const ox = (vw - W) * px, oy = (vh - H) * py;
        out[n] = { x0: -ox / W, x1: (vw - ox) / W, y0: -oy / H };
      }
      return out;
    });
    if (w === 844) for (let n = 1; n <= 6; n++) {
      await p.evaluate((k) => { document.documentElement.dataset.splashArte = String(k); }, n);
      await p.waitForTimeout(300);
      const b = await p.locator('.tp-splash__topo').boundingBox();
      const { data, info } = await sharp(await p.screenshot({ clip: b })).raw().toBuffer({ resolveWithObject: true });
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const L = (r, g, bb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bb);
      const Lt = L(180, 217, 46), razoes = [];
      for (let i = 0; i < data.length; i += info.channels) {
        const [r, g, bb] = [data[i], data[i + 1], data[i + 2]];
        if (Math.hypot(r - 180, g - 217, bb - 46) < 110 || (r > 200 && g > 200 && bb > 200)) continue;
        const Lb = L(r, g, bb); razoes.push((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05));
      }
      razoes.sort((a, z) => a - z);
      const p10 = razoes[Math.floor(razoes.length * 0.1)] || 0;
      if (p10 < 4.5) contraste.push(`arte ${n}: ${p10.toFixed(1)}:1`);
      piorContraste = Math.min(piorContraste, p10);
    }
    if (!mutante && w === 1536) for (let n = 1; n <= 6; n++) {
      await p.evaluate((k) => { document.documentElement.dataset.splashArte = String(k); }, n);
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/arte-${n}-1536x1024.png` });
    }
    for (const [n, j] of Object.entries(janelas)) {
      const [lx0, lx1, ly0] = LOGO[n];
      if (j.x0 > lx0 || j.x1 < lx1 || j.y0 > ly0) cortes.push(`${w}×${h} arte ${n}: vê ${(j.x0 * 100).toFixed(1)}-${(j.x1 * 100).toFixed(1)}% x, topo ${(j.y0 * 100).toFixed(1)}%; logo ${lx0 * 100}-${lx1 * 100}%, topo ${ly0 * 100}%`);
    }
    await p.close();
    const dentro = g.jogar && g.jogar.l >= 0 && g.jogar.t >= 0 && g.jogar.r <= g.vw && g.jogar.b <= g.vh;
    const cruza = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    if (!dentro) falhas.push(`${w}×${h}: JOGAR fora da tela`);
    if (cruza(g.centro, g.dica)) falhas.push(`${w}×${h}: dica encosta no bloco central`);
  }
  add('SP7', !falhas.length, falhas.length ? falhas.join('; ') : `${VIEWPORTS.map(([w, h]) => `${w}×${h}`).join(', ')}: JOGAR na tela, dica livre`);

  add('SP12', !contraste.length && piorContraste < 99, contraste.length ? `status do carregamento abaixo de 4,5:1 no pior décimo do fundo em 844×390: ${contraste.join(', ')}` : `844×390, 6 artes: pior décimo do fundo dá ${piorContraste.toFixed(1)}:1`);
  add('SP9', !cortes.length, cortes.length ? `logo cortado: ${cortes.join('; ')}` : '6 artes × 4 telas: letras do logo inteiras');

  /* SP8: ?ui=legacy mantém o splash anterior. */
  const leg = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await leg.goto(`${BASE}/?ui=legacy`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await leg.waitForTimeout(1500);
  const vazou = await leg.evaluate(() => !!document.querySelector('.tp-splash')?.checkVisibility());
  await leg.close();
  add('SP8', !vazou, vazou ? 'splash v3 aparece com ?ui=legacy' : '?ui=legacy mantém o splash anterior');
  return r;
}

const MUT = [['arte-contain', 'SP2'], ['etapa-mentirosa', 'SP3'], ['arena-sem-tr', 'SP6'], ['foco-centrado', 'SP9'],
  ['pelicula', 'SP10'], ['salta', 'SP11'], ['degrade-baixo', 'SP12']];
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo] of MUT.filter(([m]) => !process.env.SO || process.env.SO === m)) {
    const c = (await medir(mut)).find((x) => x.id === alvo);
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nsplash v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);

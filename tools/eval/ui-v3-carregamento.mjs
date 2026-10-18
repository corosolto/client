#!/usr/bin/env node
/* Régua do carregamento VS Treta Pop (telas 04, 14 e 20 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9423 node tools/eval/ui-v3-carregamento.mjs [--mutantes]
   Sobe a partida de verdade (?debug=1&auto=) com os GLBs presos: o overlay fica no ar com o elenco sorteado.
   Capturas em OUT (padrão tools/eval/out/ui-v3-carregamento). Um navegador por vez. */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9423';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-carregamento';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
const DICAS = [...readFileSync('public/js/main.js', 'utf8').match(/const _DICAS = \[([\s\S]*?)\];/)[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);

/* a = bots do seu lado, e = bots do outro (o formato livre do jogo); vp = tela */
const CENAS = [
  { id: '4x4-1536x1024', vp: [1536, 1024], a: 3, e: 4 },
  { id: '5x5-1536x1024', vp: [1536, 1024], a: 4, e: 5 },
  { id: '8x8-1536x1024', vp: [1536, 1024], a: 7, e: 8 },
  { id: 'solo-vs-8-1536x1024', vp: [1536, 1024], a: 0, e: 8 },
  { id: 'direita-6x6-1536x1024', vp: [1536, 1024], a: 5, e: 6, lado: 'B' },
  { id: '4x4-1920x1080', vp: [1920, 1080], a: 3, e: 4 },
  { id: '8x8-1920x1080', vp: [1920, 1080], a: 7, e: 8 },
  { id: '5x5-1280x720', vp: [1280, 720], a: 4, e: 5 },
  { id: '8x8-1280x720', vp: [1280, 720], a: 7, e: 8 },
  { id: '4x4-844x390', vp: [844, 390], a: 3, e: 4 },
  { id: '8x8-844x390', vp: [844, 390], a: 7, e: 8 },
  { id: 'en-8x8-1536x1024', vp: [1536, 1024], a: 7, e: 8, lang: 'en' },
  { id: 'en-4x4-844x390', vp: [844, 390], a: 3, e: 4, lang: 'en' },
  { id: 'hoje-1536x1024', vp: [1536, 1024], a: 3, e: 4, legado: true },
  { id: 'hoje-844x390', vp: [844, 390], a: 7, e: 8, legado: true },
  { id: 'vagas-online-1536x1024', vp: [1536, 1024], vagas: true },
];

/* Mutantes reescrevem o JS ou o CSS servido; cada um prova que aplicou. */
const TROCAS = {
  'sem-flag': [/\/js\/main\.js/, "if (document.documentElement.dataset.ui === 'v3') {\n  import('./splash-v3.js')", "{\n  import('./splash-v3.js')"],
  'sem-gancho': [/\/js\/main\.js/, "if (document.documentElement.dataset.ui === 'v3') {\n    window.__tpElenco", "if (false) {\n    window.__tpElenco"],
  'banner-ate-8': [/\/js\/tp\/carregamento\.js/, 'const ATE_BANNER = 5;', 'const ATE_BANNER = 8;'],
  'passo-fixo': [/\/js\/tp\/carregamento\.js/, 'grade: 30 }', 'grade: 60 }'],
  'barra-por-jogador': [/\/js\/tp\/carregamento\.js/, "nm.append(el('span', 'tp-carga__n', p.nome));", "nm.append(el('span', 'tp-carga__n', p.nome), el('span', 'tp-carga__barra'));"],
  'pct-inventado': [/\/js\/tp\/carregamento\.js/, "const pct = document.getElementById('load-pct')?.textContent || '0%';", "const pct = '72%';"],
  'sem-escala': [/\/js\/tp\/carregamento\.js/, 'const s = Math.min(w / bw, h / bh);', 'const s = 1;'],
  'dica-sem-en': [/\/js\/i18n\.js/, /\n {2}'Segure TAB a qualquer momento[^\n]*/, ''],
  'legado-visivel': [/\/css\/tp\/carregamento\.css/, ':root[data-ui="v3"] #load-overlay>:not(.tp-carga){display:none}', ''],
  'vaga-some': [/\/js\/tp\/carregamento\.js/, 'while (d.tamanho &&', 'while (false && d.tamanho &&'],
  'rotulo-bot-online': [/\/js\/tp\/carregamento\.js/, "const rotuloBot = d.online ? '' : tr('BOT');", "const rotuloBot = tr('BOT');"],
  'retrato-quebrado': [/\/js\/tp\/carregamento\.js/, "['chars-hero', 'chars/avatars', 'chars']", "['chars-sumiu']"],
  'celular-inclinado': [/\/css\/tp\/carregamento\.css/, '{width:72px;height:86px;transform:none;', '{width:72px;height:86px;transform:skewX(-8deg);'],
};
async function preparar(page, mutante) {
  if (!mutante) return;
  const [teste, de, para] = TROCAS[mutante];
  await page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = antes.replace(de, para);
    if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
}

async function abrir(cena, mutante) {
  const [w, h] = cena.vp;
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await preparar(p, mutante);
  await p.addInitScript(([a, e]) => {
    try { localStorage.setItem('awpbr_settings', JSON.stringify({ allyBots: a, enemyBots: e, quality: 'low', menuMusic: false, vol: 0, speech: false })); } catch {}
    /* o GLB preso é de propósito: o watchdog de lançamento não pode cobrir a tela medida com "a arena não abriu" */
    let lanc = null;
    Object.defineProperty(window, '__gameLaunch', { configurable: true, get: () => lanc, set: (v) => { if (v) v.fail = () => {}; lanc = v; } });
    addEventListener('tp:elenco', (ev) => {
      const d = ev.detail || {};
      window.__reguaElenco = { lado: d.lado, eu: d.eu?.name, aliados: (d.aliados || []).map((c) => c.name), inimigos: (d.inimigos || []).map((c) => c.name) };
    });
  }, [cena.a ?? 3, cena.e ?? 4]);
  /* O GLB de personagem fica preso; os assets de fundo terminam para o boot alcançar a partida. */
  await p.route(/\/models\/characters\/.*\.glb(?:\?|$)/, () => {});
  const flag = cena.legado ? 'ui=legacy&' : '';
  const url = cena.vagas ? `${BASE}/?${flag}tela=loading&lang=pt`
    : `${BASE}/?${flag}lang=${cena.lang || 'pt'}&debug=1&auto=${cena.lado === 'B' ? 'B,sertanejo' : 'E,punk'}`;
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => { const b = document.getElementById('load-overlay'); return b && !b.classList.contains('hidden'); }, null, { timeout: 90000 }).catch(() => {});
  if (cena.vagas) {
    await p.waitForTimeout(1500);
    /* online: o servidor promete 8 por lado e o elenco ainda chegou incompleto */
    await p.evaluate(() => {
      const def = (id, name) => ({ id, name });
      dispatchEvent(new CustomEvent('tp:elenco', { detail: {
        lado: 'E', eu: def('canarinho', 'Canarinho'), online: true, tamanho: 8, ctf: true, rounds: 3, mapa: 'Treta na Amazônia',
        aliados: [def('punk', 'Punk'), def('trapfunk', 'Trap Funk'), def('clubber', 'Clubber'), def('funkraiz', 'Funk Raiz'), def('emo', 'Emo')],
        inimigos: [def('sertanejo', 'Sertanejo'), def('et', 'ET de Varginha'), def('metaleiro', 'Metaleiro'), def('caminhoneiro', 'Caminhoneiro'), def('skatista', 'Skatista'), def('pagodeiro', 'Pagodeiro')],
      } }));
    });
  } else if (!cena.legado) {
    await p.waitForFunction(() => document.querySelector('.tp-carga')?.dataset.forma !== 'vazio', null, { timeout: 30000 }).catch(() => {});
  }
  await p.waitForTimeout(1600);
  return p;
}

async function ler(p) {
  return p.evaluate(() => {
    const caixa = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const raiz = document.querySelector('.tp-carga');
    const visivel = (s) => !!document.querySelector(s)?.checkVisibility?.();
    const lado = (t) => [...(raiz?.querySelectorAll(`.tp-carga__lado[data-time="${t}"] .tp-carga__ban`) || [])].map((b) => ({
      caixa: caixa(b), voce: b.hasAttribute('data-voce'), vazia: b.hasAttribute('data-vazia'), naGrade: !!b.closest('.tp-carga__grade'),
      nome: b.querySelector('.tp-carga__n')?.textContent || '', rotulo: b.querySelector('.tp-carga__k')?.textContent || '',
      transform: getComputedStyle(b).transform, quebrado: !!b.querySelector('img') && !(b.querySelector('img').naturalWidth > 0),
    }));
    const vagas = [...(raiz?.querySelectorAll('.tp-carga__vaga') || [])].map((v) => ({ i: +v.style.getPropertyValue('--i'), atraso: getComputedStyle(v).animationDelay }));
    const barras = raiz ? raiz.querySelectorAll('.tp-carga__lado [class*="barra"], .tp-carga__lado progress, .tp-carga__lado [role="progressbar"]').length : 0;
    const um = (s) => { const e = raiz?.querySelector(s); return e && e.checkVisibility() ? caixa(e) : null; };
    return {
      tem: !!raiz, v3Visivel: !!raiz?.checkVisibility?.(), forma: raiz?.dataset.forma, tela: raiz?.dataset.tela,
      E: lado('E'), B: lado('B'), vagas, barras, nBarras: raiz?.querySelectorAll('.tp-carga__barra').length ?? 0,
      vs: um('.tp-carga__vs .tp-ital'), mapa: um('.tp-carga__mapa'), progresso: um('.tp-carga__progresso'),
      cabs: [...(raiz?.querySelectorAll('.tp-carga__cab') || [])].map(caixa),
      pct: raiz?.querySelector('.tp-carga__pct')?.textContent, p: raiz?.style.getPropertyValue('--p'),
      pctLegado: document.getElementById('load-pct')?.textContent,
      texto: raiz?.innerText || '', dica: raiz?.querySelector('.tp-carga__dica span')?.textContent || '',
      legadoVisivel: ['.lo-box', '#load-kicker', '#load-character-stage'].filter(visivel),
      legadoMapa: document.getElementById('load-map')?.textContent || '',
      elenco: window.__reguaElenco || null, vw: innerWidth, vh: innerHeight,
    };
  });
}

async function medir(mutante = '', soCenas = null) {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  const m = {};
  mkdirSync(OUT, { recursive: true });
  for (const cena of CENAS.filter((c) => !soCenas || soCenas.includes(c.id))) {
    const p = await abrir(cena, mutante);
    m[cena.id] = { cena, ...(await ler(p)) };
    if (cena.lang === 'en') m[cena.id].semEn = await p.evaluate(async (dicas) => { const { tr } = await import('/js/i18n.js'); return dicas.filter((d) => tr(d) === d); }, DICAS);
    if (!mutante) {
      await p.evaluate(() => document.getElementById('crash-overlay')?.remove());
      await p.screenshot({ path: `${OUT}/${cena.id}.png` });
    }
    await p.close();
  }
  const v3 = Object.values(m).filter((x) => !x.cena.legado && !x.cena.vagas);
  const tem = (ids) => ids.every((id) => m[id]);

  if (tem(['hoje-1536x1024'])) {
    const falhas = Object.values(m).filter((x) => x.cena.legado).filter((x) => x.tem || !x.legadoVisivel.includes('.lo-box') || !x.legadoMapa);
    add('CG1', !falhas.length, falhas.length ? `com ?ui=legacy: ${falhas.map((x) => `${x.cena.id} ${x.tem ? 'monta o carregamento novo' : 'perdeu o overlay legado'}`).join('; ')}` : '?ui=legacy mantém o carregamento anterior (.lo-box com o mapa, nada .tp-)');
  }
  if (v3.length) {
    const erros = [];
    for (const x of v3) {
      const [a, e] = [x.cena.a, x.cena.e];
      const meu = x.elenco?.lado === 'B' ? x.B : x.E;
      const quer = Math.max(1 + a, e) <= 5 ? 'banners' : 'grade';
      if (x.forma !== quer) erros.push(`${x.cena.id}: forma ${x.forma} (quer ${quer})`);
      else if (quer === 'grade' && x.tela !== 'celular') {
        const eu = meu.find((b) => b.voce);
        if (!eu || eu.naGrade) erros.push(`${x.cena.id}: você não está em destaque fora da grade`);
        const resto = [...x.E, ...x.B].filter((b) => !b.voce);
        if (resto.some((b) => !b.naGrade)) erros.push(`${x.cena.id}: ${resto.filter((b) => !b.naGrade).length} retratos fora da grade`);
      }
    }
    add('CG2', !erros.length, erros.length ? erros.join('; ') : `até 5 por lado em banners, 6 a 8 em grade com você em destaque (${v3.length} cenas)`);

    const errosElenco = [];
    for (const x of v3) {
      const meu = x.elenco?.lado === 'B' ? x.B : x.E, deles = x.elenco?.lado === 'B' ? x.E : x.B;
      if (x.cena.lado && x.elenco && x.elenco.lado !== x.cena.lado) errosElenco.push(`${x.cena.id}: jogo pôs você em ${x.elenco.lado}, a cena pediu ${x.cena.lado}`);
      const quebrados = [...meu, ...deles].filter((b) => b.quebrado).length;
      if (quebrados) errosElenco.push(`${x.cena.id}: ${quebrados} retratos sem imagem`);
      if (meu.length !== 1 + x.cena.a || deles.length !== x.cena.e) { errosElenco.push(`${x.cena.id}: ${meu.length} × ${deles.length} na tela, ${1 + x.cena.a} × ${x.cena.e} no ajuste`); continue; }
      if (meu.filter((b) => b.voce).length !== 1 || [...deles].some((b) => b.voce)) errosElenco.push(`${x.cena.id}: "você" fora do seu lado`);
      const el = x.elenco;
      if (!el) { errosElenco.push(`${x.cena.id}: o main.js não entregou o elenco sorteado`); continue; }
      if (x.tela === 'celular') continue;
      const tela = [meu.map((b) => b.nome), deles.map((b) => b.nome)];
      const sorteio = [[el.eu, ...el.aliados], el.inimigos];
      const diverge = sorteio.flat().filter((n) => !tela.flat().some((t) => t.toLowerCase() === String(n).toLowerCase()));
      if (diverge.length) errosElenco.push(`${x.cena.id}: sorteado e ausente: ${diverge.join(', ')}`);
    }
    add('CG3', !errosElenco.length, errosElenco.length ? errosElenco.join('; ') : 'contagem por lado = ajuste da partida, nomes = elenco sorteado, todo retrato com imagem, "você" uma vez no seu lado');

    const errosBarra = v3.filter((x) => x.barras || x.nBarras !== 1 || x.pct !== x.pctLegado || Math.abs(parseFloat(x.p) - parseInt(x.pctLegado, 10) / 100) > 0.005)
      .map((x) => `${x.cena.id}: ${x.barras} barras por jogador, ${x.nBarras} barra geral, ${x.pct} na tela contra ${x.pctLegado} no carregador`);
    add('CG4', !errosBarra.length, errosBarra.length ? errosBarra.join('; ') : 'uma barra só, com o número do LoadingManager; nenhuma barra por jogador sem progresso por jogador');

    const cortes = [];
    const cruza = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
    const fora = (c, x) => c && (c.l < -1 || c.t < -1 || c.r > x.vw + 1 || c.b > x.vh + 1);
    for (const x of v3) {
      const cards = [...x.E, ...x.B].map((b) => b.caixa);
      const blocos = { VS: x.vs, mapa: x.mapa, progresso: x.progresso };
      if (!cards.length || !x.vs) cortes.push(`${x.cena.id}: sem ${cards.length ? 'VS' : 'retratos'} para medir`);
      if (cards.some((c) => fora(c, x)) || Object.values(blocos).some((c) => fora(c, x)) || x.cabs.some((c) => fora(c, x))) cortes.push(`${x.cena.id}: algo sai da tela`);
      for (const [nome, b] of Object.entries(blocos)) if (cards.some((c) => cruza(c, b))) cortes.push(`${x.cena.id}: retrato encosta em ${nome}`);
      if (x.E.some((a) => x.B.some((b) => cruza(a.caixa, b.caixa)))) cortes.push(`${x.cena.id}: os dois lados se encostam`);
      if (cruza(x.mapa, x.progresso)) cortes.push(`${x.cena.id}: nome do mapa encosta na barra`);
      if (!x.progresso || !x.mapa) cortes.push(`${x.cena.id}: sem ${!x.mapa ? 'nome do mapa' : 'barra'}`);
    }
    add('CG5', !cortes.length, cortes.length ? cortes.slice(0, 6).join('; ') : `${v3.length} cenas em 4 telas: tudo dentro, VS, rodapé e lados sem encostar`);

    const passo = v3.filter((x) => x.tela !== 'celular').flatMap((x) => {
      const ms = x.forma === 'grade' ? 30 : 60;
      const ruins = x.vagas.filter((v) => Math.abs(parseFloat(v.atraso) * (v.atraso.endsWith('ms') ? 1 : 1000) - v.i * ms) > 1);
      return ruins.length || !x.vagas.length ? [`${x.cena.id}: ${ruins.length || 'nenhuma'} entrada fora do passo de ${ms} ms (ex.: ${ruins[0]?.i}→${ruins[0]?.atraso})`] : [];
    });
    add('CG6', !passo.length, passo.length ? passo.join('; ') : 'entrada escalonada: 60 ms por retrato até 5 por lado, 30 ms de 6 a 8');
  }
  const en = Object.values(m).filter((x) => x.cena.lang === 'en');
  if (en.length) {
    const PT = /\b(ESQUERDA|DIREITA|VOCÊ|CARREGANDO|POSICIONANDO|AQUECENDO|DICA|MATA-MATA|VAGA|CAPTURA)\b/i;
    const ptV3 = v3.filter((x) => x.cena.lang !== 'en');
    const EN = /\b(LEFT|RIGHT|YOU|LOADING|PLACING|WARMING|TIP|DEATHMATCH)\b/;
    const erros = [];
    for (const x of en) {
      const vaza = x.texto.match(PT)?.[0];
      if (vaza) erros.push(`${x.cena.id}: "${vaza}" em EN`);
      if (DICAS.includes(x.dica)) erros.push(`${x.cena.id}: dica em português no EN`);
      if (x.semEn?.length) erros.push(`${x.semEn.length} das ${DICAS.length} dicas sem inglês (${x.semEn[0].slice(0, 30)}…)`);
    }
    for (const x of ptV3) { const vaza = x.texto.match(EN)?.[0]; if (vaza) erros.push(`${x.cena.id}: "${vaza}" em PT`); }
    add('CG7', !erros.length, erros.length ? [...new Set(erros)].join('; ') : `PT e EN sem string do outro idioma; as ${DICAS.length} dicas têm inglês`);
  }
  if (m['vagas-online-1536x1024']) {
    const x = m['vagas-online-1536x1024'];
    const vazias = [x.E.filter((b) => b.vazia).length, x.B.filter((b) => b.vazia).length];
    const bot = [...x.E, ...x.B].filter((b) => /^BOT$/i.test(b.rotulo)).length;
    add('CG8', vazias[0] === 2 && vazias[1] === 2 && !bot && /VAGA DE BOT ENTRANDO/.test(x.texto),
      `online, time de 8 com 6 e 6 chegados: ${vazias[0]} e ${vazias[1]} vagas (quer 2 e 2), ${bot} rótulos BOT chutados (quer 0)`);
  }
  if (v3.length) {
    const vaza = v3.filter((x) => x.legadoVisivel.length || !x.v3Visivel).map((x) => `${x.cena.id}: ${x.v3Visivel ? x.legadoVisivel.join(', ') : 'carregamento novo invisível'}`);
    add('CG9', !vaza.length, vaza.length ? vaza.join('; ') : 'com a flag o overlay antigo some inteiro e o novo cobre a tela');
    const cel = v3.filter((x) => x.cena.vp[0] === 844);
    if (cel.length) {
      const erros = cel.flatMap((x) => {
        const cards = [...x.E, ...x.B];
        const tortos = cards.filter((b) => b.transform !== 'none').length;
        const larg = new Set(cards.map((b) => Math.round(b.caixa.w)));
        const cols = Math.max(...['E', 'B'].map((t) => new Set(x[t].map((b) => Math.round(b.caixa.l))).size));
        return x.tela !== 'celular' || !cards.length || tortos || larg.size > 1 || cols > 4 ? [`${x.cena.id}: tela ${x.tela}, ${cards.length} retratos, ${tortos} inclinados, ${larg.size} larguras, ${cols} colunas`] : [];
      });
      add('CG10', !erros.length, erros.length ? erros.join('; ') : 'celular deitado: grade reta de retratos iguais, até 4 colunas por lado');
    }
  }
  return r;
}

const MUT = [
  ['sem-flag', 'CG1', ['hoje-1536x1024']], ['banner-ate-8', 'CG2', ['8x8-1536x1024']], ['sem-gancho', 'CG3', ['4x4-1536x1024']], ['retrato-quebrado', 'CG3', ['4x4-1536x1024']],
  ['barra-por-jogador', 'CG4', ['4x4-1536x1024']], ['pct-inventado', 'CG4', ['4x4-1536x1024']], ['sem-escala', 'CG5', ['5x5-1280x720']],
  ['passo-fixo', 'CG6', ['8x8-1536x1024']], ['dica-sem-en', 'CG7', ['en-8x8-1536x1024']], ['vaga-some', 'CG8', ['vagas-online-1536x1024']],
  ['rotulo-bot-online', 'CG8', ['vagas-online-1536x1024']], ['legado-visivel', 'CG9', ['4x4-1536x1024']], ['celular-inclinado', 'CG10', ['8x8-844x390']],
];
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo, cenas] of MUT.filter(([mm]) => !process.env.SO || process.env.SO === mm)) {
    const c = (await medir(mut, cenas)).find((x) => x.id === alvo);
    if (!c || c.ok) sair = 1;
    console.log(`${c && !c.ok ? 'MORDE ' : 'CEGO  '} ${alvo} (${mut})  ${c ? c.msg : 'cláusula não mediu'}`);
  }
} else {
  const r = await medir('', process.env.CENAS ? process.env.CENAS.split(',') : null);
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) && r.length >= 10 ? 0 : 1;
  console.log(`\ncarregamento v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);

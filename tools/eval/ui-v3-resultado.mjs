#!/usr/bin/env node
/* Régua do fim de partida Treta Pop (telas 06 e 22 de design/treta-pop-2026-10-14) medida no Chrome,
   numa partida real (?auto=) encerrada por _endMatch, como em tools/eval/telas-capture.mjs.
     BASE=http://127.0.0.1:9425 node tools/eval/ui-v3-resultado.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/ui-v3-resultado). Um navegador por vez. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9425';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-resultado';
const VIEWPORTS = [[1536, 1024], [1920, 1080], [1280, 720], [844, 390]];
/* Tamanho do VITÓRIA: 168 px no artboard 1536×1024 (06-resultado.html) e 72 px no 844×390 (22-mresultado.html). */
const TITULO = { desktop: 168, mobile: 72 };
const FACES = { Anton: [400], 'Barlow Semi Condensed': [500, 600, 700, 800], 'JetBrains Mono': [500, 700, 800] };
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
mkdirSync(OUT, { recursive: true });

const MUT = {
  concordancia: ['RS4', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace("'A {time} levou a treta. O pastel da vitória está pago.'", "'{time} venceram a treta. O pastel da vitória está pago.'")],
  'placar-eb': ['RS2', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace('placar: [g.roundsWon[eu] | 0, g.roundsWon[eles] | 0]', 'placar: [g.roundsWon.E | 0, g.roundsWon.B | 0]')],
  'dano-inventado': ['RS3', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace("['Duração', d.segundos, 'tempo']", "['Dano', 2140, 'int']")],
  'fase2-visivel': ['RS3', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace('<div class="tp-res__fase2" hidden>', '<div class="tp-res__fase2">')],
  arial: ['RS5', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('.tp-res__frase{', '.tp-res__frase{font-family:Arial,sans-serif;')],
  'sem-foco': ['RS6a', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace('alvo.focus({ preventScroll: true });', '')],
  'titulo-atrasa': ['RS7', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('.tp-res__titulo{', '.tp-res__titulo{animation:tpResNum 480ms 200ms both!important;')],
  'tecla-nao-pula': ['RS7', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace("if ('anim' in raiz.dataset) {", "if (false) {")],
  'mobile-sobrepoe': ['RS8', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace(/(@media \(max-height:520px\)\{[\s\S]*?\.tp-res__col\{)/, '$1width:760px!important;')],
  'mvp-volta': ['RS11a', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace("if (d.combo >= 2) medalha(", "medalha('MVP', 'MVP da partida', 'mvp'); if (d.combo >= 2) medalha(")],
  'selo-por-cima': ['RS15', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('#match-end[data-tp-res]:not(.hidden)) #vm-debug-badge{display:none}', '#match-end[data-tp-res]:not(.hidden)) #vm-debug-badge{display:block!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:auto!important}')],
  'nome-desloca': ['RS16', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('.tp-res__assina{position:absolute;left:calc(var(--res-cx) - 200 * var(--k))', '.tp-res__assina{position:absolute;left:calc(var(--res-cx) - 80 * var(--k))')],
  'heroi-pequeno': ['RS16', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('--res-fig:min(calc(100dvh - 66px),calc(768 * var(--k) / var(--fh,.9)))', '--res-fig:min(calc(100dvh - 66px),calc(560 * var(--k) / var(--fh,.9)))')],
  'acoes-no-pe': ['RS17', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('justify-content:center;gap:calc(20 * var(--k))}', 'justify-content:flex-start;gap:calc(20 * var(--k))}.tp-res__acoes{margin-top:auto!important}')],
  'partilha-lima': ['RS18', 'v3pt', /\/css\/tp\/resultado\.css/, (t) => t.replace('.tp-res__partilha{background:var(--tp-elevado);color:var(--tp-tinta-1);', '.tp-res__partilha{background:var(--tp-ganho);color:var(--tp-asfalto);')],
  'online-revanche': ['RS12', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace('jogar.hidden = !!semRevanche;', 'jogar.hidden = false;')],
  'partilha-ponto': ['RS13', 'v3pt', /\/js\/tp\/resultado\.js/, (t) => t.replace("'fim-de-partida'", "'resultado'")],
  'en-vaza': ['RS9', 'v3en', /\/js\/i18n\.js/, (t) => t.replace("'Outro mapa': 'Another map',", '')],
  'sem-flag': ['RS10', 'legado', /\/js\/main\.js/, (t) => t.replace("if (document.documentElement.dataset.ui === 'v3') {\n  import('./splash-v3.js')", "if (true) {\n  import('./splash-v3.js')")],
};

async function preparar(page, mutante) {
  if (!mutante) return;
  const [, , teste, troca] = MUT[mutante];
  await page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
}

/* Partida real (debug=1 liga o ?auto=), encerrada à mão. O overlay de erro do arnês (o serve.mjs dá 404 nos deps do Astro) sai da frente da captura. */
async function abrirPartida(lang, flag, mutante) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  const pedidos = [];
  page.on('request', (r) => pedidos.push(new URL(r.url()).pathname));
  await preparar(page, mutante);
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_nick', 'ZÉ DO AWP');
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
    window.__partilhas = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__partilhas.push(d); } });
  });
  await page.goto(`${BASE}/?${flag ? '' : 'ui=legacy&'}lang=${lang}&debug=1&auto=E,esquerdomacho&map=praca_poderes`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.addStyleTag({ content: '#launch-error,#crash-overlay,astro-dev-toolbar{display:none!important;pointer-events:none!important}' });
  await page.waitForTimeout(800);
  return { page, pedidos };
}

/* Encerra com o cenário pedido e lê a tela no microtask seguinte: é o "primeiro quadro" do fim. */
const encerrar = (page, cen) => page.evaluate(async (c) => {
  const g = window.__game;
  const fim = document.getElementById('match-end');
  fim.classList.add('hidden');
  g.player.kills = c.k; g.player.deaths = c.d; g.player.headshots = c.hs;
  for (const b of g.bots) { b.kills = 0; b.deaths = 0; }
  if (c.botTop) g.bots[g.bots.length - 1].kills = c.botTop;
  g.mk.best = c.combo; g.roundsWon = { ...c.rounds }; g.online = !!c.online;
  const time = g.playerTeam;
  if (c.lado) g.playerTeam = c.lado;
  g._endMatch();
  await Promise.resolve();
  g.playerTeam = time;
  const raiz = document.querySelector('.tp-res');
  const tit = raiz?.querySelector('.tp-res__titulo');
  const num = raiz?.querySelector('.tp-res__stat .tp-res__n');
  return {
    segundos: Math.round(g.time),
    tituloOpac: tit ? +getComputedStyle(tit).opacity : -1, tituloVis: !!tit?.checkVisibility(),
    tituloAtraso: tit ? getComputedStyle(tit).animationDelay : '', numAtraso: num ? getComputedStyle(num).animationDelay : '',
    numT0: num?.textContent ?? null, animando: !!raiz && 'anim' in raiz.dataset,
  };
}, cen);

/* Corpo opaco da arte do personagem em px de tela: alfa > 40 lido aqui, a 256 px de largura, sem passar pelo módulo. */
const figura = (page) => page.evaluate(async () => {
  const h = document.querySelector('.tp-res__heroi');
  const url = h && (getComputedStyle(h).backgroundImage.match(/url\("?([^")]+)/) || [])[1];
  if (!url || !h.checkVisibility()) return null;
  const img = new Image(); img.src = url; await img.decode();
  const W = 256, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
  const a = x.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (a[(y * W + i) * 4 + 3] > 40) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const b = h.getBoundingClientRect();
  const bs = getComputedStyle(h).backgroundSize;
  if (x1 < 0 || bs !== '100% 100%' || Math.abs(b.width / b.height - img.naturalWidth / img.naturalHeight) > 0.01) return { erro: `arte fora da proporção (${bs}, ${(b.width / b.height).toFixed(3)})` };
  return { l: b.left + (x0 / W) * b.width, r: b.left + ((x1 + 1) / W) * b.width, t: b.top + (y0 / H) * b.height, b: b.top + ((y1 + 1) / H) * b.height };
});

const lum = (rgb) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const ler = (page) => page.evaluate(({ FACES }) => {
  const raiz = document.querySelector('.tp-res');
  const vis = (e) => !!e && e.checkVisibility();
  const caixa = (e) => { if (!vis(e)) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const fim = document.getElementById('match-end');
  if (!raiz) return { existe: false, legadoVisivel: vis(fim?.querySelector('.me-wrap')), titulo: document.getElementById('match-title')?.textContent,
    stats: [], medalhas: [], texto: '', frase: '', foco: document.activeElement?.className || '', fontes: [], botoesBaixos: [], tituloPx: 0, vw: innerWidth, vh: innerHeight };
  const q = (s) => raiz.querySelector(s);
  const fontes = [];
  for (const e of raiz.querySelectorAll('*')) {
    if (!vis(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const peso = +cs.fontWeight;
    const ok = FACES[fam]?.includes(peso) && document.fonts.check(`${peso} 16px "${fam}"`);
    if (!ok) fontes.push(`${e.className || e.tagName}: ${fam} ${peso}`);
  }
  const botoes = [...fim.querySelectorAll('button')].filter(vis);
  return {
    existe: true, visivel: vis(raiz), legadoVisivel: vis(fim.querySelector('.me-wrap')),
    titulo: q('.tp-res__titulo')?.textContent.trim(), placar: q('.tp-res__placar')?.textContent.replace(/\s+/g, ' ').trim(),
    frase: vis(q('.tp-res__frase')) ? q('.tp-res__frase').textContent : '',
    stats: [...raiz.querySelectorAll('.tp-res__stat')].filter(vis).map((s) => [s.querySelector('.tp-rotulo').innerText.trim(), s.querySelector('.tp-res__n').textContent.trim()]),
    medalhas: [...raiz.querySelectorAll('.tp-res__medalha')].filter(vis).map((m) => m.dataset.medalha),
    mvp: /\bMVP\b/.test(raiz.innerText), fase2: vis(q('.tp-res__fase2')),
    texto: raiz.innerText, fim: 'fim' in raiz.dataset,
    foco: document.activeElement?.className || '', primarios: [...fim.querySelectorAll('.tp-btn--primario')].filter(vis).length,
    jogar: vis(q('.tp-res__jogar')), outro: vis(q('.tp-res__outro')), proximo: vis(q('.tp-res__proximo')),
    fontes, botoesBaixos: botoes.filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.className),
    col: caixa(q('.tp-res__col')), acoes: caixa(q('.tp-res__acoes')), assina: caixa(q('.tp-res__assina')), heroi: caixa(q('.tp-res__heroi')),
    tituloPx: parseFloat(getComputedStyle(q('.tp-res__titulo')).fontSize), vw: innerWidth, vh: innerHeight,
    rolaX: document.documentElement.scrollWidth > innerWidth,
    cobertos: [q('.tp-res__titulo'), ...botoes].filter((e) => e && raiz.contains(e)).flatMap((e) => {
      const b = e.getBoundingClientRect();
      return [[0.08, 0.15], [0.5, 0.5], [0.92, 0.85]].map(([fx, fy]) => document.elementFromPoint(b.left + fx * b.width, b.top + fy * b.height))
        .filter((t) => !t || !raiz.contains(t)).map((t) => `${e.className.split(' ').at(-1)} sob ${t ? t.id || t.className || t.tagName : 'nada'}`);
    }),
    blocos: [q('.tp-res__topo'), q('.tp-res__frase'), q('.tp-res__stats'), q('.tp-res__medalhas'), q('.tp-res__fase2'), q('.tp-res__acoes')].filter(vis).map((e) => { const b = e.getBoundingClientRect(); return [e.className.split(' ').at(-1), b.top, b.bottom]; }),
    partilha: vis(q('.tp-res__partilha')) ? (() => { const cs = getComputedStyle(q('.tp-res__partilha')); return { bg: cs.backgroundColor, cor: cs.color }; })() : null,
    statRotulos: [...raiz.querySelectorAll('.tp-res__stat .tp-rotulo')].filter(vis).map((e) => e.innerText.trim()),
    partilhaTexto: q('.tp-res__partilha')?.innerText.trim(),
  };
}, { FACES });

const clicar = (page, sel) => page.click(sel, { timeout: 3000 }).then(() => true, () => false);
const sai = (page) => page.waitForFunction(() => document.getElementById('match-end').classList.contains('hidden'), null, { timeout: 8000 }).then(() => true, () => false);
const VIT = { k: 24, d: 8, hs: 9, combo: 3, rounds: { E: 3, B: 1 } };
const DER = { k: 7, d: 12, hs: 1, combo: 1, botTop: 30, rounds: { E: 1, B: 3 } };
const PT_VAZA = /\b(VITÓRIA|DERROTA|Jogar de novo|Outro mapa|Abates|Mortes|Duração|Compartilhar|levou|Abate triplo|da partida)/i;
const EN_VAZA = /\b(VICTORY|DEFEAT|Play again|Another map|Kills|Deaths|Duration|Share card|took the|Triple kill|of the match)\b/i;
const tempo = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

async function medir(mutante = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  const fase = mutante ? MUT[mutante][1] : '';
  const foto = (page, nome) => (mutante ? null : page.screenshot({ path: `${OUT}/${nome}.png` }));
  const ptTexto = [];

  if (!fase || fase === 'v3pt') {
    const { page } = await abrirPartida('pt', true, mutante);
    const t0 = await encerrar(page, VIT);
    await page.waitForTimeout(30);
    await page.keyboard.press('Shift');
    const v = await ler(page);
    ptTexto.push(v.texto);
    add('RS1', v.visivel && !v.legadoVisivel && v.titulo === 'VITÓRIA', `tela v3 ${v.visivel ? 'visível' : 'ausente'}, legado ${v.legadoVisivel ? 'visível' : 'escondido'}, título "${v.titulo}"`);
    const quer = [['Abates', '24'], ['Mortes', '8'], ['Headshot', '38%'], ['Duração', tempo(t0.segundos)]];
    const errado = quer.filter(([k, val], i) => !v.stats[i] || v.stats[i][0].toLowerCase() !== k.toLowerCase() || v.stats[i][1] !== val);
    const inventa = (v.texto.match(/\bXP\b|T\$|TRETA\$|N[íi]vel|\bQuests?\b|\bDano\b/i) || [])[0];
    add('RS3', !errado.length && v.stats.length === 4 && !inventa && !v.fase2,
      inventa ? `número sem fonte na tela: "${inventa}"` : v.fase2 ? 'espaço da fase 2 visível sem backend' : errado.length ? `estatísticas ${JSON.stringify(v.stats)} (quer ${JSON.stringify(quer)})` : `4 números medidos pelo cliente: ${v.stats.map((s) => s.join(' ')).join(', ')}; fase 2 escondida`);
    add('RS5', v.visivel && v.fontes.length === 0, !v.visivel ? 'tela v3 ausente: nada para medir' : v.fontes.length ? `texto fora das 3 famílias carregadas: ${v.fontes.slice(0, 4).join('; ')}` : 'todo texto em Anton, Barlow Semi Condensed ou JetBrains Mono, carregadas');
    const fraseVit = v.frase;
    add('RS7', t0.tituloOpac === 1 && t0.tituloVis && /^0s/.test(t0.tituloAtraso) && t0.animando && t0.numT0 === '0' && t0.numAtraso.startsWith('0.08s') && v.fim && v.stats[0]?.[1] === '24',
      `quadro 0: título opacidade ${t0.tituloOpac} atraso ${t0.tituloAtraso || '?'}, número "${t0.numT0}" atraso ${t0.numAtraso || '?'}; depois de uma tecla ${v.fim ? 'no fim' : 'ainda contando'} (${v.stats[0]?.[1]})`);
    add('RS11a', v.visivel && !v.mvp && !v.medalhas.includes('mvp') && v.medalhas.includes('combo'), `melhor placar e 3 abates seguidos: MVP ${v.mvp ? 'na tela sem vir do servidor' : 'escondido'}, medalhas [${v.medalhas.join(', ')}]`);
    add('RS6a', v.foco.includes('tp-res__jogar') && v.primarios === 1, `foco em "${v.foco}", ${v.primarios} botão primário visível`);

    const lay = [], cob = [], fig = [], vao = [];
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      const g = await ler(page);
      g.fig = await figura(page);
      g.heroi = g.fig && !g.fig.erro ? g.fig : g.heroi;
      const mobile = h <= 520;
      const k = Math.min(w / 1536, h / 1024);
      if (g.cobertos.length) cob.push(`${w}×${h}: ${[...new Set(g.cobertos)].join(', ')}`);
      if (!g.fig || g.fig.erro) fig.push(`${w}×${h}: ${g.fig?.erro || 'personagem ausente'}`);
      else {
        const cx = (g.fig.l + g.fig.r) / 2, ax = g.assina ? (g.assina.l + g.assina.r) / 2 : NaN, alt = g.fig.b - g.fig.t;
        const minAlt = mobile ? 0.72 * h : 0.72 * 1024 * k;
        if (!(Math.abs(cx - ax) <= 12)) fig.push(`${w}×${h}: nome em x ${ax.toFixed(0)}, corpo em x ${cx.toFixed(0)}`);
        if (alt < minAlt) fig.push(`${w}×${h}: corpo com ${alt.toFixed(0)} px de altura (quer ≥ ${minAlt.toFixed(0)})`);
        if (g.fig.r > w + 0.5 || g.fig.l < 0) fig.push(`${w}×${h}: corpo fora da tela (${g.fig.l.toFixed(0)}–${g.fig.r.toFixed(0)})`);
        if (g.assina && g.assina.t < g.fig.b - 2 && !mobile) fig.push(`${w}×${h}: nome sobre o corpo`);
      }
      if (!mobile) {
        let maior = 0, onde = '';
        for (let i = 1; i < g.blocos.length; i++) { const v = g.blocos[i][1] - g.blocos[i - 1][2]; if (v > maior) { maior = v; onde = `${g.blocos[i - 1][0]} → ${g.blocos[i][0]}`; } }
        if (maior > 120 * k) vao.push(`${w}×${h}: ${maior.toFixed(0)} px entre ${onde} (teto ${(120 * k).toFixed(0)})`);
      } else if (!(g.statRotulos[2] === 'HS' && /^COMPARTILHAR$/i.test(g.partilhaTexto || ''))) lay.push(`${w}×${h}: rótulos curtos da tela 22 ausentes (${g.statRotulos[2]}, ${g.partilhaTexto})`);
      const alvo = mobile ? TITULO.mobile : TITULO.desktop * Math.min(w / 1536, h / 1024);
      const dentro = (b) => !b || (b.l >= 0 && b.t >= 0 && b.r <= g.vw + 0.5 && b.b <= g.vh + 0.5);
      const cruza = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const pares = [['coluna', g.col, 'personagem', g.heroi], ['ações', g.acoes, 'personagem', g.heroi], ['coluna', g.col, 'nome', g.assina], ['ações', g.acoes, 'nome', g.assina]];
      for (const [n1, a, n2, b] of pares) if (cruza(a, b)) lay.push(`${w}×${h}: ${n1} cruza ${n2}`);
      for (const [n, b] of [['coluna', g.col], ['ações', g.acoes], ['nome', g.assina]]) if (!dentro(b)) lay.push(`${w}×${h}: ${n} fora da tela`);
      if (Math.abs(g.tituloPx - alvo) > alvo * 0.1) lay.push(`${w}×${h}: título ${g.tituloPx.toFixed(0)} px (quer ${alvo.toFixed(0)})`);
      if (g.botoesBaixos.length) lay.push(`${w}×${h}: botão abaixo de 44 px: ${g.botoesBaixos.join(', ')}`);
      if (g.rolaX) lay.push(`${w}×${h}: rolagem horizontal`);
      await foto(page, `v3-vitoria-${w}x${h}`);
    }
    add('RS15', !cob.length, cob.length ? `algo fora da tela de resultado por cima: ${cob.join('; ')}` : 'título e botões sem nada por cima em nenhuma resolução');
    add('RS16', !fig.length, fig.length ? fig.join('; ') : 'corpo do personagem ≥ 72% da altura do artboard, dentro da tela, com o nome centrado sob ele (±12 px)');
    add('RS17', !vao.length, vao.length ? `vão vazio na coluna: ${vao.join('; ')}` : 'sem a fase 2, nenhum vão maior que 120 px de artboard entre os blocos da coluna');
    const pb = v.partilha;
    const lumP = pb ? lum(pb.bg) : 1, cP = pb ? contraste(pb.bg, pb.cor) : 0;
    add('RS18', pb && lumP <= 0.2 && cP >= 4.5, pb ? `COMPARTILHAR CARD: fundo ${pb.bg} (luminância ${lumP.toFixed(2)}, teto 0,2 para não competir com o lima de 0,61), contraste do texto ${cP.toFixed(1)}:1` : 'COMPARTILHAR CARD ausente');
    add('RS8', !lay.length, lay.length ? lay.join('; ') : `${VIEWPORTS.map(([w, h]) => `${w}×${h}`).join(', ')}: blocos na tela, sem cruzar, título na escala da referência, botões ≥ 44 px`);
    await page.setViewportSize({ width: 1536, height: 1024 });

    await encerrar(page, DER);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const d = await ler(page);
    const ficou = d.visivel && !(await page.evaluate(() => document.getElementById('match-end').classList.contains('hidden')));
    const rs7 = r.find((c) => c.id === 'RS7');
    if (!ficou) { rs7.ok = false; rs7.msg += '; ENTER durante a contagem saiu da tela'; }
    add('RS4', fraseVit === 'A Time E levou a treta. O pastel da vitória está pago.' && d.frase === 'A Time B levou a melhor. Já pediram CPI da partida.' && !/venceram|levaram/.test(fraseVit + d.frase),
      `vitória: "${fraseVit}"; derrota: "${d.frase}"`);
    add('RS11b', d.visivel && !d.mvp && !d.medalhas.length, `um bot com 30 abates e combo 1: MVP ${d.mvp ? 'visível' : 'escondido'}, medalhas [${d.medalhas.join(', ')}]`);
    await foto(page, 'v3-derrota-1536x1024');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await foto(page, 'v3-derrota-844x390');
    await page.setViewportSize({ width: 1536, height: 1024 });

    await encerrar(page, { ...VIT, lado: 'B', rounds: { E: 1, B: 3 } });
    await page.keyboard.press('Shift');
    const inv = await ler(page);
    add('RS2', inv.titulo === 'VITÓRIA' && inv.placar === '3 × 1', `jogador na Direita, rodadas E 1 × B 3: "${inv.titulo}" ${inv.placar}`);

    await encerrar(page, { ...VIT, online: true });
    await page.keyboard.press('Shift');
    const on = await ler(page);
    add('RS12', !on.jogar && !on.outro && on.proximo && on.primarios === 0 && on.foco.includes('tp-res__lobby'),
      `online: JOGAR DE NOVO ${on.jogar ? 'visível' : 'escondido'}, OUTRO MAPA ${on.outro ? 'visível' : 'escondido'}, aviso de próximo mapa ${on.proximo ? 'visível' : 'ausente'}, foco em "${on.foco}"`);
    await foto(page, 'v3-online-1536x1024');

    await encerrar(page, VIT);
    await page.waitForTimeout(900);
    await clicar(page, '.tp-res__partilha');
    await page.waitForTimeout(200);
    const p = await page.evaluate(() => window.__partilhas.at(-1) || null);
    const u = p?.url ? new URL(p.url) : null;
    add('RS13', u && u.searchParams.get('utm_source') === 'compartilhar' && u.searchParams.get('utm_medium') === 'fim-de-partida' && /^Ganhei/.test(p.text || ''),
      p ? `Web Share: "${p.text}" ${p.url}` : 'COMPARTILHAR CARD não chamou o Web Share');

    await encerrar(page, VIT);
    await page.waitForTimeout(900);
    const antes = await page.evaluate(() => window.__game);
    await page.keyboard.press('Enter');
    const reinicia = await sai(page) && await page.waitForFunction((g0) => window.__game && window.__game !== g0 && window.__game.state !== 'matchEnd', antes, { timeout: 60000 }).then(() => true, () => false);
    add('RS6b', reinicia, reinicia ? 'ENTER depois da contagem começa outra partida' : 'ENTER não começou outra partida');
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 }).catch(() => {});
    await encerrar(page, VIT);
    await page.waitForTimeout(700);
    await clicar(page, '.tp-res__outro');
    await page.waitForTimeout(1200);
    const mapa = await page.evaluate(() => ({ fim: document.getElementById('match-end').classList.contains('hidden'),
      // v3: o escolhedor é o tp/modos dentro do hub-map-modal (a grade legada fica no guarda, oculta por design)
      grade: !!document.querySelector('.tp-modos')?.checkVisibility() || !document.getElementById('hub-map-modal')?.hidden }));
    add('RS14b', mapa.fim && mapa.grade, `OUTRO MAPA: fim de partida ${mapa.fim ? 'fechou' : 'aberto'}, escolha de mapa ${mapa.grade ? 'aberta' : 'ausente'}`);
    await foto(page, 'v3-outro-mapa-1536x1024');
    await page.close();
  }

  if (!fase || fase === 'v3en') {
    const { page } = await abrirPartida('en', true, mutante);
    await encerrar(page, VIT);
    await page.keyboard.press('Shift');
    const e = await ler(page);
    await foto(page, 'v3-vitoria-en-1536x1024');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await foto(page, 'v3-vitoria-en-844x390');
    const vazaEn = (e.texto.match(PT_VAZA) || [])[0];
    const vazaPt = ptTexto.length ? (ptTexto[0].match(EN_VAZA) || [])[0] : null;
    add('RS9', e.titulo === 'VICTORY' && !vazaEn && !vazaPt && /^The Team E took the fight/.test(e.frase),
      vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : `EN: "${e.titulo}", "${e.frase}"${ptTexto.length ? '; PT sem string EN' : ''}`);
    await clicar(page, '.tp-res__lobby');
    const menu = await sai(page) && await page.evaluate(() => !document.getElementById('main-menu').classList.contains('hidden'));
    add('RS14a', menu, menu ? 'LOBBY volta ao menu' : 'LOBBY não voltou ao menu');
    await page.close();
  }

  if (!fase || fase === 'legado') {
    const { page, pedidos } = await abrirPartida('pt', false, mutante);
    await encerrar(page, VIT);
    await page.waitForTimeout(1200);
    const l = await ler(page);
    const tp = pedidos.filter((p) => /\/(css|js)\/tp\//.test(p));
    add('RS10', !l.existe && l.legadoVisivel && l.titulo === 'VITÓRIA' && !tp.length,
      l.existe ? 'tela v3 montada com ?ui=legacy' : tp.length ? `arquivo da v3 pedido no rollback: ${tp[0]}` : !l.legadoVisivel ? 'tela anterior sumiu' : '?ui=legacy mantém a tela anterior');
    if (!mutante) for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      await foto(page, `antes-vitoria-${w}x${h}`);
    }
    await page.close();
  }
  return r;
}

let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, [alvo]] of Object.entries(MUT).filter(([m]) => !process.env.SO || process.env.SO === m)) {
    const c = (await medir(mut)).find((x) => x.id === alvo);
    if (!c || c.ok) sair = 1;
    console.log(`${c && !c.ok ? 'MORDE ' : 'CEGO  '} ${alvo} (${mut})  ${c?.msg || 'cláusula não rodou'}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nresultado v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);

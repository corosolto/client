#!/usr/bin/env node
/* ============================================================================
   char-plastico.mjs — C12: POR QUE O ELENCO INTEIRO TEM O MESMO ACABAMENTO
   ----------------------------------------------------------------------------
   O C9 (char-pbr-check) mede rugosidade no ARQUIVO: o elenco vai de 0,270
   (pagodeiro) a 0,860 (funkeiro) — um espalhamento de 3,2x. O dono olha os 62
   e vê o MESMO plástico. Ou o arquivo não chega na tela, ou o que chega não é
   o que decide o acabamento. Esta régua mede QUAL DOS DOIS, com número.

   O QUE ELA MEDE — duas leituras, no charlineup.html (mapa real, sol e
   hemisférica do mapa, IBL do game.js e composite do bloom.js):

   1. RUGOSIDADE EFETIVA NA TELA (`?charprobe=rough`, sonda do characters.js).
      O shader cospe `roughnessFactor` — o valor que o BRDF de fato usou, depois
      das TRÊS reescritas do caminho (constante do material, roughnessMap do
      GLB, e CS_REGION reclassificando por albedo). Render CRU, sem tonemap e
      sem composite: o byte lido é o valor exato.
      -> `rugTela` por personagem, e `espalhaTela` = desvio-padrão ENTRE
         personagens. Se `espalhaTela` << `espalhaArquivo`, o arquivo não manda.

   2. ACABAMENTO NO PIXEL COMPOSITADO (o que o dono vê):
      • VERNIZ — % da silhueta com L* alto E croma baixo. Realce especular é
        claro e DESSATURADO; albedo claro é claro e colorido. É a assinatura de
        plástico envernizado, e separa uma das duas coisas da outra.
      • Lsd    — desvio-padrão de L* dentro do recorte = contraste interno,
        que é o "liso, cor chapada" que o dono cobra.
      • C      — croma médio CIELAB.

   POR QUE NÃO O mounttest.html: ele tem hemisférica chapada e NENHUM envMap.
   Sem IBL a rugosidade quase não aparece e todo A/B de material sai empatado —
   armadilha já paga duas vezes nesta base.

   PISO DE RUÍDO: o composite tem grão animado (uLens.w = tempo), então dois
   frames NUNCA são bit-idênticos. A régua mede a variante base DUAS vezes e
   imprime o piso; delta menor que o piso não é resultado, é grão.

   uso: node tools/eval/char-plastico.mjs [--map=loja_h] [--chars=a,b,c]
        [--variantes="nome=&query;nome2=&query"] [--out=/tmp/plastico]
        [--mutante=verniz]
   ============================================================================ */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ARG = (k, d) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const MAP = ARG('map', 'loja_h');
const OUT = ARG('out', '/tmp/plastico');
const BASE = ARG('base', 'http://localhost:8123');
/* Oito personagens que cobrem a distribuição MEDIDA do arquivo (pbr-elenco.json):
   0,270 / 0,332 / 0,356 / 0,426 / 0,624 / 0,710 / 0,772 / 0,860. Medir só os
   extremos esconderia um meio achatado; medir o elenco todo custa 8x o tempo
   sem mudar a conclusão. */
const CHARS = ARG('chars', 'pagodeiro,dollynho,lampiao,boto,trapfunk,coach,oakley,emo,camera-roxa');
/* O spawn P não existe na loja_h e o fallback caía no B, que fica ENCOSTADO na
   parede: a fila nascia dentro do concreto e o recorte saía vazio para os 8.
   O E é chão aberto do mesmo mapa. Régua que mede parede não mede personagem. */
const SPAWN = ARG('spawn', 'E');
/* Rugosidade efetiva DO ARQUIVO, para o contraste arquivo x tela. Vem do laudo
   do char-pbr-check, não de chute. */
const ARQUIVO = {
  pagodeiro: 0.270, dollynho: 0.332, lampiao: 0.356, boto: 0.426,
  trapfunk: 0.624, coach: 0.710, oakley: 0.772, emo: 0.829, 'camera-roxa': 0.860,
};
const MUT = ARG('mutante', '');
const VARS = (ARG('variantes', 'base=') || '').split(';').filter(Boolean)
  .map((s) => { const i = s.indexOf('='); return { nome: s.slice(0, i), q: s.slice(i + 1) }; });

mkdirSync(OUT, { recursive: true });

/* ── MUTANTES ──────────────────────────────────────────────────────────────
   `verniz`  enverniza o elenco pela querystring (rugosidade 0,03, sem o bloco
             regional) — PL2 tem que reprovar.
   `semmapa` apaga o roughnessMap do material, que é a REGRESSÃO HISTÓRICA desta
             base: `grep roughnessMap` não dava uma linha e 17 personagens
             carregavam metallicRoughness do Mint enquanto a tela desenhava a
             constante. Com ele, todo personagem cai no mesmo valor fixo e o
             espalhamento na tela vai a zero — PL1 tem que reprovar. É patch no
             FONTE, restaurado inclusive em Ctrl-C. */
const ARQ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'js', 'characters.js');
let original = null, mutado = null;
/* Restaura SÓ se o arquivo ainda for exatamente o que a régua escreveu. Esta base
   é editada por vários agentes ao mesmo tempo, e "salvar o original e escrever de
   volta" apaga em silêncio quem editou durante a corrida. Se o conteúdo mudou, a
   régua grita e deixa o mutante no disco — perder trabalho alheio é pior que
   deixar um patch visível para alguém desfazer. */
const restaurar = () => {
  if (original == null) return;
  if (mutado != null && readFileSync(ARQ, 'utf8') !== mutado) {
    console.error(`\nATENÇÃO: ${ARQ} mudou durante o mutante — NÃO restaurei para não apagar edição alheia.`);
    console.error('         O patch do mutante continua no disco. Confira o `git diff` antes de seguir.');
    original = null; return;
  }
  writeFileSync(ARQ, original); original = null;
};
if (MUT === 'semmapa') {
  original = readFileSync(ARQ, 'utf8');
  process.on('exit', restaurar);
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { restaurar(); process.exit(1); });
  mutado = original.replace('roughnessMap: src.roughnessMap || null,', 'roughnessMap: null, // MUTANTE');
  if (mutado === original) { console.error('mutante semmapa: não achei a linha do roughnessMap — régua morre em vez de passar calada.'); process.exit(1); }
  writeFileSync(ARQ, mutado);
} else if (MUT && MUT !== 'verniz') {
  console.error(`mutante desconhecido: ${MUT} (use verniz | semmapa)`); process.exit(1);
}
const Q_SONDA = MUT === 'verniz' ? '&charprobe=rough&cshadow=0&charrough=0.03&charregion=0' : '&charprobe=rough&cshadow=0';

/* ── medição no navegador ──────────────────────────────────────────────────
   Roda DENTRO da página: 1600x900x4 bytes por frame, e são 2+N frames por
   variante. Trazer isso pro node seria transporte à toa. */
const MEDIR = () => {
  const L = window.LINEUP, W = L.w, H = L.h;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const gl = document.querySelector('canvas');
  const grab = () => { cx.clearRect(0, 0, W, H); cx.drawImage(gl, 0, 0, W, H); return cx.getImageData(0, 0, W, H).data; };
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const lab = (r, g, b) => {
    const R = s2l(r / 255), G = s2l(g / 255), B = s2l(b / 255);
    const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
    const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
    const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const probe = new URLSearchParams(location.search).get('charprobe') === 'rough';
  // cor: frame COMPOSITADO (o pixel do jogo). recorte: frames CRUS (determinísticos).
  L.todos(); const fg = grab();
  L.fundo(); const bgC = grab();          // fundo COMPOSITADO — é contra ele que o C1 mede
  L.cruFundo(); const bg = grab();        // fundo CRU — só para o recorte determinístico
  const out = [];
  for (let i = 0; i < L.ids.length; i++) {
    L.cruSo(i); const so = grab();
    const m = new Uint8Array(W * H); let n = 0;
    for (let p = 0; p < W * H; p++) {
      const o = p * 4;
      const d = Math.abs(so[o] - bg[o]) + Math.abs(so[o + 1] - bg[o + 1]) + Math.abs(so[o + 2] - bg[o + 2]);
      if (d > 12) { m[p] = 1; n++; }
    }
    if (!n) { out.push({ id: L.ids[i], erro: 'recorte vazio' }); continue; }
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const Ls = [], Cs = [], Rs = [];
    let verniz = 0;
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const o = p * 4;
      const [l, a, b2] = lab(fg[o], fg[o + 1], fg[o + 2]);
      const c = Math.hypot(a, b2);
      Ls.push(l); Cs.push(c);
      // VERNIZ: claro E dessaturado. O limiar separa realce especular (branco)
      // de albedo claro (colorido) — jaleco branco tem L* alto e C* alto por
      // causa do fill cromático, e NÃO deve contar como verniz.
      if (l >= 72 && c <= 12) verniz++;
      if (probe) {
        // A sonda escreve cinza puro; o que não for cinza é sombra de contato
        // ou fundo vazando pela borda do recorte e não é rugosidade.
        if (so[o] === so[o + 1] && so[o + 1] === so[o + 2] && so[o] >= 4) Rs.push(so[o] / 255);
      }
    }
    /* dL* = |L* do recorte − L* do anel de 20 px atrás dele| — o C1 do BAR §2.1,
       alvo ≥ 20. É a CONTRAPARTIDA do piso: baixar o piso ganha contraste interno
       e pode perder clareza contra o fundo, então as duas medidas andam juntas ou
       o conserto fica bonito de perto e ilegível em jogo. Lido no frame SÓ-FUNDO,
       senão o vizinho da fila entra no anel e mede personagem contra personagem. */
    const R = 20; const Lr = [];
    for (let y = Math.max(0, minY - R); y <= Math.min(H - 1, maxY + R); y++) {
      for (let x = Math.max(0, minX - R); x <= Math.min(W - 1, maxX + R); x++) {
        const p = y * W + x; if (m[p]) continue;
        let perto = false;
        for (let dy = -R; dy <= R && !perto; dy += 4) for (let dx = -R; dx <= R; dx += 4) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if (m[yy * W + xx]) { perto = true; break; }
        }
        if (!perto) continue;
        const o = (y * W + x) * 4; Lr.push(lab(bgC[o], bgC[o + 1], bgC[o + 2])[0]);
      }
    }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[(s.length / 2) | 0]; };
    const mu = mean(Ls);
    const r = {
      id: L.ids[i], px: n,
      L50: med(Ls), Lmed: mu,
      Lsd: Math.sqrt(mean(Ls.map((v) => (v - mu) * (v - mu)))),
      C: mean(Cs),
      verniz: (100 * verniz) / n,
      dL: Lr.length ? Math.abs(mu - mean(Lr)) : null,
    };
    if (probe && Rs.length) {
      const s = [...Rs].sort((x, y) => x - y);
      r.rugTela = mean(Rs); r.rugP10 = s[(s.length * 0.1) | 0]; r.rugP50 = s[(s.length / 2) | 0];
      r.rugP90 = s[(s.length * 0.9) | 0]; r.rugPx = Rs.length;
    }
    out.push(r);
  }
  L.todos();
  return out;
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const capturar = async (q, png) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  const url = `${BASE}/charlineup.html?map=${MAP}&spawn=${SPAWN}&chars=${encodeURIComponent(CHARS)}&w=1600&h=900${q}`;
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction('window.LINEUP && window.LINEUP.ready', null, { timeout: 240000 });
  await page.waitForTimeout(1200);
  if (png) await page.screenshot({ path: png });
  const r = await page.evaluate(MEDIR);
  await page.close();
  return r;
};

const res = {};
for (const v of VARS) res[v.nome] = await capturar(v.q, `${OUT}/lineup-${v.nome}.png`);
/* PISO DE RUÍDO: a MESMA query, medida de novo. Grão animado do composite entra
   aqui; qualquer delta entre variantes abaixo deste piso não é resultado. */
const repeticao = await capturar(VARS[0].q, null);
/* RUGOSIDADE EFETIVA: passe separado com a sonda + sombra de contato desligada
   (o plano de sombra é MeshBasic, não tem rugosidade e sujaria o recorte). */
const sonda = await capturar(Q_SONDA, `${OUT}/sonda-rough.png`);
await browser.close();
restaurar();

res.__sonda = sonda;
writeFileSync(`${OUT}/plastico.json`, JSON.stringify(res, null, 2));

const num = (x, d = 2) => (x == null ? '  -  ' : x.toFixed(d).padStart(6));
const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length); };

console.log(`\nC12 — ACABAMENTO DO ELENCO (${MAP}, composite do jogo). Imagens em ${OUT}/\n`);

// piso de ruído
let piso = 0;
for (let i = 0; i < repeticao.length; i++) {
  const a = res[VARS[0].nome][i], b = repeticao[i];
  if (!a || !b || a.erro || b.erro) continue;
  piso = Math.max(piso, Math.abs(a.verniz - b.verniz), Math.abs(a.Lmed - b.Lmed), Math.abs(a.C - b.C), Math.abs(a.Lsd - b.Lsd));
}
console.log(`PISO DE RUÍDO (mesma query, 2 capturas): ${piso.toFixed(4)} — delta menor que isto é grão, não efeito.\n`);

console.log('RUGOSIDADE: ARQUIVO x TELA');
console.log('personagem      arquivo    tela   p10    p50    p90   (tela-arquivo)');
const arq = [], tela = [];
for (const r of sonda) {
  if (r.erro || r.rugTela == null) { console.log(`${r.id.padEnd(14)} sem leitura`); continue; }
  const a = ARQUIVO[r.id];
  if (a != null) { arq.push(a); tela.push(r.rugTela); }
  console.log(`${r.id.padEnd(14)}${num(a, 3)} ${num(r.rugTela, 3)} ${num(r.rugP10, 3)} ${num(r.rugP50, 3)} ${num(r.rugP90, 3)}   ${num(r.rugTela - (a ?? 0), 3)}`);
}
if (arq.length > 1) {
  const eArq = sd(arq), eTela = sd(tela);
  console.log(`\nESPALHAMENTO entre personagens:  arquivo sd=${eArq.toFixed(3)}   tela sd=${eTela.toFixed(3)}   compressão=${(eArq / Math.max(eTela, 1e-6)).toFixed(2)}x`);
  console.log(`amplitude:                       arquivo ${(Math.max(...arq) - Math.min(...arq)).toFixed(3)}   tela ${(Math.max(...tela) - Math.min(...tela)).toFixed(3)}`);
}

for (const v of VARS) {
  console.log(`\n[${v.nome}] ${v.q || '(padrão)'}`);
  console.log('personagem       L50    Lmed   Lsd     C*   verniz%    dL*(C1≥20)');
  const V = [];
  for (const r of res[v.nome]) {
    if (r.erro) { console.log(`${r.id.padEnd(14)} ${r.erro}`); continue; }
    V.push(r.verniz);
    console.log(`${r.id.padEnd(14)}${num(r.L50, 1)} ${num(r.Lmed, 1)} ${num(r.Lsd, 2)} ${num(r.C, 2)} ${num(r.verniz, 2)}    ${num(r.dL, 1)}${r.dL != null && r.dL < 20 ? ' <20' : ''}`);
  }
  if (V.length > 1) console.log(`espalhamento do verniz entre personagens: sd=${sd(V).toFixed(3)}`);
}

// A/B contra a primeira variante
for (const v of VARS.slice(1)) {
  const A = res[VARS[0].nome], B = res[v.nome];
  let dV = 0, dL = 0, dC = 0, dS = 0;
  for (let i = 0; i < A.length; i++) {
    if (A[i].erro || B[i].erro) continue;
    dV = Math.max(dV, Math.abs(A[i].verniz - B[i].verniz));
    dL = Math.max(dL, Math.abs(A[i].Lmed - B[i].Lmed));
    dC = Math.max(dC, Math.abs(A[i].C - B[i].C));
    dS = Math.max(dS, Math.abs(A[i].Lsd - B[i].Lsd));
  }
  const vivo = Math.max(dV, dL, dC, dS) > piso * 3;
  console.log(`\nΔ máx [${VARS[0].nome} -> ${v.nome}]  verniz ${dV.toFixed(2)}  L ${dL.toFixed(2)}  C ${dC.toFixed(2)}  Lsd ${dS.toFixed(2)}  => ${vivo ? 'TEM EFEITO' : 'SEM EFEITO (dentro do grão)'}`);
}

/* ── VEREDITO ──────────────────────────────────────────────────────────────
   Dois números, e os dois são de CAUSA, não de gosto:

   PL1 — a rugosidade do ARQUIVO tem que CHEGAR na tela. O elenco vai de 0,27 a
         0,86 no disco; se o espalhamento na tela for muito menor, alguma etapa
         do caminho está achatando o material e o char-pbr-check estaria medindo
         uma declaração que ninguém honra. Teto de compressão 1,6x — o dobro da
         folga do 0,92x medido hoje.
   PL2 — nenhum personagem pode virar espelho na tela: p50 da rugosidade efetiva
         >= 0,20, o MESMO ponto que o char-pbr-check (C9) chama de verniz. As
         duas réguas compartilham o limiar de propósito: uma mede no arquivo,
         esta mede no pixel, e limiar diferente faria as duas discordarem sem
         que ninguém soubesse qual estava certa.

   O que esta régua NÃO faz: dar nota de beleza. Lsd, C* e verniz% são medidos e
   impressos porque são a evidência do A/B entre variantes, mas não têm limiar —
   contraste interno "bom" depende do personagem, e um teto ali reprovaria o
   figurino preto por ser preto. */
const sondaOk = sonda.filter((r) => !r.erro && r.rugTela != null && ARQUIVO[r.id] != null);
const falhas = [];
if (sondaOk.length >= 2) {
  const eArq = sd(sondaOk.map((r) => ARQUIVO[r.id])), eTela = sd(sondaOk.map((r) => r.rugTela));
  const comp = eArq / Math.max(eTela, 1e-6);
  console.log(`\nPL1 CHEGADA     (compressão arquivo->tela <= 1,60x): ${comp.toFixed(2)}x ${comp <= 1.6 ? 'OK' : 'FALHOU'}`);
  if (comp > 1.6) falhas.push(`PL1: material do arquivo achatado ${comp.toFixed(2)}x no caminho até a tela`);
  const verniz = sondaOk.filter((r) => r.rugP50 < 0.20);
  console.log(`PL2 SEM VERNIZ  (p50 da rugosidade na tela >= 0,20): ${sondaOk.length - verniz.length}/${sondaOk.length}`
    + (verniz.length ? ` — ${verniz.map((r) => `${r.id} ${r.rugP50.toFixed(3)}`).join(', ')}` : ''));
  if (verniz.length) falhas.push(`PL2: ${verniz.map((r) => r.id).join(', ')} com p50 de rugosidade abaixo de 0,20 na tela`);
} else {
  falhas.push('sonda de rugosidade sem leitura — a régua não sabe medir e não vai passar calada');
}

if (MUT) console.log(`\n[mutante=${MUT}] a régua TEM que ficar vermelha aqui.`);
if (falhas.length) { console.error('\nPLÁSTICO VERMELHO\n  ' + falhas.join('\n  ')); process.exit(1); }
console.log('\nPLÁSTICO VERDE');

#!/usr/bin/env node
/* ============================================================================
   char-shade.mjs — C11: A COR QUE O DONO VÊ (personagem RENDERIZADO, não textura)
   ----------------------------------------------------------------------------
   O C9 mede a textura no arquivo. O C10 mede o que o piso de albedo faz com ela.
   Este mede o PIXEL FINAL: o personagem na cena do jogo, com o sol e a hemisférica
   do mapa, o IBL do game.js e o composite do bloom.js (AgX + piso + vinheta).

   Segmentação sem chute: a página desenha o mesmo frame N+1 vezes — uma só com o
   fundo e uma por personagem — então a máscara de cada um é a diferença exata
   contra o fundo. Não há limiar de cor adivinhando quem é personagem.

   POR PERSONAGEM:
     • L50/sd  — mediana e desvio-padrão de L* do recorte (sd = contraste interno,
                 que é o "acabamento" que o dono cobra: "liso, cor chapada")
     • C*      — croma médio CIELAB (a cor que sobra depois do tonemap)
     • dL      — |L* do recorte − L* do anel de 20 px atrás dele| = o C1 do BAR §2.1,
                 alvo ≥ 20. É a régua de CLAREZA que motivou o piso existir.

   uso: node tools/eval/char-shade.mjs [--map=loja_h] [--out=/tmp/shade]
        [--variantes="nome=query;nome=query"]
   ============================================================================ */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ARG = (k, d) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const BASE = process.env.BASE || 'http://localhost:8123';
const MAP = ARG('map', 'loja_h');
const OUT = ARG('out', '/tmp/charshade');
const CHARS = ARG('chars', 'trapfunk,oakley,coach,emo,blackmetal,gotinha,padata,canarinho');
/* A bancada cai em `spawns.P || spawns.B` e a loja_h NÃO TEM P: a fila nascia no
   B, que fica encostado na parede, e os 8 recortes saíam vazios — depois disso a
   mediana de um array vazio explodia num TypeError. Ou seja: o C11 estava MORTO,
   não frouxo. Régua que morre no meio parece falha de ambiente e é ignorada; por
   isso o spawn agora é explícito e o fim do relatório recusa passar sem leitura. */
const SPAWN = ARG('spawn', 'E');
const VARS = ARG('variantes', 'DEPOIS=;ANTES=&charalbreg=0').split(';').map((s) => {
  const i = s.indexOf('='); return { nome: s.slice(0, i), q: s.slice(i + 1) };
});
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});

/* medição roda DENTRO da página: o canvas WebGL já está lá e mandar 9 PNGs de
   1600×900 por variante pro node só para diferenciá-los seria transporte à toa. */
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
  // cor: frames COMPOSITADOS (o pixel do jogo). recorte: frames CRUS (determinísticos).
  L.todos(); const fg = grab();
  L.fundo(); const bgC = grab();
  L.cruFundo(); const bg = grab();
  const out = [];
  for (let i = 0; i < L.ids.length; i++) {
    L.cruSo(i); const so = grab();
    // máscara = diferença contra o fundo, no render CRU. 12/255 corta o dither do
    // sRGB sem comer a borda do personagem.
    const m = new Uint8Array(W * H);
    let n = 0, minX = W, maxX = 0, minY = H, maxY = 0;
    for (let p = 0; p < W * H; p++) {
      const o = p * 4;
      const d = Math.abs(so[o] - bg[o]) + Math.abs(so[o + 1] - bg[o + 1]) + Math.abs(so[o + 2] - bg[o + 2]);
      if (d > 12) {
        m[p] = 1; n++;
        const x = p % W, y = (p / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (!n) { out.push({ id: L.ids[i], erro: 'recorte vazio' }); continue; }
    const Ls = [], Cs = [];
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const o = p * 4, [l, a, b2] = lab(fg[o], fg[o + 1], fg[o + 2]);
      Ls.push(l); Cs.push(Math.hypot(a, b2));
    }
    // anel de 20 px em volta da silhueta, lido no frame SÓ-FUNDO (senão o vizinho
    // da fila entra no anel e o C1 mediria personagem contra personagem).
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
        const o = p * 4; Lr.push(lab(bgC[o], bgC[o + 1], bgC[o + 2])[0]);
      }
    }
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[(s.length / 2) | 0]; };
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const mu = mean(Ls);
    out.push({
      id: L.ids[i], px: n,
      L50: med(Ls), Lmed: mu,
      sd: Math.sqrt(mean(Ls.map((v) => (v - mu) * (v - mu)))),
      C: mean(Cs),
      Lfundo: Lr.length ? mean(Lr) : null,
      dL: Lr.length ? Math.abs(mu - mean(Lr)) : null,
    });
  }
  L.todos();
  return out;
};

const res = {};
for (const v of VARS) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => console.error('[pageerror]', v.nome, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', v.nome, m.text()); });
  const url = `${BASE}/charlineup.html?map=${MAP}&spawn=${SPAWN}&chars=${encodeURIComponent(CHARS)}&w=1600&h=900&ao=1${v.q}`;
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.LINEUP && window.LINEUP.ready', null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/lineup-${v.nome}.png` });
  res[v.nome] = await page.evaluate(MEDIR);
  await page.close();
}
await browser.close();
writeFileSync(`${OUT}/shade.json`, JSON.stringify(res, null, 2));

const nomes = VARS.map((v) => v.nome);
console.log(`C11 — PERSONAGEM RENDERIZADO (${MAP}, composite do jogo)   imagens em ${OUT}/\n`);
const cab = nomes.map((n) => n.padStart(9) + '  sd     C*    dL*').join('   |');
console.log('id             ' + '  ' + cab);
console.log('-'.repeat(16 + nomes.length * 34));
for (let i = 0; i < res[nomes[0]].length; i++) {
  let ln = res[nomes[0]][i].id.padEnd(15);
  for (const n of nomes) {
    const r = res[n][i];
    if (r.erro) { ln += '  ' + r.erro.padStart(30); continue; }
    ln += '  ' + r.Lmed.toFixed(1).padStart(7) + r.sd.toFixed(1).padStart(6) + r.C.toFixed(1).padStart(7) + (r.dL == null ? '   —' : r.dL.toFixed(1).padStart(7));
  }
  console.log(ln);
}
console.log('-'.repeat(16 + nomes.length * 34));
for (const n of nomes) {
  const ok = res[n].filter((r) => !r.erro);
  // Sem UM recorte a régua não sabe medir, e não saber custa o mesmo que estar
  // errado: fala alto e sai 1 em vez de estourar num TypeError de mediana vazia.
  if (!ok.length) { console.error(`C11 [${n}]: NENHUM recorte — a fila não apareceu na tela (spawn dentro de parede?). Régua não mediu nada.`); process.exit(1); }
  const md = (k) => { const a = ok.map((r) => r[k]).sort((x, y) => x - y); return a[(a.length / 2) | 0]; };
  const c1 = ok.filter((r) => r.dL != null && r.dL < 20);
  console.log(`${n.padEnd(9)}  mediana: L* ${md('Lmed').toFixed(1)}  sd ${md('sd').toFixed(1)}  C* ${md('C').toFixed(1)}  dL* ${md('dL').toFixed(1)}`
    + `   C1 (dL* ≥ 20): ${ok.length - c1.length}/${ok.length}${c1.length ? ' — fora: ' + c1.map((r) => `${r.id} ${r.dL.toFixed(0)}`).join(', ') : ''}`);
}

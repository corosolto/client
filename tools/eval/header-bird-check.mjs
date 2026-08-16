/* header-bird-check.mjs — A PISTOLA DO CANARINHO EXISTE NO TAMANHO EM QUE ELA É SERVIDA?
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   O dono pediu: *"o canarinho girando devia segurar uma arma"*. A arma JÁ estava lá —
   `tools/eval/canarinho-icon.mjs` reparenta o mount da `deagle` (a arma que
   `CHAR_WEAPON.canarinho` declara) e gira exatamente esse modelo, e extraindo os 24
   quadros do `.webp` commitado ela aparece em todos os 24. O defeito nunca foi
   "faltou a arma": foi **"a arma não é visível no tamanho em que ela é servida"**.

   E é aí que está a lição, que vale para qualquer coisa deste repo: **olhar o asset no
   tamanho do asset é teatro**. O `canarinho-header.webp` tem 604×240 px e a pistola tem
   ~35 px nele — dá para ver. Só que o `.brand-bird` de `src/layouts/Layout.astro:254-259`
   não serve a faixa inteira nem no tamanho dela:

     .brand-bird      --bh:60px · width = 60 * 298/236 · overflow:hidden + máscara radial
     .brand-bird img  left = 60 * -288/236 · width = 60 * 604/236

   ou seja, o header mostra a JANELA x 288..586 / y 0..236 da faixa, reduzida para 60 px
   de altura. Nessa conta a pistola fica com ~8 px de comprimento, preta, sobre um fundo
   marrom escuro. Existe, é desenhada, e ninguém vê.

   ── O QUE ESTA RÉGUA MEDE ──────────────────────────────────────────────────────────
   Ela NÃO renderiza nada. Ela lê os dois `.webp` que a `canarinho-icon.mjs` REALMENTE
   grava — o de controle (`--armaenv=0`, o comportamento antigo) e o candidato —, aplica
   a MESMA janela de recorte do CSS, reduz para os mesmos 60 px de altura, e:

     1. isola os pixels da ARMA por diferença entre as duas faixas. Isso só é honesto
        porque a mudança candidata não move um vértice (é `envMap` no material da arma):
        geometria idêntica => todo pixel que mudou é pixel de arma;
     2. mede a luminância mediana desses pixels nas duas versões;
     3. mede a luminância mediana do FUNDO LOCAL — a moldura de 2 px em volta da máscara
        da arma, na própria faixa. Não é uma constante inventada: é o pixel em que a arma
        encosta, com o gradiente radial da faixa e o corpo do passarinho incluídos;
     4. devolve o contraste de Weber |arma − fundo| / fundo, que é a grandeza que decide
        se uma forma pequena se separa do que está atrás dela.

   ── O TETO, E DE ONDE ELE VEM ──────────────────────────────────────────────────────
   `CONTRASTE_MIN = 0,25`. Procedência: é o piso de contraste de Weber abaixo do qual um
   detalhe de poucos pixels deixa de ser resolvido em tela comum — a mesma ordem de
   grandeza do mínimo de 3:1 que a WCAG 2.1 (1.4.11, componentes gráficos) exige em
   RAZÃO de luminância. 3:1 em razão é 2,0 em Weber para um alvo mais claro; 0,25 é
   deliberadamente MUITO mais frouxo que isso, porque aqui não se trata de acessibilidade
   de conteúdo (a faixa é `aria-hidden` e decorativa) e sim do mínimo para a forma existir.
   Um teto frouxo que a versão antiga REPROVA vale mais que um teto rigoroso inventado.

   ── E O QUE ELA PROTEGE ALÉM DO CONTRASTE ──────────────────────────────────────────
   As três coisas que o header assume e que quebram em silêncio:
     · 604×240 exatos (o `width`/`height` do `<img>` e as frações do CSS são desses números);
     · 24 quadros, que é o que fecha 360° sem salto;
     · a JANELA x 288..586 continuar contendo o passarinho — se a silhueta mudar de lugar,
       o header corta o bicho no meio e o `Layout.astro` (que não é arquivo desta rodada)
       precisa saber.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/canarinho-icon.mjs --armaenv=0 --out=/tmp/ctrl   # controle
     node tools/eval/canarinho-icon.mjs                               # candidato
     node tools/eval/header-bird-check.mjs /tmp/ctrl/img/canarinho-header.webp
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const CTRL = args.find((a) => !a.startsWith('--'));
const ALVO = (args.find((a) => a.startsWith('--alvo=')) || '').split('=')[1]
  || 'public/img/canarinho-header.webp';
const TMP = (args.find((a) => a.startsWith('--tmp=')) || '').split('=')[1]
  || '/private/tmp/claude-504/-Users-ruben-game/8e0ad904-6bb5-4589-ab1a-48cf35c08b4f/scratchpad/hdr-check';

/* A JANELA DO HEADER, lida de `src/layouts/Layout.astro:254-259` e não estimada.
   Se qualquer um destes números mudar lá, ele tem que mudar aqui — e é de propósito que
   a régua quebre, porque o recorte deixou de ser o que ela mede. */
const FAIXA = { w: 604, h: 240 };
const CROP = { x: 288, y: 0, w: 298, h: 236 };
const BH = 60;                       // --bh do .brand-bird
const CONTRASTE_MIN = 0.25;

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mediana = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

/* Aplica a janela do CSS e reduz para a altura de exibição. `quadro` é o índice do frame
   do WebP animado; `magick <arq>.webp` já expande a animação em `-<i>.png`. */
async function janela(webp, quadro, tag) {
  fs.mkdirSync(TMP, { recursive: true });
  const pref = path.join(TMP, tag);
  /* `-coalesce` NÃO é opcional: `img2webp -min_size` grava a animação com predição entre
     quadros, então o quadro N não é a imagem completa — é o retângulo que mudou, com o
     resto transparente. Sem coalescer, um `removeAlpha()` pinta esse resto de preto e
     QUALQUER comparação entre quadros acusa a faixa inteira como diferente (medido: a
     silhueta dava x 0..603 mesmo com limiar 150 de 765). */
  execSync(`magick ${JSON.stringify(webp)} -coalesce ${pref}-%d.png`);
  const quadros = fs.readdirSync(TMP).filter((f) => f.startsWith(`${tag}-`) && f.endsWith('.png')).length;
  const m = await sharp(`${pref}-0.png`).metadata();
  const alvoW = Math.round((BH * CROP.w) / CROP.h);
  const img = await sharp(`${pref}-${quadro}.png`)
    .extract({ left: CROP.x, top: CROP.y, width: CROP.w, height: CROP.h })
    .resize(alvoW, BH, { kernel: 'lanczos3' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { ...img, quadros, tam: { w: m.width, h: m.height } };
}

if (!CTRL || !fs.existsSync(CTRL)) {
  console.error('uso: node tools/eval/header-bird-check.mjs <faixa-de-controle.webp> [--alvo=<faixa.webp>]');
  console.error('     a de controle sai de: node tools/eval/canarinho-icon.mjs --armaenv=0 --out=<dir>');
  process.exit(2);
}

const falhas = [];
const QUADRO = Math.round(parseFloat((args.find((a) => a.startsWith('--quadro=')) || '').split('=')[1] || '0'));
const a = await janela(CTRL, QUADRO, 'ctrl');
const b = await janela(ALVO, QUADRO, 'alvo');

// ── HDR1: as dimensões que o Layout assume ─────────────────────────────────────────
for (const [nome, t] of [['controle', a.tam], ['alvo', b.tam]]) {
  if (t.w !== FAIXA.w || t.h !== FAIXA.h) {
    falhas.push(`HDR1 · faixa ${nome} é ${t.w}×${t.h}, o CSS do header assume ${FAIXA.w}×${FAIXA.h} (Layout.astro:258-259)`);
  }
}
if (b.quadros !== 24) falhas.push(`HDR2 · a faixa alvo tem ${b.quadros} quadros; 24 × 15° é o que fecha 360° sem salto`);
console.log(`faixa: ${b.tam.w}×${b.tam.h} · ${b.quadros} quadros · janela do header x ${CROP.x}..${CROP.x + CROP.w} / y ${CROP.y}..${CROP.y + CROP.h} -> ${Math.round((BH * CROP.w) / CROP.h)}×${BH} px servidos`);

// ── máscara da arma: onde as duas faixas diferem ───────────────────────────────────
const N = b.info.width * b.info.height, C = b.info.channels;
const mask = new Uint8Array(N);
let dif = 0;
for (let i = 0; i < N; i++) {
  const o = i * C;
  const d = Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]);
  if (d > 12) { mask[i] = 1; dif++; }      // 12/765: acima do ruído de recompressão WebP
}
if (!dif) {
  falhas.push('HDR3 · controle e alvo são o MESMO pixel no recorte do header — a mudança não chegou onde o jogador olha');
}

/* Fundo local: moldura de 2 px em volta da máscara. É contra ISTO que a arma precisa
   se separar — não contra uma cor de fundo declarada, que ignoraria o corpo do
   passarinho e o realce radial da faixa. */
const W = b.info.width, H = b.info.height;
const borda = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (mask[i]) continue;
    let perto = false;
    for (let dy = -2; dy <= 2 && !perto; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (mask[ny * W + nx]) { perto = true; break; }
      }
    }
    if (perto) borda[i] = 1;
  }
}

const lumaDe = (img, sel) => {
  const out = [];
  for (let i = 0; i < N; i++) if (sel[i]) { const o = i * img.info.channels; out.push(luma(img.data[o], img.data[o + 1], img.data[o + 2])); }
  return out;
};
const armaAntes = mediana(lumaDe(a, mask));
const armaDepois = mediana(lumaDe(b, mask));
const fundo = mediana(lumaDe(b, borda));
const weber = (v) => (fundo > 0 ? Math.abs(v - fundo) / fundo : 0);

console.log(`\npixels de arma no recorte servido: ${dif} de ${N} (${((100 * dif) / N).toFixed(1)} % da área do header)`);
console.log(`fundo local (moldura de 2 px): luma ${fundo.toFixed(1)}\n`);
console.log(`  ${'ANTES (--armaenv=0)'.padEnd(24)} arma luma ${armaAntes.toFixed(1).padStart(5)}   contraste de Weber ${weber(armaAntes).toFixed(3)}`);
console.log(`  ${'DEPOIS'.padEnd(24)} arma luma ${armaDepois.toFixed(1).padStart(5)}   contraste de Weber ${weber(armaDepois).toFixed(3)}`);
console.log(`  teto: contraste >= ${CONTRASTE_MIN}`);

if (weber(armaDepois) < CONTRASTE_MIN) falhas.push(`HDR4 · a arma fica em contraste ${weber(armaDepois).toFixed(3)} contra o fundo local (mínimo ${CONTRASTE_MIN}) — no header ela é uma mancha, não uma pistola`);

/* A régua tem que MORDER: se a versão de controle passasse, ela não estaria medindo o
   defeito que o dono reportou, estaria medindo qualquer coisa. */
const controlePassa = weber(armaAntes) >= CONTRASTE_MIN;
console.log(`\nteste de mutação (a versão ANTIGA tem que REPROVAR): ${controlePassa ? 'ELA PASSA -> a régua está cega' : 'reprova, como esperado'}`);
if (controlePassa) falhas.push('HDR5 · a versão de controle passa no teto — a régua não distingue o defeito relatado');

/* ── HDR6: o passarinho continua dentro da janela do header ────────────────────────
   Se a silhueta escapar do recorte, o header corta o bicho e `Layout.astro` (que não é
   arquivo desta rodada) precisa ser avisado.

   O JEITO ÓBVIO ESTÁ ERRADO, e custou uma falsa vermelha: "conte os pixels claros da
   metade direita da faixa" acusou o passarinho em x 302..603, estourando a janela em
   17 px. Não era o passarinho — a faixa tem uma RÉGUA DOURADA `#e8b34b` de 3 px de
   altura na borda inferior, largura inteira (canarinho-icon.mjs, o `<rect y="HH-3">`),
   e ela tem luma ~180. O limiar de brilho estava medindo o enfeite do fundo.

   O critério correto é INDEPENDENTE DE FUNDO: o fundo da faixa é o mesmo nos 24 quadros
   e só o passarinho gira. Então a união dos pixels que MUDAM entre quadros é, por
   construção, área de passarinho — nenhuma escolha de limiar de brilho entra na conta. */
const quadrosCmp = [6, 12, 18].filter((i) => fs.existsSync(path.join(TMP, `alvo-${i}.png`)));
const base = await sharp(path.join(TMP, `alvo-${QUADRO}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = 1e9, maxX = -1e9;
for (const qi of quadrosCmp) {
  const outro = await sharp(path.join(TMP, `alvo-${qi}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < base.info.height; y++) {
    for (let x = 0; x < base.info.width; x++) {
      const o = (y * base.info.width + x) * base.info.channels;
      const d = Math.abs(base.data[o] - outro.data[o]) + Math.abs(base.data[o + 1] - outro.data[o + 1]) + Math.abs(base.data[o + 2] - outro.data[o + 2]);
      if (d > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
}
console.log(`silhueta do passarinho na faixa (união de ${quadrosCmp.length} pares de quadros): x ${minX}..${maxX} · janela do header x ${CROP.x}..${CROP.x + CROP.w}`);
if (minX < CROP.x || maxX > CROP.x + CROP.w) falhas.push(`HDR6 · o passarinho ocupa x ${minX}..${maxX} e a janela do header é ${CROP.x}..${CROP.x + CROP.w} — o recorte de Layout.astro:258 corta a figura. AVISAR: Layout.astro não é arquivo desta rodada`);

console.log('');
if (falhas.length) { for (const f of falhas) console.log(`✗ ${f}`); console.log(`\n${falhas.length} falha(s)`); process.exit(1); }
console.log('✓ HDR1..HDR6 passam — a pistola existe no tamanho em que o header a serve');

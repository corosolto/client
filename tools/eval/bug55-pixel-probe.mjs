// PROBE DE PIXEL — BUG-55: mede o que as figuras de evidência MOSTRAM.
// A régua mede o mundo (escala-favela-check); este mede a FOTO: altura da vareta de
// referência de 1,70 m em pixels e a altura do vão de porta na mesma imagem, e traduz
// vão para metros pela vareta. É o "gere a figura e olhe" em número.
// Uso: node tools/eval/bug55-pixel-probe.mjs <png>
import sharp from 'sharp';

const file = process.argv[2];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (x, y) => { const i = (y * W + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
const near = (c, t, tol) => Math.abs(c[0] - t[0]) < tol && Math.abs(c[1] - t[1]) < tol && Math.abs(c[2] - t[2]) < tol;

// vareta: vermelho saturado 0xff2614
const colsRod = new Map();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (near(px(x, y), [0xff, 0x26, 0x14], 60)) colsRod.set(x, (colsRod.get(x) || 0) + 1);
const rodX = [...colsRod.entries()].filter(([, n]) => n > 5).map(([x]) => x).sort((a, b) => a - b);
const rodPix = rodX.length ? Math.max(...rodX.map((x) => colsRod.get(x))) : 0;
// vão: cinza-escuro quente 0x2b2a27 (matVao), na metade esquerda onde está a fachada-alvo
const voids = [];
for (let x = 0; x < W; x++) {
  let run = 0, best = 0, y0 = 0, yBest = 0;
  for (let y = Math.floor(H * 0.25); y < Math.floor(H * 0.95); y++) {
    if (near(px(x, y), [0x2b, 0x2a, 0x27], 14)) { if (run === 0) y0 = y; run++; if (run > best) { best = run; yBest = y0; } }
    else run = 0;
  }
  if (best > 8) voids.push({ x, h: best, y0: yBest });
}
// agrupa colunas contíguas em aberturas e pega a maior
const grupos = [];
for (const v of voids) {
  const last = grupos[grupos.length - 1];
  if (last && v.x - last.x1 <= 3 && Math.abs(v.y0 - last.y0) < 40) { last.x1 = v.x; last.h = Math.max(last.h, v.h); last.y0 = Math.min(last.y0, v.y0); }
  else grupos.push({ x0: v.x, x1: v.x, h: v.h, y0: v.y0 });
}
grupos.sort((a, b) => b.h - a.h);
const maior = grupos[0] || null;
const mpp = rodPix ? 1.7 / rodPix : null;
console.log(file);
console.log(`  vareta 1,70 m: ${rodPix} px de altura (m/px = ${mpp ? mpp.toFixed(4) : '?'})`);
if (maior && mpp) {
  console.log(`  maior vão escuro: ${maior.h} px ≈ ${(maior.h * mpp).toFixed(2)} m · base y=${maior.y0} (${(maior.y0 / H * 100).toFixed(0)}% da altura do quadro) · largura ${maior.x1 - maior.x0} px`);
  console.log(`  porta de referência (2,10 m) teria ${(2.10 / mpp).toFixed(0)} px`);
} else console.log('  vão não encontrado');

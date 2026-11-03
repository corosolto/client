// Recorta a arte crua de uma moeda TRETA$ gerada pelo OpenRouter
// (../coro-solto-studio/tools/gen-image.mjs --raw-only, uma moeda por imagem, fundo branco liso) no MESMO
// formato da moeda do Saci (public/img/treta/coin-classic-saci.webp): webp 512×512,
// moeda de borda a borda, fora do círculo transparente.
//
// A moeda é o trecho contínuo mais longo de colunas e de linhas com tinta (não branco).
// O recorte é o quadrado em volta desse círculo e a máscara circular apaga o resto.
//
// Uso:
//   node tools/treta-coin-cut.mjs --coin curupira --from /tmp/gen-image/treta-coin-curupira-v1.png
//   ... --out public/img/treta   (padrão)
import sharp from 'sharp';
import { TRETA_COINS } from '../public/js/treta-catalog.js';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const die = (m) => { console.error('ERRO:', m); process.exit(1); };
const FROM = arg('from') || die('faltou --from <png cru da moeda>');
const coin = TRETA_COINS.find((c) => c.character === arg('coin')) || die(`--coin deve ser um de: ${TRETA_COINS.map((c) => c.character).join(', ')}`);
const OUT = arg('out', 'public/img/treta');
const SIZE = 512;

const { data, info } = await sharp(FROM).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const ink = (x, y) => { const i = (y * W + x) * 3; return 765 - data[i] - data[i + 1] - data[i + 2] > 60; };
const longest = (n, has) => { let best = [0, -1], s = -1; for (let i = 0; i <= n; i++) { if (i < n && has(i)) { if (s < 0) s = i; } else if (s >= 0) { if (i - s > best[1] - best[0]) best = [s, i]; s = -1; } } return best; };
const minRun = 0.02;
const colHas = (x) => { let c = 0; for (let y = 0; y < H; y++) if (ink(x, y)) c++; return c > H * minRun; };
const rowHas = (y) => { let c = 0; for (let x = 0; x < W; x++) if (ink(x, y)) c++; return c > W * minRun; };
const [cx0, cx1] = longest(W, colHas), [ry0, ry1] = longest(H, rowHas);
const bw = cx1 - cx0, bh = ry1 - ry0;
if (bw < W * 0.4 || bh < H * 0.4) die(`${coin.character}: moeda não encontrada (${bw}×${bh})`);
if (Math.abs(bw - bh) > Math.max(bw, bh) * 0.03) die(`${coin.character}: recorte não é círculo (${bw}×${bh}); a moeda está inclinada ou cortada`);
if (cx0 === 0 || ry0 === 0 || cx1 === W || ry1 === H) die(`${coin.character}: moeda encosta na borda da imagem`);
const d = Math.max(bw, bh), cx = cx0 + bw / 2, cy = ry0 + bh / 2;
const left = Math.max(0, Math.round(cx - d / 2)), top = Math.max(0, Math.round(cy - d / 2));
const side = Math.min(Math.round(d), W - left, H - top);
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 0.5}" fill="#fff"/></svg>`);
const file = `${OUT}/coin-classic-${coin.character}.webp`;
await sharp(FROM).extract({ left, top, width: side, height: side }).resize(SIZE, SIZE)
  .ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 86, alphaQuality: 100 }).toFile(file);
console.log(`✓ T$ ${coin.value} ${coin.name}: ${file} (círculo ${bw}×${bh} px no cru)`);

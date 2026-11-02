#!/usr/bin/env node
/* char-sheet.mjs — CONTACT SHEET do gauntlet de personagens.
   ----------------------------------------------------------------------------
   Monta uma grade PNG com um retrato por personagem (ângulo à escolha) a
   partir de artifacts/gauntlet/<label>/, com nome + frenteZ/dMaoR no rodapé
   de cada célula. O gosto final é humano: a folha é o que vai pro dono.

   Uso: node tools/eval/char-sheet.mjs [--label=baseline] [--ang=frente]
        [--arma=ak] [--cols=8] [--out=saida.png] [--pior=N]
   Sem --out imprime o caminho do PNG gerado em artifacts/gauntlet/<label>/. */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const LABEL = arg('label', 'baseline');
const ANG = arg('ang', 'frente');
const ARMA = arg('arma', 'ak');
const COLS = parseInt(arg('cols', '8'), 10);
const PIOR = parseInt(arg('pior', '0'), 10);
const DIR = join(ROOT, 'artifacts', 'gauntlet', LABEL);

const manifest = existsSync(join(DIR, 'manifest.json'))
  ? JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'))
  : { resultados: [] };
const nums = new Map(manifest.resultados.filter((r) => !r.erro && r.wid === ARMA).map((r) => [r.id, r.num]));

let ids = readdirSync(DIR)
  .filter((f) => f.endsWith(`__${ARMA}__${ANG}.png`))
  .map((f) => f.split('__')[0]);
if (PIOR) {
  // piores N por frenteZ (palma à frente do corpo) — heurística de ordenação da folha
  ids.sort((a, b) => (nums.get(b)?.frenteZ ?? 0) - (nums.get(a)?.frenteZ ?? 0));
}
const CELL_W = 280, CELL_H = 380, PAD = 6, FOOT = 34;

const cells = [];
for (const id of ids) {
  const buf = readFileSync(join(DIR, `${id}__${ARMA}__${ANG}.png`));
  const n = nums.get(id) || {};
  const svg = `<svg width="${CELL_W}" height="${FOOT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#181b1f"/>
    <text x="8" y="14" fill="#e8ff8a" font-family="monospace" font-size="13" font-weight="bold">${id}</text>
    <text x="8" y="29" fill="#9aa39b" font-family="monospace" font-size="11">fz ${n.frenteZ ?? '?'} · dMaoR ${n.dMaoR ?? '?'} · dMaoL ${n.dMaoL ?? '—'}${n.oneHanded ? ' · 1m' : ''}</text>
  </svg>`;
  cells.push({ id,
    img: await sharp(buf).resize(CELL_W - PAD * 2, CELL_H - FOOT - PAD * 2, { fit: 'contain', background: '#202226' }).png().toBuffer(),
    foot: Buffer.from(svg) });
}

const rows = Math.max(1, Math.ceil(cells.length / COLS));
const W = COLS * CELL_W, H = rows * CELL_H;
const composite = cells.map((c, i) => ({
  input: c.img, left: (i % COLS) * CELL_W + PAD, top: Math.floor(i / COLS) * CELL_H + PAD,
}));
const compositeFoot = cells.map((c, i) => ({
  input: c.foot, left: (i % COLS) * CELL_W, top: Math.floor(i / COLS) * CELL_H + CELL_H - FOOT,
}));
const out = arg('out') || join(DIR, `sheet__${ARMA}__${ANG}${PIOR ? `__pior${PIOR}` : ''}.png`);
await sharp({ create: { width: W, height: H, channels: 3, background: '#101216' } })
  .composite([...composite, ...compositeFoot]).png().toFile(out);
console.log(`${out} — ${cells.length} personagens, ${COLS} colunas, arma=${ARMA}, ângulo=${ANG}`);

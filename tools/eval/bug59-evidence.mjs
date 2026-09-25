/* bug59-evidence.mjs — prancha de evidência do lote BUG-59, no espírito da
   regra "gere a figura e OLHE": cada linha = avatar 256 (tamanho do rail),
   arte de resultado reduzida a 256×384 (proporção 1024×1536 servida), e
   quadros de seleção/vitória/derrota a 160×214 / 214×214. Receipts JSON com
   dimensões, margens UIA19 e SHA em tools/eval/asset-evidence/bug59/. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'bandeirante', 'boto', 'camera-roxa', 'cuca', 'curupira', 'designer-ux',
  'doidinho-bairro', 'gilbomes', 'lampiao', 'lenda-lanhouse', 'lobisomem',
  'mariabonita', 'microfonildo', 'motoca-cachorro-loko', 'profeta-calcada',
  'programador-virado', 'saci', 'zumbi',
];
const OUT = 'tools/eval/asset-evidence/bug59';
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'bug59-ev-'));
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);

async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = new Uint32Array(info.height); const cols = new Uint32Array(info.width);
  let total = 0;
  for (let y = 0, p = 3; y < info.height; y++) {
    for (let x = 0; x < info.width; x++, p += info.channels) {
      if (data[p] <= 8) continue;
      cols[x]++; rows[y]++; total++;
    }
  }
  const q = (hist, f) => { const t = total * f; let a = 0; for (let i = 0; i < hist.length; i++) { a += hist[i]; if (a >= t) return i; } return hist.length - 1; };
  return {
    top: q(rows, .002) / info.height, bottom: (info.height - 1 - q(rows, .998)) / info.height,
    left: q(cols, .002) / info.width, right: (info.width - 1 - q(cols, .998)) / info.width,
  };
}

const CELW = [256, 256, 160, 214, 214];
const H_MAX = 384, GAP = 12, ALT_CEL = H_MAX;
const receipts = [];
const comp = [];
const rotulos = ['avatar', 'resultado', 'seleção', 'vitória', 'derrota'];

for (let i = 0; i < IDS.length; i++) {
  const id = IDS[i];
  const avatar = `public/img/chars/avatars/${id}.webp`;
  const still = `public/img/resultado/${id}-vitoria.webp`;
  const sel = `public/video/chars/${id}.webm`;
  const vit = `public/video/resultado/${id}-vitoria.webm`;
  const der = `public/video/resultado/${id}-derrota.webm`;
  for (const f of [avatar, still, sel, vit, der]) {
    if (!existsSync(f)) { console.error(`✗ ${id}: falta ${f}`); process.exit(1); }
  }
  const frame = (webm, t, name) => {
    const p = join(tmp, `${id}-${name}.png`);
    execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-ss', String(t), '-i', webm, '-frames:v', '1', p]);
    return p;
  };
  const b = await alphaBounds(readFileSync(still));
  receipts.push({
    id,
    avatar: { sha: sha(avatar), derivado: `public/video/chars/${id}.webm@1.0s cover 256` },
    still: {
      sha: sha(still), parByteIdêntico: sha(still) === sha(`public/img/resultado/${id}-derrota.webp`),
      margens: { top: +b.top.toFixed(3), bottom: +b.bottom.toFixed(3), left: +b.left.toFixed(3), right: +b.right.toFixed(3) },
      usoVertical: +(1 - b.top - b.bottom).toFixed(3),
    },
    selecao: { sha: sha(sel) }, vitoria: { sha: sha(vit) }, derrota: { sha: sha(der) },
  });
  const celulas = [
    { buf: await sharp(avatar).resize(CELW[0], 256, { fit: 'contain', background: '#111' }).png().toBuffer(), h: 256 },
    { buf: await sharp(still).resize(CELW[1], 384, { fit: 'contain', background: '#111' }).png().toBuffer(), h: 384 },
    { buf: await sharp(frame(sel, 1.0, 'sel')).resize(CELW[2], 214, { fit: 'contain', background: '#111' }).png().toBuffer(), h: 214 },
    { buf: await sharp(frame(vit, 0.9, 'vit')).resize(CELW[3], 214, { fit: 'contain', background: '#111' }).png().toBuffer(), h: 214 },
    { buf: await sharp(frame(der, 1.2, 'der')).resize(CELW[4], 214, { fit: 'contain', background: '#111' }).png().toBuffer(), h: 214 },
  ];
  const top = 30 + i * (ALT_CEL + 34);
  let x = 0;
  for (let c = 0; c < celulas.length; c++) {
    comp.push({ input: celulas[c].buf, left: x, top: top + (ALT_CEL - celulas[c].h) / 2 });
    if (i === 0) comp.push({ input: Buffer.from(`<svg width="${CELW[c]}" height="18"><text x="2" y="14" font-family="monospace" font-size="12" fill="#9aa">${rotulos[c]}</text></svg>`), left: x, top: top - 20 });
    x += CELW[c] + GAP;
  }
  comp.push({ input: Buffer.from(`<svg width="360" height="26"><text x="2" y="20" font-family="monospace" font-size="16" fill="#fff">${id}</text></svg>`), left: 0, top: top + ALT_CEL + 4 });
}

const LARG = CELW.reduce((s, w) => s + w + GAP, 0);
const ALT = 30 + IDS.length * (ALT_CEL + 34);
await sharp({ create: { width: LARG, height: ALT, channels: 4, background: '#1a1a1e' } })
  .composite(comp).png().toFile(join(OUT, 'contact-sheet-18.png'));
writeFileSync(join(OUT, 'receipts.json'), `${JSON.stringify({ gerado: new Date().toISOString(), lote: IDS.length, fonte: 'GLB do jogo via char-native-vids/char-result-stills' }, null, 2)}\n${JSON.stringify(receipts, null, 2)}\n`);
console.log(`✓ ${OUT}/contact-sheet-18.png + receipts.json (${IDS.length} personagens)`);

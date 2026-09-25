/* Calibração do lote BUG-59: reproduz a receita do avatar (punk@gotinha @1.0s)
   e mede os bounds de alpha das artes de resultado existentes (alvo UIA19). */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);

async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = new Uint32Array(info.width);
  const rows = new Uint32Array(info.height);
  let total = 0;
  for (let y = 0, p = 3; y < info.height; y++) {
    for (let x = 0; x < info.width; x++, p += info.channels) {
      if (data[p] <= 8) continue;
      cols[x]++; rows[y]++; total++;
    }
  }
  const quantile = (hist, q) => {
    const target = total * q; let acc = 0;
    for (let i = 0; i < hist.length; i++) { acc += hist[i]; if (acc >= target) return i; }
    return hist.length - 1;
  };
  const left = quantile(cols, .002), right = quantile(cols, .998);
  const top = quantile(rows, .002), bottom = quantile(rows, .998);
  return {
    width: info.width, height: info.height, total,
    left: +(left / info.width).toFixed(3), right: +((info.width - 1 - right) / info.width).toFixed(3),
    top: +(top / info.height).toFixed(3), bottom: +((info.height - 1 - bottom) / info.height).toFixed(3),
  };
}

const dir = mkdtempSync(join(tmpdir(), 'bug59-cal-'));
for (const id of ['punk', 'gotinha']) {
  const png = join(dir, `${id}-1s.png`);
  execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-ss', '1.0', '-i', `public/video/chars/${id}.webm`, '-frames:v', '1', png]);
  const avatar = readFileSync(`public/img/chars/avatars/${id}.webp`);
  const meta = await sharp(avatar).metadata();
  console.log(`avatar ${id}: ${meta.width}x${meta.height} alpha=${meta.hasAlpha} sha=${sha(avatar)}`);
  for (const modo of ['cover', 'contain']) {
    const out = await sharp(png).resize(256, 256, { fit: modo, kernel: 'lanczos3' }).removeAlpha().toColorspace('srgb').webp({ quality: 90 }).toBuffer();
    console.log(`  derivado ${modo}: sha=${sha(out)} tamanho=${out.length} (original ${avatar.length})`);
  }
  // variação: flatten sobre cor média de fundo do frame
  const flat = await sharp(png).resize(256, 256, { fit: 'cover', kernel: 'lanczos3' }).flatten().webp({ quality: 90 }).toBuffer();
  console.log(`  derivado cover+flatten: sha=${sha(flat)} tamanho=${flat.length}`);
}
console.log('\n== bounds das artes de resultado existentes (alvo do gerador) ==');
for (const f of ['mst-vitoria.webp', 'punk-vitoria.webp', 'gotinha-vitoria.webp', 'bonzo-vitoria.webp']) {
  const b = await alphaBounds(readFileSync(`public/img/resultado/${f}`));
  console.log(f, JSON.stringify(b), 'usoPrincipal=', +(1 - b.top - b.bottom).toFixed(3));
}

/* bug59-avatars.mjs — avatares .webp dos 18 do BUG-59, derivados do PRÓPRIO
   vídeo de seleção (frame @1.0s), como o registro do lote de 44 documenta
   (redesign-static-audit.json: avatarReference 'public/video/chars/{punk,gotinha}.webm@1.0s').
   256×256 opacos, cover — mesma forma dos 44 existentes (medido: punk/gotinha
   256×256 alpha=false). punk e gotinha NÃO são regenerados: os SHAs deles estão
   pinados na UIA28. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'bandeirante', 'boto', 'camera-roxa', 'cuca', 'curupira', 'designer-ux',
  'doidinho-bairro', 'gilbomes', 'lampiao', 'lenda-lanhouse', 'lobisomem',
  'mariabonita', 'microfonildo', 'motoca-cachorro-loko', 'profeta-calcada',
  'programador-virado', 'saci', 'zumbi',
];
const dir = mkdtempSync(join(tmpdir(), 'bug59-av-'));
for (const id of IDS) {
  const webm = `public/video/chars/${id}.webm`;
  if (!existsSync(webm)) { console.error(`✗ ${id}: sem ${webm} — rode o char-native-vids primeiro`); process.exit(1); }
  const png = join(dir, `${id}.png`);
  execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-ss', '1.0', '-i', webm, '-frames:v', '1', png]);
  const out = `public/img/chars/avatars/${id}.webp`;
  await sharp(png).resize(256, 256, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().webp({ quality: 90 }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`✓ ${id} ${m.width}×${m.height} alpha=${m.hasAlpha}`);
}
console.log('FIM');

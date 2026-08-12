import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const output = process.argv[2];
const entries = process.argv.slice(3);
if (!output || !entries.length) throw new Error('uso: node script saida.json rotulo=imagem ...');
const rows = entries.map((entry) => {
  const split = entry.indexOf('=');
  const label = entry.slice(0, split);
  const file = entry.slice(split + 1);
  const [width, height] = execFileSync('magick', [file, '-trim', '-format', '%w %h', 'info:'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
  return { label, file, canvasPx: 150, visibleWidthPx: width, visibleHeightPx: height };
});
const result = { method: 'fixed orthographic Blender render; ImageMagick alpha trim', targetVisibleWidthPx: 115, rows };
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));

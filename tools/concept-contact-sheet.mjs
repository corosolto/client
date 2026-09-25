#!/usr/bin/env node
/* Monta sheet de revisão com cada concept exatamente a 150 px.
   node tools/concept-contact-sheet.mjs --out <png> --item rotulo=caminho [...]
*/
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const output = outIndex >= 0 ? args[outIndex + 1] : null;
const items = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--item') {
  const raw = args[++i] || '', split = raw.indexOf('=');
  if (split < 1) throw new Error('--item exige rotulo=caminho');
  items.push({ label: raw.slice(0, split), path: raw.slice(split + 1) });
}
if (!output || !items.length) throw new Error('uso: --out <png> --item rotulo=caminho [...]');
const esc = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tileWidth = 180, imageSize = 150, labelHeight = 30, tileHeight = imageSize + labelHeight;
const columns = Math.min(2, items.length), rows = Math.ceil(items.length / columns);
const composites = [];
const receiptItems = [];
for (const [index, item] of items.entries()) {
  const bytes = readFileSync(item.path);
  const image = await sharp(bytes).resize(imageSize, imageSize, { fit: 'contain', background: '#171922' }).png().toBuffer();
  const left = (index % columns) * tileWidth + (tileWidth - imageSize) / 2, top = Math.floor(index / columns) * tileHeight;
  composites.push({ input: image, left, top });
  composites.push({ input: Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#171922"/><text x="${tileWidth / 2}" y="20" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#ffffff">${esc(item.label)}</text></svg>`), left: (index % columns) * tileWidth, top: top + imageSize });
  receiptItems.push({ label: item.label, path: item.path, sha256: createHash('sha256').update(bytes).digest('hex') });
}
mkdirSync(dirname(output), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background: '#171922' } })
  .composite(composites).png().toFile(output);
const outputBytes = readFileSync(output);
writeFileSync(`${output}.json`, `${JSON.stringify({ imageHeightPerConcept: imageSize, columns, rows,
  items: receiptItems, sha256: createHash('sha256').update(outputBytes).digest('hex') }, null, 2)}\n`);
console.log(`CONTACT_SHEET=${output} (${columns}x${rows}; ${imageSize}px por concept)`);

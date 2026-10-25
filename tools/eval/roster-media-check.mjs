import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';

const source = readFileSync('public/js/characters.js', 'utf8');
const roster = vm.runInNewContext(source.match(/export const CHARACTERS = (\[[\s\S]*?\n\]);/)[1]).filter(c => c.team === 'P' || c.team === 'M');
const manifest = JSON.parse(readFileSync('public/img/walls.json', 'utf8'));
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const spritesOnly = process.argv.includes('--sprites-only');
const wallpapers = JSON.parse(readFileSync('public/img/roster-wallpapers.json', 'utf8'));
const failures = [];
for (const path of spritesOnly ? [] : manifest.loading) {
  const meta = await sharp(`public${path}`).metadata();
  const width = mutant === 'palhaco-3x2' && path.endsWith('loading-20.webp') ? 1536 : meta.width;
  const height = mutant === 'palhaco-3x2' && path.endsWith('loading-20.webp') ? 1024 : meta.height;
  if (width * 9 !== height * 16) failures.push(`${path}: ${width}×${height}, exige 16:9`);
}
for (const { id } of roster) {
  const path = wallpapers.find(w => w.id === id)?.wall;
  if (!spritesOnly) {
    if (!path || !existsSync(`public${path}`)) failures.push(`${id}: wallpaper ausente`);
    else {
      const meta = await sharp(`public${path}`).metadata();
      if (meta.width * 2 !== meta.height * 3) failures.push(`${id}: wallpaper fora de 3:2`);
      assert(manifest.walls.includes(path), `${id}: wallpaper fora da rotação`);
    }
  }
  for (const suffix of ['', '-still']) {
    const path = `public/img/roster-sprites/${id}${suffix}.webp`;
    if (!existsSync(path)) { failures.push(`${id}${suffix}: sprite ausente`); continue; }
    const sprite = await sharp(path, { animated: true }).metadata();
    const width = mutant === 'sprite-esticado' && id === roster[0].id ? 384 : sprite.width;
    if (width !== 192 || (sprite.pageHeight || sprite.height) !== 192 || !sprite.hasAlpha) failures.push(`${id}${suffix}: quadro/alpha incorreto`);
    if (!suffix && (sprite.pages || 1) < 2) failures.push(`${id}: sprite sem animação`);
  }
}
console.log(`ROSTER-MEDIA: ${roster.length} personagens; ${failures.length} falhas`);
if (failures.length) { console.error(failures.slice(0, 8).join('\n')); process.exitCode = 1; }

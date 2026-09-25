/* A thumbnail usa a arma canônica do personagem e deixa recibo ligado ao arquivo.

   Caso real: Programador e Doidinho foram capturados com `svd`, embora CHAR_WEAPON
   declare M4/P90. O script de captura aceitava a arma manualmente e não persistia
   proveniência; uma imagem errada parecia válida para todos os gates estruturais.
   `--mutante=arma-trocada` altera o recibo em memória e deve reprovar.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { charWeapon } = await import('../../public/js/characters.js');
const IDS = ['camera-roxa', 'programador-virado', 'motoca-cachorro-loko', 'doidinho-bairro', 'designer-ux', 'lenda-lanhouse'];
const MUT = process.argv.includes('--mutante=arma-trocada');
const falhas = [];
for (const [index, id] of IDS.entries()) {
  const file = `public/img/chars/${id}.webp`, receipt = `${file}.json`;
  if (!existsSync(file) || !existsSync(receipt)) {
    falhas.push(`${id}: thumbnail ou recibo ausente`); continue;
  }
  const meta = JSON.parse(readFileSync(receipt, 'utf8'));
  if (MUT && index === 0) meta.weapon = 'svd';
  const image = await sharp(file).metadata();
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (meta.char !== id) falhas.push(`${id}: recibo pertence a ${meta.char}`);
  if (meta.weapon !== charWeapon(id)) falhas.push(`${id}: ${meta.weapon} no thumbnail, ${charWeapon(id)} no jogo`);
  if (meta.sha256 !== sha256) falhas.push(`${id}: SHA do recibo não corresponde ao WebP`);
  if (image.width !== 360 || image.height !== 463) falhas.push(`${id}: ${image.width}×${image.height}, esperado 360×463`);
}
if (falhas.length) {
  falhas.forEach((falha) => console.error(`✗ ${falha}`));
  process.exit(1);
}
console.log(`CHAR-THUMBNAIL ✓ ${IDS.length}/${IDS.length} armas canônicas + SHA + 360×463`);

// Deriva os normal maps da água (RC2, plans/23) da textura de superfície gerada
// via OpenRouter (tools/gen-image.mjs — a regra da casa é 2D só por lá). O modelo
// de imagem NÃO sabe o que é um normal map (entrega azul decorativo errado), então
// o que ele gera é a SUPERFÍCIE vista de cima e a normal sai da luminância por
// sobel — derivada honesta, sem atribuir ao modelo o que ele não fez.
//
// Uso: node tools/gen-water-normals.mjs /tmp/gen-image/water-surface-v1.png
//   -> public/img/textures/water_normal_a.webp (força 1,0, quadrante 512)
//   -> public/img/textures/water_normal_b.webp (força 0,55, blur+256: frequência
//      maior — as duas camadas em scroll cruzado são o que tira o "padrão único")
// No shader, MirroredRepeatWrapping elimina a emenda do recorte por construção.
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC) { console.error('uso: node tools/gen-water-normals.mjs <png de superfície>'); process.exit(1); }

function sobelNormal(lum, w, h, forca) {
  const out = Buffer.alloc(w * h * 3);
  const L = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = (L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1));
    const gy = (L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1));
    let nx = -gx * forca, ny = gy * forca, nz = 255;
    const inv = 1 / Math.hypot(nx, ny, nz);
    const i = (y * w + x) * 3;
    out[i] = Math.round((nx * inv * 0.5 + 0.5) * 255);
    out[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
    out[i + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
  }
  return out;
}

async function deriva({ forca, size, blur, dest }) {
  let img = sharp(SRC).extract({ left: 0, top: 0, width: 512, height: 512 }).greyscale();
  if (blur) img = img.blur(blur);
  const { data, info } = await img.resize(size, size).raw().toBuffer({ resolveWithObject: true });
  const normal = sobelNormal(data, info.width, info.height, forca);
  await sharp(normal, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 95 }).toFile(dest);
  console.log('  ->', dest, `${info.width}x${info.height}, forca ${forca}`);
}

await deriva({ forca: 1.0, size: 512, blur: 0, dest: 'public/img/textures/water_normal_a.webp' });
await deriva({ forca: 0.55, size: 256, blur: 1.2, dest: 'public/img/textures/water_normal_b.webp' });

// KTX2/Basis nas texturas de personagem e arma: a textura chega COMPRIMIDA na GPU.
// Um 1024² RGBA8 com mipmaps ocupa 5,6 MB de VRAM; transcodificado (BC/ASTC/ETC) cai a ~0,7 MB.
// O PREÇO é download: ETC1S fica ~45% maior que WebP no disco, e o transcoder do cliente pesa
// 571 KB. Por isso a decisão é da régua KTX1 (VRAM) contra a BOOT (bytes), não do gosto.
// Exige `basisu` no PATH (brew install basis_universal) e o transcoder vendorizado.
// Uso: node tools/optimize-ktx2.mjs <pasta> [--seco]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import path from 'node:path';

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const SRC = process.argv[2];
const SECO = process.argv.includes('--seco');
if (!SRC) { console.error('uso: node tools/optimize-ktx2.mjs <pasta> [--seco]'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const tmp = mkdtempSync(path.join(tmpdir(), 'ktx2-'));

let antes = 0, depois = 0, convertidas = 0, vramAntes = 0, vramDepois = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.glb')).sort()) {
  const entrada = path.join(SRC, f);
  antes += statSync(entrada).size;
  const doc = await io.read(entrada);
  const basisu = doc.createExtension(KHRTextureBasisu).setRequired(true);
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(); if (!img || t.getMimeType() === 'image/ktx2') continue;
    const [w, h] = t.getSize() || [0, 0];
    vramAntes += w * h * 4 * 1.33;
    /* ETC1S em tudo: UASTC (melhor para normal) ficou 7× maior que o WebP no teste — o funil
       não paga isso. `-mipmap` porque a cadeia vem no arquivo, não gerada no cliente. */
    const png = path.join(tmp, 'in.png'), out = path.join(tmp, 'out.ktx2');
    await sharp(Buffer.from(img)).png().toFile(png);
    execFileSync('basisu', ['-ktx2', '-mipmap', '-q', '160', png, '-output_file', out], { stdio: 'ignore' });
    t.setImage(new Uint8Array(readFileSync(out))).setMimeType('image/ktx2');
    vramDepois += w * h * 0.5 * 1.33;   // ETC1S transcodifica para 4 bpp (BC1/ETC1/ASTC)
    convertidas++;
  }
  if (!convertidas) basisu.dispose();
  if (!SECO) { await io.write(entrada, doc); depois += statSync(entrada).size; } else depois += statSync(entrada).size;
}
const mb = (b) => (b / 1048576).toFixed(1);
console.log(`${SRC}: ${convertidas} texturas · disco ${mb(antes)} -> ${mb(depois)} MB · VRAM ${mb(vramAntes)} -> ${mb(vramDepois)} MB`);
if (SECO) console.log('(--seco: nada foi escrito)');

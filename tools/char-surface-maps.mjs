/* char-surface-maps.mjs — dá normal + roughness aos personagens que só têm albedo.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO (invariante CHR5B, aviso): 27 dos 44 personagens com ZERO mapa de
   superfície, contra 18 normalMaps no melhor mapa do mundo (loja_h). É literalmente
   o "três níveis de acabamento na mesma tela" que o dono descreveu, e ele piora
   conforme os cenários sobem de qualidade.

   A conta é a MESMA do resto do jogo, de propósito — consistência antes de fidelidade.
   `public/js/textures.js` deriva relevo e aspereza do próprio canvas de albedo desde a
   rodada R7, e é o que os 5 mapas usam via `lam()`:

     normal    Sobel da luminância, nz = 1                   (textures.js:31-45)
     roughness r = hi + (lo − hi)·lum, claro = mais lustroso  (textures.js:47-59)

   Aqui a mesma fórmula roda offline sobre o albedo EMBUTIDO no GLB e o resultado é
   gravado no próprio GLB com gltf-transform. Nada disso é textura nova: é o albedo que
   já está lá, lido de outro jeito.

   PARÂMETROS ESCOLHIDOS PARA PERSONAGEM, NÃO PARA PAREDE
   • FORCA = 1.1 contra os 2.2 do textures.js. O albedo dos personagens já vem do Mint
     com sombra pintada (olho, boca, dobra de pano); a 2.2 o Sobel transforma o desenho
     do rosto em relevo e o personagem ganha cicatriz. Comparado em imagem.
   • ROUGH_LO/HI = 0.80/1.00, centrado perto de 1,0 e não em 0,55/0,98. O material do
     personagem em runtime usa `roughness: 0.86` FIXO (characters.js:294) e o mapa entra
     como MULTIPLICADOR — mapa centrado em 1,0 quebra o especular chapado sem mudar a
     média do elenco. Com 0,55/0,98 todo mundo ficaria 30% mais lustroso de uma vez.
   • 512² (o MAX_DETAIL do textures.js): relevo não precisa da resolução do albedo, e
     512 em webp custa ~25 KB contra ~90 KB em 1024.

   ARMADILHA MEDIDA: o `upgradeCharMaterial` (characters.js:289) reconstrói o material e
   carrega `map` e `normalMap`, mas NÃO `roughnessMap` — `grep roughnessMap public/js/
   characters.js public/js/glbchars.js` não dá uma linha. Ou seja, os 17 personagens que
   JÁ tinham metallicRoughnessTexture do Mint nunca usaram isso na tela: o CHR5B contava
   arquivo, e o pixel vinha de `roughness: 0.86` fixo. Embutir mapa sem consertar isso
   seria peso morto no download.

   uso: node tools/char-surface-maps.mjs <id|arquivo.glb> [...]
        node tools/char-surface-maps.mjs --sem-mapa          (todos os que faltam)
   env: FORCA (1.1) · ROUGH_LO (0.80) · ROUGH_HI (1.00) · TAM (512) · SAIDA (dir)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const CHARS = 'public/models/characters';
const FORCA = +(process.env.FORCA || 1.1);
const LO = +(process.env.ROUGH_LO || 0.80);
const HI = +(process.env.ROUGH_HI || 1.00);
const TAM = +(process.env.TAM || 512);
const SAIDA = process.env.SAIDA || CHARS;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function normalDoAlbedo(px, w, h, forca) {
  const out = Buffer.alloc(w * h * 3);
  const L = (x, y) => {
    x = (x + w) % w; y = (y + h) % h;
    const i = (y * w + x) * 3;
    return (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * forca;
    const dy = (L(x, y + 1) - L(x, y - 1)) * forca;
    const nx = -dx, ny = dy, l = Math.sqrt(nx * nx + ny * ny + 1);
    const i = (y * w + x) * 3;
    out[i] = Math.round((nx / l * 0.5 + 0.5) * 255);
    out[i + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
    out[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
  }
  return out;
}

// glTF: metallicRoughnessTexture leva oclusão em R, ASPEREZA em G, metal em B.
function metalRoughDoAlbedo(px, w, h, lo, hi) {
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0, j = 0; i < w * h * 3; i += 3, j += 3) {
    const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    const r = Math.max(0, Math.min(1, hi + (lo - hi) * lum));
    out[j] = 255;                       // R (oclusão) neutro — AO não é derivável de albedo
    out[j + 1] = Math.round(r * 255);   // G = roughness
    out[j + 2] = 0;                     // B = metallic (o runtime força metalness 0)
  }
  return out;
}

async function trata(alvo) {
  const file = alvo.endsWith('.glb') ? alvo : `${CHARS}/${alvo}.glb`;
  const id = path.basename(file, '.glb');
  if (!fs.existsSync(file)) { console.error(`sem arquivo: ${file}`); return null; }
  const antes = fs.statSync(file).size;
  const doc = await io.read(file);
  doc.createExtension(EXTTextureWebP).setRequired(false);
  const root = doc.getRoot();
  let feitos = 0, pulados = 0;
  for (const mat of root.listMaterials()) {
    const base = mat.getBaseColorTexture();
    if (!base) { pulados++; continue; }
    if (mat.getNormalTexture() && mat.getMetallicRoughnessTexture()) { pulados++; continue; }
    const img = sharp(Buffer.from(base.getImage()));
    const { data, info } = await img.clone().resize(TAM, TAM, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    if (!mat.getNormalTexture()) {
      const buf = await sharp(normalDoAlbedo(data, w, h, FORCA), { raw: { width: w, height: h, channels: 3 } })
        .webp({ quality: 90 }).toBuffer();
      const t = doc.createTexture(`${id}_normal`).setMimeType('image/webp').setImage(buf);
      mat.setNormalTexture(t);
      mat.setNormalScale(1);
    }
    if (!mat.getMetallicRoughnessTexture()) {
      const buf = await sharp(metalRoughDoAlbedo(data, w, h, LO, HI), { raw: { width: w, height: h, channels: 3 } })
        .webp({ quality: 85 }).toBuffer();
      const t = doc.createTexture(`${id}_metalrough`).setMimeType('image/webp').setImage(buf);
      mat.setMetallicRoughnessTexture(t);
    }
    feitos++;
  }
  if (!feitos) { console.log(`${id}: nada a fazer (${pulados} materiais já completos ou sem albedo)`); return null; }
  const out = `${SAIDA}/${id}.glb`;
  fs.mkdirSync(SAIDA, { recursive: true });
  await io.write(out, doc);
  const depois = fs.statSync(out).size;
  console.log(`${id}: ${feitos} material(is) | ${(antes / 1024) | 0} KB -> ${(depois / 1024) | 0} KB (+${(((depois - antes) / 1024)) | 0} KB)`);
  return { id, antes, depois };
}

let alvos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (process.argv.includes('--sem-mapa')) {
  const probe = JSON.parse(fs.readFileSync('tools/eval/char_probe.json', 'utf8'));
  alvos = probe.personagens.filter((p) => (p.C5.mapasDeSuperficie || 0) === 0).map((p) => p.id);
  console.log(`--sem-mapa: ${alvos.length} personagens sem mapa de superfície no char_probe.json`);
}
if (!alvos.length) { console.error('uso: char-surface-maps <id|arquivo.glb> ... | --sem-mapa'); process.exit(1); }
let sa = 0, sd = 0;
for (const a of alvos) { const r = await trata(a); if (r) { sa += r.antes; sd += r.depois; } }
console.log(`\nTOTAL ${(sa / 1048576).toFixed(2)} MB -> ${(sd / 1048576).toFixed(2)} MB  (+${((sd - sa) / 1048576).toFixed(2)} MB)  FORCA=${FORCA} rough ${LO}..${HI} ${TAM}px`);

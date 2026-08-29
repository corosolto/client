// Otimização TEXTURA-ONLY das armas (models/weapons) — a única pasta de modelo que nunca
// passou por otimizador, e a que mais custa VRAM: 78 texturas, 3,3 MB em disco viram ~259 MB
// descomprimidas (RGBA8+mips), contra 89 MB dos 9 personagens de uma partida. `g3` e `m92`
// carregam três 2048² cada (21,3 MB de VRAM POR textura), herdadas cruas da Mint.
// Mesma receita já validada em optimize-tribos: resize 1024 + webp + prune/dedup.
// NUNCA quantize/simplify — malha skinned explode no GPU real e passa no headless (lição da
// R-saga, ver o cabeçalho do optimize-tribos). Aqui não é skinned, mas a arma na mão é a coisa
// mais olhada do jogo: geometria fica intocada e só a textura desce.
// Uso: node tools/optimize-armas.mjs [--saida=DIR] [--tex=1024] [--seco]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const SRC = 'public/models/weapons';
const OUT = arg('saida', SRC);
const TEX = parseInt(arg('tex', '1024'), 10);
const SECO = process.argv.includes('--seco');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
if (OUT !== SRC) mkdirSync(OUT, { recursive: true });

const mb = (b) => (b / 1048576).toFixed(2);
let antesDisco = 0, depoisDisco = 0, antesVram = 0, depoisVram = 0;
const vramDe = (doc) => doc.getRoot().listTextures()
  .reduce((s, t) => { const [w, h] = t.getSize() || [0, 0]; return s + w * h * 4 * 1.33; }, 0);

for (const f of readdirSync(SRC).filter((x) => x.endsWith('.glb')).sort()) {
  const entrada = path.join(SRC, f);
  const doc = await io.read(entrada);
  const dA = statSync(entrada).size, vA = vramDe(doc);
  await doc.transform(
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [TEX, TEX] }),
    prune(),
  );
  const vD = vramDe(doc);
  let dD = dA;
  if (!SECO) { await io.write(path.join(OUT, f), doc); dD = statSync(path.join(OUT, f)).size; }
  antesDisco += dA; depoisDisco += dD; antesVram += vA; depoisVram += vD;
  const marca = vA !== vD ? '  <-- desceu' : '';
  console.log(`  ${f.replace('.glb', '').padEnd(14)} disco ${mb(dA)} -> ${mb(dD)} MB · VRAM ${mb(vA)} -> ${mb(vD)} MB${marca}`);
}

console.log(`\nTOTAL disco ${mb(antesDisco)} -> ${mb(depoisDisco)} MB (${(100 - 100 * depoisDisco / antesDisco).toFixed(1)}% menor)`);
console.log(`TOTAL VRAM  ${mb(antesVram)} -> ${mb(depoisVram)} MB (${(100 - 100 * depoisVram / antesVram).toFixed(1)}% menor)`);
if (SECO) console.log('(--seco: nada foi escrito)');

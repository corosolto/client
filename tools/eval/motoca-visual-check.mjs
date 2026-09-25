/* Projeção frontal medida do capacete/telefone do Motoca (BUG-45 reaberto).

   O Blender renderiza os próprios triângulos finais em 360x463: branco/cinza é
   capacete, vermelho é corpo/suporte do telefone, verde é tela. A régua mede
   abertura facial, continuidade do aro e proporção da moldura — bounds 3D
   sozinhos já deixaram passar o blob anterior.

   Mutantes: casco-fechado, casco-rompido, telefone-slab.
*/
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const mutationArg = process.argv.find((arg) => arg.startsWith('--mutante='));
const mutation = mutationArg ? mutationArg.slice('--mutante='.length) : '';
const maskPath = process.env.MOTOCA_MASK || 'tools/eval/asset-evidence/motoca-cachorro-loko/motoca-front-mask.png';
const assetPath = process.env.CHAR_HARD_ASSET || 'public/models/characters/motoca-cachorro-loko.glb';
const { data, info } = await sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const width = info.width, height = info.height;
const pixel = (x, y) => {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
};
const isHelmet = (rgba) => rgba[3] > 128 && rgba[0] > 90 && Math.abs(rgba[0] - rgba[1]) < 20;
const isPhone = (rgba) => rgba[3] > 128 && (rgba[0] > 90 || rgba[1] > 90) && rgba[2] < 60;
const isFrame = (rgba) => rgba[3] > 128 && rgba[0] > 90 && rgba[1] < 60;
const isScreen = (rgba) => rgba[3] > 128 && rgba[1] > 90 && rgba[0] < 60;
let helmet = new Set(), phone = new Set(), frame = new Set(), screen = new Set();
const key = (x, y) => y * width + x;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const rgba = pixel(x, y), id = key(x, y);
  if (isHelmet(rgba)) helmet.add(id);
  if (isPhone(rgba)) phone.add(id);
  if (isFrame(rgba)) frame.add(id);
  if (isScreen(rgba)) screen.add(id);
}
const bbox = (set) => {
  const xs = [...set].map((id) => id % width), ys = [...set].map((id) => Math.floor(id / width));
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};
if (!helmet.size || !phone.size) throw new Error(`máscara vazia/incompleta: ${maskPath}`);
const hb = bbox(helmet), pb = bbox(phone);

// Mutação causal sobre a própria projeção, antes das medições.
if (mutation === 'casco-fechado') {
  for (let y = Math.round(hb.minY + (hb.maxY - hb.minY) * .30); y <= Math.round(hb.minY + (hb.maxY - hb.minY) * .72); y++)
    for (let x = Math.round(hb.minX + (hb.maxX - hb.minX) * .22); x <= Math.round(hb.maxX - (hb.maxX - hb.minX) * .22); x++) helmet.add(key(x, y));
}
if (mutation === 'casco-rompido') {
  const splitY = Math.round((hb.minY + hb.maxY) / 2);
  for (let y = splitY - 3; y <= splitY + 3; y++) for (let x = hb.minX; x <= hb.maxX; x++) helmet.delete(key(x, y));
}
if (mutation === 'telefone-slab') frame = new Set();

const opening = [];
for (let y = Math.round(hb.minY + (hb.maxY - hb.minY) * .28); y <= Math.round(hb.minY + (hb.maxY - hb.minY) * .70); y++)
  for (let x = Math.round(hb.minX + (hb.maxX - hb.minX) * .24); x <= Math.round(hb.maxX - (hb.maxX - hb.minX) * .24); x++)
    if (!helmet.has(key(x, y))) opening.push(key(x, y));
const openingArea = Math.max(1,
  (Math.round((hb.maxY - hb.minY) * .42) + 1) * (Math.round((hb.maxX - hb.minX) * .52) + 1));
const openingRatio = opening.length / openingArea;

const largestComponent = (set) => {
  const remaining = new Set(set); let largest = 0;
  while (remaining.size) {
    const seed = remaining.values().next().value, queue = [seed]; remaining.delete(seed); let count = 0;
    while (queue.length) {
      const id = queue.pop(); count++;
      const x = id % width, y = Math.floor(id / width);
      for (const next of [key(x - 1, y), key(x + 1, y), key(x, y - 1), key(x, y + 1)])
        if (remaining.delete(next)) queue.push(next);
    }
    largest = Math.max(largest, count);
  }
  return largest;
};
const continuity = largestComponent(helmet) / helmet.size;
const frameRatio = frame.size / phone.size;

const glb = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(assetPath);
const materials = new Map(glb.getRoot().listMaterials().map((material) => [material.getName(), material]));
const screenMaterial = materials.get('Motofrete_PhoneScreen');
const screenColor = screenMaterial?.getBaseColorFactor().slice(0, 3) || [1, 1, 1];
const screenLuma = .2126 * screenColor[0] + .7152 * screenColor[1] + .0722 * screenColor[2];
const failures = [];
const check = (ok, label, evidence) => {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${evidence}`);
  if (!ok) failures.push(label);
};
check(materials.has('CS_HARD_Motofrete_Helmet_FullFace'), 'MOTO-V1 casco integral é peça explícita', 'material Helmet_FullFace');
check(materials.has('Motofrete_Visor_Smoke')
    && !materials.has('CS_HARD_Motofrete_ChinBar')
    && !materials.has('Motofrete_Visor_Hinge'),
  'MOTO-V2 visor único integra a casca, sem queixeira/aro empilhados', 'Visor_Smoke único; sem ChinBar/Hinge');
check(openingRatio >= .22, 'MOTO-V3 projeção preserva abertura facial', `${(openingRatio * 100).toFixed(1)}% >= 22,0%`);
check(continuity >= .90, 'MOTO-V4 casco/queixeira leem como conjunto contínuo', `${(continuity * 100).toFixed(1)}% >= 90,0%`);
check(hb.maxX - hb.minX >= 28 && hb.maxY - hb.minY >= 45, 'MOTO-V5 capacete sobrevive no frame 360x463', `${hb.maxX - hb.minX}x${hb.maxY - hb.minY} px`);
check(materials.has('Motofrete_PhoneMount'), 'MOTO-V6 telefone tem suporte/correia separado', 'Motofrete_PhoneMount');
check(frameRatio >= .42, 'MOTO-V7 corpo/suporte escuro domina a tela', `${(frameRatio * 100).toFixed(1)}% >= 42,0%`);
check(screenLuma <= .20, 'MOTO-V8 tela tem brilho fraco, não slab ciano', `luma ${screenLuma.toFixed(3)} <= 0,200`);

if (mutation) {
  if (!failures.length) {
    console.error(`MUTANTE PASSOU: ${mutation} não acendeu nenhuma cláusula.`);
    process.exit(1);
  }
  console.log(`mutante ${mutation} reprovado como esperado: ${failures.join(', ')}`);
  process.exit(1);
}
if (failures.length) process.exit(1);
console.log(`MOTOCA-VISUAL ✓ máscara ${maskPath}; opening ${(openingRatio * 100).toFixed(1)}%; continuidade ${(continuity * 100).toFixed(1)}%`);

/* Landmarks Mint preservam seus materiais PBR no runtime.
   Caso real (09/08/2026): Palácio do Planalto bonito no Mint virou caixa escura no jogo;
   map_brasilia carregava o GLB e sobrescrevia sua única malha com MAT.concBranco.
   --mutante=reveste volta a chamada e precisa reprovar. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let src = readFileSync(path.join(root, 'public/js/map_brasilia.js'), 'utf8');
let escadao = readFileSync(path.join(root, 'public/js/map_escadao.js'), 'utf8');
if (process.argv.includes('--mutante=reveste')) {
  const before = src;
  src = src.replace(/(const b = placeProp\('palacio',[^\n]+\);\n\s*if \(b\) \{)/,
    '$1\n        dressGLB(b, MAT.concBranco);');
  if (src === before) throw new Error('MUTANTE reveste não aplicou');
}
if (process.argv.includes('--mutante=caixacubo')) {
  const before = escadao;
  escadao = escadao.replace(/propAt\('caixa_dagua'[^;]+;/, '/* mutante: caixa preta procedural */');
  if (escadao === before) throw new Error('MUTANTE caixacubo não aplicou');
}
const palaceBlock = src.match(/const b = placeProp\('palacio'[\s\S]*?occBox\([\s\S]*?'palacio'\);/)?.[0] || '';
const preserva = palaceBlock.length > 0 && !/dressGLB\(b,/.test(palaceBlock);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.join(root, 'public/models/props/palacio.glb'));
const prims = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
const pbr = prims.length > 0 && prims.every((p) => {
  const m = p.getMaterial();
  return m?.getBaseColorTexture() && m.getNormalTexture() && m.getMetallicRoughnessTexture();
});
const caixaRegistrada = /ESCADAO_PROPS\s*=\s*\[[\s\S]*?'caixa_dagua'/.test(escadao);
const caixaUsada = /propAt\('caixa_dagua'\s*,\s*-12\s*,\s*-32/.test(escadao);
const caixaDoc = await io.read(path.join(root, 'public/models/props/caixa_dagua.glb'));
const caixaRoot = caixaDoc.getRoot();
const caixaPrims = caixaRoot.listMeshes().flatMap((m) => m.listPrimitives());
const caixaPbr = caixaPrims.length > 0 && caixaPrims.every((p) => {
  const m = p.getMaterial();
  return m?.getBaseColorTexture() && m.getNormalTexture() && m.getMetallicRoughnessTexture();
});
const caixaTris = Math.round(caixaPrims.reduce((sum, p) => sum +
  ((p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0) / 3), 0));
const caixaTexMax = Math.max(0, ...caixaRoot.listTextures().flatMap((t) => t.getSize() || [0, 0]));
/* Teto: o maior prop de mapa hoje é vw_9150 com 89.198 triângulos; 90k preserva esse
   referencial real. Textura 1024² vem de tools/eval/RUBRIC.md §C. O Tripo bruto desta
   caixa tinha 1.875.081 tris/55 MB; optimize-static 0,01 entrega o mesmo marco em 18.749. */
const caixaBudget = caixaTris <= 90_000 && caixaTexMax <= 1024;
console.log(`${preserva ? 'PASSA' : 'FALHA'} LANDMARK1 código preserva material do Palácio Mint`);
console.log(`${pbr ? 'PASSA' : 'FALHA'} LANDMARK2 palacio.glb tem albedo+normal+metal/rough`);
console.log(`${caixaRegistrada && caixaUsada ? 'PASSA' : 'FALHA'} LANDMARK3 Escadão usa caixa_dagua GLB no lugar do cubo (${caixaRegistrada ? 'preload' : 'sem preload'}, ${caixaUsada ? 'propAt' : 'sem propAt'})`);
console.log(`${caixaPbr ? 'PASSA' : 'FALHA'} LANDMARK4 caixa_dagua.glb preserva albedo+normal+metal/rough`);
console.log(`${caixaBudget ? 'PASSA' : 'FALHA'} LANDMARK5 caixa d'água no orçamento (${caixaTris} tris, textura ${caixaTexMax}²; tetos 90000/1024)`);
if (!preserva || !pbr || !caixaRegistrada || !caixaUsada || !caixaPbr || !caixaBudget) process.exitCode = 1;

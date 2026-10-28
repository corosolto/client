#!/usr/bin/env node
/* Contrato mapa → soundscape. Um loop só é carregável quando publica `src` string;
 * `path` parece válido no mapa, mas vira fetch(undefined) no consumidor. */
import { THREE, MAPS, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').slice(10) || null;
if (MUTANTE && MUTANTE !== 'path-no-lugar-de-src') throw new Error(`mutante desconhecido: ${MUTANTE}`);

const textures = await initTextures();
const invalidos = [];
let mutanteAplicado = false;

for (const [mapa, registro] of Object.entries(MAPS)) {
  const world = registro.build(new THREE.Scene(), textures);
  const loops = world.sound?.loops || [];
  if (MUTANTE === 'path-no-lugar-de-src' && !mutanteAplicado && loops.length) {
    loops[0] = { ...loops[0], path: loops[0].src };
    delete loops[0].src;
    mutanteAplicado = true;
  }
  loops.forEach((loop, indice) => {
    if (typeof loop.src !== 'string' || !loop.src.trim() || Object.hasOwn(loop, 'path')) {
      invalidos.push({ mapa, indice, src: loop.src, path: loop.path });
    }
  });
}

if (MUTANTE && !mutanteAplicado) {
  console.error('MUTANTE NÃO APLICOU: nenhum mapa declarou loop de áudio');
  process.exit(1);
}

console.log(`SOUNDSCAPE — contrato de ${Object.keys(MAPS).length} mapas${MUTANTE ? ` [mutante: ${MUTANTE}]` : ''}`);
if (invalidos.length) {
  for (const item of invalidos) console.log(`  x ${item.mapa} loop ${item.indice}: src=${String(item.src)} path=${String(item.path)}`);
  if (MUTANTE) {
    console.log('MUTANTE MORDIDO: path-no-lugar-de-src');
    process.exit(0);
  }
  process.exit(1);
}
if (MUTANTE) {
  console.error('MUTANTE SOBREVIVEU: path-no-lugar-de-src');
  process.exit(1);
}
console.log('  SC1 todos os loops publicam src string — PASSA');

#!/usr/bin/env node
/* Contrato mapa → soundscape. Um loop só é carregável quando publica `src` string;
 * `path` parece válido no mapa, mas vira fetch(undefined) no consumidor. */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { createSoundscape } from '../../public/js/soundscape.js';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').slice(10) || null;
if (MUTANTE && !['path-no-lugar-de-src', 'posicao-sem-z'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const textures = await initTextures();
const invalidos = [];
let mutanteAplicado = false;
let alvoMutado = null;
let loopsConsumidos = 0;

async function consumirLoops(loops) {
  const originalFetch = globalThis.fetch;
  const ganhos = [];
  const parametro = () => ({ value: 0, setTargetAtTime(value) {
    if (!Number.isFinite(value)) throw new Error('AudioParam recebeu valor não finito');
    ganhos.push(value);
  } });
  const node = () => ({ connect() {}, start() {}, stop() {} });
  const ctx = { currentTime: 1, decodeAudioData: async () => ({ duration: 1 }),
    createBufferSource: node, createGain: () => ({ ...node(), gain: parametro() }),
    createStereoPanner: () => ({ ...node(), pan: parametro() }) };
  const soundscape = createSoundscape({ ctx, master: {} }, { loops });
  globalThis.fetch = async () => new Response(new Uint8Array(1));
  try {
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    for (let i = 0; i < 20 && soundscape.state.loops.length !== loops.length; i++)
      await new Promise(resolve => setImmediate(resolve));
    if (soundscape.state.loops.length !== loops.length) throw new Error('loops não chegaram ao consumidor');
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    if (loops.length && ganhos.length < loops.length) throw new Error('update não escreveu todos os ganhos');
    loopsConsumidos += loops.length;
  } finally { soundscape.dispose(); globalThis.fetch = originalFetch; }
}

for (const [mapa, registro] of Object.entries(MAPS)) {
  const world = registro.build(new THREE.Scene(), textures);
  const loops = world.sound?.loops || [];
  if (MUTANTE === 'path-no-lugar-de-src' && !mutanteAplicado && loops.length) {
    loops[0] = { ...loops[0], path: loops[0].src };
    delete loops[0].src;
    mutanteAplicado = true; alvoMutado = { mapa, indice: 0 };
  }
  if (MUTANTE === 'posicao-sem-z' && !mutanteAplicado && loops.length) {
    loops[0] = { ...loops[0], pos: [0, 0] };
    mutanteAplicado = true; alvoMutado = { mapa, indice: 0 };
  }
  loops.forEach((loop, indice) => {
    if (typeof loop.src !== 'string' || !loop.src.trim() || Object.hasOwn(loop, 'path')) {
      invalidos.push({ mapa, indice, src: loop.src, path: loop.path });
    }
    if (loop.pos !== undefined && (!Array.isArray(loop.pos) || loop.pos.length !== 3 || !loop.pos.every(Number.isFinite))) {
      invalidos.push({ mapa, indice, src: loop.src, path: loop.path, pos: loop.pos, motivo: 'posição precisa de XYZ finitos' });
    }
  });
  if (!invalidos.some(item => item.mapa === mapa)) {
    try { await consumirLoops(loops); }
    catch (error) { invalidos.push({ mapa, indice: -1, motivo: error.message }); }
  }
}

if (MUTANTE && !mutanteAplicado) {
  console.error('MUTANTE NÃO APLICOU: nenhum mapa declarou loop de áudio');
  process.exit(1);
}

console.log(`SOUNDSCAPE — contrato de ${Object.keys(MAPS).length} mapas${MUTANTE ? ` [mutante: ${MUTANTE}]` : ''}`);
if (invalidos.length) {
  for (const item of invalidos) console.log(`  x ${item.mapa} loop ${item.indice}: src=${String(item.src)} path=${String(item.path)} ${item.motivo ?? ''} pos=${JSON.stringify(item.pos)}`);
  if (MUTANTE) {
    const detected = invalidos.some(item => item.mapa === alvoMutado.mapa && item.indice === alvoMutado.indice
      && (MUTANTE !== 'posicao-sem-z' || item.motivo));
    console.log(`${detected ? 'MUTANTE MORDIDO' : 'MUTANTE NÃO DETECTADO'}: ${MUTANTE}`);
    process.exit(detected ? 0 : 1);
  }
  process.exit(1);
}
if (MUTANTE) {
  console.error(`MUTANTE SOBREVIVEU: ${MUTANTE}`);
  process.exit(1);
}
console.log('  SC1 todos os loops publicam src string e posição XYZ finita — PASSA');
console.log(`  SC2 consumidor real atualizou ${loopsConsumidos} loops com AudioParams finitos (fetch/decode locais) — PASSA`);

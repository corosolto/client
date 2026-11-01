#!/usr/bin/env node
/* Contrato mapa → soundscape. Um loop só é carregável quando publica `src` string;
 * `path` parece válido no mapa, mas vira fetch(undefined) no consumidor. */
import https from 'node:https';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { createSoundscape, AMB_LOOPS } from '../../public/js/soundscape.js';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').slice(10) || null;
if (MUTANTE && !['path-no-lugar-de-src', 'posicao-sem-z', 'piscina-sem-loops', 'asset-ausente'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const textures = await initTextures();
const invalidos = [];
let mutanteAplicado = false;
let alvoMutado = null;
let loopsConsumidos = 0;
let piscinaVista = false;
const srcsUnicos = new Set();
const dividaPublicacao = new Set();

async function consumirLoops(loops) {
  const originalFetch = globalThis.fetch;
  const ganhos = [];
  const parametro = (ganho = false) => {
    const param = { value: 0, chamadas: 0, setTargetAtTime(value) {
      if (!Number.isFinite(value)) throw new Error('AudioParam recebeu valor não finito');
      this.chamadas++;
    } };
    if (ganho) ganhos.push(param);
    return param;
  };
  const node = () => ({ connect() {}, start() {}, stop() {} });
  const ctx = { currentTime: 1, decodeAudioData: async () => ({ duration: 1 }),
    createBufferSource: node, createGain: () => ({ ...node(), gain: parametro(true) }),
    createStereoPanner: () => ({ ...node(), pan: parametro() }) };
  const soundscape = createSoundscape({ ctx, master: {} }, { loops });
  globalThis.fetch = async () => new Response(new Uint8Array(1));
  try {
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    for (let i = 0; i < 20 && soundscape.state.loops.length !== loops.length; i++)
      await new Promise(resolve => setImmediate(resolve));
    if (soundscape.state.loops.length !== loops.length) throw new Error('loops não chegaram ao consumidor');
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    if (ganhos.length !== loops.length || ganhos.some(param => param.chamadas === 0))
      throw new Error('update não escreveu todos os ganhos');
    loopsConsumidos += loops.length;
  } finally { soundscape.dispose(); globalThis.fetch = originalFetch; }
}

for (const [mapa, registro] of Object.entries(MAPS)) {
  const world = registro.build(new THREE.Scene(), textures);
  const loops = world.sound?.loops || [];
  for (const l of loops) if (typeof l.src === 'string') srcsUnicos.add(l.src);
  if (mapa === 'piscina_treta') {
    piscinaVista = true;
    if (MUTANTE === 'piscina-sem-loops') {
      loops.splice(0); mutanteAplicado = true; alvoMutado = { mapa, indice: -2 };
    }
    if (loops.length !== 2) invalidos.push({ mapa, indice: -2, motivo: 'Piscina precisa publicar os dois loops' });
  }
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

if (!piscinaVista) invalidos.push({ mapa: 'piscina_treta', indice: -2, motivo: 'Piscina não foi construída' });

/* SC3 (#1137, crítica estraga-codigo): o fetch controlado do consumidor não prova
   existência — src inexistente passava nas duas cláusulas e só morria em produção.
   Cada src único faz HEAD na origem de assets; o mutante asset-ausente aponta um
   probe inexistente e exige a reprovação. */
if (!MUTANTE || MUTANTE === 'asset-ausente') {
  const ORIGEM = process.env.ASSET_ORIGIN || 'https://www.csbrasil.online';
  /* Dívida de publicação (padrão DIVIDA das mãos): todo src do registro AMB_LOOPS
     em 404 na origem é dívida numerada do dono (upload do acervo privado) — o jogo
     degrada para silêncio nesse loop. Asset ausente FORA do registro reprova. */
  const DIVIDA_DE_PUBLICACAO = new Set(Object.values(AMB_LOOPS));
  const alvos = MUTANTE === 'asset-ausente' ? [...srcsUnicos, 'audio/ambiente/asset-ausente-probe.mp3'] : [...srcsUnicos];
  const ausentes = [];
  for (const src of alvos) {
  const status = await new Promise((res) => {
    const pedido = https.request(new URL(src.replace(/^\//, ''), ORIGEM.endsWith('/') ? ORIGEM : ORIGEM + '/'), { method: 'HEAD' }, (r) => res(r.statusCode));
    pedido.setTimeout(10_000, () => { pedido.destroy(); res(0); });
    pedido.on('error', () => res(0)); pedido.end();
  });
  if (status >= 400) ausentes.push(`${src} (HTTP ${status})`);
  }
  if (MUTANTE === 'asset-ausente') {
    const mordido = ausentes.some((a) => a.includes('asset-ausente-probe'));
    console.log(`${mordido ? 'MUTANTE MORDIDO' : 'MUTANTE NÃO DETECTADO'}: asset-ausente`);
    console.log(`  SC3 existência na origem: ${srcsUnicos.size} srcs reais ok, probe ausente reprovar ${mordido ? '— PASSA' : '— FALHA'}`);
    process.exit(mordido ? 0 : 1);
  }
  for (const a of ausentes) {
    const src = a.slice(0, a.indexOf(' (HTTP'));
    if (DIVIDA_DE_PUBLICACAO.has(src)) { dividaPublicacao.add(src); continue; }
    invalidos.push({ mapa: '*', indice: -3, motivo: `asset inexistente na origem: ${a}` });
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
if (dividaPublicacao.size) console.log(`  SC3 DÍVIDA DE PUBLICAÇÃO (${dividaPublicacao.size}): ${[...dividaPublicacao].join(', ')} — 404 na origem; upload é passo do dono, asset novo ausente reprova`);

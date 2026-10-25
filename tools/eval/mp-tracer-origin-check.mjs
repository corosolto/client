/* MPT — o traçante multiplayer usa a origem autoritativa do evento. A pose interpolada já
   avançou quando o lote chega; reconstruir a linha dali faz o tiro viajar de lado, sobretudo
   com a câmera atrás do corpo em 3ª pessoa.
   Uso: node tools/eval/mp-tracer-origin-check.mjs [--mutante=sem-origem] */
import { THREE } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && mutante !== 'sem-origem') throw new Error(`mutante desconhecido: ${mutante}`);

const tracers = [];
const player = { pos: new THREE.Vector3(10, 0, 0) };
const game = {
  player,
  settings: { quality: 'high' },
  _tracer(from, to) { tracers.push({ from: from.clone(), to: to.clone() }); },
  _puff() {}, _flash() {}, _impactSfx() {},
};
const net = { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {}, events: [] };
const nc = makeNetcode(game, net);
clearInterval(nc._nsTimer);

const event = { k: 'tiro', a: 1, w: 'ak', o: [0, 1.62, 0], p: [[0, 1.62, -60]], s: '-' };
if (mutante === 'sem-origem') delete event.o;
nc.tiroDeRede(player, event);
const tracer = tracers[0];
const desvio = tracer ? Math.hypot(tracer.from.x, tracer.from.y - 1.62) : Infinity;
const ok = tracers.length === 1 && desvio < 0.02 && tracer.to.distanceTo(new THREE.Vector3(0, 1.62, -60)) < 0.02;
console.log(`${ok ? 'PASSA' : 'FALHA'} MPT1 · pose atual x=10 m, origem do tiro x=0 m · desvio lateral do traçante ${Number.isFinite(desvio) ? desvio.toFixed(2) : '∞'} m`);

nc.dispose();
if (mutante) {
  console.log(ok ? 'mutante sem-origem NÃO detectado' : 'mutante sem-origem detectado');
  process.exit(ok ? 1 : 0);
}
process.exit(ok ? 0 : 1);

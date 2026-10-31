import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let source = readFileSync(new URL('../../public/js/mode_operacao_flavio.js', import.meta.url), 'utf8');
if (process.argv.includes('--mutante=marcha-curta')) {
  const old = 'for (let i = 0; i < 64; i++)';
  assert.equal(source.split(old).length, 2, 'mutante deve aplicar uma vez na marcha real');
  source = source.replace(old, 'for (let i = 0; i < 24; i++)');
  console.log('Mutante marcha-curta aplicado');
}
const { OperacaoFlavio } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const nodes = [];
const master = {};
const currentTime = 100;
const ctx = { currentTime,
  createOscillator() {
    const node = { frequency: { value: 0 }, stops: [],
      connect(gain) { this.gain = gain; }, start(t) { this.started = t; }, stop(t) { this.stops.push(t); } };
    nodes.push(node); return node;
  },
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect(destination) { assert.equal(destination, master, 'marcha usa master do jogo'); } }; },
};
const mode = Object.create(OperacaoFlavio.prototype);
mode.game = { time: 10, dedicated: false, sfx: { ensure() {}, ctx, master }, vmScene: { visible: true } };
mode.fontes = []; mode.hud = { textContent: '' };
mode.startCinematic('B');
assert.ok(nodes.length > 0, 'produção agenda fontes de áudio');
const duration = Math.max(...nodes.map(n => n.stops[0])) - currentTime;
assert.ok(duration >= 18 && duration <= 24, `spec docs/maps/operacao-decola.md: marcha18–24s, medida=${duration.toFixed(2)}s`);
assert.ok(nodes.every(n => Number.isFinite(n.started) && n.started >= currentTime && n.stops[0] > n.started), 'agenda válida');
const first = [...nodes];
mode.startCinematic('E');
assert.ok(first.every(n => n.stops.at(-1) === undefined), 'nova cena cancela toda marcha anterior');
const second = [...mode.fontes];
mode._encerrarFontes();
assert.equal(mode.fontes.length, 0);
assert.ok(second.every(n => n.stops.at(-1) === undefined), 'reset/pulo pode cancelar fontes futuras');
console.log(`MARCHA VERDE: ${duration.toFixed(2)}s, agenda e cancelamento reais`);

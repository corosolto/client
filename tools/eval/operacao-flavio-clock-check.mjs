import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, initTextures, renderer, sfx, PCHAR, CHARACTERS } from './harness.mjs';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
const mutations = {
  'relogio-simulado': ['return Math.max(0, (performance.now() - this.cinematic.anchorAt) / 1000);', 'return Math.max(0, this.game.time - this.cinematic.startedAt);'],
  'sem-limite': ['if (elapsed >= 9) { this._finalizarCinematic(); return; }', ''],
  'prazo-online': ["if (!this.game.online && this.game.state === 'roundEnd') this.game.stateUntil = this.game.time;", "if (this.game.state === 'roundEnd') this.game.stateUntil = this.game.time;"],
  'fontes-vazam': ['this.cinematic.skipped = true;\n    this._encerrarFontes();', 'this.cinematic.skipped = true;'],
  'sem-interrupcao': ["if (this.game.state !== 'roundEnd') { this._finalizarCinematic(); return; }", ''],
  'prazo-outro-estado': ["if (!this.game.online && this.game.state === 'roundEnd') this.game.stateUntil = this.game.time;", 'if (!this.game.online) this.game.stateUntil = this.game.time;'],
};

console.info = () => {};
const game = new Game({ renderer, textures: initTextures(), sfx,
  settings: { bots: 2, quality: 'low', difficulty: 'normal', sens: 1 },
  playerCharId: PCHAR, playerTeam: 'E', mapId: 'operacao_flavio', testMode: true,
  onQuit() {}, onMatchEnd() {} });
if (mutant) {
  assert.ok(Object.hasOwn(mutations, mutant), 'mutante conhecido');
  const [before, after] = mutations[mutant], url = new URL('../../public/js/mode_operacao_flavio.js', import.meta.url);
  let source = readFileSync(url, 'utf8');
  assert.equal(source.split(before).length - 1, 1, 'mutação tem alvo real único');
  source = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  const { OperacaoFlavio } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  game.objective.dispose(); game.objective = new OperacaoFlavio(game, CHARACTERS.find(c => c.id === 'senador'));
  console.log('Mutação aplicada: ' + mutant);
}
game.start();
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
let nowMs = 100000;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => nowMs } });
const failed = [];
let cases = 0;
const check = (clause, fn) => {
  cases++;
  try { fn(); console.log('✓ ' + clause); }
  catch (error) { failed.push({ clause, type: error.name, message: error.message }); console.error('✗ ' + clause + ': ' + error.name + ': ' + error.message.split('\n')[0]); }
};
const begin = (online, winner = 'B') => {
  game.objective.prepareRound(); game.online = online; game.state = 'roundEnd';
  game.time = 10; game.stateUntil = 500; nowMs += 10000;
  game.objective.startCinematic(winner);
};
try {
  for (const online of [false, true]) check('pulo após dois segundos reais, online=' + online, () => {
    begin(online); nowMs += 2100; game.objective._key({ code: 'Space' });
    assert.equal(game.objective.cinematicActive, false, 'tempo real libera o gesto apesar da simulação parada');
    assert.equal(game.stateUntil, online ? 500 : game.time, 'pulo respeita autoridade');
  });
  check('câmera avança com tempo real e simulação parada', () => {
    begin(true); game.objective.updatePresentation(); const initial = game.camera.position.clone();
    nowMs += 4500; game.objective.updatePresentation();
    assert.ok(!game.camera.position.equals(initial), 'câmera usa relógio de apresentação');
    assert.equal(game.time, 10, 'medição não avança simulação');
  });
  for (const online of [false, true]) check('fim aos nove segundos reais, online=' + online, () => {
    begin(online, 'E'); let stopped = 0;
    game.objective.fontes.push({ stop() { stopped++; } });
    nowMs += 9001; game.objective.updatePresentation();
    assert.equal(game.objective.cinematicActive, false, 'cena tem limite em tempo real');
    assert.equal(stopped, 1, 'fim encerra fontes');
    assert.equal(game.objective._amb, null, 'fim restaura ambiente');
    assert.equal(game.stateUntil, online ? 500 : game.time, 'fim respeita autoridade');
  });
  check('salto de simulação não libera pulo antes de dois segundos reais', () => {
    begin(true); game.time += 60; nowMs += 100; game.objective._key({ code: 'Escape' });
    assert.equal(game.objective.cinematicActive, true, 'simulação não antecipa gesto');
    assert.equal(game.stateUntil, 500);
  });
  for (const online of [false, true]) for (const state of ['matchEnd', 'countdown', 'live']) {
    check('interrupção ' + state + ', online=' + online, () => {
      begin(online, 'E'); nowMs += 1000; game.state = state;
      game.objective.updatePresentation();
      assert.equal(game.objective.cinematicActive, false, 'troca de estado solta apresentação');
      assert.equal(game.objective._amb, null, 'interrupção restaura ambiente');
      assert.equal(game.stateUntil, 500, 'interrupção não reescreve prazo de outro estado');
    });
  }
} finally {
  game.objective.dispose();
  if (descriptor) Object.defineProperty(globalThis, 'performance', descriptor); else delete globalThis.performance;
}
console.log(JSON.stringify({ mutant, cases, failed }));
if (failed.length) process.exitCode = 1;

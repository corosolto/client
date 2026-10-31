import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, initTextures, renderer, sfx, PCHAR, CHARACTERS } from './harness.mjs';

const mutants = {
  'sem-pulo': ['mode_operacao_flavio.js', 'this.cinematic.skipped = true;', '', /apresentação pulada não continua/],
  'relogio-local': ['mode_operacao_flavio.js', 'if (!this.game.online) this.game.stateUntil = this.game.time;', 'this.game.stateUntil = this.game.time;', /gesto local não adianta/],
  'camera-follow': ['netgame.js', 'if (game.objective?.cinematicActive) return;', '', /follow não sobrescreve/],
  'sem-vencedor': ['mode_operacao_flavio.js', "if (winner === 'E' || winner === 'B') this.state.winner = winner;", '', /snapshot do resultado por tempo/],
  'audio-continua': ['mode_operacao_flavio.js', 'this.cinematic.skipped = true;\n        this._encerrarFontes();', 'this.cinematic.skipped = true;', /áudio da cena pulada é interrompido/],
};
if (process.argv.includes('--mutantes')) {
  for (const [name, [, , , failure]] of Object.entries(mutants)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante='+name], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(r.status, 1); assert.ok(r.stdout.includes('Mutação aplicada: '+name));
    assert.match(r.stderr, failure);
    console.log('Mutante reprovado na cláusula esperada: '+name);
  }
  process.exit(0);
}
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) assert.ok(mutants[mutant], 'mutante conhecido');
async function moduleFor(file) {
  const url = new URL('../../public/js/'+file, import.meta.url);
  if (mutants[mutant]?.[0] !== file) return import(url);
  const [, old, replacement] = mutants[mutant];
  let source = readFileSync(url, 'utf8');
  assert.equal(source.split(old).length - 1, 1, 'mutação aplica uma vez');
  source = source.replace(old, replacement).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, q, spec) => 'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  console.log('Mutação aplicada: '+mutant);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const { makeNetcode } = await moduleFor('netgame.js');

console.info = () => {};
const g = new Game({ renderer, textures: initTextures(), sfx,
  settings: { bots: 2, quality: 'low', difficulty: 'normal', sens: 1 },
  playerCharId: PCHAR, playerTeam: 'E', mapId: 'operacao_flavio', testMode: true,
  onQuit() {}, onMatchEnd() {} });
if (mutants[mutant]?.[0] === 'mode_operacao_flavio.js') {
  const { OperacaoFlavio } = await moduleFor('mode_operacao_flavio.js');
  g.objective.dispose();
  g.objective = new OperacaoFlavio(g, CHARACTERS.find(c => c.id === 'senador'));
}
g.start();
g.online = true;
const net = { meta: {}, yourEnt: null, startPing() {}, stopPing() {} };
const mp = makeNetcode(g, net);
g._mp = mp;
let failed = 0;
const check = (name, run) => { try { run(); console.log('PASS '+name); } catch(e) { failed++; console.error('FAIL '+name+': '+e.message); } };
const begin = () => {
  g.online = true; g.state = 'roundEnd'; g.stateUntil = 500; g.time = 10;
  g.objective.startCinematic('B');
};
try {
  check('antes de2s o gesto não pula apresentação', () => {
    begin(); g.time = 11.9;
    g.objective._key({ code: 'Space' });
    assert.equal(g.stateUntil, 500);
    g.camera.position.set(123, 234, 345); g.objective.updatePresentation();
    assert.notEqual(g.camera.position.x, 123);
  });
  for (const code of ['Space', 'Escape']) check(code+' pula só a apresentação online e encerra fontes', () => {
    begin(); let stopped = 0;
    g.objective.fontes.push({ stop() { stopped++; } });
    g.time = 12.1; g.objective._key({ code, preventDefault() {}, stopPropagation() {} });
    assert.equal(g.stateUntil, 500, 'gesto local não adianta a rodada autoritativa');
    assert.equal(g.state, 'roundEnd');
    g.camera.position.set(123, 234, 345); g.objective.updatePresentation();
    assert.equal(g.camera.position.x, 123, 'apresentação pulada não continua movendo a câmera');
    assert.equal(stopped, 1, 'áudio da cena pulada é interrompido');
  });
  check('câmera real de espectador respeita cena e retoma após pulo', () => {
    begin(); g.time = 13;
    for (const b of g.bots) { b._remote = true; b.alive = true; }
    g.objective.updatePresentation(); const position = g.camera.position.clone();
    mp.cameraEspectador();
    assert.ok(g.camera.position.equals(position), 'follow não sobrescreve plano cinematográfico');
    g.objective._key({ code: 'Space', preventDefault() {}, stopPropagation() {} });
    mp.cameraEspectador();
    assert.ok(!g.camera.position.equals(position), 'follow retoma depois do pulo local');
  });
  check('pulo offline ainda antecipa próxima rodada', () => {
    begin(); g.online = false; g.time = 13;
    g.objective._key({ code: 'Space', preventDefault() {}, stopPropagation() {} });
    assert.ok(g.stateUntil <= g.time);
  });
  check('cena nova recupera câmera e áudio após cena pulada', () => {
    begin(); g.time = 13; g.objective._key({ code: 'Space' });
    g.objective.startCinematic('E');
    g.camera.position.set(123, 234, 345); g.objective.updatePresentation();
    assert.notEqual(g.camera.position.x, 123);
    assert.equal(g.objective.cinematic.winner, 'E');
  });
  check('timeout real termina objetivo com vencedor E no estado replicado', () => {
    g.objective.prepareRound(); g.online = false; g.state = 'live'; g.timeLeft = .01;
    g._updatePlayer = () => {}; g._updateBot = () => {};
    g.update(.02, false);
    assert.equal(g.state, 'roundEnd');
    assert.equal(g.objective.netState().winner, 'E', 'snapshot do resultado por tempo tem vencedor');
  });
} finally { mp.dispose(); g.dispose(); }
if (failed) process.exitCode = 1;

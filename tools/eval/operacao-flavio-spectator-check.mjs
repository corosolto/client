// O main cria espectadores com dedicated+mpFactory+net; headless não recebe mpFactory/net.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, THREE, initTextures, renderer, sfx, PCHAR, CHARACTERS } from './harness.mjs';

const mutations = {
  hud: ['mode_operacao_flavio.js', "if ((!game.dedicated || game.online) && typeof document !== 'undefined') {", "if (!game.dedicated && typeof document !== 'undefined') {", 'espectador recebe HUD'],
  estado: ['mode_operacao_flavio.js', 'applyNetState(net) {\n    if (!this.game.online) return;', 'applyNetState(net) {\n    if (!this.game.online || this.game.dedicated) return;', 'espectador aplica estado'],
  autoridade: ['mode_operacao_flavio.js', 'if (!this.game.online) {', 'if (!this.game.online || this.game.dedicated) {', 'espectador não decide vitória'],
  respawn: ['mode_operacao_flavio.js', 'if (this.game.online) return undefined;', 'if (this.game.online && !this.game.dedicated) return undefined;', 'espectador não agenda respawn'],
  bot: ['mode_operacao_flavio.js', 'if (bot !== this.vip || this.game.online) return false;', 'if (bot !== this.vip || (this.game.online && !this.game.dedicated)) return false;', 'espectador não executa controlador'],
  camera: ['mode_operacao_flavio.js', 'if (!this.cinematicActive || (this.game.dedicated && !this.game.online)) return;', 'if (!this.cinematicActive || this.game.dedicated) return;', 'espectador vê cena E'],
  marcha: ['mode_operacao_flavio.js', 'if (!this.game.dedicated || this.game.online) this.fontes = marchaMilitar(this.game.sfx);', 'if (!this.game.dedicated) this.fontes = marchaMilitar(this.game.sfx);', 'espectador ouve marcha no resultado B'],
  ambiente: ['mode_operacao_flavio.js', "if (winner === 'E' && (!this.game.dedicated || this.game.online)) {", "if (winner === 'E' && !this.game.dedicated) {", 'espectador vê cena E'],
  slot: ['netgame.js', 'if (this._netTick < 0 && Number.isFinite(snap.roundNum)) this._netRodada = snap.roundNum;', 'if (Number.isFinite(snap.roundNum)) this._netRodada = snap.roundNum;', 'troca de slot na virada roundEnd'],
  cores: ['mode_operacao_flavio.js', "    if (this.hud) { this.hud.style.background = '#09101cdd'; this.hud.style.borderColor = '#d8b765'; }", '', 'reset após morte recupera cores'],
};
if (process.argv.includes('--mutantes')) {
  for (const [name, [, , , clause]] of Object.entries(mutations)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante='+name], { encoding: 'utf8', timeout: 90000, maxBuffer: 4 << 20 });
    assert.equal(r.status, 1, name+' precisa reprovar');assert.ok(!r.signal && !r.error);
    assert.ok(r.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name), name+' precisa aplicar');
    assert.ok(r.stderr.includes('FAIL '+clause), name+' precisa da cláusula esperada');
    console.log('✓ espectador/'+name+': aplicado e reprovado na cláusula esperada');
  }
  process.exit(0);
}
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) assert.ok(mutations[mutant], 'mutante conhecido');
async function moduleFor(file) {
  const url = new URL('../../public/js/'+file, import.meta.url);
  if (mutations[mutant]?.[0] !== file) return import(url);
  const [, before, after] = mutations[mutant];
  let source = readFileSync(url, 'utf8');
  assert.equal(source.split(before).length, 2, 'alvo único');
  source = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) =>
    'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  console.log('Mutação aplicada: '+mutant);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const { makeNetcode } = await moduleFor('netgame.js');

console.info = () => {};
const net = { meta: {}, espectador: true, yourEnt: null, startPing() {}, stopPing() {} };
const options = { renderer, textures: initTextures(), sfx, settings: { bots: 2, quality: 'low', sens: 1 },
  playerCharId: PCHAR, playerTeam: 'E', mapId: 'operacao_flavio', testMode: true, dedicated: true,
  onQuit() {}, onMatchEnd() {} };
const g = new Game({ ...options, mpFactory: makeNetcode, net });
const server = new Game({ ...options, textures: initTextures() });
const local = new Game({ ...options, dedicated: false, textures: initTextures() });
if (mutations[mutant]?.[0] === 'mode_operacao_flavio.js') {
  const { OperacaoFlavio } = await moduleFor('mode_operacao_flavio.js');
  for (const game of [g, server, local]) {
    game.objective.dispose();game.objective = new OperacaoFlavio(game, CHARACTERS.find(c => c.id === 'senador'));
  }
}
assert.equal(g.online, true); assert.equal(g.dedicated, true);
assert.equal(server.online, false); assert.equal(server.dedicated, true);
g.start();server.start();local.start();
let failures = 0;
const check = (name, fn) => { try { fn(); console.log('PASS '+name); } catch(e) { failures++; console.error('FAIL '+name+': '+e.message); } };
const nodes = [];
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
const audio = { ensure() {}, master: {}, ctx: { currentTime: 100,
  createGain() { return { gain: param(), connect() {} }; },
  createOscillator() { const o = { frequency: param(), stops: [], connect() {}, start() {}, stop(t) { this.stops.push(t); } };nodes.push(o);return o; },
} };
g.sfx = audio;server.sfx = audio;
const mode = g.objective;
const snapshot = (round, state = 'live') => ({ type: 'snapshot', tick: round * 10, t: round,
  state, roundNum: round, timeLeft: 291, scoreE: 0, scoreB: 0, ents: [],
  objective: { checkpoint: 1, position: { x: 0, z: 6 }, escortCount: 2, vipId: 123 } });
try {
  check('espectador recebe HUD e handler de pulo no nascimento real', () => {
    assert.ok(mode.hud, 'HUD do espectador existe');assert.equal(typeof mode._key, 'function', 'pulo do espectador existe');
  });
  check('espectador aplica estado autoritativo do objetivo', () => {
    mode.applyNetState(snapshot(1).objective);
    assert.equal(mode.state.checkpoint, 1, 'checkpoint recebido');assert.equal(mode.state.position.z, 6, 'posição recebida');
  });
  check('espectador não decide vitória local', () => {
    g.state = 'live';mode.prepareRound();mode.vip.alive = false;
    const end = g._endRound;let ended = 0;g._endRound = () => { ended++; };
    try { mode.update(.1);assert.equal(ended, 0, 'vitória pertence ao servidor');assert.equal(mode.state.winner, null); }
    finally { g._endRound = end;mode.prepareRound(); }
  });
  check('espectador não agenda respawn local', () => {
    assert.equal(mode.respawnAt(g.bots.find(b => b !== mode.vip), 10), undefined, 'respawn pertence ao servidor');
  });
  check('espectador não executa controlador autoritativo do VIP', () => {
    assert.equal(mode.updateBot(mode.vip, .01), false, 'animação remota segue netcode');
  });
  check('espectador ouve marcha no resultado B', () => {
    mode.prepareRound();g.time = 10;mode.startCinematic('B');
    assert.ok(mode.fontes.length, 'marcha B disponível sem sirene E');
  });
  check('espectador vê cena E com câmera, luz e áudio', () => {
    mode.prepareRound();g.state = 'roundEnd';g.time = 10;g.camera.position.set(123, 234, 345);
    mode.startCinematic('E');g.time = 11;mode.updatePresentation();
    assert.notEqual(g.camera.position.x, 123, 'câmera da cena controla espectador');
    assert.ok(g.world.root.getObjectByName('sirene-vermelha-flavio'), 'luz vermelha do espectador');
    assert.ok(mode.fontes.length, 'áudio do espectador agendado');
  });
  check('pulo do espectador libera câmera e ambiente sem adiantar servidor', () => {
    g.time = 13;g.stateUntil = 500;
    assert.equal(typeof mode._key, 'function', 'pulo disponível');mode._key({ code: 'Space' });
    assert.equal(g.stateUntil, 500, 'relógio do servidor preservado');assert.equal(mode.cinematicActive, false);
    assert.equal(g.world.root.getObjectByName('sirene-vermelha-flavio'), undefined);
    assert.equal(mode.fontes.length, 0);
  });
  let serial = 10;
  for (const before of ['roundEnd', 'live']) check('troca de slot na virada '+before+' preserva identidade da rodada', () => {
    const round = serial;serial += 2;
    mode.prepareRound();net.snap = snapshot(round);g._mp.applySnapshot();
    g.state = before;g.time = 20;mode.startCinematic('E');
    g._mp._evOn = true;g.drops = [{ _nid: 44 }, { weapon: 'pistol' }];
    const remove = g._sumirDrop;g._sumirDrop = i => g.drops.splice(i, 1);
    try {
      net.onSlot({ yourTeam: null });assert.equal(g._mp._netMap.size, 0, 'recasamento real pendente');
      net.snap = snapshot(round + 1);g._mp.applySnapshot();
      assert.equal(mode.cinematic, null, 'rodada nova encerra cerimônia mesmo após slot');
      assert.equal(g.world.root.getObjectByName('sirene-vermelha-flavio'), undefined);
      assert.equal(g.drops.length, 1, 'drops antigos removidos');assert.equal(g.drops[0].weapon, 'pistol');
      assert.equal(g.timeLeft, 291);
    } finally { g._sumirDrop = remove; }
  });
  check('reset após morte recupera cores normais do HUD', () => {
    const hudMode = local.objective;
    assert.ok(hudMode.hud, 'HUD local existe independentemente do espectador');
    // mkEl não interpreta cssText; estes são os valores declarados pelo construtor.
    hudMode.hud.style.background = '#09101cdd';hudMode.hud.style.borderColor = '#d8b765';
    hudMode.deathAnnounced = false;hudMode.anunciarMorte();
    assert.equal(hudMode.hud.style.borderColor, '#ff514f', 'pré-condição vermelha');
    hudMode.prepareRound();assert.equal(hudMode.hud.style.background, '#09101cdd');assert.equal(hudMode.hud.style.borderColor, '#d8b765');
  });
  check('controle headless mantém autoridade e não cria apresentação', () => {
    const m = server.objective;assert.equal(m.hud, null);
    m.prepareRound();server.state = 'live';m.vip.alive = false;
    const end = server._endRound;let ended = 0;server._endRound = () => { ended++; };
    try { m.update(.1);assert.equal(ended, 1, 'headless decide resultado'); }
    finally { server._endRound = end; }
    const count = nodes.length;server.time = 10;m.startCinematic('E');m.updatePresentation();
    assert.equal(nodes.length, count, 'headless não agenda áudio');
    assert.equal(server.world.root.getObjectByName('sirene-vermelha-flavio'), undefined);
  });
} finally { g.dispose();server.dispose();local.dispose(); }
process.exitCode = failures ? 1 : 0;

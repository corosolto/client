import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, initTextures, renderer, sfx, PCHAR } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

// Executa o bloco OBJETIVO real com transporte controlado; não é evidência de WebSocket.
const source = readFileSync(new URL('./tiro-mp-browser.mjs', import.meta.url), 'utf8');
const start = source.indexOf('  if (OBJETIVO) {');
const end = source.indexOf('\n  } else {\n  if (IDENTIDADE)', start);
assert.ok(start >= 0 && end > start, 'bloco objetivo existe uma vez');
const body = source.slice(start + '  if (OBJETIVO) {'.length, end);
const probe = new (Object.getPrototypeOf(async function() {}).constructor)('page', 'cobra', 'erros', 'FOTO', body);
console.info = () => {};
const g = new Game({ renderer, textures: initTextures(), sfx,
  settings: { bots: 2, quality: 'low' }, playerCharId: PCHAR, playerTeam: 'E',
  mapId: 'operacao_flavio', testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
g.start(); g.online = true; g.dedicated = false;
g._ensureDolly = () => {};
const net = { meta: {}, startPing() {}, stopPing() {}, stats: { hz: 20 }, ws: { protocol: 'coro-snapshot-v8' } };
const mp = makeNetcode(g, net); g._mp = mp;
let failed = 0;
try {
  for (const scenario of ['recebe-aplica', 'sem-payload', 'sem-aplicacao', 'aplicacao-noop', 'modo-trocado']) {
    g.objective.prepareRound();
    let tick = 10;
    const apply = g.objective.applyNetState;
    const originalObjective = g.objective;
    const noop = () => {};
    if (scenario === 'aplicacao-noop') g.objective.applyNetState = noop;
    const payload = { ...g.objective.netState(), checkpoint: 2 };
    const advance = () => {
      net.snap = { tick: ++tick, t: tick / 20, state: 'live', timeLeft: 300,
        scoreE: 0, scoreB: 0, ents: [], ...(scenario === 'sem-payload' ? {} : { objective: payload }) };
      if (scenario !== 'sem-aplicacao') mp.applySnapshot();
      g.objective.update(.05);
    };
    advance();
    const previousGame = window.__game; window.__game = g;
    const clauses = [];
    const page = {
      async evaluate(fn, arg) {
        if (scenario === 'modo-trocado' && g.__qaObjectiveReceipt?.applied) g.objective = { state: {}, netState() { return {}; } };
        return fn(arg);
      },
      async waitForFunction(fn, arg) {
        for (let i = 0; i < 4; i++) { if (await fn(arg)) return; advance(); }
        throw new Error('Timeout simulado: condição de recepção/aplicação não satisfeita');
      },
      async screenshot() {},
    };
    try {
      await probe(page, (ok, label) => clauses.push({ ok: !!ok, label }), [], '/tmp/nao-gerado.png');
      const measured = clauses.find(c => c.label.startsWith('OBJ3'));
      assert.equal(clauses.find(c=>c.label.startsWith('OBJ1'))?.ok,true,'par v8 passa negociação exigida pelo smoke');
      assert.ok(measured, 'OBJ3 foi medida');
      assert.equal(measured.ok, scenario === 'recebe-aplica', 'OBJ3 deve rejeitar '+scenario);
      assert.notEqual(originalObjective.state.checkpoint, -9180, 'instrumentação restaura estado se não chega aplicação');
      assert.equal(originalObjective.applyNetState, scenario === 'aplicacao-noop' ? noop : apply, 'instrumentação remove wrapper ao terminar');
      console.log('PASS probe: '+scenario);
    } catch (e) { failed++; console.error('FAIL probe: '+scenario+': '+e.message); }
    finally { window.__game = previousGame; g.objective = originalObjective; g.objective.applyNetState = apply; }
  }
} finally { mp.dispose(); g.dispose(); }
if (failed) process.exitCode = 1;

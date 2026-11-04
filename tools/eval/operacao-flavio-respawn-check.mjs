import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initTextures, renderer, sfx, PCHAR, CHARACTERS } from './harness.mjs';

const mutants = {
  individual: ['mode_operacao_flavio.js', 'return epoch + (Math.floor((now - epoch) / 8) + 1) * 8;', 'return now + 2.2;', /mortes na mesma janela aguardam/],
  relativo: ['mode_operacao_flavio.js', 'return epoch + (Math.floor((now - epoch) / 8) + 1) * 8;', 'return epoch + (Math.floor((now - epoch) / 8) + 1) * 8 - now;', /mortes na mesma janela aguardam/],
  'vip-revive': ['mode_operacao_flavio.js', 'if (ent === this.vip) return Infinity;', 'if (ent === this.vip) return now + 8;', /VIP morto não revive/],
  'spawn-antigo': ['game.js', 'const list = this.objective?.spawnCandidates?.(team) || this.world.spawns[team] || [];', 'const list = this.world.spawns[team] || [];', /respawn nunca fica à frente|spawn acompanha checkpoint/],
};
if (process.argv.includes('--mutantes')) {
  for (const [name, [, , , failure]] of Object.entries(mutants)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante='+name], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(r.status, 1); assert.ok(r.stdout.includes('Mutação aplicada: '+name));
    assert.match(r.stderr, failure); console.log('Mutante reprovado na cláusula esperada: '+name);
  }
  process.exit(0);
}
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) assert.ok(mutants[mutant], 'mutante conhecido');
async function moduleFor(file) {
  const url = new URL('../../public/js/'+file, import.meta.url);
  if (mutants[mutant]?.[0] !== file) return import(url);
  const [, old, replacement] = mutants[mutant];
  let source = readFileSync(url, 'utf8'); assert.equal(source.split(old).length - 1, 1, 'mutação aplica uma vez');
  source = source.replace(old, replacement).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, q, spec) => 'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  console.log('Mutação aplicada: '+mutant);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const { Game } = await moduleFor('game.js');

console.info = () => {};
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('PASS '+name); } catch (e) { failed++; console.error('FAIL '+name+': '+e.message); } };
const textures = initTextures();
for (const dedicated of [false, true]) {
  const g = new Game({ renderer, textures, sfx, settings: { bots: 6, quality: 'low' },
    playerCharId: PCHAR, playerTeam: 'E', mapId: 'operacao_flavio', testMode: true,
    dedicated, onQuit() {}, onMatchEnd() {} });
  if (mutants[mutant]?.[0] === 'mode_operacao_flavio.js') {
    const { OperacaoFlavio } = await moduleFor('mode_operacao_flavio.js');
    g.objective.dispose(); g.objective = new OperacaoFlavio(g, CHARACTERS.find(c => c.id === 'senador'));
  }
  g.start(); g.time = 100; g.objective.prepareRound(); g.state = 'live';
  try {
    check('onda comum de8s '+JSON.stringify({ dedicated }), () => {
      const guards = g.bots.filter(b => b !== g.objective.vip).slice(0, 3);
      for (const [i, b] of guards.entries()) {
        g.time = [103, 106, 107.9][i]; b.weapon = 'knife'; g._kill(b, null);
        assert.equal(b.respawnAt, 108, 'mortes na mesma janela aguardam a mesma onda');
      }
      const b = guards[0]; b.alive = true; g.time = 108; g._kill(b, null);
      assert.equal(b.respawnAt, 116, 'morte na borda aguarda próxima onda');
    });
    check('VIP não entra na onda '+JSON.stringify({ dedicated }), () => {
      g.time = 109; g._kill(g.objective.vip, null);
      assert.equal(g.objective.vip.respawnAt, Infinity, 'VIP morto não revive no meio do objetivo');
      g.objective.vip.alive = true;
    });
    for (let k = 0; k < g.world.escortPath.length; k++) for (const team of ['E', 'B']) check('retaguarda física '+JSON.stringify({ dedicated, k, team }), () => {
      const vip = g.objective.vip, path = g.world.escortPath;
      g.objective.state.checkpoint = k;
      Object.assign(g.objective.state.position, path[k]);
      vip.pos.set(path[k].x, 0, path[k].z);
      const anchor = path[Math.max(0, k - 1)];
      for (let attempt = 0; attempt < 3; attempt++) {
        const spawn = g._pickSpawn(team);
        assert.ok(spawn.z < vip.pos.z, 'respawn nunca fica à frente do VIP');
        assert.ok(Math.hypot(spawn.x - anchor.x, spawn.z - anchor.z) <= 18, 'spawn acompanha checkpoint anterior, sem ficar preso na base inicial');
        assert.ok(!g.world.colliders.some(c => c.minY < 1.8 && c.maxY > .1 && spawn.x > c.minX - .4 && spawn.x < c.maxX + .4 && spawn.z > c.minZ - .4 && spawn.z < c.maxZ + .4), 'corpo nasce fora de parede/prop');
        const from = g.world.nearestWaypoint(spawn.x, spawn.z), to = g.world.nearestWaypoint(anchor.x, anchor.z);
        assert.ok(from === to || g.world.findPath(from, to).at(-1) === to, 'retaguarda tem rota até o checkpoint');
      }
      if (team === 'E' && !dedicated) { g._respawnPlayer(); assert.ok(g.player.pos.z < vip.pos.z); }
      const body = g.bots.find(b => b.team === team && b !== vip);
      assert.ok(body); g._respawnEntity(body); assert.ok(body.pos.z < vip.pos.z);
    });
    check('countdown conserva pontos iniciais '+JSON.stringify({ dedicated }), () => {
      g.state = 'countdown';
      for (const team of ['E','B']) assert.ok(g.world.spawns[team].includes(g._pickSpawn(team)));
    });
    check('onda recomeça em rodada nova '+JSON.stringify({ dedicated }), () => {
      g.time = 200; g.objective.prepareRound(); g.state = 'live';
      const b = g.bots.find(b => b !== g.objective.vip); b.alive = true;
      g.time = 203; g._kill(b, null); assert.equal(b.respawnAt, 208);
    });
    check('sem objetivo conserva contrato comum '+JSON.stringify({ dedicated }), () => {
      const objective = g.objective; g.objective = null;
      try {
        g.time = 300; const b = g.bots.find(b => b !== objective.vip); b.alive = true;
        g._kill(b, null); assert.equal(b.respawnAt, 302.2);
        for (const team of ['E','B']) assert.ok(g.world.spawns[team].includes(g._pickSpawn(team)));
      } finally { g.objective = objective; }
    });
  } finally { g.dispose(); }
}
if (failed) process.exitCode = 1;

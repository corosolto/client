import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initTextures, renderer, sfx, seedRandom, CHARACTERS } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (process.argv.includes('--mutantes')) {
  for (const name of ['sem-alvo', 'alvo-par']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--mutante='+name], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(r.status, 1); assert.ok(r.stdout.includes('Mutação aplicada: '+name));
    assert.match(r.stderr, /AssertionError/); assert.match(r.stderr, /alvo de vitória permanece definido/);
    console.log('Mutante reprovado na cláusula esperada: '+name);
  }
  process.exit(0);
}
const url = new URL('../../public/js/game.js', import.meta.url);
let source = readFileSync(url, 'utf8');
if (mutant) {
  assert.ok(['sem-alvo', 'alvo-par'].includes(mutant), 'mutante conhecido');
  const anchor = 'get roundsToWin() { return Math.floor(this._roundsMax / 2) + 1; }';
  assert.equal(source.split(anchor).length - 1, 1, 'mutação deve aplicar uma vez');
  source = source.replace(anchor, mutant === 'sem-alvo' ? 'get roundsToWin() { return undefined; }' : 'get roundsToWin() { return Math.ceil(this._roundsMax / 2); }');
  console.log('Mutação aplicada: '+mutant);
}
source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) => 'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
const { Game } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

console.info = () => {};
const textures = initTextures();
const player = CHARACTERS.find(c => c.team === 'E');
for (const options of [{ roundsMax: 1 }, { roundsMax: 4 }, { roundsMax: 7 }, { roundsMax: 3, ctf: true }, { arena: true, roundsMax: 7 }]) {
  seedRandom(478);
  const g = new Game({ renderer, textures, sfx, settings: { bots: 2, quality: 'low' },
    playerCharId: player.id, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'FORMATO', mapId: 'ferro_velho', testMode: true, onQuit() {}, onMatchEnd() {}, ...options });
  try {
    assert.equal(g.roundsMax, options.arena ? 1 : options.roundsMax);
    assert.equal(g.roundsToWin, Math.floor(g.roundsMax / 2) + 1, 'alvo de vitória permanece definido fora da arena');
    let banner;
    g._banner = (title, detail) => { banner = { title, detail }; };
    g._startRound();
    assert.ok(banner, 'Game real anuncia a rodada');
    assert.doesNotMatch(banner.detail, /undefined|NaN/, 'banner do modo não usa formato indefinido');
    console.log('PASS formato: '+JSON.stringify(options));
  } finally { g.dispose(); }
}

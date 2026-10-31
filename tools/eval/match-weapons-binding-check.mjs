import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initTextures, renderer, sfx, PCHAR } from './harness.mjs';

if (process.argv.includes('--self-test')) {
  for (const flag of ['', '--mutante=sem-lista']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(flag ? [flag] : [])], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    assert.equal(r.status, flag ? 1 : 0, r.stderr.slice(-1200));
    if (flag) {
      assert.match(r.stdout, /Mutação aplicada/);
      assert.match(r.stderr, /bot recebe a arma pré-carregada/);
    }
    console.log(flag ? 'PASS mutante real sem-lista reprovado' : 'PASS três modos e fallback legado');
  }
  process.exit(0);
}

let { Game } = await import('../../public/js/game.js');
if (process.argv.includes('--mutante=sem-lista')) {
  const url = new URL('../../public/js/game.js', import.meta.url);
  const original = readFileSync(url, 'utf8');
  const before = 'this._matchWeapons = matchWeapons;';
  assert.equal(original.split(before).length - 1, 1, 'mutante precisa alterar a fonte real uma vez');
  const source = original.replace(before, '').replace(/from\s+(['"])([^'"]+)\1/g,
    (_, q, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  ({ Game } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')));
  console.log('Mutação aplicada: sem-lista');
}

console.info = () => {};
const weapons = ['uzi', 'm4', 'ak', 'deagle', 'shotgun', 'mp5', 'scar', 'pistol'];
for (const mode of [{}, { ctf: true }, { arena: true }, { legacy: true }]) {
  const { legacy, ...options } = mode;
  const g = new Game({ renderer, textures: initTextures(), sfx, playerCharId: PCHAR, playerTeam: 'E',
    settings: { bots: 4, wpnMode: 'awp', quality: 'low', difficulty: 'normal', sens: 1 },
    mapId: 'piscina_treta', testMode: true, matchWeapons: legacy ? null : weapons,
    onQuit() {}, onMatchEnd() {}, ...options });
  try {
    assert.ok(g.bots.length > 1, 'exercício precisa cobrir os dois lados');
    assert.deepEqual(g.bots.map(b => b.weapon), legacy ? g.bots.map(() => 'awp') : weapons.slice(0, g.bots.length),
      'bot recebe a arma pré-carregada, sem um segundo sorteio');
    console.log('PASS ' + JSON.stringify(mode));
  } finally { g.dispose(); }
}

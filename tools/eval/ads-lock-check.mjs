import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initTextures, renderer, sfx, PCHAR } from './harness.mjs';

const mutante = process.argv.includes('--mutante=sem-ads-lock');
let url = new URL('../../public/js/game.js', import.meta.url);
if (mutante) {
  let source = readFileSync(url, 'utf8');
  const antes = 'this._adsAposLock = e.button === 2 && !this.player.nade && this.player.weapon !== \'knife\';';
  assert.equal(source.split(antes).length, 2, 'alvo único do mutante');
  source = source.replace(antes, 'this._adsAposLock = false;');
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : spec)}`);
  console.log('Mutação aplicada: sem-ads-lock');
  url = new URL(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { Game } = await import(url);

const game = new Game({ renderer, textures: initTextures(), sfx, settings: { bots: 0, quality: 'low' },
  playerCharId: PCHAR, playerTeam: 'E', mapId: 'ferro_velho', testMode: true, onQuit() {}, onMatchEnd() {} });
game.start(); game.state = 'live'; game.testMode = false; game.paused = false; game.player.alive = true;
game.player.weapon = 'famas'; game.player.nade = null; let travou = 0, lockTarget = null;
game._requestLock = () => { travou++; lockTarget = game.renderer.domElement; };
const clique = (button) => {
  const evento = { button, target: game.renderer.domElement, preventDefault() {} };
  game._md(evento);
};
document.pointerLockElement = null;
clique(2);
assert.equal(travou, 1, 'clique direito no canvas pede pointer lock');
if (mutante) assert.equal(game._adsAposLock, false, 'mutante não arma ADS');
else assert.equal(game._adsAposLock, true, 'clique direito arma ADS pendente do lock');
document.pointerLockElement = lockTarget;
game._plc();
assert.equal(game.player.scoped, true, 'ADS entra assim que o lock engaja');
game._mu({ button: 2 });
assert.equal(game.player.scoped, false, 'soltar o direito sai do ADS');
game.dispose();
console.log(mutante ? '✓ mutante sem-ads-lock reprovado' : '✓ clique direito sem lock: pede lock e entra em ADS');

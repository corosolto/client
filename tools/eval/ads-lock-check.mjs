import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initTextures, renderer, sfx, PCHAR } from './harness.mjs';
import { replaceOnce } from './mutation.mjs';

const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || null;
let url = new URL('../../public/js/game.js', import.meta.url);
if (mutante) {
  const mutacoes = {
    'sem-ads-lock': [
      "this._adsAposLock = e.button === 2 && !this.player.nade && this.player.weapon !== 'knife';",
      'this._adsAposLock = false;',
    ],
    'cancela-mouseup': [
      'this._adsAposLock = false;   // clique rápido: soltar antes do lock não pode mirar depois',
      ';',
    ],
  };
  const [antes, depois] = mutacoes[mutante];
  assert.ok(antes, 'mutante conhecido');
  let source = readFileSync(url, 'utf8');
  source = replaceOnce(source, antes, depois, `mutante ${mutante}`);
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
    `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : spec)}`);
  console.log(`Mutação aplicada: ${mutante}`);
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
if (mutante === 'sem-ads-lock') assert.equal(game._adsAposLock, false, 'mutante não arma ADS');
else assert.equal(game._adsAposLock, true, 'clique direito arma ADS pendente do lock');
game._mu({ button: 2 });
assert.equal(game._adsAposLock, false, 'soltar antes do lock cancela o ADS pendente');
document.pointerLockElement = lockTarget;
game._plc();
assert.equal(game.player.scoped, false, 'lock posterior não revive clique já solto');
document.pointerLockElement = null;
clique(2);
assert.equal(travou, 2, 'segundo clique direito pede pointer lock novamente');
document.pointerLockElement = lockTarget;
game._plc();
assert.equal(game.player.scoped, true, 'ADS entra assim que o lock engaja');
game._mu({ button: 2 });
assert.equal(game.player.scoped, false, 'soltar o direito sai do ADS');
game.dispose();
console.log(mutante ? `✓ mutante ${mutante} reprovado` : '✓ clique direito sem lock: pede lock, cancela no mouseup e entra em ADS');

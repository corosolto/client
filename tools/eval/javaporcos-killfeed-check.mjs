import assert from 'node:assert/strict';
import {Game} from './harness.mjs';
const mutante=process.argv.includes('--mutante=arma-de-fogo');
const ui={_wpnIcon:Game.prototype._wpnIcon};
const icone=Game.prototype._killfeedWeaponIcon.call(ui,mutante?'AK':'PRESA');
let falhou=false;
try {
  assert.match(icone,/aria-label="Ataque de javaporco"/);
  assert.doesNotMatch(icone,/weapon-mask|weapons\//);
  assert.match(Game.prototype._killfeedWeaponIcon.call(ui,'AK'),/weapon-mask/);
} catch(error) { falhou=true; console.log('✗ JAV-FEED '+error.message.slice(0,180)); }
console.log(`JAV-FEED ${falhou?'VERMELHO':'VERDE'}${mutante?' (mutante)':''}`);
process.exitCode=mutante?(falhou?0:1):(falhou?1:0);

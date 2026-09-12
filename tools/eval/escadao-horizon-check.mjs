import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
if (process.argv.includes('--mutante=sem-horizonte'))
  game.world.root.getObjectByName('ESCADAO_HORIZONTE_MORRO')?.removeFromParent();
const horizon = game.world.root.getObjectByName('ESCADAO_HORIZONTE_MORRO');
assert.ok(horizon, 'Escadão precisa de horizonte próprio');
const terrain = horizon.getObjectByName('ESCADAO_MORRO_DISTANTE');
const houses = horizon.getObjectByName('ESCADAO_CASARIO_DISTANTE');
assert.ok(terrain?.isMesh && terrain.geometry.index.count > 1000, 'Morro distante precisa ter relevo contínuo');
assert.ok(houses && houses.children.length >= 36, 'Horizonte precisa de casario distante');
const solidNames = new Set(game.world.colliders.map(c => c.name).filter(Boolean));
assert.equal(horizon.userData.nonSolidSurface, true, 'Horizonte não pode virar superfície jogável');
assert.equal(solidNames.has('ESCADAO_HORIZONTE_MORRO'), false, 'Horizonte não pode entrar nos colliders');
for (const house of houses.children) assert.equal(house.userData.nonSolidSurface, true, 'Casario distante é apenas visual');
console.log(`HORIZON PASS: ${terrain.geometry.index.count / 3} tris de morro, ${houses.children.length} casas distantes, sem colisão`);

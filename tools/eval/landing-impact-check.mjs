/* Pouso com peso: a física entrega intensidade normalizada, o áudio recebe essa força e
   o cliente produz poeira/splash de superfície. Antes, todo pouso era o mesmo burst e não
   havia resposta visual no chão. */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.includes('--mutante=sem-impacto');
const game = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 12345 });
const p = game.player;
game._acceptInput = () => true;
const y = game.world.groundHeightAt(-4.1, -27.8, 10);
p.pos.set(-4.1, y + 1.2, -27.8);
p.vel.set(0, -8, 0);
p.grounded = false;
p.crouchF = 0;
let audio = null;
game.sfx = { ...game.sfx, land(strength) { audio = strength; } };
if (mutante) game._landingFx = () => 0;

let result = null;
for (let frame = 0; frame < 30 && !p.grounded; frame++) {
  result = game._moveEntity(p, { ax: 0, az: 0, crouch: false, shift: false, jump: false }, 1 / 60);
}
assert.equal(p.grounded, true, 'fixture não pousou');
assert(result?.landImpact >= 0.45 && result.landImpact <= 1,
  `física deve expor força normalizada do pouso; recebeu ${result?.landImpact}`);
assert(Math.abs(audio - result.landImpact) < 1e-9,
  `áudio deve receber a mesma força do pouso; áudio=${audio}, física=${result.landImpact}`);

const particles = [];
game._tintFx = () => ({ spawn(pos, options) { particles.push({ pos: pos.clone(), options }); } });
game._footstepSurface = () => 'areia';
const count = typeof game._landingFx === 'function'
  ? game._landingFx(new THREE.Vector3(0, 0, 0), result.landImpact)
  : 0;
assert(count >= 2 && count <= 5, `pouso forte deve soltar 2 a 5 partículas; soltou ${count}`);
assert.equal(particles.length, count, 'contador visual divergiu dos spawns reais');
assert(particles.every(({ options }) => options.vel?.y > 0 && options.life >= 0.18),
  'poeira do pouso precisa sair do chão e permanecer visível por pelo menos 180 ms');

console.log(`VERDE landing-impact: força ${result.landImpact.toFixed(2)}, ${count} partículas de areia`);

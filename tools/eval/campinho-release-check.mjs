import { THREE, initTextures, bootGame } from './harness.mjs';

const game = bootGame('quebrada', { textures: initTextures(), seed: 12345, bots: 4 });
const roles = new Map();
game.world.root.traverse((object) => {
  const role = object.userData.campinhoRole;
  if (!role) return;
  const list = roles.get(role) || [];
  list.push(object);
  roles.set(role, list);
});

const expected = new Map([['gate-cover', 2], ['sideline-cover', 11], ['scoreboard', 1]]);
const failures = [];
for (const [role, count] of expected) {
  const entries = roles.get(role) || [];
  if (entries.length !== count) failures.push(`${role}: ${entries.length} (esperado ${count})`);
  for (const object of entries) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) failures.push(`${role}: geometria vazia`);
  }
}
if (failures.length) throw new Error(`CAMPINHO_RELEASE falhou: ${failures.join('; ')}`);
console.log(`CAMPINHO_RELEASE ok · gate-cover=${roles.get('gate-cover').length} · sideline-cover=${roles.get('sideline-cover').length} · scoreboard=${roles.get('scoreboard').length}`);

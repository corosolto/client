/* Casas abertas na praça: mede o corpo real contra os colisores do mapa em Node.
   A rota entra pela porta sul e sai pela janela norte; não aceita fachada vazia
   nem uma janela pintada sobre parede sólida. */
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice('--mutante='.length);
if (mutant && mutant !== 'fechar-porta') throw Error('Mutante desconhecido: fechar-porta');
const scene = new THREE.Scene();
const world = MAPS.velho_oeste.build(scene, await initTextures());
const houses = world.interiorHouses || [];
if (mutant === 'fechar-porta') {
  const first = houses[0]?.userData.interior;
  if (!first) throw Error('Mutante não aplicou: casa interna ausente');
  world.colliders.push({ minX: first.inside[0] - 1, maxX: first.inside[0] + 1, minY: 0, maxY: 2.6,
    minZ: first.entrance[1] + .2, maxZ: first.entrance[1] + .5, tag: 'mutante-porta-fechada' });
}
const probe = Object.create(Game.prototype); probe.world = world;
const EPS = 1e-6;
function capsulePath(a, b) {
  const samples = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, p = new THREE.Vector3(a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t);
    const original = p.clone(); probe._collide(p, .38);
    samples.push({ t, displacement: p.distanceTo(original) });
  }
  return { clear: samples.every(s => s.displacement <= EPS), maxDisplacement: Math.max(...samples.map(s => s.displacement)) };
}
function windowClear(house) {
  const [x, z] = house.userData.interior.inside;
  const target = house.userData.interior.northWindow;
  world.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 1.62, z), new THREE.Vector3(0, 0, 1), 0, target[1] - z);
  const own = new Set(); house.traverse(o => { if (o.isMesh) own.add(o); });
  const hits = ray.intersectObjects([...own], false);
  return { clear: hits.length === 0, hits: hits.map(h => h.object.name) };
}
const results = houses.map(house => {
  const meta = house.userData.interior || {};
  const entry = meta.entrance && meta.inside ? capsulePath(meta.entrance, meta.inside) : { clear: false, maxDisplacement: Infinity };
  const window = meta.inside && meta.northWindow ? windowClear(house) : { clear: false, hits: ['metadado-ausente'] };
  return { name: house.name, doorWidth: meta.doorWidth, entry, window };
});
const checks = {
  IN1: results.length === 2 && results.every(r => r.doorWidth >= 1.9 && r.entry.clear),
  IN2: results.length === 2 && results.every(r => r.window.clear),
};
console.log(JSON.stringify({ checks, houses: results, mutation: mutant || null }, null, 2));
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
if (mutant) process.exitCode = failed.length === 1 && failed[0] === 'IN1' ? 0 : 1;
else process.exitCode = failed.length ? 1 : 0;
